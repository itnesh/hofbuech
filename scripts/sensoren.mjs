// Stündlicher Hintergrund-Job (GitHub Actions): akenza-Füllstände und Agrometeo-Wetterdaten nach Firestore.
// Zugangsdaten stehen in hoefe/{HOF}/einstellungen/main (in der App unter Einstellungen > Sensoren erfasst).
import admin from 'firebase-admin';

const HOF = process.env.HB_HOF || 'bannhalde';
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();
const base = db.collection('hoefe').doc(HOF);
const set = (await base.collection('einstellungen').doc('main').get()).data() || {};
const now = Date.now();

async function push(title, body, url = './#/kalender') {
  const g = (await base.collection('geraete').get()).docs.map(d => ({ id: d.id, ...d.data() }));
  for (const x of g) {
    try { await admin.messaging().send({ token: x.token, data: { title, body, url, tag: 'sensor-' + title }, webpush: { headers: { Urgency: 'high', TTL: '21600' } } }); }
    catch (e) { console.log('Push-Fehler', x.id, e.code); }
  }
}

// ---------- akenza ----------
const pickKey = (keys, re, not) => keys.find(k => re.test(k) && !(not && not.test(k)));
async function batterie(deviceId) {
  for (const topic of ['lifecycle', 'default', 'battery']) {
    try {
      const r = await fetch(`https://api.akenza.io/v3/devices/${deviceId}/query?topic=${topic}&limit=1`, { headers: { 'x-api-key': set.akenzaKey, accept: 'application/json' } });
      if (!r.ok) continue;
      const j = await r.json(); const a = Array.isArray(j) ? j : (j.data || []);
      const d = a[0] && (a[0].data || a[0]); if (!d) continue;
      const k = Object.keys(d).find(k => /batt/i.test(k) && typeof d[k] === 'number');
      if (k) { console.log('Batterie', topic, k, d[k]); return d[k]; }
    } catch (e) { }
  }
  return null;
}
async function akenza(id, deviceId, name, leer, voll) {
  const qs = `topic=measurement&limit=2000&startDate=${encodeURIComponent(new Date(now - 31 * 864e5).toISOString())}&endDate=${encodeURIComponent(new Date(now + 3600e3).toISOString())}`;
  const r = await fetch(`https://api.akenza.io/v3/devices/${deviceId}/query?${qs}`, { headers: { 'x-api-key': set.akenzaKey, accept: 'application/json' } });
  if (!r.ok) { console.log(name, 'HTTP', r.status, (await r.text()).slice(0, 300)); return; }
  const j = await r.json();
  const arr = Array.isArray(j) ? j : (j.data || j.items || j.results || []);
  const rows = arr.map(x => ({ t: Date.parse(x.timestamp || x.time || x.createdAt), d: x.data || x }))
    .filter(x => x.t && x.d && typeof x.d === 'object').sort((a, b) => a.t - b.t);
  if (!rows.length) { console.log(name, 'keine Daten', JSON.stringify(j).slice(0, 300)); return; }
  const keys = Object.keys(rows[rows.length - 1].d).filter(k => typeof rows[rows.length - 1].d[k] === 'number');
  const kW = set['sensKey_' + id] || pickKey(keys, /fill|level|percent|prozent|füll/i, /batt/i) || pickKey(keys, /.*/, /batt|temp|rssi|snr|signal/i);
  const kB = pickKey(keys, /batt/i);
  console.log(name, 'Felder', keys.join(','), '-> Wert', kW, 'Batterie', kB);
  console.log(name, 'Zeitraum', new Date(rows[0].t).toISOString(), 'bis', new Date(rows[rows.length - 1].t).toISOString(), 'letzte Werte', rows.slice(-3).map(x => x.d[kW]).join(', '));
  const pts = rows.filter(x => typeof x.d[kW] === 'number').map(x => [x.t, Math.round(x.d[kW] * 10) / 10]);
  const last = rows[rows.length - 1];
  const serie48 = pts.filter(p => p[0] >= now - 48 * 3600e3);
  const serie30 = []; let lastT = 0;
  for (const p of pts.filter(p => p[0] >= now - 30 * 864e5)) if (p[0] - lastT >= 3 * 3600e3) { serie30.push(p); lastT = p[0]; }
  const ref = base.collection('sensoren').doc(id);
  const prev = (await ref.get()).data() || {};
  const wert = typeof last.d[kW] === 'number' ? last.d[kW] : null;
  const L = parseFloat(leer), V = parseFloat(voll);
  const ok = isFinite(L) && isFinite(V) && L !== V;
  const pct = x => ok ? Math.round((L - x) / (L - V) * 1000) / 10 : null;
  const gut = q => q !== null && q >= 0 && q <= 100; // ausserhalb 0-100% = Messfehler, wird ignoriert
  const lastOk = ok ? [...pts].reverse().find(p => gut(pct(p[1]))) : null;
  const prozent = ok ? (lastOk ? pct(lastOk[1]) : null) : null;
  const bat = kB ? last.d[kB] : await batterie(deviceId);
  const conv = p => { const q = pct(p[1]); return { 0: p[0], 1: q === null ? p[1] : q }; };
  const filt = a => ok ? a.filter(p => gut(pct(p[1]))) : a;
  const fehler = ok ? pts.filter(p => !gut(pct(p[1]))).length : 0; if (fehler) console.log(name, 'Messfehler ignoriert', fehler);
  let alarm = prev.alarm ?? 100;
  if (prozent !== null) {
    const stufe = Math.ceil(prozent / 10) * 10; // 28 -> 30
    if (stufe < alarm && stufe <= 50) { await push(`${name}: unter ${stufe}%`, `Aktuell ${Math.round(prozent)}% (${new Date(lastOk[0]).toLocaleString('de-CH', { timeZone: 'Europe/Zurich' })})`, './#/journale/' + id); alarm = stufe; }
    if (stufe > alarm) alarm = stufe; // wieder gefüllt -> Alarmstufe zurücksetzen
  }
  await ref.set({ id, name, typ: 'fuellstand', einheit: prozent === null ? 'cm' : '%', keyWert: kW, keyBatterie: kB || null, last: { zeit: lastOk ? lastOk[0] : last.t, wert: lastOk ? lastOk[1] : wert, prozent, batterie: bat ?? null }, serie48: filt(serie48).map(conv), serie30: filt(serie30).map(conv), alarm, aktualisiert: now });
  console.log(name, 'ok', wert, 'Punkte', pts.length);
}

