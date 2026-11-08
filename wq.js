// Wasserqualität (Dragino WQS-LB, Reservoir): gemeinsame Logik für App (Browser) und Hintergrund-Job (Node).
// Werte: Trübung (turbidity, NTU), gelöster Sauerstoff (dissolved_oxygen, mg/L), Leitfähigkeit (EC_K1, µS/cm), Wassertemperatur (DO_temp, °C).
// Alarm: Vergleich der letzten Messung mit einer Basis (Median der letzten 7 Tage, ohne die letzten 6 Stunden, erst ab Echtbetrieb).
(function (g) {
  const WQ = {};
  WQ.DEVICE = '02c610145b1f4644';
  WQ.AB = '2026-11-08 16:17'; // erste gültige Messung im Reservoir, alles davor (Test) wird ignoriert
  WQ.DEF = { ec: 30, tu: 20, do: 2 }; // Alarmgrenzen: EC ±%, Trübung +NTU, Sauerstoff -mg/L gegenüber Basis
  WQ.F = {
    tu: { label: 'Trübung', kurz: 'Trübung', unit: 'NTU', dec: 1, col: '#B8A04A' },
    do: { label: 'Sauerstoff', kurz: 'O₂', unit: 'mg/L', dec: 2, col: '#5B8FD6' },
    ec: { label: 'Leitfähigkeit', kurz: 'EC', unit: 'µS/cm', dec: 0, col: '#2E8B62' }
  };
  const fin = v => typeof v === 'number' && isFinite(v);
  const r = (v, d) => fin(v) ? Math.round(v * 10 ** d) / 10 ** d : null;
  const med = a => { const b = a.filter(fin).sort((x, y) => x - y), n = b.length; return n ? (n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2) : null; };
  const mean = a => { const b = a.filter(fin); return b.length ? b.reduce((x, y) => x + y, 0) / b.length : null; };
  WQ.abMs = s => { const t = Date.parse(String(s || WQ.AB).trim().replace(' ', 'T') + ':00+01:00'); return isFinite(t) ? t : Date.parse(WQ.AB.replace(' ', 'T') + ':00+01:00'); };
  WQ.grenzen = set => ({ ec: +set.wqEc || WQ.DEF.ec, tu: +set.wqTu || WQ.DEF.tu, do: +set.wqDo || WQ.DEF.do });

  // akenza: Messungen seitenweise rückwärts laden
  WQ.laden = async (fetchFn, key, deviceId, tage) => {
    const now = Date.now(), von = now - tage * 864e5, H = { 'x-api-key': key, accept: 'application/json' };
    let ende = now + 3600e3, arr = [];
    for (let s = 0; s < 12; s++) {
      const res = await fetchFn(`https://api.akenza.io/v3/devices/${deviceId}/query?topic=measurement&limit=2000&startDate=${encodeURIComponent(new Date(von).toISOString())}&endDate=${encodeURIComponent(new Date(ende).toISOString())}`, { headers: H });
      if (!res.ok) { if (arr.length) break; throw new Error('HTTP ' + res.status); }
      const j = await res.json(), a = Array.isArray(j) ? j : (j.data || j.items || j.results || []);
      if (!a.length) break; arr = arr.concat(a);
      const min = Math.min(...a.map(x => Date.parse(x.timestamp || x.time || x.createdAt)).filter(Boolean));
      if (!isFinite(min) || min >= ende || min <= von || a.length < 2000) break; ende = min - 1;
    }
    const seen = new Set();
    return arr.filter(x => { const k = x.timestamp || x.time || x.createdAt; if (seen.has(k)) return false; seen.add(k); return true; })
      .map(x => ({ t: Date.parse(x.timestamp || x.time || x.createdAt), d: x.data || x }))
      .filter(x => x.t && x.d && typeof x.d === 'object').sort((a, b) => a.t - b.t);
  };

  // Rohdaten -> Messpunkte (ungültige Werte raus, temp_DS18B20 wird ignoriert)
  WQ.punkte = rows => rows.map(({ t, d }) => ({
    t,
    tu: fin(d.turbidity) && d.turbidity >= 0 && d.turbidity <= 1000 ? r(d.turbidity, 1) : null,
    do: fin(d.dissolved_oxygen) && d.dissolved_oxygen > 0 && d.dissolved_oxygen <= 25 ? r(d.dissolved_oxygen, 2) : null,
    ec: fin(d.EC_K1) && d.EC_K1 > 0 && d.EC_K1 <= 2000 ? r(d.EC_K1, 0) : null,
    te: fin(d.DO_temp) && d.DO_temp > -5 && d.DO_temp < 50 ? r(d.DO_temp, 1) : null,
    bat: fin(d.batV) ? r(d.batV, 3) : null
  })).filter(p => p.tu !== null || p.do !== null || p.ec !== null);

  // Auswertung: letzte Werte, Basis, Alarme, Verlauf (48 h, 30 Tage, 365 Tage Tagesmittel)
  WQ.auswerten = (pts, set, prev, now) => {
    prev = prev || {}; const ab = WQ.abMs(set.wqAb), G = WQ.grenzen(set);
    const echt = pts.filter(p => p.t >= ab);
    const last = echt.length ? echt[echt.length - 1] : null;
    const lastV = k => { for (let i = echt.length - 1; i >= 0; i--) if (echt[i][k] !== null) return echt[i][k]; return null; };
    const bp = echt.filter(p => p.t >= now - 7 * 864e5 && p.t <= now - 6 * 3600e3);
    const basis = bp.length >= 12 ? { tu: r(med(bp.map(p => p.tu)), 1), do: r(med(bp.map(p => p.do)), 2), ec: r(med(bp.map(p => p.ec)), 0), n: bp.length, von: bp[0].t, bis: bp[bp.length - 1].t } : null;
    const akt = { tu: lastV('tu'), do: lastV('do'), ec: lastV('ec') };
    const alarme = [];
    if (basis && last && last.t >= now - 3 * 3600e3) {
      if (akt.ec !== null && basis.ec) { const p = (akt.ec - basis.ec) / basis.ec * 100; if (Math.abs(p) > G.ec) alarme.push({ k: 'ec', text: `Leitfähigkeit ${akt.ec} µS/cm (${p > 0 ? '+' : ''}${Math.round(p)} % zur Basis ${basis.ec})` }); }
      if (akt.tu !== null && basis.tu !== null && akt.tu - basis.tu > G.tu) alarme.push({ k: 'tu', text: `Trübung ${akt.tu} NTU (+${r(akt.tu - basis.tu, 1)} NTU zur Basis ${basis.tu})` });
      if (akt.do !== null && basis.do !== null && basis.do - akt.do > G.do) alarme.push({ k: 'do', text: `Sauerstoff ${akt.do} mg/L (-${r(basis.do - akt.do, 2)} mg/L zur Basis ${basis.do})` });
    }
    const keep = p => ({ t: p.t, tu: p.tu, do: p.do, ec: p.ec, te: p.te });
    const serie48 = echt.filter(p => p.t >= now - 48 * 3600e3).map(keep);
    const serie30 = []; let lt = 0;
    for (const p of echt.filter(p => p.t >= now - 30 * 864e5)) if (p.t - lt >= 3 * 3600e3) { serie30.push(keep(p)); lt = p.t; }
    // Tagesmittel: akenza hält nur ca. 3 Monate, daher in Firestore bis 365 Tage weiterführen
    const tag = {}; for (const p of echt) { const d = new Date(p.t + 3600e3).toISOString().slice(0, 10); (tag[d] = tag[d] || []).push(p); }
    const hm = {}; const abTag = Date.parse(new Date(ab + 3600e3).toISOString().slice(0, 10) + 'T12:00:00Z');
    for (const p of (prev.serie365 || [])) if (p.t >= now - 365 * 864e5 && p.t >= abTag) hm[p.t] = p;
    for (const d of Object.keys(tag)) { const a = tag[d], t = Date.parse(d + 'T12:00:00Z'); hm[t] = { t, tu: r(mean(a.map(p => p.tu)), 1), do: r(mean(a.map(p => p.do)), 2), ec: r(mean(a.map(p => p.ec)), 0), te: r(mean(a.map(p => p.te)), 1) }; }
    const serie365 = Object.keys(hm).map(Number).sort((a, b) => a - b).map(t => hm[t]);
    return {
      id: 'wasserqualitaet', name: 'Wasserqualität', typ: 'wasserqualitaet',
      last: last ? { zeit: last.t, ...akt, te: last.te, bat: last.bat } : null,
      basis, alarme, grenzen: G, serie48, serie30, serie365, aktualisiert: now
    };
  };
  g.WQ = WQ;
})(typeof window !== 'undefined' ? window : globalThis);