// ---------- Agrometeo / vitimeteo ----------
function reihen(j) {
  const out = [];
  const walk = x => {
    if (Array.isArray(x)) {
      if (x.length >= 2 && typeof x[0] === 'string' && /^\d{4}-\d{2}/.test(x[0]) && typeof x[1] === 'number') { out.push([x[0].slice(0, 7), x[1]]); return; }
      x.forEach(walk); return;
    }
    if (x && typeof x === 'object') {
      const dk = Object.keys(x).find(k => typeof x[k] === 'string' && /^\d{4}-\d{2}/.test(x[k]));
      const vk = Object.keys(x).find(k => typeof x[k] === 'number' && !/^(id|station|year|month)$/i.test(k));
      if (dk && vk) { out.push([x[dk].slice(0, 7), x[vk]]); return; }
      Object.values(x).forEach(walk);
    }
  };
  walk(j); return out;
}
async function vitimeteo(sensor, fn) {
  const st = set.agroStation || '177';
  const url = `https://vitimeteo.ch/api/stations/${st}/weatherdata.json?startdate=2004-01-01&enddate=2099-12-31&groupby=month&sen_list=[[${sensor},'${fn}']]&datastructure=json&cflag=0`;
  const r = await fetch(url, { headers: { Authorization: 'Basic ' + Buffer.from(`${set.agroUser}:${set.agroPass}`).toString('base64') } });
  if (!r.ok) { console.log('vitimeteo', sensor, 'HTTP', r.status); return null; }
  const j = await r.json();
  const rows = reihen(j);
  console.log('vitimeteo', sensor, fn, 'Zeilen', rows.length, rows.slice(-2));
  if (!rows.length) console.log('Antwort', JSON.stringify(j).slice(0, 500));
  return rows;
}
function jahresreihen(rows) {
  const y = new Date().getFullYear(), akt = Array(12).fill(null), vor = Array(12).fill(null), sum = Array(12).fill(0), n = Array(12).fill(0);
  let seit = 9999;
  for (const [ym, v] of rows) {
    const yy = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1; if (m < 0 || m > 11) continue;
    seit = Math.min(seit, yy);
    if (yy === y) akt[m] = Math.round(v * 10) / 10;
    else { if (yy === y - 1) vor[m] = Math.round(v * 10) / 10; sum[m] += v; n[m]++; }
  }
  return { akt, vor, avg: sum.map((s, i) => n[i] ? Math.round(s / n[i] * 10) / 10 : null), seit };
}
async function agrometeo() {
  const ref = base.collection('sensoren').doc('agrometeo');
  const prev = (await ref.get()).data() || {};
  if (prev.aktualisiert && now - prev.aktualisiert < 20 * 3600e3 && !process.env.FORCE) return console.log('agrometeo: aktuell');
  const regen = await vitimeteo(6, 'sum');
  const temp = await vitimeteo(set.agroTempSensor || 1, 'avg');
  const R = regen && regen.length ? jahresreihen(regen) : null, T = temp && temp.length ? jahresreihen(temp) : null;
  await ref.set({ id: 'agrometeo', typ: 'agrometeo', station: set.agroStation || '177', jahr: new Date().getFullYear(), seit: (R || T || {}).seit || 2004, regen: R, temp: T, aktualisiert: now });
}

if (set.akenzaKey) {
  if (set.sensWasser !== '') await akenza('wasserstand', set.sensWasser || '02bdf0b1b64b4c40', 'Wasserstand', set.wasserLeer || 214, set.wasserVoll || 56).catch(e => console.log('Wasserstand', e.message));
  if (set.sensFass !== '') await akenza('traenkefass', set.sensFass || '029412d5966ce1d4', 'Tränkefass', set.fassLeer || 83, set.fassVoll || 9.3).catch(e => console.log('Tränkefass', e.message));
} else console.log('akenza: kein API-Key in den Einstellungen');
if (set.agroUser && set.agroPass) await agrometeo().catch(e => console.log('agrometeo', e.message));
else console.log('agrometeo: keine Zugangsdaten');
process.exit(0);
