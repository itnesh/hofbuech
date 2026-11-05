// hofbuech - Hof-App (PWA). Daten lokal oder in Firestore (hoefe/{schluessel}/...).
const VERSION = '1.18.4';

/* ---------- Helfer ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pd = s => new Date(s + 'T00:00:00');
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => iso(new Date());
const addDays = (s, n) => { const d = pd(s); d.setDate(d.getDate() + Number(n || 0)); return iso(d); };
const diff = (a, b) => Math.round((pd(b) - pd(a)) / 86400000);
const fmt = s => s ? `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)}` : '';
const fmtS = s => s ? `${s.slice(8, 10)}.${s.slice(5, 7)}.` : '';
const months = (a, b) => { const A = pd(a), B = pd(b); let m = (B.getFullYear() - A.getFullYear()) * 12 + B.getMonth() - A.getMonth(); if (B.getDate() < A.getDate()) m--; return m; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? 0 : n; };
const nf = n => ((Math.round(n * 10) / 10) || 0).toLocaleString('de-CH');
const MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const clean = o => JSON.parse(JSON.stringify(o));
const kurzOM = om => { const d = String(om || '').replace(/\D/g, ''); return d.length >= 5 ? d.slice(-5, -1) : d; };
const alterTxt = m => m === null || m === undefined ? '' : m <= 25 ? `${m} Mt.` : `${(m / 12).toFixed(1)} J.`;
const TIC = {
  Kalb: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11.5c0-1.7 1.3-3 3-3s3 1.3 3 3v3c0 1.9-1.3 3.2-3 3.2s-3-1.3-3-3.2z"/><path d="M9 11l-2.6-.7.7 2.1H9M15 11l2.6-.7-.7 2.1H15"/></svg>',
  Rind: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 9.5C7.5 7 9.5 5.5 12 5.5s4.5 1.5 4.5 4v5c0 2.8-2 4.6-4.5 4.6s-4.5-1.8-4.5-4.6z"/><path d="M7.5 9L3.5 8l1 3h3M16.5 9l4-1-1 3h-3"/><path d="M10.4 16h.01M13.6 16h.01"/></svg>',
  Kuh: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6.5C7 4.5 5 3.5 3 3.8M16 6.5c1-2 3-3 5-2.7"/><path d="M7.5 10C7.5 7.5 9.5 6 12 6s4.5 1.5 4.5 4v4.5c0 2.8-2 4.6-4.5 4.6s-4.5-1.8-4.5-4.6z"/><path d="M7.5 10L3.5 9.5l1.2 2.8h2.8M16.5 10l4-.5-1.2 2.8h-2.8"/><path d="M10.4 16.2h.01M13.6 16.2h.01"/></svg>'
};
const relTag = d => { const n = diff(today(), d); return n === 0 ? 'heute' : n === 1 ? 'morgen' : n === -1 ? 'gestern' : n > 0 ? `in ${n} T.` : `vor ${-n} T.`; };

/* ---------- Icons ---------- */
const I = p => `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC = {
  geburt: I('<circle cx="12" cy="9" r="5"/><path d="M8 20c1-3 2-4 4-4s3 1 4 4"/>'),
  brunst: I('<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/>'),
  besamung: I('<path d="M4 20l8-8"/><path d="M14 4l6 6"/><path d="M9 9l6 6"/>'),
  zugang: I('<path d="M12 5v14M5 12h14"/>'),
  abgang: I('<path d="M5 12h14"/>'),
  auslauf: I('<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>'),
  behandlung: I('<rect x="3" y="8" width="18" height="8" rx="4"/><path d="M12 8v8"/>'),
  guellen: I('<path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z"/>'),
  misten: I('<path d="M4 20h16"/><path d="M6 20c0-4 3-7 6-7s6 3 6 7"/>'),
  silieren: I('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>'),
  heuen: I('<circle cx="12" cy="12" r="8"/><path d="M6 9c4 1 8 1 12 0M6 15c4-1 8-1 12 0"/>'),
  bezugHeu: I('<path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/>'),
  bezugSilage: I('<path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/>'),
  bezugStroh: I('<path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/>'),
  stroh: I('<path d="M6 20L10 4M10 20L12 4M14 20L12 4M18 20L14 4"/>'),
  ernte: I('<circle cx="12" cy="12" r="8"/><path d="M6 9c4 1 8 1 12 0M6 15c4-1 8-1 12 0"/>'),
  kauf: I('<path d="M3 4h2l2.4 11h11L21 7H7"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>'),
  verbrauch: I('<path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/>'),
  duengung: I('<path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z"/>'),
};

/* ---------- Einstellungen ---------- */
const DEF = {
  hofname: 'Hof Bannhalde', tragzeit: 285, kalbMonate: 12, laktAbMonate: 16, abgekalbtTage: 60,
  alpVon: '05-25', alpBis: '10-05', puffer: 14, unbesamtAb: 16, baldTage: 30, lat: 47.5425, lon: 8.1356,
  parzellen: [], gruende: ['Winter / Vegetation', 'Zu nass', 'Kein Futter', 'Geburt', 'Eingriff am Tier', 'Kälte', 'Sturm'],
  medikamente: [], startHeu: 0, startSilo: 0, startStroh: 0,
  betrieb: 'Matthias Erdin, Bannhalde 126, 5272 Gansingen', tvd: '164240.7'
};

/* ---------- Datenhaltung ---------- */
const COLLS = ['tiere', 'ereignisse', 'behandlungen', 'auslauf', 'feld', 'parzellen', 'labiola', 'aufgaben', 'lprotokoll', 'meldungen', 'notizen', 'sensoren'];
const S = { loaded: {}, tiere: [], ereignisse: [], behandlungen: [], auslauf: [], feld: [], parzellen: [], labiola: [], aufgaben: [], lprotokoll: [], meldungen: [], notizen: [], sensoren: [], set: { ...DEF } };
let W = null; // writer
let mode = 'local';
const HOF = window.HB_HOF || 'bannhalde';
function mergeSet(o) { const x = { ...DEF, ...(o || {}) }; if (x.alpVon === '06-15' && x.alpBis === '09-15') { x.alpVon = DEF.alpVon; x.alpBis = DEF.alpBis; } return x; }
let USER = null, AUTH = null;

function setSync(state, title) { const el = $('#sync'); el.className = 'sync ' + state; el.title = title || ''; }
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
let lastErr = null;
function showErr(e) {
  console.error(e); const code = e && e.code || '';
  setSync('err', String(e && e.message || e));
  if (lastErr === code) return; lastErr = code;
  toast(code === 'permission-denied' ? 'Zugriff verweigert - Konto nicht freigegeben' : 'Fehler: ' + (code || e && e.message || e));
  schedule();
}
function errBanner() {
  if (!lastErr) return '';
  const why = lastErr === 'permission-denied'
    ? `Das Konto <b>${esc(USER && USER.email || '?')}</b> hat keinen Zugriff. In den Firestore-Regeln muss genau diese E-Mail-Adresse stehen und die Regeln müssen veröffentlicht sein.`
    : `Fehlercode: ${esc(lastErr)}`;
  return `<div class="note" style="margin:8px 0"><b>Speichern nicht möglich</b><br>${why}<div class="btns" style="margin-top:10px"><button class="btn" data-act="logout">Abmelden / anderes Konto</button></div></div>`;
}

function initLocal() {
  mode = 'local';
  try { const d = JSON.parse(localStorage.getItem('hb-local') || '{}'); COLLS.forEach(c => { S[c] = d[c] || []; S.loaded[c] = true; }); S.loaded.set = true; S.auslauf = S.auslauf.map(a => a.typ === 'Stall' ? { ...a, typ: 'Laufhof' } : a); S.set = mergeSet(d.set); } catch (e) { }
  const persist = () => { const d = { set: S.set }; COLLS.forEach(c => d[c] = S[c]); localStorage.setItem('hb-local', JSON.stringify(d)); schedule(); };
  W = {
    put: (c, o) => { const i = S[c].findIndex(x => x.id === o.id); if (i >= 0) S[c][i] = o; else S[c].push(o); persist(); },
    del: (c, id) => { S[c] = S[c].filter(x => x.id !== id); persist(); },
    setSettings: o => { S.set = mergeSet(o); persist(); }
  };
  setSync('off', 'Nur lokal gespeichert (Firebase nicht eingerichtet)');
}

async function initFirebase(cfg) {
  mode = 'firebase';
  setSync('', 'Verbinde...');
  const V = '10.12.2';
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const A = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`);
  const F = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
  const app = initializeApp(cfg);
  const auth = A.getAuth(app); AUTH = { auth, A, app, F, V };
  try { await A.getRedirectResult(auth); } catch (e) { loginScreen(e.message); }
  USER = await new Promise(res => A.onAuthStateChanged(auth, u => u ? res(u) : loginScreen()));
  $('#tabbar').classList.remove('hidden');
  let db;
  try { db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) }); }
  catch (e) { db = F.getFirestore(app); }
  const ref = c => F.collection(db, 'hoefe', HOF, c);
  COLLS.forEach(c => F.onSnapshot(ref(c), { includeMetadataChanges: true }, snap => {
    S[c] = snap.docs.map(d => ({ ...d.data(), id: d.id })); S.loaded[c] = true; if (c === 'auslauf') S[c] = S[c].map(a => a.typ === 'Stall' ? { ...a, typ: 'Laufhof' } : a); if (!snap.metadata.fromCache && lastErr) { lastErr = null; }
    setSync(snap.metadata.fromCache ? 'off' : 'ok', snap.metadata.fromCache ? 'Offline - wird später synchronisiert' : 'Synchronisiert');
    schedule();
  }, showErr));
  F.onSnapshot(F.doc(db, 'hoefe', HOF, 'einstellungen', 'main'), d => { S.set = mergeSet(d.data()); S.loaded.set = true; schedule(); }, showErr);
  W = {
    put: (c, o) => { F.setDoc(F.doc(db, 'hoefe', HOF, c, o.id), clean(o)).catch(showErr); },
    del: (c, id) => { F.deleteDoc(F.doc(db, 'hoefe', HOF, c, id)).catch(showErr); },
    setSettings: o => { F.setDoc(F.doc(db, 'hoefe', HOF, 'einstellungen', 'main'), clean(o)).catch(showErr); }
  };
}

function put(c, o) { o.id = o.id || uid(); o.geaendert = Date.now(); W.put(c, o); return o; }
function del(c, id) { W.del(c, id); }

/* ---------- Fachlogik ---------- */
const istObjekt = z => z && (z.art === 'objekt' || z.nutzung === 'Hecke');
const istArchiv = z => z && z.art === 'archiv';
const parzellen = () => S.parzellen.filter(z => !istObjekt(z) && !istArchiv(z)).map(x => x.name).filter(Boolean).sort((a, b) => a.localeCompare(b, 'de', { numeric: true }));
const gruende = () => [...new Set([...(S.set.gruende || []), ...S.auslauf.map(a => a.grund)].filter(Boolean))];
const rassen = () => [...new Set(S.tiere.map(t => (t.rasse || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
const tierById = id => S.tiere.find(t => t.id === id);
const tName = id => { const t = tierById(id); return t ? (t.name || t.ohrmarke || '?') : '?'; };
const aktiv = (t, d = today()) => (!t.zugang || t.zugang <= d) && (!t.geburt || t.geburt <= d) && (!t.abgang || t.abgang > d);
const aktiveTiere = (d = today()) => S.tiere.filter(t => aktiv(t, d)).sort(sortName);
const sortName = (a, b) => (a.name || a.ohrmarke || '').localeCompare(b.name || b.ohrmarke || '', 'de');
const evOf = (id, typ) => S.ereignisse.filter(e => e.tierId === id && (!typ || e.typ === typ)).sort((a, b) => a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0);
const alterMt = (t, d = today()) => t.geburt ? months(t.geburt, d) : null;

function kategorie(t, d = today()) {
  if (t.gekalbert === 'ja' || evOf(t.id, 'abkalbung').some(e => e.datum <= d)) return 'Kuh';
  const m = alterMt(t, d);
  if (m !== null && m < S.set.kalbMonate) return 'Kalb';
  return 'Rind';
}
function lakt(t, d = today()) {
  if (t.geschlecht !== 'w') return null;
  const m = alterMt(t, d);
  if (m !== null && m < S.set.laktAbMonate) return null;
  const cal = evOf(t.id, 'abkalbung').filter(e => e.datum <= d).pop();
  const bes = evOf(t.id, 'besamung').filter(e => e.datum <= d && (!cal || e.datum > cal.datum)).pop();
  if (bes) return { status: 'Besamt', bes, cal, erwartet: addDays(bes.datum, S.set.tragzeit) };
  if (cal && diff(cal.datum, d) <= S.set.abgekalbtTage) return { status: 'Abgekalbt', cal };
  return { status: 'Unbesamt', cal };
}
let alpMemo = { k: '', m: {} };
function alpIst() {
  const k = S.auslauf.length + ':' + S.auslauf.reduce((a, x) => Math.max(a, x.geaendert || 0), 0);
  if (alpMemo.k === k) return alpMemo.m;
  const sl = sortedAuslauf(), m = {};
  sl.forEach((a, i) => { if (a.typ !== 'Alp') return; const y = a.datum.slice(0, 4); const bis = sl[i + 1] ? addDays(sl[i + 1].datum, -1) : null; if (!m[y]) m[y] = [a.datum, bis]; else if (bis === null || (m[y][1] && bis > m[y][1])) m[y][1] = bis; });
  alpMemo = { k, m }; return m;
}
// Vergangene/laufende Alp aus dem Auslaufjournal, sonst Schätzung aus den Einstellungen
function alpFenster(y) {
  const ist = alpIst()[String(y)], plan = [`${y}-${S.set.alpVon}`, `${y}-${S.set.alpBis}`];
  if (!ist) return plan;
  return [ist[0], ist[1] || (plan[1] > ist[0] ? plan[1] : addDays(ist[0], 120))];
}
function inAlp(d) { const [a, b] = alpFenster(d.slice(0, 4)); return d >= a && d <= b; }
function verbotFenster(y) { const [a, b] = alpFenster(y); return [addDays(a, -S.set.tragzeit - S.set.puffer), addDays(b, -S.set.tragzeit + S.set.puffer)]; }
function verbotSegmente(y) {
  let segs = [verbotFenster(y)];
  for (const ay of [y - 1, y]) { const [aa, ab] = alpFenster(ay); segs = segs.flatMap(([a, b]) => { if (ab < a || aa > b) return [[a, b]]; const r = []; if (a < aa) r.push([a, addDays(aa, -1)]); if (b > ab) r.push([addDays(ab, 1), b]); return r; }); }
  return segs;
}
function imVerbot(d) { if (inAlp(d)) return false; for (const y of [+d.slice(0, 4), +d.slice(0, 4) + 1]) { const [a, b] = verbotFenster(y); if (d >= a && d <= b) return true; } return false; }

function aufgabeFaellig(a, y) { if (a.archiv || (a.art !== 'einmalig' && ((a.vonJahr && +y < a.vonJahr) || (a.bisJahr && +y > a.bisJahr)))) return null; return a.art === 'einmalig' ? (a.faellig && a.faellig.startsWith(String(y)) ? a.faellig : null) : (a.faelligMT ? `${y}-${a.faelligMT}` : null); }
function aufgabenOffen(y) { return S.aufgaben.map(a => ({ a, d: aufgabeFaellig(a, y) })).filter(x => x.d && !(x.a.erledigt || {})[String(y)]); }
function agenda(tage = 150) {
  const d = today(), end = addDays(d, tage), it = [];
  for (const t of aktiveTiere()) {
    const n = t.name || t.ohrmarke, l = lakt(t), f = frist(t.id);
    if (f) it.push({ d: f.freiAb, k: 'Absetzfrist endet', n, s: f.medikament || '', id: t.id, c: 'warn', cat: 'behandlung' });
    if (!l) continue;
    if (l.status === 'Besamt') {
      it.push({ d: l.erwartet, k: 'Gepl. Abkalbung', n, alp: inAlp(l.erwartet), id: t.id, c: inAlp(l.erwartet) ? 'red' : 'green', cat: 'abkalbung' });
      const k = addDays(l.bes.datum, 21); if (k >= addDays(d, -2)) it.push({ d: k, k: 'Brunstkontrolle', n, id: t.id, c: 'blue', cat: 'zucht' });
    } else {
      const br = evOf(t.id, 'brunst').filter(e => !l.cal || e.datum > l.cal.datum).pop();
      if (br) { let nx = addDays(br.datum, 21); while (nx < addDays(d, -1)) nx = addDays(nx, 21); it.push({ d: nx, k: 'Gepl. Brunst', n, verbot: imVerbot(nx), id: t.id, c: imVerbot(nx) ? 'red' : 'blue', cat: 'zucht' }); }
    }
  }
  for (const y of [+d.slice(0, 4), +d.slice(0, 4) + 1]) { const [a, b] = alpFenster(y); const ist = alpIst()[String(y)]; if (!ist) it.push({ d: a, k: 'Gepl. Alpauffahrt', n: '', c: 'grey', cat: 'auslauf' }); if (!ist || !ist[1]) it.push({ d: b, k: 'Gepl. Alpabfahrt', n: '', c: 'grey', cat: 'auslauf' }); }
  for (const y of [+d.slice(0, 4), +d.slice(0, 4) + 1]) {
    it.push(...pzRegeln(y));
    for (const { a, d: fd } of aufgabenOffen(y)) it.push({ d: fd, k: a.objekt ? `Labiola ${labName(labNr(a.objekt))}` : 'Labiola', n: labTitel(a, y), c: fd < d ? 'red' : 'warn', keep: fd < d, link: '#/labiola', cat: 'labiola' });
  }
  return it.filter(x => (x.keep || x.d >= addDays(d, -2)) && x.d <= end).sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0);
}
function mmtt(x) { const t = String(x || '').trim(); let m = t.match(/^(\d{1,2})\.(\d{1,2})\.?$/); if (m) return `${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; m = t.match(/^(\d{1,2})-(\d{1,2})$/); return m ? `${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : ''; }
const pzInfo = n => S.parzellen.find(x => x.name === n);
function pzRegeln(y) {
  const out = [];
  for (const o of S.labiola) if (o.szp) out.push({ d: `${y}-${o.szp}`, k: 'Schnitt erlaubt', n: `${labName(o.nr)} (Obj. ${o.nr})`, c: 'green', link: '#/labiola', cat: 'labiola' });
  for (const z of S.parzellen) {
    if (z.schnittAb) out.push({ d: `${y}-${z.schnittAb}`, k: 'Schnitt erlaubt', n: z.name, c: 'green', link: '#/labiola', cat: 'labiola' });
    if (z.fruehBis) out.push({ d: `${y}-${z.fruehBis}`, k: 'Frühschnitt bis', n: z.name, c: 'warn', link: '#/labiola', cat: 'labiola' });
    if (z.schnitt2Ab) out.push({ d: `${y}-${z.schnitt2Ab}`, k: '2. Schnitt erlaubt', n: z.name, c: 'green', link: '#/labiola', cat: 'labiola' });
  }
  return out;
}
function feldWarnung(typ, pz, datum) {
  const z = pzInfo(pz) || {}; if (!pz || !datum) return '';
  const w = [];
  const isD = typ === 'duengung', isS = typ === 'ernte';
  for (const o of S.labiola.filter(o => o.parzelle === pz)) { if (isD && o.duengen !== 'ja') w.push(`Labiola Obj. ${o.nr} (${o.typ || ''}) auf ${pz}: keine Düngung`); if (isS && o.szp && datum.slice(5) < o.szp) w.push(`Labiola Obj. ${o.nr}: Schnitt erst ab ${o.szp.slice(3)}.${o.szp.slice(0, 2)}.`); }
  if (isD && z.duengen === 'nein') w.push(`Düngung auf ${z.name} nicht erlaubt (${z.programm || 'Vertrag'})`);
  if (isS && z.schnittAb && datum.slice(5) < z.schnittAb) w.push(`Frühester Schnitt auf ${z.name}: ${z.schnittAb.slice(3)}.${z.schnittAb.slice(0, 2)}.`);
  return w.map(x => `<div class="note" style="margin-top:6px"><b>Achtung:</b> ${esc(x)}</div>`).join('');
}
// Freigabe Fleisch = letzter Behandlungstag (Bis, sonst Von) + Absetzfrist Fleisch
const freiCalc = b => b.datum ? addDays(b.bis && b.bis > b.datum ? b.bis : b.datum, num(b.frist)) : '';
function behFreiKorr() { if (!S.loaded.behandlungen) return; for (const b of S.behandlungen) { const f = freiCalc(b); if (f && b.freiAb !== f) put('behandlungen', { ...b, freiAb: f }); } }
const alleTiere = (ids = [], d = today()) => { const a = aktiveTiere(d); return a.length > 1 && a.every(t => ids.includes(t.id)); };
function frist(tid, d = today()) {
  return S.behandlungen.filter(b => (b.tierIds || []).includes(tid) && b.freiAb && b.freiAb > d).sort((a, b) => a.freiAb < b.freiAb ? 1 : -1)[0];
}
function lager() {
  const L = { heu: num(S.set.startHeu), silo: num(S.set.startSilo), stroh: num(S.set.startStroh) }, K = { Heu: 'heu', Silage: 'silo', Stroh: 'stroh' };
  for (const f of S.feld) { const k = K[f.was]; if (!k) continue; if (f.typ === 'ernte' || f.typ === 'kauf') L[k] += num(f.menge); if (f.typ === 'verbrauch') L[k] -= num(f.menge); }
  return L;
}
function kpis(list = aktiveTiere()) {
  const k = { Kalb: 0, Rind: 0, Kuh: 0, Unbesamt: 0, Besamt: 0, Abgekalbt: 0 };
  for (const t of list) { k[kategorie(t)]++; const l = lakt(t); if (l) k[l.status]++; }
  return k;
}
function sortedAuslauf() { return [...S.auslauf].sort((a, b) => a.datum !== b.datum ? (a.datum < b.datum ? -1 : 1) : (a.geaendert || 0) - (b.geaendert || 0)); }
const ausKey = a => [a.typ, a.typ === 'Weide' ? a.parzelle || '' : '', a.typ === 'Laufhof' ? a.grund || '' : ''].join('|');
// Aufeinanderfolgende gleiche Einträge zusammenfassen, bei gleichem Datum gilt der zuletzt erfasste
let ausMemo = '';
function auslaufBereinigen() {
  if (!S.loaded || !S.loaded.auslauf) return;
  const k = S.auslauf.map(a => a.id + a.datum + (a.geaendert || '')).join(); if (k === ausMemo) return; ausMemo = k;
  const sl = sortedAuslauf(); let prev = null;
  sl.forEach((a, i) => {
    const nx = sl[i + 1];
    if (nx && nx.datum === a.datum) { del('auslauf', a.id); return; }
    if (prev && ausKey(prev) === ausKey(a)) { if (a.notiz && !(prev.notiz || '').includes(a.notiz)) { prev.notiz = [prev.notiz, a.notiz].filter(Boolean).join(' · '); put('auslauf', prev); } del('auslauf', a.id); return; }
    prev = a;
  });
}
function herdeAm(d = today(), list = sortedAuslauf()) { let best = null; for (const a of list) { if (a.datum > d) break; best = a; } return best; }
const ortTxt = a => !a ? 'Kein Eintrag' : a.typ + (a.typ === 'Weide' && a.parzelle ? ' · ' + a.parzelle : (a.typ === 'Stall' || a.typ === 'Laufhof') && a.grund ? ' · ' + a.grund : a.ort ? ' · ' + a.ort : '');
function ortAm(tid, d, list = sortedAuslauf()) { let best = null; for (const a of list) { if (a.datum > d) break; if ((a.tierIds || []).includes(tid)) best = a; } return best; }

/* ---------- Router ---------- */
let rq = false;
function schedule() { if (rq) return; rq = true; requestAnimationFrame(() => { rq = false; render(); }); }
const UI = { tierFilter: { kat: '', lakt: '', q: '', sort: 'alter', abg: false }, jTab: '', lTab: 'pendenzen', lPz: '', lAlle: false, lJahr: '', lOpen: '', kalMonat: today().slice(0, 7), kalTag: '', fTab: 'austrag', jahr: String(new Date().getFullYear()) };

function render() {
  if (mode === 'firebase' && !USER) return;
  feldMigration(); auslaufBereinigen(); lagerKorrektur(); behFreiKorr(); labiolaSeed(); if (!SENS.zuletzt) setTimeout(() => sensorenLaden(), 0);
  if (document.querySelector('.sheet.show [data-dirty="1"]')) return; // Formular offen und bearbeitet: nicht neu zeichnen
  const h = location.hash.replace(/^#\/?/, '') || 'start';
  const p = h.split('/');
  const view = $('#view');
  const back = $('#back');
  let title = 'hofbuech', html = '', tab = p[0], showBack = false;
  try {
    if (p[0] === 'start') { title = S.set.hofname || 'hofbuech'; html = vStart(); }
    else if (p[0] === 'tiere') { title = 'Tiere'; html = vTiere(); }
    else if (p[0] === 'tier') { const t = tierById(p[1]); showBack = true; tab = 'tiere'; if (!t) { html = '<div class="empty">Tier nicht gefunden.</div>'; } else if (p[2] === 'laktation') { title = 'Laktationsplanung'; html = vLaktation(t); } else if (p[2] === 'nachkommen') { title = 'Nachkommen'; html = vNachkommen(t); } else if (p[2] === 'behandlungen') { title = 'Behandlungen'; html = vTierBeh(t); } else { title = t.name || t.ohrmarke; html = vTier(t); } }
    else if (p[0] === 'journale') { title = 'Analyse'; if (p[1] !== undefined) UI.jTab = p[1]; html = vJournale(); }
    else if (p[0] === 'feld') { title = 'Analyse'; UI.jTab = 'lager'; tab = 'journale'; html = vJournale(); }
    else if (p[0] === 'labiola') { title = 'Labiola'; html = vLabiola(); }
    else if (p[0] === 'notizen') { title = 'Notizen'; html = vNotizen(); }
    else if (p[0] === 'notiz') { const n = S.notizen.find(x => x.id === p[1]); title = n ? n.titel : 'Notiz'; tab = 'notizen'; showBack = true; html = n ? vNotiz(n) : '<div class="empty">Notiz nicht gefunden.</div>'; }
    else if (p[0] === 'meldung') { title = S.set.hofname || 'hofbuech'; tab = 'start'; html = vStart(); const m = S.meldungen.find(x => x.id === p[1]); if (m && !UI.mOpen) { UI.mOpen = 1; setTimeout(() => { meldungSheet(m); history.replaceState(null, '', '#/start'); UI.mOpen = 0; }, 50); } }
    else if (p[0] === 'kalender') { title = 'Kalender'; html = vKalender(); }
    else if (p[0] === 'analyse') { title = 'Analyse'; tab = 'journale'; html = vJournale(); }
    else if (p[0] === 'einstellungen') { title = 'Einstellungen'; html = vSettings(); showBack = true; tab = ''; }
    else { html = vStart(); tab = 'start'; }
  } catch (e) { console.error(e); html = `<div class="note">Anzeigefehler: ${esc(e.message)}</div>`; }
  $('#title').textContent = title;
  $('#hlogo').classList.toggle('hidden', p[0] !== 'start' && h !== 'start');
  back.classList.toggle('hidden', !showBack);
  $$('#tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  const sx = window.scrollY, same = view.dataset.route === h;
  view.innerHTML = errBanner() + html; view.dataset.route = h;
  if (same) window.scrollTo(0, sx);
  afterRender();
}
let leafletP = null, karteMap = null;
function leafletLaden() { if (!leafletP) leafletP = (async () => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'vendor/leaflet/leaflet.css'; document.head.appendChild(l); await loadScript('vendor/leaflet/leaflet.js'); })(); return leafletP; }
const geoLL = z => { try { return JSON.parse(z.geo).map(r => r.map(([x, y]) => [y, x])); } catch (e) { return null; } };
async function miniKarte(el, zz) {
  const zs = (Array.isArray(zz) ? zz : [zz]).filter(z => z && z.geo);
  await leafletLaden();
  const map = L.map(el, { zoomControl: false, attributionControl: false, dragging: true });
  L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg', { maxZoom: 20, maxNativeZoom: 19 }).addTo(map);
  for (const o of S.parzellen) { const ll = o.geo && !istArchiv(o) && geoLL(o); if (ll && !zs.includes(o)) L.polygon(ll, { color: '#fff', weight: 1, fillOpacity: 0.05 }).addTo(map); }
  const grp = L.featureGroup().addTo(map);
  for (const z of zs) { const ll = geoLL(z); if (ll) L.polygon(ll, { color: '#F2C14E', weight: 3, fillColor: '#F2C14E', fillOpacity: 0.4 }).addTo(grp).bindTooltip(esc(pzKurz(z.name)), { permanent: true, direction: 'center', className: 'pzlabel' }); }
  if (!grp.getLayers().length) return;
  setTimeout(() => { map.invalidateSize(); map.fitBounds(grp.getBounds(), { padding: [30, 30], maxZoom: 18 }); }, 250);
}
async function karteZeichnen() {
  const el = $('#karte'); if (!el) return;
  await leafletLaden();
  if (!document.body.contains(el)) return;
  if (karteMap) { try { karteMap.remove(); } catch (e) { } }
  const map = karteMap = L.map(el, { zoomControl: false, attributionControl: true });
  L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg', { maxZoom: 20, maxNativeZoom: 19, attribution: '© swisstopo' }).addTo(map);
  const grp = L.featureGroup().addTo(map);
  const y = String(new Date().getFullYear());
  const filt = !!el.dataset.filter;
  for (const z of [...S.parzellen].sort((a, b) => (istObjekt(a) ? 1 : 0) - (istObjekt(b) ? 1 : 0))) {
    if (!z.geo) continue;
    if ((!filt && istObjekt(z)) || istArchiv(z)) continue;
    let rings; try { rings = JSON.parse(z.geo); } catch (e) { continue; }
    const lab = z.programm === 'Labiola', hecke = z.nutzung === 'Hecke';
    const col = hecke ? '#7A5A2E' : lab ? '#F2C14E' : '#FFFFFF';
    const poly = L.polygon(rings.map(r => r.map(([x, yy]) => [yy, x])), { color: col, weight: 2, fillColor: col, fillOpacity: lab ? 0.28 : 0.12 }).addTo(grp);
    const f = S.feld.filter(x => x.parzelle === z.name && (x.datum || '').startsWith(y)).sort((a, b) => a.datum < b.datum ? 1 : -1).slice(0, 3);
    const md = v => v ? `${v.slice(3)}.${v.slice(0, 2)}.` : '';
    if (filt) {
      const sel = UI.lPz === z.name, obj = istObjekt(z), oc = z.nutzung === 'Hecke' ? '#8B5A2B' : z.nutzung === 'Bäume' ? '#3E7D3A' : '#D9822B';
      poly.setStyle(obj ? { color: oc, weight: 2, fillColor: oc, fillOpacity: 0.35, dashArray: z.nutzung === 'Bäume' ? '5 4' : null } : { color: '#FFFFFF', weight: 2, fillColor: '#FFFFFF', fillOpacity: 0.12 });
      if (sel) poly.setStyle({ color: '#E08A1E', weight: 4, fillColor: '#E08A1E', fillOpacity: 0.5 }); else if (UI.lPz) poly.setStyle({ fillOpacity: 0.06, opacity: 0.5 });
      if (obj) poly.bringToFront();
      poly.on('click', e => { L.DomEvent.stopPropagation(e); UI.lPz = sel ? '' : z.name; UI.lOpen = ''; render(); });
      poly.bindTooltip(esc(pzKurz(z.name)), { permanent: !obj || sel, direction: 'center', className: obj ? 'pzlabel obj' : 'pzlabel' });
      continue;
    }
    poly.bindPopup(`<b>${esc(z.name)}</b><br>${nf(num(z.ha))} ha${z.programm ? ' · ' + esc(z.programm) : ''}${z.schnittAb ? '<br>Schnitt ab ' + md(z.schnittAb) : ''}${z.fruehBis ? '<br>Frühschnitt bis ' + md(z.fruehBis) : ''}${z.duengen === 'nein' ? '<br>keine Düngung' : ''}${f.length ? '<br><small>' + f.filter(x => FELD[x.typ]).map(x => fmtS(x.datum) + ' ' + fL(x)).join('<br>') + '</small>' : ''}`);
    poly.bindTooltip(esc(z.name.replace(/\s*\(.*\)/, '')), { permanent: !hecke && num(z.ha) > 0.1, direction: 'center', className: 'pzlabel' });
  }
  if (grp.getLayers().length) { map.fitBounds(grp.getBounds(), { padding: [8, 8] }); setTimeout(() => { if (!document.body.contains(el)) return; map.invalidateSize(); map.fitBounds(grp.getBounds(), { padding: [8, 8] }); }, 350); }
}
function afterRender() {
  karteZeichnen();
  const sc = $('.tl-scroll');
  if (sc && sc.dataset.today && !sc.dataset.done) { sc.scrollLeft = Math.max(0, +sc.dataset.today - sc.clientWidth * 0.45); sc.dataset.done = 1; }
}

/* ---------- Views ---------- */
function kpiBlock(k, link = false, L = null) {
  const c = (key, label) => link
    ? `<button type="button" class="stat ${UI.tierFilter.kat === key || UI.tierFilter.lakt === key ? 'sel' : ''}" data-act="filt" data-v="${key}"><b>${k[key]}</b><span>${label}</span></button>`
    : `<a class="stat" href="#/tiere" data-act="filtlink" data-v="${key}"><b>${k[key]}</b><span>${label}</span></a>`;
  const ls = (v, l) => `<a class="stat ${v <= 5 ? 'low' : ''}" href="#/journale/lager"><b>${nf(v)}</b><span>${l}</span></a>`;
  const sw = id => { const x = S.sensoren.find(s => s.id === id), p = x && x.last ? x.last.prozent : null; return `<a class="stat ${p !== null && p !== undefined && p < 30 ? 'low' : ''} ${SENS.laedt ? 'laedt' : ''}" href="#/journale/${id}"><b>${SENS.laedt ? '<i class="ld"></i>' : p === null || p === undefined ? '-' : Math.round(p) + '%'}${!SENS.laedt && x && x.fehlerSeit ? '<i class="fx" title="Sensor liefert Fehlmessungen">!</i>' : ''}</b><span>${id === 'wasserstand' ? 'Wasserstand' : 'Tränkefass'}</span></a>`; };
  const lg = L ? `<div class="stats-row"><span class="stats-h">Lager</span>${ls(L.heu, 'Heu')}${ls(L.silo, 'Silage')}${ls(L.stroh, 'Stroh')}</div><div class="stats-row two"><span class="stats-h">Wasser</span>${sw('wasserstand')}${sw('traenkefass')}</div>${ausbKpi()}` : '';
  const lk = '';
  return `<div class="stats"><div class="stats-row"><span class="stats-h">Bestand</span>${c('Kalb', 'Kälber')}${c('Rind', 'Rinder')}${c('Kuh', 'Kühe')}</div>${lk}${lg}</div>`;
}
function herdeBanner() {
  const a = herdeAm(), ic = !a ? '?' : a.typ === 'Weide' ? IC.heuen : a.typ === 'Alp' ? I('<path d="M3 20l6-10 4 6 3-4 5 8z"/>') : I('<path d="M4 11l8-7 8 7v9H4z"/>');
  return `<button type="button" class="herde ${a ? a.typ.toLowerCase() : ''}" data-act="form" data-f="auslauf"><span class="herde-ic">${ic}</span><span class="herde-t"><b>${esc(ortTxt(a))}</b><small>${a ? 'Herde seit ' + fmt(a.datum) + ' · ' + diff(a.datum, today()) + ' T.' : 'Auslaufjournal: ersten Eintrag erfassen'}</small></span><span class="herde-go">Wechseln</span></button>`;
}
const IC_VERBOT = '<svg class="mini" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#A3312A" stroke-width="2.4" aria-label="Besamungsverbot"><circle cx="12" cy="12" r="9"/><path d="M5.6 18.4L18.4 5.6"/></svg>';
const IC_ALP = '<svg class="mini" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#8A4B12" stroke-width="2.2" stroke-linejoin="round" aria-label="Alp"><path d="M2 20l7-12 4 6 3-4 6 10z"/></svg>';
function itemRow(x, rel = true) {
  const href = x.id ? `#/tier/${x.id}` : x.link || '';
  const tag = href ? `a href="${href}"` : 'div';
  const head = x.k ? (x.n ? `${x.k}: ${x.n}` : x.k) : (x.n || x.t || '');
  const right = rel ? relTag(x.d) : `${x.d.slice(8, 10)}.${x.d.slice(5, 7)}.`;
  return `<${tag} class="row one"><i class="bar ${x.c}"></i><div class="main"><span class="t1"><span class="hd">${esc(head)}</span>${x.verbot ? IC_VERBOT : ''}${x.alp ? IC_ALP : ''}${x.plan ? '<span class="pr">Prognose</span>' : ''}${x.s ? ` <span class="ex">${esc(x.s)}</span>` : ''}</span></div><small class="rt">${right}</small></${href ? 'a' : 'div'}>`;
}
function agendaRows(items) { return items.map(x => itemRow(x)).join(''); }
function vStart() {
  const k = kpis(), L = lager();
  if (!S.tiere.length) {
    return `${kpiBlock(k, false, L)}
    <div class="card" style="margin-top:16px"><b>Los geht's</b><p class="muted" style="margin:6px 0 12px">Tiere über den + Button erfassen.</p><div class="btns"><button class="btn pri" data-act="form" data-f="zugang">Tier erfassen</button></div></div>`;
  }
  const all = agenda(60), late = all.filter(x => x.keep), ag = all.filter(x => !x.keep);
  const offen = aktiveTiere().filter(t => { const l = lakt(t), m = alterMt(t); return l && l.status === 'Unbesamt' && (m === null || m >= S.set.unbesamtAb); });
  const band = offen.length ? `<a class="band" href="#/tiere" data-act="filtlink" data-v="Unbesamt"><b>${offen.length} ${offen.length === 1 ? 'Tier' : 'Tiere'} zum Besamen offen</b><span>${esc(offen.map(t => t.name || t.ohrmarke).join(', '))}</span></a>` : '';
  const neu = S.meldungen.filter(m => !m.status).sort((a, b) => a.zeit < b.zeit ? 1 : -1);
  const kam = neu.length ? `<button type="button" class="band blue" data-act="meldung" data-id="${neu[0].id}"><b>${neu.length} Kamera-${neu.length === 1 ? 'Meldung' : 'Meldungen'} (CowCatcher)</b><span>${esc(neu[0].kamera || '')} · ${esc((neu[0].zeit || '').replace('T', ' ').slice(0, 16))}</span></button>` : '';
  const lateRow = late.length ? `<a class="row one" href="#/labiola"><i class="bar red"></i><div class="main"><span class="t1"><span class="hd">${late.length} Labiola-Pendenzen überfällig</span></span></div><small class="rt">›</small></a>` : '';
  return `${wetterZeile()}${kam}${band}${herdeBanner()}${kpiBlock(k, false, L)}
  <div class="sec-t">Demnächst (60 Tage)</div>
  <div class="list">${lateRow}${ag.length ? agendaRows(ag) : '<div class="empty">Nichts geplant. Brunst und Besamung erfassen, dann erscheinen hier die nächsten Termine.</div>'}</div>`;
}
function lagerKpi(L) {
  const c = (v, l) => `<span class="stat ${v <= 5 ? 'low' : ''}"><b>${nf(v)}</b><span>${l}</span></span>`;
  return `<div class="stats"><div class="stats-row"><span class="stats-h">Lager</span>${c(L.heu, 'Heuballen')}${c(L.silo, 'Silageballen')}${c(L.stroh, 'Stroh Kleinb.')}</div></div>`;
}
function vTiere() {
  const F = UI.tierFilter, d = today();
  let list = F.abg ? S.tiere.filter(t => !aktiv(t)) : aktiveTiere();
  const k = kpis(aktiveTiere());
  if (F.kat) list = list.filter(t => kategorie(t) === F.kat);
  if (F.lakt) list = list.filter(t => { const l = lakt(t); return l && l.status === F.lakt; });
  if (F.q) { const q = F.q.toLowerCase(); list = list.filter(t => (t.name || '').toLowerCase().includes(q) || (t.ohrmarke || '').toLowerCase().includes(q)); }
  const sorters = {
    name: sortName,
    ohrmarke: (a, b) => (a.ohrmarke || '').localeCompare(b.ohrmarke || ''),
    alter: (a, b) => (a.geburt || '9') < (b.geburt || '9') ? -1 : 1,
    abkalbung: (a, b) => { const x = (lakt(a) || {}).erwartet || '9999', y = (lakt(b) || {}).erwartet || '9999'; return x < y ? -1 : x > y ? 1 : 0; }
  };
  list.sort(sorters[F.sort] || sortName);
  const tlTiere = list.filter(t => lakt(t));
  return `${kpiBlock(k, true)}
  <div class="toolbar">
    <select class="sel" data-act="sort" aria-label="Sortierung">${[['alter', 'Alter (älteste zuerst)'], ['name', 'Name'], ['ohrmarke', 'Ohrmarke'], ['abkalbung', 'Nächste Abkalbung']].map(([v, l]) => `<option value="${v}" ${F.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    ${F.kat || F.lakt || F.q ? '<button type="button" class="chip" data-act="reset">Filter löschen</button>' : ''}
  </div>
  ${tlTiere.length ? `<div class="sec-t">Zeitachse (heute ±365 Tage)</div>${timeline(tlTiere)}` : ''}
  <div class="sec-t">${list.length} Tiere</div>
  <div class="list">${list.length ? list.map(t => tierRow(t, d)).join('') : '<div class="empty">Keine Tiere.</div>'}</div>`;
}
function tierRow(t, d = today()) {
  const l = lakt(t), f = frist(t.id), kat = kategorie(t);
  const sub = [kat + (l && l.status === 'Besamt' ? ' (tragend)' : ''), alterTxt(alterMt(t))].filter(Boolean).join(' · ');
  let pill = '';
  if (!aktiv(t)) pill = `<span class="pill grey">${esc(t.abgangGrund || 'Abgang')} ${fmtS(t.abgang)}</span>`;
  else if (f) pill = `<span class="pill warn">Frist ${fmtS(f.freiAb)}</span>`;
  else if (l) pill = l.status === 'Besamt' ? `<span class="pill ${inAlp(l.erwartet) ? 'red' : 'blue'}">Abk. ${fmtS(l.erwartet)}</span>` : l.status === 'Abgekalbt' ? `<span class="pill">Abgekalbt</span>` : `<span class="pill grey">Unbesamt</span>`;
  const m = alterMt(t);
  const hl = aktiv(t) && l && ((l.status === 'Unbesamt' && (m === null || m >= S.set.unbesamtAb)) || (l.status === 'Besamt' && diff(d, l.erwartet) <= S.set.baldTage));
  const trg = l && l.status === 'Besamt';
  return `<a class="row ${hl ? 'hl' : ''}" href="#/tier/${t.id}"><span class="av ${kat.toLowerCase()}">${TIC[kat]}${trg ? '<i class="trg" title="tragend"></i>' : ''}</span><div class="main"><span class="t">${esc(t.name || t.ohrmarke)}${t.ohrmarke ? ` <span class="om">${kurzOM(t.ohrmarke)}</span>` : ''}${t.geschlecht === 'm' ? ' <span class="om">♂</span>' : ''}</span><span class="s">${esc(sub)}</span></div>${pill}</a>`;
}
function timeline(tiere) {
  const d = today(), start = addDays(d, -365), end = addDays(d, 365);
  const NW = 64, W = 360, ppd = (W - NW - 4) / 730, rowH = 22, head = 18, H = head + tiere.length * rowH;
  const x = s => NW + Math.round(diff(start, s) * ppd * 10) / 10;
  const clip = (a, b) => [a < start ? start : a, b > end ? end : b];
  const tip = t => ` data-tip="${esc(t)}"`;
  let g = '';
  const y0 = +start.slice(0, 4), y1 = +end.slice(0, 4) + 1;
  for (let y = y0; y <= y1; y++) {
    for (let [a, b] of verbotSegmente(y)) if (b >= start && a <= end) { [a, b] = clip(a, b); g += `<rect x="${x(a)}" y="${head}" width="${x(b) - x(a)}" height="${H - head}" fill="url(#hatch)"${tip('Besamungsverbot ' + fmt(a) + ' – ' + fmt(b) + ' (Abkalbung fiele in die Alpzeit)')}/>`; }
    let [a, b] = alpFenster(y);
    if (b >= start && a <= end) { [a, b] = clip(a, b); g += `<rect x="${x(a)}" y="${head}" width="${x(b) - x(a)}" height="${H - head}" fill="#CFE3D5" opacity=".7"${tip('Alpzeit ' + fmt(a) + ' – ' + fmt(b))}/>`; }
  }
  const m0 = pd(start); m0.setDate(1); m0.setMonth(m0.getMonth() + 1);
  for (let m = new Date(m0); iso(m) <= end; m.setMonth(m.getMonth() + 1)) {
    const s = iso(m), xx = x(s);
    g += `<line x1="${xx}" x2="${xx}" y1="${head - 4}" y2="${H}" stroke="${m.getMonth() === 0 ? '#C9CCC6' : '#EEF0EC'}" stroke-width=".6"/>${m.getMonth() % 3 === 0 ? `<text x="${xx + 1.5}" y="${head - 6}" font-size="7.5" fill="#59605B">${m.getMonth() === 0 ? "'" + String(m.getFullYear()).slice(2) : MON[m.getMonth()]}</text>` : ''}`;
  }
  tiere.forEach((t, i) => {
    const cy = head + i * rowH + rowH / 2;
    g += `<line x1="0" x2="${W}" y1="${head + (i + 1) * rowH}" y2="${head + (i + 1) * rowH}" stroke="#EEF0EC" stroke-width=".6"/><a href="#/tier/${t.id}"><text x="4" y="${cy + 3.5}" font-size="10" font-weight="600" fill="#16201B">${esc((t.name || kurzOM(t.ohrmarke)).slice(0, 11))}</text></a>`;
    for (const e of evOf(t.id)) {
      if (e.datum < start || e.datum > end) continue;
      const xx = x(e.datum);
      if (e.typ === 'brunst') g += `<rect x="${xx - 3}" y="${cy - 7}" width="6" height="14" fill="transparent"${tip('Brunst ' + fmt(e.datum))}/><line x1="${xx}" x2="${xx}" y1="${cy - 6}" y2="${cy + 6}" stroke="#B8641A" stroke-width="1.8" pointer-events="none"/>`;
      if (e.typ === 'besamung') g += `<circle cx="${xx}" cy="${cy}" r="3.6" fill="${imVerbot(e.datum) ? '#A12A1F' : '#1D4F91'}"${tip('Besamung ' + fmt(e.datum) + (e.stier ? ' · ' + e.stier : '') + (imVerbot(e.datum) ? ' (im Besamungsverbot)' : ''))}/>`;
      if (e.typ === 'abkalbung') g += `<path d="M${xx} ${cy - 5.5}L${xx + 5.5} ${cy + 4.5}L${xx - 5.5} ${cy + 4.5}Z" fill="#1F4D36"${tip('Abkalbung ' + fmt(e.datum))}/>`;
    }
    const l = lakt(t);
    if (l && l.status === 'Besamt' && l.erwartet <= end) {
      const xx = x(l.erwartet), bad = inAlp(l.erwartet);
      g += `<line x1="${x(l.bes.datum)}" x2="${xx}" y1="${cy}" y2="${cy}" stroke="${bad ? '#A12A1F' : '#1D4F91'}" stroke-dasharray="2 2" opacity=".6" pointer-events="none"/><path d="M${xx} ${cy - 5.5}L${xx + 5.5} ${cy + 4.5}L${xx - 5.5} ${cy + 4.5}Z" fill="#fff" stroke="${bad ? '#A12A1F' : '#1F4D36'}" stroke-width="1.6"${tip('Erwartete Abkalbung ' + fmt(l.erwartet) + (bad ? ' (während Alp!)' : ''))}/>`;
    }
  });
  const tx = x(d);
  g += `<line x1="${tx}" x2="${tx}" y1="${head - 4}" y2="${H}" stroke="#1A1F1C" stroke-width="1.2" pointer-events="none"/><line x1="${NW - 2}" x2="${NW - 2}" y1="0" y2="${H}" stroke="#E2E4DF"/>`;
  return `<div class="tl"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Zeitachse Besamung und Abkalbung, Symbole antippen"><defs><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#F8E1DE"/><line x1="0" y1="0" x2="0" y2="5" stroke="#E3A79F" stroke-width="1.6"/></pattern></defs>${g}</svg></div>
  <p class="small muted" style="margin:6px 4px">Symbol antippen für Details.</p>`;
}
function vTier(t) {
  const l = lakt(t), f = frist(t.id), m = alterMt(t);
  const mutter = t.mutterId ? tierById(t.mutterId) : null;
  const kinder = S.tiere.filter(x => x.mutterId === t.id);
  const ev = evOf(t.id).filter(e => ['abkalbung', 'besamung', 'brunst'].includes(e.typ));
  const beh = S.behandlungen.filter(b => (b.tierIds || []).includes(t.id));
  return `
  ${f ? `<div class="note" style="margin-top:8px"><b>Absetzfrist läuft</b> bis ${fmt(f.freiAb)} (${esc(f.medikament)})</div>` : ''}
  ${!aktiv(t) ? `<div class="note blue" style="margin-top:8px">Abgang ${fmt(t.abgang)} · ${esc(t.abgangGrund || '')}</div>` : ''}
  <div class="card" style="margin-top:8px"><dl class="info">
    <dt>Name</dt><dd>${esc(t.name || '-')}</dd>
    <dt>Ohrmarke</dt><dd class="num">${esc(t.ohrmarke || '-')}</dd>
    <dt>Mutter</dt><dd>${mutter ? `<a href="#/tier/${mutter.id}">${esc(mutter.name || mutter.ohrmarke)}</a>` : esc(t.mutterName || '-')}</dd>
    <dt>Geburtsdatum</dt><dd>${fmt(t.geburt) || '-'}${m !== null ? ` <span class="muted small">(${alterTxt(m)})</span>` : ''}</dd>
    <dt>Zugangsdatum</dt><dd>${fmt(t.zugang) || '-'}</dd>
    <dt>Geschlecht</dt><dd>${t.geschlecht === 'm' ? 'männlich' : 'weiblich'}${t.rasse ? ' · ' + esc(t.rasse) : ''}</dd>
    <dt>Kategorie</dt><dd>${kategorie(t)}</dd>
    ${l ? `<dt>Status</dt><dd>${l.status}${l.status === 'Besamt' ? `<br><span class="small ${inAlp(l.erwartet) ? '' : 'muted'}" style="${inAlp(l.erwartet) ? 'color:var(--red)' : ''}">Abkalbung ca. ${fmt(l.erwartet)}${inAlp(l.erwartet) ? ' (während Alp!)' : ''}</span>` : ''}</dd>` : ''}
  </dl>${t.notiz ? `<p class="small muted" style="margin:10px 0 0">${esc(t.notiz)}</p>` : ''}</div>
  <div class="btnlist" style="margin-top:12px">
    <a class="btnrow" href="#/tier/${t.id}/laktation"><span>Laktationsplanung</span><span class="muted">${ev.length} ›</span></a>
    <a class="btnrow" href="#/tier/${t.id}/nachkommen"><span>Nachkommen</span><span class="muted">${kinder.length} ›</span></a>
    <a class="btnrow" href="#/tier/${t.id}/behandlungen"><span>Behandlungen</span><span class="muted">${beh.length} ›</span></a>
  </div>
  <div class="btns" style="margin-top:12px"><button class="btn" data-act="edit" data-c="tiere" data-id="${t.id}">Bearbeiten</button></div>
  <p class="small muted" style="margin:10px 4px">Neue Einträge für ${esc(t.name || 'dieses Tier')}: unten auf + tippen, das Tier ist vorausgewählt.</p>`;
}
function evLabel(e) {
  if (e.typ === 'abkalbung') { const k = e.kalbId ? tierById(e.kalbId) : null; const kn = k ? (k.geschlecht === 'm' ? '♂ ' : '♀ ') + (k.name || k.ohrmarke) : e.kalbName ? (e.kalbGeschlecht === 'm' ? '♂ ' : '♀ ') + e.kalbName : ''; return [e.totgeburt ? 'Abkalbung (Totgeburt)' : 'Abkalbung', [kn, e.verlauf, e.lage, e.groesse ? 'Kalb ' + e.groesse : '', e.notiz].filter(Boolean).join(' · ')]; }
  if (e.typ === 'besamung') return ['Besamung', [e.stier, e.notiz].filter(Boolean).join(' · ')];
  if (e.typ === 'brunst') return ['Brunst', [e.sicherheit, e.notiz].filter(Boolean).join(' · ')];
  return [e.typ, ''];
}
function vLaktation(t) {
  const l = lakt(t);
  const ev = evOf(t.id).filter(e => ['abkalbung', 'besamung', 'brunst'].includes(e.typ)).reverse();
  const cals = evOf(t.id, 'abkalbung');
  let zkz = '';
  if (cals.length > 1) { const zs = cals.slice(1).map((c, i) => diff(cals[i].datum, c.datum)); zkz = `<div class="card" style="margin-top:8px"><span class="muted small">Ø Zwischenkalbezeit</span><br><b>${Math.round(zs.reduce((a, b) => a + b, 0) / zs.length)} Tage</b></div>`; }
  return `<div class="sec-t">${esc(t.name || t.ohrmarke)}</div>
  ${l && l.status === 'Besamt' ? `<div class="note ${inAlp(l.erwartet) ? '' : 'green'}">Erwartete Abkalbung <b>${fmt(l.erwartet)}</b> (besamt ${fmt(l.bes.datum)}, ${S.set.tragzeit} T.)${inAlp(l.erwartet) ? '<br><b>Fällt in die Alpzeit.</b>' : ''}</div>` : l ? `<div class="note blue">Status: ${l.status}${imVerbot(today()) ? '<br>Heute im Besamungsverbot (Abkalbung würde in Alpzeit fallen).' : ''}</div>` : ''}
  ${zkz}
  <div style="height:10px"></div>
  <div class="list">${ev.length ? ev.map(e => { const [a, b] = evLabel(e); return `<button type="button" class="row" data-act="edit" data-c="ereignisse" data-id="${e.id}"><div class="main"><span class="t">${a}</span><span class="s">${esc(b)}</span></div><span class="r">${fmt(e.datum)}</span></button>`; }).join('') : '<div class="empty">Keine Meldungen.</div>'}</div>`;
}
function vNachkommen(t) {
  const k = S.tiere.filter(x => x.mutterId === t.id).sort((a, b) => (a.geburt || '') < (b.geburt || '') ? 1 : -1);
  const ext = evOf(t.id, 'abkalbung').filter(e => !e.kalbId || !tierById(e.kalbId)).reverse();
  return `<div class="sec-t">Nachkommen von ${esc(t.name || t.ohrmarke)}</div><div class="list">${k.map(x => tierRow(x)).join('')}${ext.map(e => `<button type="button" class="row" data-act="edit" data-c="ereignisse" data-id="${e.id}"><span class="av kalb">${TIC.Kalb}</span><div class="main"><span class="t">${esc(e.kalbName || 'Kalb')}${e.kalbOhrmarke ? ` <span class="om">${kurzOM(e.kalbOhrmarke)}</span>` : ''}${e.kalbGeschlecht === 'm' ? ' <span class="om">♂</span>' : ''}</span><span class="s wrap">geb. ${fmt(e.datum)} · ${e.totgeburt ? 'Totgeburt' : 'nicht mehr im Bestand'}${e.notiz ? ' · ' + esc(e.notiz) : ''}</span></div></button>`).join('')}${!k.length && !ext.length ? '<div class="empty">Keine Nachkommen erfasst.</div>' : ''}</div>`;
}
function behRows(list) {
  return list.length ? list.map(b => `<button type="button" class="row" data-act="edit" data-c="behandlungen" data-id="${b.id}"><div class="main"><span class="t">${esc(b.medikament || '-')}${b.grund ? ' · ' + esc(b.grund) : ''}</span><span class="s">${esc(tierListe(b.tierIds, b.datum))} · ${esc([b.menge, b.durch].filter(Boolean).join(' · '))}</span></div><div class="r">${fmt(b.datum)}${b.bis && b.bis !== b.datum ? '<br><span class="small muted">bis ' + fmt(b.bis) + '</span>' : ''}<br>${b.freiAb && b.freiAb > today() ? `<span class="pill warn">frei ab ${fmtS(b.freiAb)}</span>` : `<span class="pill">frei</span>`}</div></button>`).join('') : '<div class="empty">Keine Behandlungen.</div>';
}
function tierListe(ids = [], d) { if (alleTiere(ids, d)) return `Alle Tiere (${ids.length})`; return ids.length > 3 ? `${ids.length} Tiere` : ids.map(tName).join(', '); }
function vTierBeh(t) {
  const list = S.behandlungen.filter(b => (b.tierIds || []).includes(t.id)).sort((a, b) => a.datum < b.datum ? 1 : -1);
  return `<div class="sec-t">${esc(t.name || t.ohrmarke)}</div><div class="btns" style="margin-bottom:12px"><button class="btn" data-act="form" data-f="behandlung" data-tier="${t.id}">+ Behandlung</button><button class="btn" data-act="pdf" data-p="behTier" data-id="${t.id}">PDF</button></div><div class="list">${behRows(list)}</div>`;
}

function jahre(listen) { const s = new Set([String(new Date().getFullYear())]); listen.forEach(l => l.forEach(x => x.datum && s.add(x.datum.slice(0, 4)))); return [...s].sort().reverse(); }
function jahrSel() { return `<select class="sel" data-act="jahr" aria-label="Jahr">${jahre([S.behandlungen, S.auslauf, S.feld]).map(j => `<option ${j === UI.jahr ? 'selected' : ''}>${j}</option>`).join('')}</select>`; }

function vJournale() {
  const SECT = { lager: 'Lager', auslauf: 'Auslaufjournal', behandlung: 'Behandlungsjournal', feld: 'Feldkalender', zucht: 'Zucht', traenkefass: 'Tränkefass', wasserstand: 'Wasserstand', ausbringen: 'Gülle / Mist ausbringen', wetter: 'Agrometeo Analyse' };
  if (!SECT[UI.jTab]) return anaKacheln();
  const tabs = `<div class="anah"><a class="back" href="#/journale/">‹ Übersicht</a><b>${SECT[UI.jTab]}</b></div>`;
  if (UI.jTab === 'auslauf') return tabs + vAuslauf();
  if (UI.jTab === 'feld') return tabs + vFeld();
  if (UI.jTab === 'lager') return tabs + anaLager();
  if (UI.jTab === 'zucht') return tabs + anaZucht();
  if (UI.jTab === 'traenkefass' || UI.jTab === 'wasserstand') return tabs + anaSensor(UI.jTab);
  if (UI.jTab === 'wetter') return tabs + anaWetter();
  if (UI.jTab === 'ausbringen') return tabs + anaAusbringen();
  const list = S.behandlungen.filter(b => (b.datum || '').startsWith(UI.jahr)).sort((a, b) => a.datum < b.datum ? 1 : -1);
  const offen = S.behandlungen.filter(b => b.freiAb && b.freiAb > today());
  return `${tabs}
  ${offen.length ? `<div class="note" style="margin-bottom:12px">${offen.length} laufende Absetzfrist(en), letzte endet ${fmt(offen.map(b => b.freiAb).sort().pop())}</div>` : ''}
  <div class="stats"><div class="stats-row"><span class="stats-h">${UI.jahr}</span><span class="stat"><b>${list.length}</b><span>Behandlungen</span></span><span class="stat"><b>${list.reduce((a, b) => a + (b.tierIds || []).length, 0)}</b><span>Tierbehandl.</span></span><span class="stat"><b>${offen.length}</b><span>Fristen offen</span></span></div></div>
  <div class="toolbar">${jahrSel()}<button class="btn pri" data-act="pdf" data-p="beh">PDF ${UI.jahr}</button></div>
  <div class="list">${behRows(list)}</div>`;
}
function auslaufPerioden() {
  const sl = sortedAuslauf();
  return sl.map((a, i) => ({ a, bis: sl[i + 1] ? sl[i + 1].datum : null })).reverse();
}
function auslaufTage(J) {
  const sl = sortedAuslauf(), out = [];
  const end = J === String(new Date().getFullYear()) ? today() : `${J}-12-31`;
  for (let d = `${J}-01-01`; d <= end; d = addDays(d, 1)) { const a = herdeAm(d, sl); if (a) out.push([d, a]); }
  return out;
}
function vAuslauf() {
  const d = today(), tage = auslaufTage(UI.jahr), sum = {};
  tage.forEach(([, a]) => sum[a.typ] = (sum[a.typ] || 0) + 1);
  const per = auslaufPerioden().filter(p => p.a.datum <= UI.jahr + '-12-31' && (p.bis || '9999') >= UI.jahr + '-01-01');
  const cell = (k) => `<span class="stat"><b>${sum[k] || 0}</b><span>${k}</span></span>`;
  return `${anaAuslaufChart()}
  <div class="stats" style="margin-top:12px"><div class="stats-row four"><span class="stats-h">Tage ${UI.jahr}</span>${cell('Weide')}${cell('Laufhof')}${cell('Alp')}<span class="stat ghost"></span></div></div>
  <div class="toolbar">${jahrSel()}<button class="btn pri" data-act="pdf" data-p="auslaufJahr">PDF ${UI.jahr}</button></div>
  <div class="list">${per.length ? per.map(p => { const dauer = diff(p.a.datum, p.bis || addDays(d, 1)); return `<button type="button" class="row" data-act="edit" data-c="auslauf" data-id="${p.a.id}"><span class="av ${p.a.typ.toLowerCase()}">${esc(p.a.typ.slice(0, 1))}</span><div class="main"><span class="t">${esc(ortTxt(p.a))}</span><span class="s">${fmt(p.a.datum)} – ${p.bis ? fmt(addDays(p.bis, -1)) : 'heute'}</span></div><span class="r"><b>${dauer}</b> T.</span></button>`; }).join('') : '<div class="empty">Keine Einträge in diesem Jahr.</div>'}</div>`;
}
const FELD = { ernte: { l: 'Ernte', g: 'ernte' }, kauf: { l: 'Kauf', g: 'kauf' }, verbrauch: { l: 'Verbrauch', g: 'lager' }, duengung: { l: 'Düngung', g: 'austrag' } };
const FELD_ALT = { guellen: ['duengung', 'Gülle'], misten: ['duengung', 'Mist'], heuen: ['ernte', 'Heu'], silieren: ['ernte', 'Silage'], stroh: ['kauf', 'Stroh'], bezugHeu: ['verbrauch', 'Heu'], bezugSilage: ['verbrauch', 'Silage'], bezugStroh: ['verbrauch', 'Stroh'] };
const fE = f => f.typ === 'duengung' ? (f.was === 'Mist' ? 't' : 'm³') : f.was === 'Stroh' ? 'Kleinballen' : 'Ballen';
const fL = f => `${FELD[f.typ] ? FELD[f.typ].l : f.typ}${f.was ? ' ' + f.was : ''}`;
const fSub = f => f.parzelle || f.verkaeufer || '';
let feldMig = false;
function feldMigration() {
  if (feldMig) return; const alt = S.feld.filter(f => FELD_ALT[f.typ]); if (!alt.length) return; feldMig = true;
  for (const f of alt) { const [typ, was] = FELD_ALT[f.typ]; const n = { ...f, typ, was }; if (f.zweck && f.zweck !== 'Fütterung') n.notiz = [f.zweck, f.notiz].filter(Boolean).join(' · '); delete n.zweck; put('feld', n); }
}
// Einmalige Korrektur: linearer Monatsverbrauch 24.11.2025 - 16.04.2026, Bestand am 16.04.2026 = 0
function lagerKorrektur() {
  if (!S.loaded.feld || !S.loaded.set || S.set.korrLager2026 || S.feld.some(f => f.korr === 'linear2026')) return;
  const VON = '2025-11-24', BIS = '2026-04-16', START = { Heu: S.set.startHeu, Silage: S.set.startSilo, Stroh: S.set.startStroh }, msg = [];
  const daten = []; for (let m = 1; ; m++) { const d = pd(VON); d.setMonth(d.getMonth() + m); if (iso(d) >= BIS) break; daten.push(iso(d)); } daten.push(BIS);
  const total = diff(VON, BIS), anteil = daten.map((d, i) => diff(i ? daten[i - 1] : VON, d) / total);
  for (const was of ['Heu', 'Silage', 'Stroh']) {
    if (S.feld.some(f => f.typ === 'verbrauch' && f.was === was && f.datum >= VON && f.datum <= BIS)) continue;
    const best = num(START[was]) + S.feld.filter(f => f.was === was && f.datum <= BIS).reduce((a, f) => a + (f.typ === 'ernte' || f.typ === 'kauf' ? num(f.menge) : f.typ === 'verbrauch' ? -num(f.menge) : 0), 0);
    if (best <= 0) continue;
    let rest = best;
    daten.forEach((d, i) => { const m = i === daten.length - 1 ? Math.round(rest * 100) / 100 : Math.round(best * anteil[i] * 100) / 100; rest -= m; put('feld', { typ: 'verbrauch', was, datum: d, menge: m, notiz: 'Korrektur linear', korr: 'linear2026' }); });
    msg.push(`${was} ${nf(best)}`);
  }
  W.setSettings({ ...S.set, korrLager2026: today() });
  if (msg.length) toast('Lager korrigiert (linear bis 16.04.2026): ' + msg.join(', '));
}
function verbrauchProTag(was) {
  const d = today(), von = addDays(d, -90), v = S.feld.filter(f => f.typ === 'verbrauch' && f.was === was);
  if (!v.length) return 0;
  const first = v.map(f => f.datum).sort()[0], tage = Math.max(14, diff(first > von ? first : von, d));
  return v.filter(f => f.datum >= von && f.datum <= d).reduce((a, f) => a + num(f.menge), 0) / tage;
}
function reichweite(was, bestand) {
  const r = verbrauchProTag(was); if (!r) return 'kein Verbrauch erfasst';
  const t = Math.floor(bestand / r); if (t <= 0) return 'aufgebraucht';
  return `reicht ca. ${t < 60 ? t + ' Tage' : Math.round(t / 7) + ' Wochen'} (${fmtS(addDays(today(), t))})`;
}
function feldRows(list) {
  const av = g => g === 'austrag' ? 'stall' : g === 'ernte' ? 'weide' : g === 'kauf' ? 'laufhof' : 'alp';
  return list.length ? list.map(f => `<button type="button" class="row" data-act="edit" data-c="feld" data-id="${f.id}"><span class="av ${av(FELD[f.typ].g)}">${IC[f.typ] || ''}</span><div class="main"><span class="t">${esc(fL(f))}</span><span class="s">${esc(fSub(f))}${f.notiz ? (fSub(f) ? ' · ' : '') + esc(f.notiz) : ''}</span></div><div class="r"><b>${f.typ === 'verbrauch' ? '− ' : ''}${nf(num(f.menge))} ${fE(f)}</b><br><span class="small muted">${fmt(f.datum)}</span></div></button>`).join('') : '<div class="empty">Keine Einträge in diesem Jahr.</div>';
}
function vFeld() {
  const list = S.feld.filter(f => (f.datum || '').startsWith(UI.jahr) && (f.typ === 'duengung' || f.typ === 'ernte')).sort((a, b) => a.datum < b.datum ? 1 : -1);
  const sm = (typ, was) => list.filter(f => f.typ === typ && f.was === was).reduce((a, f) => a + num(f.menge), 0);
  return `<div class="stats" style="margin-top:8px"><div class="stats-row four"><span class="stats-h">Total ${UI.jahr}</span><span class="stat"><b>${nf(sm('duengung', 'Gülle'))}</b><span>Gülle m³</span></span><span class="stat"><b>${nf(sm('duengung', 'Mist'))}</b><span>Mist t</span></span><span class="stat"><b>${nf(sm('ernte', 'Heu'))}</b><span>Heu geerntet</span></span><span class="stat"><b>${nf(sm('ernte', 'Silage'))}</b><span>Silage geerntet</span></span></div></div>
  <div class="toolbar">${jahrSel()}<button class="btn pri" data-act="pdf" data-p="feld">PDF ${UI.jahr}</button></div>
  <div class="list">${feldRows(list)}</div>`;
}
function vParzellen() {
  const tabs = '';
  const y = UI.jahr, list = [...S.parzellen].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));
  const tot = list.reduce((a, z) => a + num(z.ha), 0);
  const md = x => x ? `${x.slice(3)}.${x.slice(0, 2)}.` : '';
  return `${tabs}${list.some(z => z.geo) ? '<div id="karte" class="karte"></div>' : ''}<div class="toolbar"><button class="btn pri" data-act="form" data-f="parzelle">+ Parzelle</button><span class="muted small">${list.length} Parzellen · ${nf(tot)} ha</span></div>
  <div class="list">${list.length ? list.map(z => {
    const f = S.feld.filter(x => x.parzelle === z.name && (x.datum || '').startsWith(y));
    const sum = (t, w) => f.filter(x => x.typ === t && x.was === w).reduce((a, x) => a + num(x.menge), 0);
    const info = [z.nutzung, z.ha ? nf(num(z.ha)) + ' ha' : '', z.schnittAb ? 'Schnitt ab ' + md(z.schnittAb) : '', z.fruehBis ? 'Frühschnitt bis ' + md(z.fruehBis) : '', z.duengen === 'nein' ? 'keine Düngung' : ''].filter(Boolean).join(' · ');
    const bil = [sum('duengung', 'Gülle') ? nf(sum('duengung', 'Gülle')) + ' m³ Gülle' : '', sum('duengung', 'Mist') ? nf(sum('duengung', 'Mist')) + ' t Mist' : '', sum('ernte', 'Heu') ? nf(sum('ernte', 'Heu')) + ' Heu' : '', sum('ernte', 'Silage') ? nf(sum('ernte', 'Silage')) + ' Silo' : ''].filter(Boolean).join(' · ');
    return `<button type="button" class="row" data-act="edit" data-c="parzellen" data-id="${z.id}"><span class="av weide">${esc((z.name || '?').slice(0, 1).toUpperCase())}</span><div class="main"><span class="t">${esc(z.name)}${z.programm ? ` <span class="pill ${z.programm === 'Labiola' ? '' : 'blue'}">${esc(z.programm)}</span>` : ''}</span><span class="s">${esc(info || 'keine Auflagen')}</span>${bil ? `<span class="s">${y}: ${esc(bil)}</span>` : ''}</div></button>`;
  }).join('') : '<div class="empty">Noch keine Parzellen. Mit Programm (z.B. Labiola), Schnittzeitpunkt und Düngeverbot erfassen, dann warnt die App beim Güllen und Mähen.</div>'}</div>`;
}

function kalItems(from, to) {
  const it = [];
  for (const e of S.ereignisse) { const [a, b] = evLabel(e); it.push({ d: e.datum, k: a, n: tName(e.tierId), s: b, id: e.tierId, c: e.typ === 'abkalbung' ? 'green' : e.typ === 'besamung' ? 'blue' : 'warn', cat: e.typ === 'abkalbung' ? 'abkalbung' : 'zucht' }); }
  for (const b of S.behandlungen) it.push({ d: b.datum, k: 'Behandlung', n: tierListe(b.tierIds), s: [b.medikament, b.grund, b.menge, b.freiAb ? 'frei ab ' + fmtS(b.freiAb) : ''].filter(Boolean).join(' · '), c: 'red', link: '#/journale', cat: 'behandlung' });
  for (const f of S.feld) if (FELD[f.typ]) it.push({ d: f.datum, k: fL(f), n: fSub(f), s: [num(f.menge) ? nf(num(f.menge)) + ' ' + fE(f) : '', f.notiz].filter(Boolean).join(' · '), c: 'grey', cat: 'feld' });
  for (const a of S.auslauf) it.push({ d: a.datum, k: 'Herde', n: ortTxt(a), s: a.notiz || '', c: 'grey', cat: 'auslauf' });
  for (const t of S.tiere) { if (t.geburt && t.zugang === t.geburt) continue; if (t.zugang) it.push({ d: t.zugang, k: 'Zugang', n: t.name || t.ohrmarke, id: t.id, c: 'grey', cat: 'tiere' }); }
  for (const t of S.tiere) if (t.abgang) it.push({ d: t.abgang, k: 'Abgang', n: t.name || t.ohrmarke, s: t.abgangGrund || '', id: t.id, c: 'grey', cat: 'tiere' });
  for (const a of S.aufgaben) for (const [y, dt] of Object.entries(a.erledigt || {})) it.push({ d: dt, k: 'Erledigt', n: a.titel, s: a.objekt || '', c: 'green', link: '#/labiola', cat: 'labiola' });
  for (const p of S.lprotokoll) it.push({ d: p.datum, k: 'Labiola-Schnitt', n: p.objekt, s: [p.teil, p.art, p.notiz].filter(Boolean).join(' · '), c: 'green', link: '#/labiola', cat: 'labiola' });
  for (const m of S.meldungen) it.push({ d: (m.zeit || '').slice(0, 10), k: 'Kamera', n: m.kamera || 'CowCatcher', s: m.tierName ? 'Brunst ' + m.tierName : '', c: 'blue', cat: 'zucht' });
  it.push(...agenda(800).map(x => ({ ...x, plan: true })));
  const cy = +today().slice(0, 4);
  for (let y = +from.slice(0, 4); y <= +to.slice(0, 4); y++) if (y < cy) it.push(...pzRegeln(y).map(x => ({ ...x, plan: true })));
  return it.filter(x => x.d && x.d >= from && x.d <= to).sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0);
}
function vKalender() {
  const [Y, M] = UI.kalMonat.split('-').map(Number);
  const first = `${UI.kalMonat}-01`, nDays = new Date(Y, M, 0).getDate(), last = `${UI.kalMonat}-${String(nDays).padStart(2, '0')}`;
  const KF = UI.kalFilter || '', items = kalItems(first, last).filter(x => !KF || (KF === 'prognose' ? x.plan : x.cat === KF)), byDay = {};
  items.forEach(x => (byDay[x.d] = byDay[x.d] || []).push(x));
  const off = (new Date(Y, M - 1, 1).getDay() + 6) % 7, t = today();
  let cells = '';
  for (let i = 0; i < off; i++) cells += '<span class="kd empty"></span>';
  for (let d = 1; d <= nDays; d++) {
    const ds = `${UI.kalMonat}-${String(d).padStart(2, '0')}`, ev = byDay[ds] || [];
    const alp = inAlp(ds);
    cells += `<button type="button" class="kd ${ds === t ? 'today' : ''} ${ds === UI.kalTag ? 'sel' : ''} ${alp ? 'alp' : ''}" data-act="kaltag" data-v="${ds}"><span>${d}</span><i>${ev.slice(0, 4).map(x => `<b class="${x.c}${x.plan ? ' plan' : ''}"></b>`).join('')}</i></button>`;
  }
  const show = UI.kalTag && UI.kalTag.startsWith(UI.kalMonat) ? (byDay[UI.kalTag] || []) : items;
  const rows = show.map(x => itemRow(x, false)).join('');
  return `<div class="kal">
    <div class="kal-h"><button type="button" class="iconbtn" data-act="kalmon" data-v="-1" aria-label="Vormonat">‹</button><b>${['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][M - 1]} ${Y}</b><button type="button" class="iconbtn" data-act="kalmon" data-v="1" aria-label="Folgemonat">›</button></div>
    <div class="kal-w"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div>
    <div class="kal-g">${cells}</div>
  </div>
  <div class="chips kf">${[['', 'Alle'], ['zucht', 'Brunst/Besamung'], ['abkalbung', 'Abkalbung'], ['behandlung', 'Behandlung'], ['auslauf', 'Weide / Stall'], ['feld', 'Feldkalender'], ['labiola', 'Labiola'], ['tiere', 'Zu-/Abgang'], ['prognose', 'Prognose']].map(([v, l]) => `<button type="button" class="chip ${KF === v ? 'on' : ''}" data-act="kalfilter" data-v="${v}">${l}</button>`).join('')}</div>
  <div class="sec-t">${UI.kalTag && UI.kalTag.startsWith(UI.kalMonat) ? fmt(UI.kalTag) + ' <a href="#/kalender" data-act="kaltag" data-v="" style="font-weight:500;text-transform:none;letter-spacing:0">ganzer Monat</a>' : 'Ganzer Monat'}</div>
  <div class="list">${rows || '<div class="empty">Keine Einträge.</div>'}</div>`;
}

const chartW = () => { const v = $('#view'); const w = v ? v.clientWidth - 64 : 340; return Math.max(320, Math.min(960, w || 340)); };
function svgBars(series, labels, colors, h = 150) {
  const n = labels.length, W = chartW(), pad = 22, bw = (W - pad) / n;
  const tot = labels.map((_, i) => series.reduce((a, s) => a + (s[i] || 0), 0)), mx = Math.max(1, ...tot);
  let g = '';
  labels.forEach((l, i) => {
    let y = h - 18;
    series.forEach((s, k) => { const v = s[i] || 0, hh = v / mx * (h - 30); if (hh > 0) { y -= hh; g += `<rect x="${pad + i * bw + 2}" y="${y}" width="${bw - 4}" height="${hh}" rx="2" fill="${colors[k]}"><title>${v}</title></rect>`; } });
    g += `<text x="${pad + i * bw + bw / 2}" y="${h - 4}" font-size="9" text-anchor="middle" fill="#5F6862">${l}</text>`;
  });
  g += `<text x="0" y="12" font-size="9" fill="#5F6862">${mx}</text><line x1="${pad}" x2="${W}" y1="${h - 18}" y2="${h - 18}" stroke="#E2E4DF"/>`;
  return `<svg viewBox="0 0 ${W} ${h}" width="100%" role="img" aria-label="Diagramm">${g}</svg>`;
}
const CHARTS = {};
function svgLines(series, labels, colors, h = 150, tips = null, dyn = false, alle = false) {
  const W = chartW(), pad = 26, n = labels.length, all = series.flat().filter(v => v !== null && v !== undefined);
  let mx = Math.max(1, ...all), mn = Math.min(0, ...all);
  if (dyn && all.length) { const a = Math.min(...all), b = Math.max(...all), p = Math.max(1, (b - a) * 0.12); mn = Math.max(0, Math.floor(a - p)); mx = Math.min(100, Math.ceil(b + p)); if (mx - mn < 4) { mn = Math.max(0, mn - 2); mx = mn + 4; } }
  const x = i => pad + i * (W - pad - 6) / Math.max(1, n - 1), y = v => 8 + (mx - v) / (mx - mn || 1) * (h - 30);
  let g = `<line x1="${pad}" x2="${W}" y1="${y(mn > 0 ? mn : 0)}" y2="${y(mn > 0 ? mn : 0)}" stroke="#E2E4DF"/><text x="0" y="12" font-size="9" fill="#5F6862">${nf(mx)}</text>${mn !== 0 || dyn ? `<text x="0" y="${y(mn) - 2}" font-size="9" fill="#5F6862">${nf(mn)}</text>` : ''}`;
  series.forEach((s, k) => { g += `<polyline fill="none" stroke="${colors[k]}" stroke-width="2.2" stroke-linejoin="round" points="${s.map((v, i) => v === null || v === undefined ? '' : `${x(i)},${y(v)}`).filter(Boolean).join(' ')}"/>`; });
  labels.forEach((l, i) => { if (alle || i % Math.ceil(n / 8) === 0) g += `<text x="${x(i)}" y="${h - 4}" font-size="9" text-anchor="middle" fill="#5F6862">${l}</text>`; });
  const id = 'c' + Math.random().toString(36).slice(2, 8);
  CHARTS[id] = { n, W, pad, h, tips: tips || labels.map((l, i) => `${l}: ${series.map(s => s[i] === null || s[i] === undefined ? '-' : nf(s[i])).join(' / ')}`), ys: series.map(s => s.map(v => v === null || v === undefined ? null : y(v))), colors };
  g += `<line class="cur" x1="-10" x2="-10" y1="4" y2="${h - 16}" stroke="#16201B" stroke-width="1" stroke-dasharray="3 3"/><g class="dots"></g>`;
  return `<div class="chart"><div class="tip"></div><svg data-chart="${id}" viewBox="0 0 ${W} ${h}" width="100%" role="img" aria-label="Diagramm, antippen für Werte">${g}</svg></div>`;
}
function chartTap(svg, clientX) {
  const c = CHARTS[svg.dataset.chart]; if (!c) return;
  const r = svg.getBoundingClientRect(), vx = (clientX - r.left) / r.width * c.W;
  const i = Math.max(0, Math.min(c.n - 1, Math.round((vx - c.pad) / (c.W - c.pad - 6) * (c.n - 1))));
  const xx = c.pad + i * (c.W - c.pad - 6) / Math.max(1, c.n - 1);
  const ln = svg.querySelector('.cur'); ln.setAttribute('x1', xx); ln.setAttribute('x2', xx);
  svg.querySelector('.dots').innerHTML = c.ys.map((ys, k) => ys[i] === null ? '' : `<circle cx="${xx}" cy="${ys[i]}" r="4" fill="${c.colors[k]}" stroke="#fff" stroke-width="1.5"/>`).join('');
  const tip = svg.parentElement.querySelector('.tip'); tip.textContent = c.tips[i]; tip.style.display = 'block';
}
function anaKacheln() {
  const L = lager();
  const sx = id => { const x = S.sensoren.find(s => s.id === id); if (!x || !x.last) return ['-', 'noch keine Daten', '']; const v = x.last.prozent ?? x.last.wert; const p = x.last.prozent !== null && x.last.prozent !== undefined; return [nf(Math.round(v)) + (p ? ' %' : ' cm'), 'Batterie ' + (x.last.batterie ?? '-') + ' %', p && v < 30 ? 'low' : '']; };
  const [ws, wss, wsc] = sx('wasserstand'), [tf, tfs, tfc] = sx('traenkefass');
  const k = (v, t, big, sub, cls = '') => SENS.laedt ? `<a class="kachel laedt" href="#/journale/${v}"><span>${t}</span><b><i class="ld"></i></b><small>wird geladen …</small></a>` : `<a class="kachel ${cls}" href="#/journale/${v}"><span>${t}</span><b>${big}</b><small>${sub}</small></a>`;
  const lk = (t, was, v) => `<a class="kachel k3 ${v <= 5 ? 'low' : ''}" href="#/journale/lager"><span>${t}</span><b>${nf(v)}</b><small>${esc(reichweite(was, v))}</small></a>`;
  const gb = (v, t, sub, ic) => `<a class="gross" href="#/journale/${v}"><span class="gi">${ic}</span><span><b>${t}</b><small>${sub}</small></span><i>›</i></a>`;
  return `<div class="kacheln">${k('wasserstand', 'Wasserstand', ws, wss, wsc)}${k('traenkefass', 'Tränkefass', tf, tfs, tfc)}</div>
  <div class="sec-t">Lager</div>
  <div class="kacheln drei" style="margin-top:0">${lk('Heu', 'Heu', L.heu)}${lk('Silage', 'Silage', L.silo)}${lk('Stroh', 'Stroh', L.stroh)}</div>
  <div class="grosse">
    ${gb('auslauf', 'Auslaufjournal', 'Weide, Laufhof, Alp · PDF', IC.auslauf)}
    ${gb('lager', 'Lager', 'Heu, Silage, Stroh · Ernte, Kauf, Verbrauch', IC.verbrauch)}
    ${gb('feld', 'Feldkalender', 'Düngung, Ernte · PDF', IC.ernte)}
    ${gb('behandlung', 'Behandlungsjournal', 'Behandlungen, Absetzfristen · PDF', IC.behandlung)}
    ${gb('ausbringen', 'Gülle / Mist ausbringen', 'Darf ich heute? Boden, Niederschlag, Vegetationsruhe', IC.duengung || IC.ernte)}
    ${gb('wetter', 'Agrometeo Analyse', 'Niederschlag und Temperatur', I('<path d="M7 18a4 4 0 0 1-.5-8 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 17.5 18z"/>'))}
  </div>`;
}
function anaLager() {
  const now = new Date(), mons = []; for (let i = 23; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 0); mons.push(iso(d)); }
  const ML = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const bal = (was, start) => mons.map(e => num(start) + S.feld.filter(f => f.datum <= e && f.was === was).reduce((a, f) => a + (f.typ === 'ernte' || f.typ === 'kauf' ? num(f.menge) : f.typ === 'verbrauch' ? -num(f.menge) : 0), 0));
  const H = bal('Heu', S.set.startHeu), Si = bal('Silage', S.set.startSilo), St = bal('Stroh', S.set.startStroh), L = lager();
  const cols = ['#2E8B62', '#E0A35C', '#B8A04A'];
  const logs = S.feld.filter(f => (f.datum || '').startsWith(UI.jahr) && ['ernte', 'kauf', 'verbrauch'].includes(f.typ)).sort((a, b) => a.datum < b.datum ? 1 : -1);
  return `<div class="sec-t" style="margin-top:8px">Verlauf 24 Monate</div>
  <div class="card">${svgLines([H, Si, St], mons.map(m => MON[+m.slice(5, 7) - 1].slice(0, 1)), cols, 150, mons.map((m, i) => `Ende ${ML[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}: Heu ${nf(H[i])} · Silage ${nf(Si[i])} · Stroh ${nf(St[i])}`), false, true)}<div class="legend"><span><i class="sw" style="background:${cols[0]}"></i>Heu</span><span><i class="sw" style="background:${cols[1]}"></i>Silage</span><span><i class="sw" style="background:${cols[2]}"></i>Stroh</span></div></div>
  <div style="margin-top:12px">${lagerKpi(L)}</div>
  <div class="list" style="margin-top:8px">${[['Heu', L.heu], ['Silage', L.silo], ['Stroh', L.stroh]].map(([w, v]) => `<div class="row one"><i class="bar green"></i><div class="main"><span class="t1"><span class="hd">${w}</span> <span class="ex">${esc(reichweite(w, v))}</span></span></div><small class="rt">${nf(verbrauchProTag(w) * 7)}/Woche</small></div>`).join('')}</div>
  <p class="small muted" style="margin:6px 4px">Reichweite = aktueller Bestand geteilt durch den Ø Verbrauch der letzten 90 Tage.</p>
  <div class="toolbar">${jahrSel()}</div>
  <div class="list">${feldRows(logs)}</div>`;
}
function anaAuslaufChart() {
  const J = UI.jahr, typs = ['Weide', 'Laufhof', 'Alp'], cols = ['#2E8B62', '#5B8FD6', '#E0A35C'];
  const per = typs.map(() => Array(12).fill(0));
  auslaufTage(J).forEach(([d, a]) => { const k = typs.indexOf(a.typ); if (k >= 0) per[k][+d.slice(5, 7) - 1]++; });
  return `<div class="sec-t" style="margin-top:8px">Tage pro Monat ${J}</div><div class="card">${svgBars(per, MON.map(m => m.slice(0, 1)), cols)}<div class="legend">${typs.map((t, i) => `<span><i class="sw" style="background:${cols[i]}"></i>${t}</span>`).join('')}</div></div>`;
}
function anaZucht() {
  const J = UI.jahr, yrs = jahre([S.ereignisse]).sort();
  const cnt = (typ, y) => S.ereignisse.filter(e => e.typ === typ && e.datum.startsWith(y)).length;
  const zk = []; S.tiere.forEach(t => { const c = evOf(t.id, 'abkalbung'); for (let i = 1; i < c.length; i++) zk.push(diff(c[i - 1].datum, c[i].datum)); });
  const bes = cnt('besamung', J), abk = cnt('abkalbung', J);
  return `<div class="toolbar">${jahrSel()}</div>
  <div class="stats"><div class="stats-row four"><span class="stats-h">${J}</span><span class="stat"><b>${abk}</b><span>Abkalb.</span></span><span class="stat"><b>${bes}</b><span>Besam.</span></span><span class="stat"><b>${abk ? nf(bes / abk) : '-'}</b><span>Index</span></span><span class="stat"><b>${zk.length ? Math.round(zk.reduce((a, b) => a + b, 0) / zk.length) : '-'}</b><span>Ø ZKZ</span></span></div></div>
  <p class="small muted" style="margin:4px">Index = Besamungen pro Abkalbung, ZKZ = Zwischenkalbezeit in Tagen (alle Jahre)</p>
  ${yrs.length > 1 ? `<div class="card" style="margin-top:8px">${svgBars([yrs.map(y => cnt('abkalbung', y)), yrs.map(y => cnt('besamung', y))], yrs.map(y => y.slice(2)), ['#2E8B62', '#5B8FD6'], 120)}<div class="legend"><span><i class="sw" style="background:#2E8B62"></i>Abkalbungen</span><span><i class="sw" style="background:#5B8FD6"></i>Besamungen</span></div></div>` : ''}`;
}
function anaSensor(id) {
  const sx = S.sensoren.find(x => x.id === id);
  const ban = SENS.laedt ? '<div class="note blue small" style="margin:8px 0"><i class="ld"></i> Aktuelle Daten von akenza werden geladen …</div>' : SENS.fehler ? `<div class="note small" style="margin:8px 0">akenza nicht erreichbar (${esc(SENS.fehler)}), angezeigt wird der letzte gespeicherte Stand.</div>` : '';
  return ban + (sx ? sensorKarte(sx) : '<div class="empty">Noch keine Daten.</div>');
}
function anaWetter() {
  const a = S.sensoren.find(x => x.id === 'agrometeo');
  const graf = S.set.grafanaUrl ? `<div class="card" style="padding:0;overflow:hidden;margin-top:8px"><iframe src="${esc(S.set.grafanaUrl)}" style="width:100%;height:320px;border:0" loading="lazy" title="Grafana"></iframe></div>` : '';
  return (a ? agroKarte(a) : '<div class="empty">Noch keine Wetterdaten.</div>') + graf;
}

/* ---------- Labiola: Vertrag GBV 2026-2033 (Liste der Vertragsobjekte vom 24.09.2025) ---------- */
const LAB_VERTRAG = 'gbv2026';
const LAB_JAHRE = ['2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033'];
const LAB_OBJ = [
  { nr: '1', flurname: 'Bannhalde Höhe', typ: 'Extensiv genutzte Wiese · Fromentalwiese ungedüngt', aren: 186, einheit: 'a', szp: '', duengen: 'nein', massnahmen: 'B3.2: 1. Schnitt gestaffelt (1 Objekt). 1/3-1/2 der Fläche bis spätestens Ende Mai schneiden, restliche Fläche frühestens 4 Wochen später (ca. ab 1. Juli) - jährlich wechseln. Zurechnungsfläche für Obstgarten Obj. 3.' },
  { nr: '5', flurname: 'Gemeinde Tal', typ: 'Extensiv genutzte Wiese · Fromentalwiese ungedüngt', aren: 18, einheit: 'a', szp: '07-15', duengen: 'nein', massnahmen: 'B7: Später Schnitt (frühestens 15.07.).' },
  { nr: '8', flurname: 'Gemeinde Höhe', typ: 'Extensiv genutzte Wiese · Magerwiese mit einem Schnitt', aren: 4, einheit: 'a', szp: '07-15', duengen: 'nein', massnahmen: 'B6.2: Fauna schonende Futterernte (z.B. Balkenmäher / Rapid, kein Mähaufbereiter, nicht zetten).' },
  { nr: '2', flurname: 'Bannhalde', typ: 'Extensiv genutzte Wiese · Magerwiese mit zwei Schnitten', aren: 71, einheit: 'a', szp: '06-15', duengen: 'nein', massnahmen: 'B13: Zweiter Schnitt (zwingend). B1: Rückzugsstreifen. 3 Asthaufen mit Aufzuchtkammer erstellen (Wieselförderung im Jurapark), an der Grenze zum Obj. 1, über die Länge verteilt (ca. 30 m Abstand zwischen den Haufen), möglichst bis Ende Februar, spätestens bis Ende Mai 2026 (3 Kleinstrukturen).' },
  { nr: '18', flurname: 'Bannhalde', typ: 'Extensiv genutzte Wiese · Magerwiese mit zwei Schnitten', aren: 17, einheit: 'a', szp: '06-15', duengen: 'nein', massnahmen: 'B13: Zweiter Schnitt (zwingend). B1: Rückzugsstreifen. Bewirtschaftung zusammen mit Obj. 2.' },
  { nr: '9', flurname: 'Gemeinde Höhe', typ: 'Hecke mit Krautsaum · Qualitätsstufe II', aren: 2, einheit: 'a', szp: '07-15', duengen: 'nein', massnahmen: 'L3: Kombi-Lebensraum Hecke - artenreiche Wiese. KLP-Hecke, 3 m Saum rundherum. Der Saum wird mit Obj. 8 gemäht (sauber bis an die Hecke mähen). Erste Pflege der Hecke spätestens im Winter 2026/27: Feldahorn ausholzen, Schwarzdorn und Hartriegel zurückschneiden.' },
  { nr: '6', flurname: 'Gemeinde Tal', typ: 'Hecke mit Krautsaum · Qualitätsstufe I', aren: 4, einheit: 'a', szp: '07-15', duengen: 'nein', massnahmen: 'S2.2: Kleinstrukturen. KLP-Hecke, 33 m lang mit 3 m Saum beidseitig. Angrenzend auf Obj. 1 zwei Stapel Totholz mit Bohrlöchern erstellen (gemäss Merkblatt "Kleinstrukturen") bis Ende Mai 2025 (2 Kleinstrukturen). Jährlich einen Teil der Hasel auf Stock setzen. Erster Eingriff spätestens im Winter 2026/27.' },
  { nr: '12', flurname: 'Bannhalde Höhe', typ: 'Hecke mit Krautsaum · Qualitätsstufe I', aren: 4, einheit: 'a', szp: '06-15', duengen: 'nein', massnahmen: 'B9: Saumschnitt gestaffelt. KLP-Hecke mit einseitigem Saum 3 m. Diesen auch entlang des Waldrandes stehen lassen und als Ganzes gestaffelt nutzen (2. Teil mind. 6 Wochen später). Hecke im Laufe der Vertragsperiode selektiv pflegen, dabei schnellwachsende Gehölze v.a. Eschen, Ahorn, Nussbaum herausholzen.' },
  { nr: '3', flurname: 'Bannhalde Höhe', typ: 'Hochstamm-Feldobstbäume · Qualitätsstufe II', aren: 94, einheit: 'Bäume', szp: '', duengen: '', massnahmen: 'S5: Nistgelegenheit. Bäume pflegen und bei Abgang ersetzen. Mindestens 13 Nistkästen erhalten, diese jeweils im Winter bis Ende Januar auswischen. Strukturen sind mind. 3 verschiedene Obstarten, Zurechnungsfläche im Unternutzen, 2 Linden, 2 Bäume mit Efeu und 1 Baum mit Totholz. Zurechnungsfläche ist Obj. 1.' },
  { nr: '19', flurname: 'Rütti', typ: 'Hochstamm-Feldobstbäume · Qualitätsstufe II', aren: 26, einheit: 'Bäume', szp: '', duengen: '', massnahmen: 'S5: Nistgelegenheit. Bestandteil von Obj. 3.' },
  { nr: '15', flurname: 'Rütti', typ: 'Nussbäume · Qualitätsstufe II', aren: 1, einheit: 'Baum', szp: '', duengen: '', massnahmen: 'S5: Nistgelegenheit. Zählt zum Obj. 3.' },
  { nr: '17', flurname: 'Bannhalde Höhe', typ: 'Nussbäume · Qualitätsstufe II', aren: 3, einheit: 'Bäume', szp: '', duengen: '', massnahmen: 'S5: Nistgelegenheit. Zählt zum Obj. 3.' },
  { nr: '14', flurname: 'Bannhalde', typ: 'Einzelbaum (Linde)', aren: 1, einheit: 'Baum', szp: '', duengen: '', massnahmen: 'L5: Verbindungsstruktur. Linde erhalten.' }
];
// j = jährlich (vonJahr-bisJahr), e = einmalig. ab/faellig als MM-TT bzw. Datum. nurAb = kein Enddatum im Vertrag (Saisonende 31.10.)
const LAB_PEND = [
  { vid: 'o1-frueh', objekt: 'Obj. 1', titel: '1. Schnitt gestaffelt: 1/3 bis 1/2 der Fläche schneiden (Teil jährlich wechseln)', art: 'jaehrlich', faelligMT: '05-31', teilwahl: true, notiz: 'Jährlich wechseln: oben / unten. Beim Erledigen angeben, welcher Teil geschnitten wurde.' },
  { vid: 'o1-rest', objekt: 'Obj. 1', titel: 'Restfläche schneiden, frühestens 4 Wochen nach dem 1. Teil (ca. ab 01.07.)', art: 'jaehrlich', abMT: '07-01', faelligMT: '10-31', nurAb: true, nach: { vid: 'o1-frueh', tage: 28 } },
  { vid: 'o2-s1', objekt: 'Obj. 2', titel: '1. Schnitt ab 15.06., Rückzugsstreifen stehen lassen (evtl. mit 2. Staffelung Obj. 1)', art: 'jaehrlich', abMT: '06-15', faelligMT: '10-31', nurAb: true },
  { vid: 'o2-s2', objekt: 'Obj. 2', titel: '2. Schnitt (zwingend), Rückzugsstreifen stehen lassen', art: 'jaehrlich', abMT: '08-01', faelligMT: '09-30', nurAb: false, nach: { vid: 'o2-s1', tage: 1 } },
  { vid: 'o18-s1', objekt: 'Obj. 18', titel: '1. Schnitt ab 15.06., Rückzugsstreifen (zusammen mit Obj. 2)', art: 'jaehrlich', abMT: '06-15', faelligMT: '10-31', nurAb: true },
  { vid: 'o18-s2', objekt: 'Obj. 18', titel: '2. Schnitt (zwingend), Rückzugsstreifen', art: 'jaehrlich', abMT: '08-01', faelligMT: '09-30', nurAb: false, nach: { vid: 'o18-s1', tage: 1 } },
  { vid: 'o12-saum1', objekt: 'Obj. 12', titel: 'Saumschnitt gestaffelt: 1. Teil (inkl. Saum entlang Waldrand), ca. ab 01.07.', art: 'jaehrlich', abMT: '07-01', faelligMT: '10-31', nurAb: true },
  { vid: 'o12-saum2', objekt: 'Obj. 12', titel: 'Saumschnitt 2. Teil, mind. 6 Wochen nach dem 1. Teil', art: 'jaehrlich', abMT: '07-27', faelligMT: '10-31', nurAb: true, nach: { vid: 'o12-saum1', tage: 42 } },
  { vid: 'o5-s1', objekt: 'Obj. 5', titel: 'Später Schnitt ab 15.07., zusammen mit Saum Alte Strasse Hecke (Obj. 6, beidseitig 3 m)', art: 'jaehrlich', abMT: '07-15', faelligMT: '10-31', nurAb: true },
  { vid: 'o8-s1', objekt: 'Obj. 8', titel: 'Schnitt ab 15.07., Fauna schonend (Balkenmäher / Rapid, nicht zetten), zusammen mit Saum Linde Hecke (Obj. 9, 3 m rundherum, sauber bis an die Hecke)', art: 'jaehrlich', abMT: '07-15', faelligMT: '10-31', nurAb: true },
];
// Zuordnung Labiola-Objekt -> Parzellen (Wiesen) und Einzelobjekte (eigene Fläche auf dem Plan), Flächen aus Plan Kleinstrukturen (ca.)
const LAB_MAP = {
  '1': { name: 'Höhe', hosts: ['Höhe'] }, '2': { name: 'Höhe oben', hosts: ['Höhe oben'] }, '18': { name: 'Höhe hinten', hosts: ['Höhe hinten'] },
  '5': { name: 'Alte Strasse Wiese', hosts: ['Alte Strasse Wiese'] }, '8': { name: 'Linde Wiese', hosts: ['Linde Wiese'] },
  '6': { name: 'Alte Strasse Hecke', hosts: [], obj: ['Alte Strasse Hecke'] }, '9': { name: 'Linde Hecke', hosts: [], obj: ['Linde Hecke'] }, '12': { name: 'Neue Strasse Hecke', hosts: [], obj: ['Neue Strasse Hecke'] },
  '3': { name: 'Obstgarten', hosts: [] }, '14': { name: 'Linde', hosts: [] }, '15': { name: 'Nussbaum Rüti', hosts: [] }, '17': { name: 'Nussbäume Hof', hosts: [] }, '19': { name: 'Obstgarten Rüti', hosts: [] }
};
// Soll-Zustand Karte: Wiesen-Parzellen (wählbar in Formularen) und Einzelobjekte (nur Plan)
const PZ_SOLL = [
  { name: 'Höhe', nr: '1', art: 'wiese' }, { name: 'Höhe hinten', nr: '18', art: 'wiese' }, { name: 'Höhe oben', nr: '2', art: 'wiese' },
  { name: 'Obere Rüti', art: 'wiese' }, { name: 'Untere Rüti', art: 'wiese' },
  { name: 'Alte Strasse Wiese', lnr: '5', art: 'wiese', alt: ['Alte Strasse'] }, { name: 'Linde Wiese', lnr: '8', art: 'wiese', alt: ['Linde Saum', 'LindenWiese'] },
  { name: 'Alte Strasse Hecke', lnr: '6', art: 'objekt', nutzung: 'Hecke' }, { name: 'Neue Strasse Hecke', lnr: '12', art: 'objekt', nutzung: 'Hecke', alt: ['Hecke neue Strasse'] },
  { name: 'Linde Hecke', lnr: '9', art: 'objekt', nutzung: 'Hecke', alt: ['LindenHecke'] }
];
const LAB_EINZEL = [
  { name: "Alte Strasse Wiese", nutzung: 'Wiese', labiolaNr: '5', geo: "[[[8.1397045, 47.5254184], [8.1396928, 47.5254243], [8.1396286, 47.5255294], [8.1396587, 47.5256762], [8.1395785, 47.525755], [8.1395855, 47.5258099], [8.1395925, 47.5258125], [8.1396065, 47.525805], [8.1396424, 47.5258006], [8.1397248, 47.5257779], [8.1397358, 47.5257799], [8.139745, 47.5257725], [8.1397871, 47.5257669], [8.1397949, 47.5257605], [8.1398369, 47.525755], [8.1398556, 47.5257464], [8.1398883, 47.525743], [8.1400019, 47.5257138], [8.1400587, 47.5258187], [8.1400034, 47.5258301], [8.1400004, 47.5258354], [8.1399879, 47.5258345], [8.1399739, 47.5258419], [8.1399552, 47.5258421], [8.1399459, 47.5258495], [8.1399116, 47.5258529], [8.139893, 47.5258636], [8.1398556, 47.525868], [8.139809, 47.5258842], [8.13977, 47.5258887], [8.1397623, 47.5258961], [8.1397249, 47.5259006], [8.1396814, 47.5259167], [8.1396064, 47.5259129], [8.13958, 47.5259247], [8.1395519, 47.5259281], [8.1395333, 47.5259366], [8.1395177, 47.5259367], [8.1395068, 47.5259431], [8.1394305, 47.5259595], [8.1394259, 47.5259648], [8.1393823, 47.5259714], [8.1393714, 47.5259778], [8.1392951, 47.5259952], [8.1392821, 47.5260085], [8.1392916, 47.5260201], [8.1392968, 47.5260644], [8.1393073, 47.5260882], [8.1393183, 47.5260902], [8.1393618, 47.5260762], [8.1394366, 47.5260662], [8.1394552, 47.5260577], [8.1395565, 47.5260412], [8.1395689, 47.5260337], [8.1396126, 47.5260292], [8.139667, 47.526013], [8.1396764, 47.5260161], [8.1396966, 47.5260065], [8.1397185, 47.5260064], [8.1397215, 47.5260011], [8.1397527, 47.5259977], [8.1397916, 47.5259848], [8.1398259, 47.5259825], [8.1398553, 47.5259664], [8.1398725, 47.5259642], [8.1399253, 47.5259406], [8.1399346, 47.5259416], [8.1400167, 47.5258903], [8.1400747, 47.525845], [8.1400746, 47.5258355], [8.1401254, 47.5257866], [8.1401223, 47.5257823], [8.1401361, 47.5257675], [8.1401345, 47.525759], [8.1401453, 47.5257505], [8.1401421, 47.5257452], [8.1401529, 47.5257335], [8.1401481, 47.5257293], [8.1401589, 47.5257176], [8.1401474, 47.5256733], [8.1401503, 47.5256595], [8.1401234, 47.5256279], [8.1401124, 47.5256238], [8.1400996, 47.5256027], [8.1399761, 47.5255331], [8.1399683, 47.5255342], [8.1399525, 47.5255227], [8.1399275, 47.5255154], [8.1399243, 47.5255091], [8.1399165, 47.5255112], [8.1399023, 47.5254997], [8.1398725, 47.5254935], [8.1398473, 47.5254778], [8.1398113, 47.5254664], [8.1397971, 47.5254549], [8.1397814, 47.5254528], [8.1397437, 47.5254319], [8.1397045, 47.5254184]]]" },
  { name: "Alte Strasse Hecke", nutzung: 'Hecke', labiolaNr: '6', geo: "[[[8.1399942, 47.5257234], [8.1395926, 47.5258168], [8.1395825, 47.5258237], [8.1395843, 47.5258374], [8.1396178, 47.5258901], [8.1396195, 47.5259038], [8.1396469, 47.5259106], [8.1396797, 47.5259104], [8.1400407, 47.5258162], [8.1400413, 47.5257998], [8.1399942, 47.5257234]]]" },
  { name: "Linde Wiese", nutzung: 'Wiese', labiolaNr: '8', geo: "[[[8.1423497, 47.5262548], [8.1423428, 47.5262618], [8.1423538, 47.5262712], [8.1423607, 47.5263177], [8.1423686, 47.5263219], [8.1423721, 47.5263546], [8.1423784, 47.5263578], [8.1423819, 47.5263884], [8.1423899, 47.5263968], [8.1423825, 47.5264297], [8.1423806, 47.5265249], [8.1424062, 47.5265713], [8.1424463, 47.5265948], [8.1424808, 47.5266062], [8.1425464, 47.5266069], [8.1426071, 47.5265885], [8.1426381, 47.5265704], [8.1426475, 47.5265714], [8.1426816, 47.5265521], [8.1426909, 47.5265531], [8.1427188, 47.526536], [8.1427406, 47.5265306], [8.1427476, 47.5265248], [8.1427374, 47.5265211], [8.1427172, 47.5265297], [8.1427039, 47.5265261], [8.142691, 47.5265008], [8.1426768, 47.5264882], [8.1426783, 47.5264797], [8.1426672, 47.5264724], [8.1426703, 47.526466], [8.1426386, 47.5264313], [8.1426432, 47.526427], [8.1425369, 47.5263563], [8.1424662, 47.5263229], [8.1424614, 47.5263155], [8.1424457, 47.5263114], [8.1423497, 47.5262548]]]" },
  { name: "Linde Hecke", nutzung: 'Hecke', labiolaNr: '9', geo: "[[[8.1425437, 47.5264017], [8.1424814, 47.5264085], [8.1424426, 47.5264309], [8.1424169, 47.5264337], [8.1424171, 47.5264485], [8.1424063, 47.5264581], [8.1424111, 47.5264665], [8.1424004, 47.5264867], [8.1424179, 47.5265067], [8.1424148, 47.526512], [8.1424314, 47.5265262], [8.1424736, 47.5265333], [8.1425094, 47.5265215], [8.1425421, 47.5265181], [8.1426126, 47.5264769], [8.1426058, 47.5264336], [8.1425719, 47.526409], [8.1425437, 47.5264017]]]" },
  { name: "Neue Strasse Hecke", nutzung: 'Hecke', labiolaNr: '12', geo: "[[[8.1398404, 47.5260183], [8.1397704, 47.5260378], [8.1397626, 47.5260357], [8.1397439, 47.5260443], [8.1397377, 47.5260412], [8.1397237, 47.5260497], [8.1396614, 47.5260596], [8.1396428, 47.5260682], [8.1396349, 47.5260661], [8.139596, 47.526078], [8.1395897, 47.5260738], [8.1395727, 47.5260823], [8.1395415, 47.5260846], [8.1395244, 47.5260922], [8.1393515, 47.5261239], [8.1393476, 47.5261276], [8.1393563, 47.5261334], [8.1393641, 47.5261312], [8.1394252, 47.5261467], [8.1394531, 47.5261883], [8.1393989, 47.5262288], [8.13942, 47.5262292], [8.1395165, 47.5262064], [8.1398585, 47.5260901], [8.1398655, 47.5260853], [8.1398621, 47.526061], [8.139849, 47.526022], [8.1398404, 47.5260183]]]" },
  { name: "Obstgarten Hof", nutzung: 'Bäume', labiolaNr: '3', geo: "[[[8.1404504, 47.5258581], [8.140417, 47.5258747], [8.1404227, 47.5258868], [8.1404148, 47.5258826], [8.1403369, 47.5258947], [8.1402806, 47.5258887], [8.1402628, 47.525901], [8.1402809, 47.5259131], [8.140295, 47.5259172], [8.1403246, 47.5259107], [8.1403536, 47.5259206], [8.1399022, 47.5260846], [8.1398866, 47.5260878], [8.1398725, 47.5260805], [8.1398539, 47.5260944], [8.1397419, 47.5261279], [8.1397257, 47.5261391], [8.1397383, 47.5261527], [8.1396843, 47.5262594], [8.1393685, 47.5263448], [8.1393367, 47.5263656], [8.1392496, 47.5265079], [8.139205, 47.5265632], [8.139365, 47.5267304], [8.1394004, 47.5267571], [8.1397568, 47.5266672], [8.1397927, 47.5266638], [8.1398954, 47.5268107], [8.1399143, 47.5268265], [8.139932, 47.5268676], [8.1399749, 47.5269255], [8.1399915, 47.5269365], [8.1400507, 47.5269298], [8.1400758, 47.5269392], [8.1401011, 47.5269602], [8.140115, 47.5269506], [8.1401245, 47.5269558], [8.1401322, 47.5269505], [8.1401286, 47.526969], [8.1401451, 47.52698], [8.1405762, 47.5268748], [8.1406142, 47.5268539], [8.1406024, 47.526844], [8.140626, 47.5268555], [8.1408528, 47.5267705], [8.1408872, 47.5267724], [8.1410553, 47.5268486], [8.1416417, 47.5266748], [8.1416603, 47.5266641], [8.141721, 47.526651], [8.14192, 47.5265874], [8.1421833, 47.5263621], [8.1421102, 47.526325], [8.14206, 47.5263105], [8.1419069, 47.5262454], [8.1420159, 47.526103], [8.1419554, 47.5260721], [8.1419298, 47.5260897], [8.141857, 47.526188], [8.1417574, 47.5262151], [8.1417322, 47.5261983], [8.1416609, 47.52624], [8.1416234, 47.526236], [8.1413653, 47.5263222], [8.1412204, 47.5263421], [8.1411948, 47.5263586], [8.1412155, 47.5263913], [8.1412102, 47.5264003], [8.1408275, 47.5265073], [8.140764, 47.5265479], [8.1405151, 47.5266203], [8.1404989, 47.5266315], [8.1405029, 47.5266404], [8.1403986, 47.5266665], [8.1403152, 47.5265607], [8.1403369, 47.5265478], [8.1402432, 47.5264834], [8.1402277, 47.526493], [8.1402073, 47.5264857], [8.1401089, 47.5264863], [8.140088, 47.5265007], [8.1400935, 47.5265054], [8.140078, 47.5265076], [8.1400685, 47.5265024], [8.1400608, 47.5265077], [8.1400342, 47.5265026], [8.1400249, 47.5265069], [8.140017, 47.5265017], [8.1400077, 47.526507], [8.1400146, 47.5265001], [8.1399989, 47.5264886], [8.1400074, 47.5264827], [8.1400152, 47.5264879], [8.1400417, 47.5264825], [8.140059, 47.5264929], [8.1400815, 47.5264775], [8.1400516, 47.5264639], [8.1400443, 47.5264433], [8.1401393, 47.5264216], [8.1401672, 47.5264066], [8.1403477, 47.5263611], [8.140371, 47.5263493], [8.1406698, 47.5262735], [8.14071, 47.5262426], [8.1407225, 47.5262425], [8.1407398, 47.526254], [8.1407637, 47.5262333], [8.1407864, 47.526176], [8.1408003, 47.5261653], [8.1407982, 47.5261252], [8.1407518, 47.5260985], [8.1407433, 47.5261012], [8.1407525, 47.5260948], [8.1407413, 47.5260737], [8.140624, 47.5259358], [8.1406051, 47.5259233], [8.1406416, 47.5259077], [8.140662, 47.5259182], [8.1406822, 47.5259085], [8.1407057, 47.5259137], [8.1407375, 47.5258981], [8.1407193, 47.5258861], [8.1406944, 47.5258915], [8.1406335, 47.5258877], [8.1406117, 47.5258952], [8.1405741, 47.5258859], [8.1405548, 47.5259014], [8.1405549, 47.5259109], [8.1405707, 47.5259224], [8.1405231, 47.5259232], [8.140516, 47.5259196], [8.1405268, 47.5259121], [8.140519, 47.5259058], [8.1405339, 47.5259147], [8.1405517, 47.5259024], [8.1405469, 47.5258972], [8.1405717, 47.5258833], [8.1405521, 47.5258702], [8.1404504, 47.5258581]]]" },
  { name: "Obstgarten Rüti", nutzung: 'Bäume', labiolaNr: '19', geo: "[[[8.140892, 47.5256016], [8.1408766, 47.5256123], [8.1408593, 47.525605], [8.1408469, 47.5256114], [8.1408265, 47.5256083], [8.1407964, 47.5256312], [8.140912, 47.5256977], [8.1410786, 47.5257781], [8.1410896, 47.5257823], [8.1411089, 47.525769], [8.1411042, 47.5257616], [8.1411128, 47.5257663], [8.1411205, 47.525761], [8.1411231, 47.5257742], [8.141106, 47.5257859], [8.1412673, 47.5258785], [8.1412877, 47.5258826], [8.1413177, 47.5258534], [8.1413153, 47.5258455], [8.1413574, 47.5258389], [8.1413832, 47.5258466], [8.1413803, 47.5258646], [8.141393, 47.5258762], [8.14137, 47.5259059], [8.141349, 47.5259161], [8.1413427, 47.5259119], [8.1413203, 47.5259274], [8.141319, 47.5259517], [8.1413044, 47.525964], [8.1409431, 47.5259207], [8.1409253, 47.525934], [8.1409228, 47.5259827], [8.1409015, 47.5260219], [8.1409157, 47.5260314], [8.1409079, 47.5260367], [8.1409915, 47.5261018], [8.1410406, 47.5261523], [8.1409311, 47.5261936], [8.1408735, 47.5262077], [8.1408262, 47.5261763], [8.1408084, 47.5261896], [8.1407597, 47.5262788], [8.1407647, 47.5263083], [8.1407953, 47.5263203], [8.1408843, 47.5263166], [8.1409082, 47.5262927], [8.1408814, 47.5262727], [8.14087, 47.5262421], [8.1408988, 47.5262298], [8.1409254, 47.5262402], [8.1409425, 47.5262295], [8.1409675, 47.5262357], [8.1409753, 47.5262304], [8.140984, 47.5262372], [8.1409625, 47.5262648], [8.1409783, 47.5262785], [8.140977, 47.5263007], [8.1410108, 47.5263201], [8.1410426, 47.5263014], [8.1410237, 47.5262888], [8.1410235, 47.5262782], [8.1410483, 47.5262601], [8.1410443, 47.5262532], [8.1410608, 47.5262653], [8.1410612, 47.5262896], [8.1410534, 47.526295], [8.1410615, 47.5263118], [8.1410537, 47.5263182], [8.1410844, 47.5263344], [8.1411156, 47.5263311], [8.141128, 47.5263225], [8.1411406, 47.5263309], [8.1411568, 47.5263197], [8.1411371, 47.5263066], [8.1411278, 47.526313], [8.1410939, 47.5262884], [8.1411117, 47.5262761], [8.1411606, 47.5263086], [8.1411699, 47.5263043], [8.141203, 47.5263253], [8.1412201, 47.5263251], [8.1413479, 47.5263064], [8.1416123, 47.5262212], [8.1416285, 47.5262079], [8.1416123, 47.5261689], [8.1415926, 47.5261537], [8.1415414, 47.5261794], [8.1415139, 47.526161], [8.1415316, 47.5261456], [8.1415817, 47.5261569], [8.1416026, 47.5261425], [8.1415798, 47.5260728], [8.1415554, 47.5260576], [8.1414364, 47.5260298], [8.1414199, 47.5260188], [8.141416, 47.5259607], [8.1414266, 47.5259416], [8.1414328, 47.5258157], [8.141377, 47.5257858], [8.1412985, 47.5257588], [8.1412892, 47.5257642], [8.1412915, 47.5257573], [8.1412576, 47.5257369], [8.1409796, 47.5256127], [8.1409405, 47.5256034], [8.1409141, 47.5256173], [8.140892, 47.5256016]]]" }
];
const pzNorm = s => String(s || '').toLowerCase().replace(/ü/g, 'u').replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9]/g, '');
// Parzelle finden: Nummer (Name beginnt mit Nr.) oder Name (unscharf)
function pzFinde(t, nurWiese = true) {
  const L = S.parzellen.filter(z => !istArchiv(z) && (!nurWiese || !istObjekt(z)));
  if (/^\d+$/.test(t)) { const re = new RegExp(`^\\s*(obj\\.?|objekt)?\\s*${t}\\b`, 'i'); return L.find(z => re.test(z.name || '')) || null; }
  const n = pzNorm(t); return L.find(z => pzNorm(z.name) === n) || L.find(z => pzNorm(z.name).includes(n) || (pzNorm(z.name).length > 3 && n.includes(pzNorm(z.name)))) || null;
}
const labNr = s => { const m = String(s || '').match(/(\d+)/); return m ? m[1] : ''; };
const labObj = nr => S.labiola.find(o => String(o.nr) === String(nr));
// alle Flächen eines Objekts: Wiesen-Parzellen (hosts) + Einzelobjekte
function labPzs(o) {
  if (!o) return [];
  const m = LAB_MAP[o.nr] || {}, out = [];
  if (o.parzelle) { const z = S.parzellen.find(x => x.name === o.parzelle); if (z) out.push(z); }
  for (const h of (m.hosts || [o.nr])) { const z = pzFinde(h); if (z && !out.includes(z)) out.push(z); }
  for (const n of (m.obj || [])) { const z = S.parzellen.find(x => istObjekt(x) && !istArchiv(x) && pzNorm(x.name) === pzNorm(n)); if (z && !out.includes(z)) out.push(z); }
  return out;
}
const labHosts = o => labPzs(o).filter(z => !istObjekt(z));
function labPz(o) { return labPzs(o)[0] || null; }
const pzKurz = n => String(n || '').replace(/^\s*(obj\.?|objekt)?\s*\d+\s*[-–:.]?\s*/i, '').replace(/\s*\(.*\)\s*$/, '').trim() || n;
function labName(nr) { const m = LAB_MAP[String(nr)]; if (m) return m.name; const o = labObj(nr), z = labPz(o); return z ? pzKurz(z.name) : o ? (o.flurname || `Obj. ${nr}`) : `Obj. ${nr}`; }
const labAufg = () => S.aufgaben.filter(a => !a.archiv);
function labTeil(y) { const a = S.aufgaben.find(x => x.vid === 'o1-frueh'); return a && a.teil ? a.teil[String(y)] || '' : ''; }
// Seed: Objekte und Pendenzen aus dem Vertrag (einmalig), 2025 und 2026 als erledigt
// Parzellen abgleichen (einmalig): Namen vereinheitlichen, Duplikate entfernen, Einträge umbenennen, Rest ausblenden
function pzMigration() {
  if (!['parzellen', 'feld', 'auslauf', 'set'].every(c => S.loaded[c]) || S.set.pzMig === 4 || !S.parzellen.length) return;
  S.set.pzMig = 4; W.setSettings({ ...S.set, pzMig: 4 });
  const seedGeo = n => (LAB_EINZEL.find(e => pzNorm(e.name) === pzNorm(n)) || {}).geo;
  const used = new Set(), umben = {};
  for (const w of PZ_SOLL) {
    const lose = x => pzNorm(x).replace(/(.)\1+/g, '$1'), norms = [w.name, ...(w.alt || [])].map(lose), re = w.nr ? new RegExp(`^\\s*${w.nr}\\b`) : null;
    const cand = S.parzellen.filter(z => !used.has(z.id) && (norms.includes(lose(z.name)) || (re && re.test(z.name || '')) || (!w.nr && !w.lnr && lose(z.name).includes(norms[0]))));
    const keep = cand.find(z => !z.labiolaNr && z.geo) || cand.find(z => z.geo) || cand[0];
    cand.forEach(z => { used.add(z.id); if (z !== keep) { if (z.name !== w.name) umben[z.name] = w.name; del('parzellen', z.id); } });
    if (keep && keep.name !== w.name) umben[keep.name] = w.name;
    put('parzellen', { ...(keep || {}), name: w.name, art: w.art, ...(w.nutzung ? { nutzung: w.nutzung } : {}), ...(w.lnr ? { labiolaNr: w.lnr, programm: 'Labiola' } : {}), geo: keep && keep.geo ? keep.geo : seedGeo(w.name) || '' });
  }
  const weg = [];
  const soll = new Set(PZ_SOLL.map(w => w.name));
  for (const z of [...S.parzellen]) if (!used.has(z.id) && !soll.has(z.name)) { if (/^Obstgarten (Hof|Rüti)$|^Rütti Bäume$/.test(z.name)) del('parzellen', z.id); else if (z.art !== 'archiv') { weg.push(z.name); put('parzellen', { ...z, art: 'archiv' }); } }
  for (const f of S.feld) if (f.parzelle && umben[f.parzelle]) put('feld', { ...f, parzelle: umben[f.parzelle] });
  for (const a of S.auslauf) if (a.parzelle && umben[a.parzelle]) put('auslauf', { ...a, parzelle: umben[a.parzelle] });
  for (const o of S.labiola) if (o.parzelle) put('labiola', { ...o, parzelle: '' });
  const n = Object.keys(umben).length;
  setTimeout(() => openSheet('Parzellen abgeglichen', `<p>${n ? 'Umbenannt: ' + esc(Object.entries(umben).map(([a, b]) => a + ' → ' + b).join(', ')) : 'Keine Umbenennung nötig.'}</p>${weg.length ? `<p>Ausgeblendet (nicht in der Liste): ${esc(weg.join(', '))}</p>` : ''}<p class="small muted">Bestehende Einträge in Feldkalender und Auslaufjournal wurden mit umbenannt.</p>`), 800);
}
function labiolaSeed() {
  pzMigration();
  if (S.loaded.aufgaben && S.loaded.set && S.set.labPend !== 3 && S.set.labSeed === LAB_VERTRAG) { S.set.labPend = 3; W.setSettings({ ...S.set, labPend: 3 }); for (const a of S.aufgaben) { if (!a.vid) continue; const p = LAB_PEND.find(x => x.vid === a.vid); if (!p) { if (!a.archiv) put('aufgaben', { ...a, archiv: true }); } else put('aufgaben', { ...a, ...p, erledigt: a.erledigt || {}, ...(a.teil ? { teil: a.teil } : {}) }); } }
  if (!S.loaded.labiola || !S.loaded.aufgaben || !S.loaded.set || !S.loaded.lprotokoll || S.set.labSeed === LAB_VERTRAG) return;
  S.set.labSeed = LAB_VERTRAG; W.setSettings({ ...S.set, labSeed: LAB_VERTRAG });
  for (const o of LAB_OBJ) { const alt = labObj(o.nr); put('labiola', { ...(alt || {}), ...o, parzelle: alt && alt.parzelle || '', vertrag: LAB_VERTRAG }); }
  for (const a of S.aufgaben) if (!a.vid && !a.archiv) put('aufgaben', { ...a, archiv: true });
  // Teil oben/unten Obj. 1 aus dem bisherigen Protokoll
  const teil = {}; for (const p of S.lprotokoll) if (labNr(p.objekt) === '1' && (p.datum || '').slice(5) <= '05-31') { const t = /ober/i.test(p.teil || '') ? 'oben' : /unter/i.test(p.teil || '') ? 'unten' : ''; if (t) teil[p.datum.slice(0, 4)] = t; }
  const T = today();
  for (const p of LAB_PEND) {
    if (S.aufgaben.some(a => a.vid === p.vid)) continue;
    const er = {};
    if (p.art === 'einmalig') { const y = p.faellig.slice(0, 4); if (y <= '2026') er[y] = p.faellig < T ? p.faellig : T; }
    else for (const y of ['2025', '2026']) { if (+y < (p.vonJahr || 2026)) continue; const d = `${y}-${p.faelligMT}`; er[y] = d < T ? d : T; }
    put('aufgaben', { ...p, vonJahr: p.vonJahr || 2026, bisJahr: 2033, erledigt: er, ...(p.teilwahl ? { teil } : {}), vertrag: LAB_VERTRAG });
  }
}
// Frühestens-Datum einer Pendenz im Jahr y (abhängig von einer vorherigen Pendenz)
function labAb(a, y) {
  let ab = a.art === 'einmalig' ? a.ab || '' : a.abMT ? `${y}-${a.abMT}` : '';
  if (a.nach) { const v = S.aufgaben.find(x => x.vid === a.nach.vid), d = v && (v.erledigt || {})[String(y)]; if (d) { const n = addDays(d, a.nach.tage); if (n > ab) ab = n; } }
  return ab;
}
function labTitel(a, y) {
  if (!a.teilwahl) return a.titel;
  const t = labTeil(y), v = labTeil(+y - 1);
  return `1. Schnitt gestaffelt: 1/3 bis 1/2 der Fläche${t ? ` - geschnitten: ${t === 'oben' ? 'oberer' : 'unterer'} Teil` : v ? ` - dieses Jahr: ${v === 'oben' ? 'unterer' : 'oberer'} Teil (${+y - 1}: ${v})` : ' (Teil jährlich wechseln)'}`;
}
// Jahreskalender (Monate als Spalten, Pendenzen als Balken)
// Mini-Plan (SVG): alle Flächen grau, betroffene hervorgehoben
let labBox = null, labBoxKey = '';
function labThumb(nr, w = 64, h = 52) {
  const all = S.parzellen.filter(z => z.geo && !istArchiv(z)).map(z => { try { return [z, JSON.parse(z.geo)]; } catch (e) { return null; } }).filter(Boolean);
  if (!all.length) return '';
  const key = all.map(([z]) => z.id).join();
  if (key !== labBoxKey) { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; all.forEach(([, rs]) => rs.forEach(r => r.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }))); labBox = [x0, x1, y0, y1]; labBoxKey = key; }
  const [x0, x1, y0, y1] = labBox, kx = Math.cos(((y0 + y1) / 2) * Math.PI / 180), bw = (x1 - x0) * kx || 1e-6, bh = (y1 - y0) || 1e-6, sc = Math.min((w - 6) / bw, (h - 6) / bh), ox = (w - bw * sc) / 2, oy = (h - bh * sc) / 2;
  const pt = ([x, y]) => `${(ox + (x - x0) * kx * sc).toFixed(1)},${(oy + (y1 - y) * sc).toFixed(1)}`;
  const ziel = labPzs(labObj(nr)).map(z => z.id);
  const poly = ([z, rs], on) => rs.map(r => `<polygon points="${r.map(pt).join(' ')}" fill="${on ? (istObjekt(z) ? '#8B5A2B' : '#2E8B62') : '#DCE3DD'}" stroke="${on ? '#1F4D36' : '#C3CCC5'}" stroke-width="${on ? 1 : 0.6}"/>`).join('');
  return `<svg class="lab-thumb" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${all.filter(([z]) => !ziel.includes(z.id)).map(p => poly(p, false)).join('')}${all.filter(([z]) => ziel.includes(z.id)).map(p => poly(p, true)).join('')}</svg>`;
}
function labGantt(items, y) {
  if (!items.length) return '';
  const W = chartW(), lw = Math.min(150, Math.round(W * 0.34)), rh = 18, top = 18, H = top + items.length * rh + 6, cw = (W - lw - 4) / 12;
  const x = d => { const dt = pd(d), m = dt.getMonth(), dim = new Date(dt.getFullYear(), m + 1, 0).getDate(); return lw + (m + (dt.getDate() - 1) / dim) * cw; };
  const y0 = `${y}-01-01`, y1 = `${y}-12-31`, T = today();
  let g = '';
  for (let m = 0; m < 12; m++) g += `<rect x="${lw + m * cw}" y="0" width="${cw}" height="${H}" fill="${m % 2 ? '#F4F6F2' : '#FFFFFF'}"/><text x="${lw + m * cw + cw / 2}" y="12" font-size="9" text-anchor="middle" fill="#6B726D">${MON[m].slice(0, 3)}</text>`;
  items.forEach(({ a, d, done }, i) => {
    const yy = top + i * rh; let ab = labAb(a, y) || addDays(d, a.faelligMT && a.faelligMT <= '03-31' && !a.abMT ? -40 : -21);
    const s = ab < y0 ? y0 : ab > y1 ? y1 : ab, e = d > y1 ? y1 : d < y0 ? y0 : d;
    const col = done ? '#2E8B62' : d < T ? '#C0392B' : '#E08A1E';
    g += `<g data-act="lpend" data-id="${a.id}" style="cursor:pointer"><rect x="0" y="${yy}" width="${W}" height="${rh}" fill="transparent"/>`;
    g += `<text x="4" y="${yy + 12}" font-size="9.5" fill="#1F2A24">${esc(labName(labNr(a.objekt)).slice(0, 18))}</text>`;
    g += `<rect x="${x(s)}" y="${yy + 4}" width="${Math.max(3, x(e) - x(s) + cw / 30)}" height="${rh - 8}" rx="4" fill="${col}" opacity="${done ? 0.55 : 0.85}"><title>${esc(labTitel(a, y))}: ${ab ? 'ab ' + fmt(ab) + ' ' : ''}bis ${fmt(d)}</title></rect></g>`;
  });
  if (T.startsWith(String(y))) g += `<line x1="${x(T)}" x2="${x(T)}" y1="14" y2="${H}" stroke="#1F4D36" stroke-width="1.5"/>`;
  return `<div class="card" style="padding:8px 6px"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Jahreskalender Pendenzen">${g}</svg><div class="small muted legende"><span><i class="sw" style="background:#E08A1E"></i>offen</span><span><i class="sw" style="background:#C0392B"></i>überfällig</span><span><i class="sw" style="background:#2E8B62;opacity:.55"></i>erledigt</span></div></div>`;
}
function labKarte() { return S.parzellen.some(z => z.geo) ? `<div id="karte" class="karte" data-filter="1"></div>${UI.lPz ? `<div class="toolbar"><span class="chip on">${esc(pzKurz(UI.lPz))}</span><button class="btn" data-act="lpz" data-v="">Filter aufheben</button></div>` : '<p class="small muted" style="margin:2px 4px 8px">Parzelle antippen zum Filtern.</p>'}` : ''; }
const labPzOk = nr => !UI.lPz || labPzs(labObj(nr)).some(z => z.name === UI.lPz);
function labInfo(nr, extra = '') {
  const o = labObj(nr); if (!o) return;
  const zs = labPzs(o), z = zs[0];
  const zuord = z ? '' : `<div class="fld"><span>Parzelle zuordnen</span><select class="sel" data-act="lzuord" data-id="${o.id}"><option value="">-</option>${parzellen().map(p => `<option>${esc(p)}</option>`).join('')}</select></div>`;
  openSheet(`${labName(nr)} · Obj. ${o.nr}`, `${zs.some(x => x.geo) ? '<div class="karte klein" id="lmini"></div>' : ''}${zuord}${extra}
    <div class="list"><div class="row"><div class="main"><span class="t wrap">${esc(o.typ || '')}</span><span class="s">${nf(num(o.aren))} ${esc(o.einheit || 'a')}${o.szp ? ' · Schnitt ab ' + o.szp.slice(3) + '.' + o.szp.slice(0, 2) + '.' : ''}${o.duengen === 'nein' ? ' · keine Düngung' : ''}</span></div></div></div>
    <div class="sec-t">Massnahmen / Bemerkungen</div><div class="card lab-mass">${esc(o.massnahmen || '-')}</div>`);
  const sh = $('.sheet'); if (sh) sh.classList.add(extra ? 'gross' : 'mittel');
  const el = $('#lmini'); if (el && zs.length) miniKarte(el, zs);
}
function labTeilSheet(a, y) {
  openSheet('Welcher Teil wurde geschnitten?', `<p class="small muted">Obj. 1, ${y}: 1/3 bis 1/2 der Fläche bis Ende Mai. Nächstes Jahr ist der andere Teil dran. Ab dem Schnittdatum + 4 Wochen darf die Restfläche gemäht werden.</p><div class="fld"><span>Geschnitten am</span><input type="date" id="lteildat" value="${(a.erledigt || {})[y] || (today().startsWith(String(y)) ? today() : y + '-05-31')}"></div><div class="btns" style="margin-top:10px"><button class="btn pri" data-act="lteil" data-id="${a.id}" data-y="${y}" data-v="oben">Oberer Teil</button><button class="btn pri" data-act="lteil" data-id="${a.id}" data-y="${y}" data-v="unten">Unterer Teil</button></div>`);
}
function vLabiola() {
  UI.lPz = '';
  const y = LAB_JAHRE.includes(UI.lJahr) ? UI.lJahr : (LAB_JAHRE.includes(String(new Date().getFullYear())) ? String(new Date().getFullYear()) : '2026'), T = today();
  UI.lJahr = y;
  const tabs = `<div class="seg" style="margin:8px 0 12px">${[['pendenzen', 'Pendenzen'], ['objekte', 'Objekte']].map(([v, l]) => `<button type="button" class="${UI.lTab === v ? 'on' : ''}" data-act="ltab" data-v="${v}">${l}</button>`).join('')}</div>`;
  if (UI.lTab === 'objekte') {
    const g = {};
    [...S.labiola].filter(o => labPzOk(o.nr)).sort((a, b) => num(a.nr) - num(b.nr)).forEach(o => { const hs = labHosts(o).map(z => pzKurz(z.name)); (hs.length ? hs : ['Einzelobjekte']).forEach(k => (g[k] = g[k] || []).push(o)); });
    const offen = pz => UI.lPz ? UI.lOpen !== '-' + pz : UI.lOpen === pz;
    const keys = Object.keys(g).sort((a, b) => a === 'Einzelobjekte' ? 1 : b === 'Einzelobjekte' ? -1 : a.localeCompare(b, 'de', { numeric: true }));
    return `${tabs}${keys.length ? keys.map(pz => [pz, g[pz]]).map(([pz, os]) => `<button type="button" class="grp-h ${offen(pz) ? 'on' : ''}" data-act="lgrp" data-v="${esc(pz)}"><span>${esc(pz)}</span><small>${os.length}</small><i>${offen(pz) ? '−' : '+'}</i></button>${!offen(pz) ? '' : `<div class="list" style="margin-bottom:8px">${os.map(o => `<button type="button" class="row" data-act="linfo" data-v="${esc(o.nr)}"><span class="av weide">${esc(o.nr)}</span><div class="main"><span class="t wrap"><b>${esc(labName(o.nr))}</b> · ${esc(o.typ || '')}</span><span class="s">${nf(num(o.aren))} ${esc(o.einheit || 'a')}${o.szp ? ' · Schnitt ab ' + o.szp.slice(3) + '.' + o.szp.slice(0, 2) + '.' : ''}${o.duengen === 'nein' ? ' · keine Düngung' : ''}</span>${o.massnahmen ? `<span class="s wrap lab-mass-k">${esc(o.massnahmen)}</span>` : ''}</div></button>`).join('')}</div>`}`).join('') : '<div class="empty">Keine Objekte.</div>'}`;
  }
  const alle = labAufg().filter(a => labPzOk(labNr(a.objekt)) && (a.art === 'einmalig' || ((a.vonJahr || 0) <= +y && +y <= (a.bisJahr || 9999))))
    .map(a => ({ a, d: aufgabeFaellig(a, y), done: (a.erledigt || {})[y] })).filter(x => x.d).sort((p, q) => (labAb(p.a, y) || p.d) < (labAb(q.a, y) || q.d) ? -1 : 1);
  const items = UI.lAlle ? alle : alle.filter(x => !x.done);
  const nOff = alle.filter(x => !x.done).length;
  const chk = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>';
  return `${tabs}
  <div class="toolbar"><select class="sel" data-act="ljahr" aria-label="Jahr">${LAB_JAHRE.map(j => `<option ${j === y ? 'selected' : ''}>${j}</option>`).join('')}</select><div class="seg mini">${[['', `Offen (${nOff})`], ['1', `Alle (${alle.length})`]].map(([v, l]) => `<button type="button" class="${(UI.lAlle ? '1' : '') === v ? 'on' : ''}" data-act="lalle" data-v="${v}">${l}</button>`).join('')}</div></div>
  <div class="sec-t">Jahreskalender ${y}</div>${labGantt(alle, y) || '<div class="empty">Keine Pendenzen.</div>'}
  <div class="sec-t">Pendenzen ${y}</div>
  <div class="list">${items.length ? items.map(({ a, d, done }) => { const ab = labAb(a, y), late = !done && d < T, vorAb = !done && ab && ab > T, nr = labNr(a.objekt); return `<div class="row lab-row"><button type="button" class="chk ${done ? 'on' : ''}" data-act="aufgabe" data-id="${a.id}" data-y="${y}" aria-label="erledigt">${done ? chk : ''}</button><button type="button" class="lab-pend" data-act="lpend" data-id="${a.id}">${labThumb(nr)}<span class="lab-txt"><span class="lab-ort">${esc(labName(nr))} <small>Obj. ${esc(nr)}</small></span><span class="t wrap" style="${done ? 'text-decoration:line-through;color:var(--muted)' : ''}">${esc(labTitel(a, y))}</span>${done ? `<span class="s">erledigt ${fmt(done)}</span>` : ''}</span></button><span class="pill ${done ? '' : late ? 'red' : vorAb ? 'grey' : 'warn'}">${done ? 'erledigt' : vorAb ? 'ab ' + fmtS(ab) : a.nurAb ? 'offen' : 'bis ' + fmtS(d)}</span></div>`; }).join('') : `<div class="empty">${UI.lAlle ? 'Keine Pendenzen.' : 'Alles erledigt.'}</div>`}</div>
`;
}

const WMO = c => c === 0 ? 'sun' : c <= 2 ? 'part' : c === 3 ? 'cloud' : c <= 48 ? 'fog' : c <= 67 || (c >= 80 && c <= 82) ? 'rain' : c <= 77 || c === 85 || c === 86 ? 'snow' : 'storm';
const WIC = {
  sun: '<circle cx="12" cy="12" r="5" fill="#F2B705"/>',
  part: '<circle cx="9" cy="9" r="4" fill="#F2B705"/><path d="M8 18h9a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.5 1.5A3 3 0 0 0 8 18z" fill="#B7BEC4"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.5 2A3 3 0 0 0 7 18z" fill="#9AA3AA"/>',
  fog: '<path d="M4 10h16M6 14h12M4 18h16" stroke="#9AA3AA" stroke-width="2" stroke-linecap="round"/>',
  rain: '<path d="M7 14h10a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.5 1.5A3 3 0 0 0 7 14z" fill="#9AA3AA"/><path d="M9 17l-1 3M13 17l-1 3M17 17l-1 3" stroke="#2F7FD8" stroke-width="2" stroke-linecap="round"/>',
  snow: '<path d="M7 13h10a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.5 1.5A3 3 0 0 0 7 13z" fill="#B7BEC4"/><circle cx="9" cy="18" r="1.3" fill="#6FB3F2"/><circle cx="13" cy="20" r="1.3" fill="#6FB3F2"/><circle cx="16" cy="17" r="1.3" fill="#6FB3F2"/>',
  storm: '<path d="M7 13h10a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.5 1.5A3 3 0 0 0 7 13z" fill="#7E878E"/><path d="M12 13l-2 4h3l-1.5 4" stroke="#E8A700" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
};
let wetterLaden = false;
function wetterZeile() {
  let w = null; try { w = JSON.parse(localStorage.getItem('hb-wetter2') || 'null'); } catch (e) { }
  if ((!w || Date.now() - w.t > 3 * 3600e3) && !wetterLaden && navigator.onLine !== false) {
    wetterLaden = true;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${S.set.lat}&longitude=${S.set.lon}&daily=weather_code,temperature_2m_max,precipitation_sum,precipitation_probability_max&forecast_days=14&timezone=Europe%2FZurich`)
      .then(r => r.json()).then(j => { localStorage.setItem('hb-wetter2', JSON.stringify({ t: Date.now(), d: j.daily })); wetterLaden = false; schedule(); }).catch(() => { wetterLaden = false; });
  }
  if (!w || !w.d) return '';
  const D = w.d, WT = ['S', 'M', 'D', 'M', 'D', 'F', 'S'];
  // Regen-Symbol nur bei relevantem Niederschlag (>= 1 mm und Wahrscheinlichkeit >= 50 %), sonst bewölkt
  const sym = i => { let c = WMO(D.weather_code[i]); const mm = D.precipitation_sum[i] || 0, pr = D.precipitation_probability_max ? D.precipitation_probability_max[i] : null; if ((c === 'rain' || c === 'storm') && (mm < 1 || (pr !== null && pr < 50))) c = 'cloud'; return c; };
  return `<div class="wetter" title="Wetter 14 Tage (Open-Meteo)">${D.time.map((t, i) => `<span title="${fmt(t)}: ${Math.round(D.temperature_2m_max[i])}°, ${D.precipitation_sum[i]} mm${D.precipitation_probability_max ? ', ' + D.precipitation_probability_max[i] + ' %' : ''}"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">${WIC[sym(i)]}</svg><small>${i === 0 ? 'H' : WT[pd(t).getDay()]}</small></span>`).join('')}</div>`;
}

function bildKomprimieren(file, max = 1280, q = 0.72) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const sc = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q)); };
    img.onerror = rej; img.src = url;
  });
}
function vNotizen() {
  const q = (UI.notizQ || '').toLowerCase(), kat = UI.notizKat || '';
  const kats = [...new Set(S.notizen.map(n => n.kategorie).filter(Boolean))].sort();
  const list = S.notizen.filter(n => (!kat || n.kategorie === kat) && (!q || (n.titel + ' ' + (n.text || '')).toLowerCase().includes(q))).sort((a, b) => (a.titel || '').localeCompare(b.titel || '', 'de'));
  return `<div class="toolbar"><button class="btn pri" data-act="form" data-f="notiz">+ Notiz</button></div>
  ${kats.length ? `<div class="chips kf"><button type="button" class="chip ${!kat ? 'on' : ''}" data-act="notizkat" data-v="">Alle</button>${kats.map(k => `<button type="button" class="chip ${kat === k ? 'on' : ''}" data-act="notizkat" data-v="${esc(k)}">${esc(k)}</button>`).join('')}</div>` : ''}
  <div class="list">${list.length ? list.map(n => `<a class="row one" href="#/notiz/${n.id}"><i class="bar green"></i><div class="main"><span class="t1"><b>${esc(n.titel)}</b> <span class="ex">${esc(n.kategorie || '')}${(n.bilder || []).length ? ' · ' + n.bilder.length + ' Bild' + (n.bilder.length > 1 ? 'er' : '') : ''}</span></span></div><small class="rt">›</small></a>`).join('') : '<div class="empty">Noch keine Notizen.</div>'}</div>`;
}
function vNotiz(n) {
  return `<div class="card" style="margin-top:8px"><div class="small muted">${esc(n.kategorie || '')}${n.datum ? ' · ' + fmt(n.datum) : ''}</div><div class="ntext">${esc(n.text || '').replace(/\n/g, '<br>')}</div></div>
  ${(n.bilder || []).map(b => `<img class="nbild" src="${b}" alt="">`).join('')}
  <div class="btns" style="margin-top:12px"><button class="btn" data-act="edit" data-c="notizen" data-id="${n.id}">Bearbeiten</button></div>`;
}

function meldungSheet(m) {
  const kandidaten = aktiveTiere().filter(t => t.geschlecht === 'w' && kategorie(t) !== 'Kalb');
  openSheet('Kamera-Meldung', `${m.bild ? `<img class="nbild" src="${m.bild}" alt="">` : ''}
  <p class="small muted">${esc(m.kamera || '')} · ${esc((m.zeit || '').replace('T', ' ').slice(0, 16))}${m.score ? ' · Treffer ' + esc(m.score) : ''}</p>
  <div class="sec-t">Welches Tier ist brünstig?</div>
  <div class="chips">${kandidaten.map(t => `<button type="button" class="chip" data-act="meldtier" data-id="${m.id}" data-t="${t.id}">${esc(t.name || t.ohrmarke)}</button>`).join('')}</div>
  <div class="btns" style="margin-top:16px"><button class="btn" data-act="meldverwerfen" data-id="${m.id}">Kein Brunstverhalten / verwerfen</button></div>`);
}

function sensorKarte(sx) {
  if (!sx) return '';
  const pts30 = sx.serie30 || [], pts48 = sx.serie48 || [], pts365 = sx.serie365 || [];
  const v = sx.last ? (sx.last.prozent ?? sx.last.wert) : null, bat = sx.last ? sx.last.batterie : null, pc = sx.last && sx.last.prozent !== undefined && sx.last.prozent !== null;
  const low = pc && v !== null && v < 30;
  const zt = t => { const d = new Date(t); return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const zd = t => { const d = new Date(t); return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`; };
  const u = pc ? '%' : 'cm';
  const fi = sx.fehlerInfo, fwarn = sx.fehlerSeit ? `<div class="note" style="margin:8px 0"><b>Seit ${zt(sx.fehlerSeit)} nur Fehlmessungen.</b> Angezeigt wird der letzte gültige Wert. Letzte Messung ${fi ? `${zt(fi.zeit)}: ${fi.wert ?? '-'} cm, SRC ${fi.src ?? '-'}, SRSSI ${fi.srssi ?? '-'}` : ''} (Fehlecho: SRSSI unter 4, SRC 0, oder SRC 1-2 mit SRSSI unter 8; ausserdem Füllstand ausserhalb 0-100 %). Sensor prüfen: Kondenswasser, Reif, Spinnennetz, Gegenstand im Schallweg.</div>` : '';
  const line = (pts, fmtL, ft = zt) => pts.length > 1 ? svgLines([pts.map(p => p[1])], pts.map(p => fmtL(p[0])), ['#2E8B62'], 130, pts.map(p => `${ft(p[0])} · ${nf(Math.round(p[1] * 10) / 10)} ${u}`), pc) : '<div class="empty">Keine Daten.</div>';
  return `${fwarn}<div class="stats"><div class="stats-row"><span class="stats-h">Aktuell</span><span class="stat ${low ? 'low' : ''}"><b>${v === null ? '-' : nf(Math.round(v))}<small style="font-size:11px"> ${u}</small></b><span>${pc ? 'Füllstand' : 'Abstand (ullage)'}</span></span><span class="stat"><b>${bat === null || bat === undefined ? '-' : nf(bat)}</b><span>Batterie %</span></span><span class="stat"><b class="zeit">${sx.last && sx.last.zeit ? zt(sx.last.zeit) : '-'}</b><span>Messung</span></span></div></div>
  <div class="card" style="margin-top:8px"><div class="small muted">Letzte 48 Stunden</div>${line(pts48, t => new Date(t).getHours() + 'h')}<div class="small muted" style="margin-top:8px">Letzte 30 Tage</div>${line(pts30, t => { const d = new Date(t); return d.getDate() + '.' + (d.getMonth() + 1); })}<div class="small muted" style="margin-top:8px">Letzte 365 Tage (Tagesmittel)</div>${pts365.length > 1 ? line(pts365, t => MON[new Date(t).getMonth()], zd) : '<div class="empty">Jahresverlauf wird beim nächsten Abgleich geladen.</div>'}</div>`;
}
function agroKarte(a) {
  if (!a) return '';
  const jetzt = new Date(); if (+a.jahr === jetzt.getFullYear()) { a = clean(a); for (const k of ['regen', 'temp']) if (a[k] && a[k].akt) for (let m = jetzt.getMonth(); m < 12; m++) a[k].akt[m] = null; }
  const ML = MON.map(m => m.slice(0, 1)), cols = ['#2E8B62', '#E0A35C', '#5B8FD6'];
  const leg = `<div class="legend"><span><i class="sw" style="background:${cols[0]}"></i>${a.jahr || 'Aktuell'}</span><span><i class="sw" style="background:${cols[1]}"></i>Vorjahr</span><span><i class="sw" style="background:${cols[2]}"></i>Ø seit ${a.seit || '2004'}</span></div>`;
  const cum = arr => { let t = 0; return arr.map(v => v === null || v === undefined ? null : Math.round((t += v) * 10) / 10); };
  const FM = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const L = (ser, u) => svgLines(ser, ML, cols, 130, FM.map((m, i) => `${m}: ${ser.map((x, k) => (['Aktuell', 'Vorjahr', 'Ø'][k]) + ' ' + (x[i] === null || x[i] === undefined ? '-' : nf(x[i]))).join(' · ')} ${u}`), false, true);
  return `<div class="sec-t">Agrometeo (Station ${esc(a.station || '')})</div>
  ${a.regen ? `<div class="card"><div class="small muted">Niederschlag pro Monat (mm)</div>${L([a.regen.akt, a.regen.vor, a.regen.avg], 'mm')}${leg}</div>
  <div class="card"><div class="small muted">Niederschlag kumuliert (mm)</div>${L([cum(a.regen.akt), cum(a.regen.vor), cum(a.regen.avg)], 'mm')}${leg}</div>` : ''}
  ${a.temp ? `<div class="card"><div class="small muted">Durchschnittstemperatur pro Monat (°C)</div>${L([a.temp.akt, a.temp.vor, a.temp.avg], '°C')}${leg}</div>
  <div class="card"><div class="small muted">Durchschnittstemperatur kumuliert (°C)</div>${L([cum(a.temp.akt), cum(a.temp.vor), cum(a.temp.avg)], '°C')}${leg}</div>` : ''}
  <div class="small muted" style="margin:6px 4px">Aktualisiert ${a.aktualisiert ? esc(new Date(a.aktualisiert).toLocaleString('de-CH')) : '-'}</div>`;
}

function vSettings() {
  const s = S.set, open = UI.setOpen || '';
  const grp = (id, title, sub, body) => `<details class="acc" name="einst" data-acc="${id}" ${open === id ? 'open' : ''}><summary><span><b>${title}</b><small>${sub}</small></span><i>›</i></summary><div class="acc-b">${body}</div></details>`;
  const fld = (n, l, v, extra = '') => `<label class="fld"><span>${l}</span><input name="${n}" value="${esc(v ?? '')}" ${extra}></label>`;
  const numf = (n, l, v) => fld(n, l, v, 'type="number" inputmode="decimal"');
  const ta = (n, l, v, ph = '') => `<label class="fld"><span>${l}</span><textarea name="${n}" rows="4" placeholder="${ph}">${esc(v)}</textarea></label>`;
  return `<form class="form" id="setform" style="margin-top:8px;gap:8px">
  ${grp('hof', 'Hof', s.hofname || '', fld('hofname', 'Hofname', s.hofname) + fld('betrieb', 'Betrieb (Kopf PDF)', s.betrieb) + fld('tvd', 'TVD-Nummer', s.tvd) + numf('lat', 'Wetter: Breitengrad', s.lat) + numf('lon', 'Wetter: Längengrad', s.lon))}
  ${grp('zucht', 'Zucht & Alp', `Tragzeit ${s.tragzeit} T. · Alp ${s.alpVon} bis ${s.alpBis}`, numf('tragzeit', 'Tragzeit (Tage)', s.tragzeit) + numf('kalbMonate', 'Kalb bis (Monate)', s.kalbMonate) + numf('laktAbMonate', 'Laktations-KPI ab (Monate)', s.laktAbMonate) + numf('abgekalbtTage', 'Status "Abgekalbt" während (Tage)', s.abgekalbtTage) + fld('alpVon', 'Alp von, Schätzung (MM-TT)', s.alpVon, 'placeholder="05-25"') + fld('alpBis', 'Alp bis, Schätzung (MM-TT)', s.alpBis, 'placeholder="10-05"') + numf('puffer', 'Puffer Besamungsverbot (Tage)', s.puffer))}
  ${grp('liste', 'Tierliste', `unbesamt ab ${s.unbesamtAb} Mt. · Abkalbung ${s.baldTage} T.`, numf('unbesamtAb', 'Unbesamt markieren ab (Monate)', s.unbesamtAb) + numf('baldTage', 'Abkalbung markieren (Tage vorher)', s.baldTage))}
  ${grp('listen', 'Auswahllisten', 'Gründe, Medikamente', ta('gruende', 'Gründe Stall / Laufhof', (s.gruende || []).join('\n')) + ta('medikamente', 'Medikamente (Name ; Absetzfrist Tage)', (s.medikamente || []).map(m => `${m.name} ; ${m.frist}`).join('\n'), 'Beispielpräparat ; 21'))}
  ${grp('lager', 'Lager', `Heu ${nf(num(s.startHeu))} · Silage ${nf(num(s.startSilo))} · Stroh ${nf(num(s.startStroh))}`, numf('startHeu', 'Startbestand Heuballen', s.startHeu) + numf('startSilo', 'Startbestand Silageballen', s.startSilo) + numf('startStroh', 'Startbestand Strohballen', s.startStroh))}
  ${grp('sensoren', 'Sensoren & Wetterdaten', s.akenzaKey ? 'akenza verbunden' : 'nicht verbunden', `<p class="small muted" style="margin:0">Die Daten lädt ein Hintergrund-Job stündlich (Agrometeo täglich) in hofbuech. Schlüssel und Passwort liegen nur in deiner Datenbank, nicht im Code.</p>` + fld('akenzaKey', 'akenza API-Key (x-api-key)', s.akenzaKey, 'type="password" autocomplete="off"') + fld('sensWasser', 'Gerät Wasserstand (akenza Device-ID)', s.sensWasser ?? '02bdf0b1b64b4c40') + fld('sensFass', 'Gerät Tränkefass (akenza Device-ID)', s.sensFass ?? '029412d5966ce1d4') + fld('fassLeer', 'Tränkefass: Abstand bei leer (cm)', s.fassLeer, 'inputmode="decimal" placeholder="83"') + fld('fassVoll', 'Tränkefass: Abstand bei voll (cm)', s.fassVoll, 'inputmode="decimal" placeholder="9.3"') + fld('wasserLeer', 'Wasserstand: Abstand bei leer (cm)', s.wasserLeer, 'inputmode="decimal" placeholder="214"') + fld('wasserVoll', 'Wasserstand: Abstand bei voll (cm)', s.wasserVoll, 'inputmode="decimal" placeholder="56"') + fld('agroUser', 'Agrometeo / vitimeteo Benutzer', s.agroUser ?? 'erdinmatthias') + fld('agroPass', 'Agrometeo / vitimeteo Passwort', s.agroPass, 'type="password" autocomplete="off"') + fld('agroStation', 'Agrometeo Station', s.agroStation ?? '177') + fld('grafanaUrl', 'Grafana-Link zum Einbetten (optional)', s.grafanaUrl, 'placeholder="https://..."'))}
  <button class="btn pri block" type="submit" style="margin-top:6px">Einstellungen speichern</button>
  </form>
  <div class="form" style="gap:8px;margin-top:8px">
  ${grp('push', 'Benachrichtigungen', localStorage.getItem('hb-push') ? 'auf diesem Gerät aktiv' : 'aus', `<p class="small muted" style="margin:0">Täglich am Morgen eine Push-Nachricht mit den Terminen: Abkalbung (7 Tage, 1 Tag vorher, am Tag), Brunst, Brunstkontrolle, Absetzfrist, Labiola-Pendenzen und Schnitttermine, Alp. iPhone: nur über das Homescreen-Icon.</p><button class="btn ${localStorage.getItem('hb-push') ? '' : 'pri'}" data-act="push">${localStorage.getItem('hb-push') ? 'Push erneuern' : 'Push auf diesem Gerät aktivieren'}</button>`)}
  ${grp('daten', 'Daten & Konto', mode === 'firebase' && USER ? USER.email : 'nur dieses Gerät', `<p class="small muted" style="margin:0">Speicherort: <b>${mode === 'firebase' ? 'Firebase (synchronisiert)' : 'nur dieses Gerät'}</b> · Version ${VERSION}</p><div class="btns"><button class="btn" data-act="backup">Backup herunterladen</button><label class="btn">Datei einlesen (Backup/Import)<input type="file" accept="application/json" data-act="restore" class="hidden"></label><label class="btn">Behandlungen-Import (Excel)<input type="file" accept=".xlsx,.xls,.csv" data-act="behimport" class="hidden"></label><label class="btn">TVD-Import (Excel)<input type="file" accept=".xlsx,.xls,.csv" data-act="tvdimport" class="hidden"></label>${mode === 'firebase' ? '<button class="btn" data-act="logout">Abmelden</button>' : ''}</div>`)}
  </div>`;
}

/* ---------- Formulare ---------- */
const ART = ['i.m.', 's.c.', 'i.v.', 'oral', 'äusserlich', 'intramammär'];
const VERLAUF = [['leicht', 'leicht'], ['mittel', 'mittel'], ['schwer', 'schwer'], ['Kaiserschnitt', 'Kaiserschnitt']];
const LAGE = [['Vorderendlage', 'Vorderend'], ['Hinterendlage', 'Hinterend'], ['Steisslage', 'Steiss'], ['Querlage', 'Quer']];
const GROESSE = [['klein', 'klein'], ['mittel', 'mittel'], ['gross', 'gross']];
const FORMS = {
  zugang: { t: 'Zugang', coll: 'tiere', fields: [
    { k: 'name', l: 'Name', t: 'text' }, { k: 'ohrmarke', l: 'Ohrmarke', t: 'text', ph: 'CH 120.1234.5678.9' },
    { k: 'geschlecht', l: 'Geschlecht', t: 'seg', o: [['w', 'weiblich'], ['m', 'männlich']], def: 'w' },
    { k: 'geburt', l: 'Geburtsdatum', t: 'date', def: '' }, { k: 'zugang', l: 'Zugangsdatum (leer = Geburtsdatum)', t: 'date' },
    { k: 'mutterId', l: 'Mutter (falls im Bestand)', t: 'tier', opt: true, filter: t => t.geschlecht === 'w' },
    { k: 'mutterName', l: 'Mutter (Name, falls nicht im Bestand)', t: 'text' },
    { k: 'rasse', l: 'Rasse', t: 'tag', list: rassen },
    { k: 'gekalbert', l: 'Schon gekalbert (vor hofbuech)', t: 'seg', o: [['nein', 'nein'], ['ja', 'ja']], def: 'nein', show: v => v.geschlecht === 'w' },
    { k: 'notiz', l: 'Notiz', t: 'textarea' }],
    more: true },
  tiere: null,
  abgang: { t: 'Abgang', fields: [
    { k: 'tierIds', l: 'Tiere', t: 'tiere' }, { k: 'abgang', l: 'Datum', t: 'date' },
    { k: 'abgangGrund', l: 'Grund', t: 'seg', o: [['Schlachtung', 'Schlachtung'], ['Verkauf', 'Verkauf'], ['Tod', 'Tod'], ['Sonstiges', 'Sonstiges']], def: 'Schlachtung' }],
    save(v) { v.tierIds.forEach(id => { const t = tierById(id); if (t) put('tiere', { ...t, abgang: v.abgang, abgangGrund: v.abgangGrund }); }); } },
  geburt: { t: 'Geburt', coll: 'ereignisse', fields: [
    { k: 'tierId', l: 'Mutter', t: 'tier', filter: t => t.geschlecht === 'w' && (alterMt(t) === null || alterMt(t) >= 12) },
    { k: 'datum', l: 'Geburtsdatum', t: 'date' },
    { k: 'verlauf', l: 'Verlauf', t: 'seg', o: VERLAUF, def: 'leicht' },
    { k: 'lage', l: 'Lage', t: 'seg', o: LAGE, def: 'Vorderendlage' },
    { k: 'groesse', l: 'Grösse Kalb', t: 'seg', o: GROESSE, def: 'mittel' },
    { k: 'totgeburt', l: 'Kalb', t: 'seg', o: [['', 'lebend'], ['true', 'Totgeburt']], def: '' },
    { k: 'kalbName', l: 'Name Kalb', t: 'text' }, { k: 'kalbOhrmarke', l: 'Ohrmarke Kalb', t: 'text' },
    { k: 'kalbGeschlecht', l: 'Geschlecht Kalb', t: 'seg', o: [['w', 'weiblich'], ['m', 'männlich']], def: 'w' },
    { k: 'kalbRasse', l: 'Rasse Kalb (von Mutter)', t: 'tag', list: rassen },
    { k: 'notiz', l: 'Notiz', t: 'textarea', rows: 5 }],
    hint: 'Legt das Kalb als neues Tier an und erstellt den Abkalbe-Eintrag bei der Mutter. Bei Totgeburt wird nur die Abkalbung gespeichert und das Kalb unter Nachkommen gelistet, nicht in der Tierliste. TVD-Meldung nicht vergessen.',
    onTier(form, t) { if (!t || !t.rasse) return; const box = $('[data-tag="kalbRasse"]', form); let c = $$('.chip', box).find(x => x.dataset.v === t.rasse); $$('.chip', box).forEach(x => x.classList.remove('on')); if (c) c.classList.add('on'); else { const n = box.querySelector('input'); if (n) n.value = t.rasse; } },
    save(v) {
      if (v.totgeburt) return put('ereignisse', { typ: 'abkalbung', tierId: v.tierId, datum: v.datum, verlauf: v.verlauf, lage: v.lage, groesse: v.groesse, totgeburt: true, kalbName: v.kalbName, kalbOhrmarke: v.kalbOhrmarke, kalbGeschlecht: v.kalbGeschlecht, notiz: v.notiz });
      const k = put('tiere', { name: v.kalbName, ohrmarke: v.kalbOhrmarke, geschlecht: v.kalbGeschlecht, geburt: v.datum, zugang: v.datum, mutterId: v.tierId, rasse: v.kalbRasse });
      put('ereignisse', { typ: 'abkalbung', tierId: v.tierId, datum: v.datum, verlauf: v.verlauf, lage: v.lage, groesse: v.groesse, kalbId: k.id, notiz: v.notiz });
    } },
  abkalbung: { t: 'Abkalbung', coll: 'ereignisse', fields: [
    { k: 'tierId', l: 'Mutter', t: 'tier', filter: t => t.geschlecht === 'w', hideEdit: true }, { k: 'datum', l: 'Datum', t: 'date' },
    { k: 'verlauf', l: 'Verlauf', t: 'seg', o: VERLAUF },
    { k: 'lage', l: 'Lage', t: 'seg', o: LAGE },
    { k: 'groesse', l: 'Grösse Kalb', t: 'seg', o: GROESSE },
    { k: 'totgeburt', l: 'Kalb', t: 'seg', o: [['', 'lebend'], ['true', 'Totgeburt']], def: '' },
    { k: 'notiz', l: 'Notiz', t: 'textarea', rows: 7 }], prep: v => { v.totgeburt = !!v.totgeburt; } },
  brunst: { t: 'Brunst', coll: 'ereignisse', fields: [
    { k: 'tierId', l: 'Tier', t: 'tier', filter: t => t.geschlecht === 'w' && kategorie(t) !== 'Kalb' },
    { k: 'datum', l: 'Datum', t: 'date' },
    { k: 'sicherheit', l: 'Sicherheit', t: 'seg', o: [['unsicher', 'unsicher'], ['normal', 'normal'], ['sehr sicher', 'sehr sicher']], def: 'normal' },
    { k: 'notiz', l: 'Notiz', t: 'textarea' }],
    calc: v => v.datum ? `Nächste Brunst ca. <b>${fmt(addDays(v.datum, 21))}</b>${imVerbot(v.datum) ? ' <span class="pill red">Besamungsverbot</span>' : ''}` : '' },
  besamung: { t: 'Besamung', coll: 'ereignisse', fields: [
    { k: 'tierId', l: 'Tier', t: 'tier', filter: t => t.geschlecht === 'w' && kategorie(t) !== 'Kalb' },
    { k: 'datum', l: 'Datum', t: 'date' },
    { k: 'stier', l: 'Stier', t: 'tag', list: () => [...new Set(S.ereignisse.filter(e => e.stier).map(e => e.stier))] },
    { k: 'notiz', l: 'Notiz', t: 'textarea' }],
    calc: v => v.datum ? `Brunstkontrolle <b>${fmt(addDays(v.datum, 21))}</b> · Abkalbung ca. <b>${fmt(addDays(v.datum, S.set.tragzeit))}</b>${inAlp(addDays(v.datum, S.set.tragzeit)) ? ' <span class="pill red">während Alp!</span>' : ''}` : '' },
  auslauf: { t: 'Auslaufjournal', coll: 'auslauf', fields: [
    { k: 'datum', l: 'Ab Datum', t: 'date' },
    { k: 'bis', l: 'Bis Datum (leer = läuft weiter)', t: 'date', def: '' },
    { k: 'typ', l: 'Wo (alle Tiere)', t: 'seg', o: [['Weide', 'Weide'], ['Laufhof', 'Laufhof'], ['Alp', 'Alp']], def: 'Weide' },
    { k: 'parzelle', l: 'Parzelle', t: 'tag', fixed: true, list: parzellen, show: v => v.typ === 'Weide' },
    { k: 'grund', l: 'Grund', t: 'tag', list: gruende, show: v => v.typ === 'Laufhof' },
    { k: 'notiz', l: 'Notiz', t: 'textarea' }],
    saveEdit: true,
    save(v, rec) {
      // Der gespeicherte Eintrag gilt für seinen Zeitraum, überlagerte Einträge werden überschrieben
      const von = v.datum, bis = v.bis && v.bis >= von ? v.bis : ''; delete v.bis;
      const all = sortedAuslauf(), sl = all.filter(a => !rec || a.id !== rec.id);
      const oldNext = rec ? all.find(a => a.datum > rec.datum) : null;
      if (bis) {
        const b1 = addDays(bis, 1);
        if (oldNext && oldNext.datum > b1 && oldNext.datum > von) {
          sl.filter(a => a.datum >= von && a.datum <= bis).forEach(a => del('auslauf', a.id));
          put('auslauf', { ...oldNext, datum: b1 });
        } else {
          const nach = herdeAm(b1, sl), startsNext = sl.some(a => a.datum === b1);
          sl.filter(a => a.datum >= von && a.datum <= bis).forEach(a => del('auslauf', a.id));
          if (nach && !startsNext) put('auslauf', { datum: b1, typ: nach.typ, parzelle: nach.parzelle || '', grund: nach.grund || '', notiz: '' });
        }
      } else sl.filter(a => a.datum === von).forEach(a => del('auslauf', a.id));
      put('auslauf', { ...(rec || {}), ...v });
    } },
  behandlung: { t: 'Behandlung', coll: 'behandlungen', fields: [
    { k: 'tierIds', l: 'Tiere', t: 'tiere' }, { k: 'datum', l: 'Behandlung von', t: 'date' }, { k: 'bis', l: 'Behandlung bis (leer = 1 Tag)', t: 'date', def: '' },
    { k: 'grund', l: 'Behandlungsgrund', t: 'text' },
    { k: 'medikament', l: 'Arzneimittel', t: 'text', list: () => (S.set.medikamente || []).map(m => m.name) },
    { k: 'menge', l: 'Menge pro Tier', t: 'text', ph: 'z.B. 20 ml' },
    { k: 'frist', l: 'Absetzfrist Fleisch (Tage)', t: 'number', def: '0' },
    { k: 'erfasst', l: 'Erfassungsdatum', t: 'date' },
    { k: 'durch', l: 'Name', t: 'text', def: 'Matthias Erdin', list: () => [...new Set(['Matthias Erdin', ...S.behandlungen.map(b => b.durch).filter(x => x && x !== 'Tierhalter')])] },
    { k: 'unterschrift', l: 'Unterschrift', t: 'sign', req: true },
    { k: 'notiz', l: 'Notiz', t: 'textarea' }],
    calc: v => v.datum ? `Freigabe Fleisch ab: <b>${fmt(addDays(v.bis && v.bis >= v.datum ? v.bis : v.datum, num(v.frist)))}</b>` : '',
    prep: v => { if (!v.bis || v.bis < v.datum) v.bis = ''; v.freiAb = addDays(v.bis || v.datum, num(v.frist)); v.frist = num(v.frist); } },
};
const lagerCalc = typ => v => { const w = feldWarnung(typ, v.parzelle, v.datum); const L = lager(), k = { Heu: 'heu', Silage: 'silo', Stroh: 'stroh' }[v.was]; if (!k) return w; const cur = L[k], n = cur + (typ === 'verbrauch' ? -1 : 1) * num(v.menge); return `Lager ${v.was}: ${nf(cur)} → <b>${nf(n)}</b> ${v.was === 'Stroh' ? 'Kleinballen' : 'Ballen'}` + w; };
const fDat = { k: 'datum', l: 'Datum', t: 'date' }, fNot = { k: 'notiz', l: 'Notiz', t: 'textarea' }, fPz = { k: 'parzelle', l: 'Parzelle', t: 'tag', fixed: true, list: parzellen };
const segW = o => ({ k: 'was', l: 'Was', t: 'seg', o: o.map(x => [x, x]), def: o[0] });
Object.assign(FORMS, {
  ernte: { t: 'Ernte', coll: 'feld', typ: 'ernte', fields: [fDat, segW(['Heu', 'Silage']), fPz, { k: 'menge', l: 'Anzahl Ballen', t: 'number' }, fNot], calc: lagerCalc('ernte') },
  kauf: { t: 'Kauf', coll: 'feld', typ: 'kauf', fields: [fDat, segW(['Heu', 'Silage', 'Stroh']), { k: 'verkaeufer', l: 'Verkäufer', t: 'tag', list: () => [...new Set(S.feld.map(f => f.verkaeufer).filter(Boolean))] }, { k: 'menge', l: 'Anzahl Ballen (Stroh: Kleinballen)', t: 'number' }, fNot], calc: lagerCalc('kauf') },
  verbrauch: { t: 'Verbrauch (Fütterung)', coll: 'feld', typ: 'verbrauch', fields: [fDat, segW(['Heu', 'Silage', 'Stroh']), { k: 'menge', l: 'Anzahl Ballen (Stroh: Kleinballen)', t: 'number' }, fNot], calc: lagerCalc('verbrauch') },
  duengung: { t: 'Düngung', coll: 'feld', typ: 'duengung', fields: [fDat, fPz, segW(['Gülle', 'Mist']), { k: 'menge', l: 'Menge (Gülle m³, Mist t)', t: 'number' }, fNot], calc: v => feldWarnung('duengung', v.parzelle, v.datum) },
});
FORMS.tiere = { ...FORMS.zugang, t: 'Tier bearbeiten', more: false };
FORMS.lobjekt = { t: 'Labiola-Objekt', coll: 'labiola', prep: v => { v.szp = mmtt(v.szp); v.aren = num(v.aren); v.beitrag = num(v.beitrag); }, fields: [
  { k: 'nr', l: 'Objekt-Nr.', t: 'text' }, { k: 'flurname', l: 'Flurname', t: 'text' },
  { k: 'typ', l: 'Typ', t: 'tag', list: () => [...new Set(S.labiola.map(o => o.typ).filter(Boolean))] },
  { k: 'aren', l: 'Aren / Einheiten', t: 'number' }, { k: 'szp', l: 'Schnittzeitpunkt SZP (TT.MM.)', t: 'text', ph: '15.06.' },
  { k: 'duengen', l: 'Düngung erlaubt', t: 'seg', o: [['nein', 'nein'], ['ja', 'ja']], def: 'nein' },
  { k: 'parzelle', l: 'Liegt auf Parzelle', t: 'tag', fixed: true, list: parzellen },
  { k: 'massnahmen', l: 'Massnahmen / Bemerkung', t: 'textarea' }, { k: 'beitrag', l: 'Beitrag CHF/Jahr', t: 'number' }] };
FORMS.aufgabe = { t: 'Labiola-Pendenz', coll: 'aufgaben', prep: v => { v.faelligMT = mmtt(v.faelligMT); v.abMT = mmtt(v.abMT); }, fields: [
  { k: 'titel', l: 'Aufgabe', t: 'text' }, { k: 'objekt', l: 'Objekt', t: 'tag', list: () => S.labiola.map(o => `Obj. ${o.nr}`) },
  { k: 'art', l: 'Wiederholung', t: 'seg', o: [['jaehrlich', 'jährlich'], ['einmalig', 'einmalig']], def: 'jaehrlich' },
  { k: 'faelligMT', l: 'Fällig bis (TT.MM.)', t: 'text', ph: '31.05.', show: v => v.art !== 'einmalig' },
  { k: 'faellig', l: 'Fällig bis (Datum)', t: 'date', show: v => v.art === 'einmalig' },
  { k: 'abMT', l: 'Frühestens ab (TT.MM., optional)', t: 'text' }, { k: 'notiz', l: 'Notiz', t: 'textarea' }] };
FORMS.lschnitt = { t: 'Labiola-Schnitt', coll: 'lprotokoll', fields: [
  { k: 'datum', l: 'Datum', t: 'date' }, { k: 'objekt', l: 'Objekt', t: 'tag', list: () => [...new Set([...S.labiola.map(o => `Obj. ${o.nr}`), ...S.lprotokoll.map(x => x.objekt)])] },
  { k: 'teil', l: 'Teil', t: 'tag', list: () => [...new Set(['oberer Teil', 'unterer Teil', 'mittleres Stück', 'ganze Fläche', ...S.lprotokoll.map(x => x.teil)].filter(Boolean))] },
  { k: 'art', l: 'Art', t: 'seg', o: [['Heu', 'Heu'], ['Emd', 'Emd'], ['Silage', 'Silage']], def: 'Heu' }, { k: 'notiz', l: 'Notiz', t: 'textarea' }] };
FORMS.notiz = { t: 'Notiz', coll: 'notizen', fields: [
  { k: 'titel', l: 'Titel', t: 'text' }, { k: 'kategorie', l: 'Kategorie', t: 'tag', list: () => [...new Set(['Maschinen', 'Labiola', 'Tiere', 'Hof', ...S.notizen.map(n => n.kategorie)].filter(Boolean))] },
  { k: 'text', l: 'Text', t: 'textarea' }, { k: 'bilder', l: 'Bilder', t: 'bilder' }, { k: 'datum', l: 'Datum', t: 'date' }] };
FORMS.parzelle = { t: 'Parzelle', coll: 'parzellen', prep: v => { ['schnittAb', 'fruehBis', 'schnitt2Ab'].forEach(k => v[k] = mmtt(v[k])); v.ha = num(v.ha); }, fields: [
  { k: 'name', l: 'Name', t: 'text', ph: 'z.B. Bannhalde Ost' }, { k: 'ha', l: 'Fläche (ha)', t: 'number' },
  { k: 'nutzung', l: 'Nutzung', t: 'seg', o: [['Wiese', 'Wiese'], ['Weide', 'Weide'], ['Mähweide', 'Mähweide'], ['Acker', 'Acker']], def: 'Wiese' },
  { k: 'programm', l: 'Programm / Vertrag', t: 'tag', list: () => [...new Set(['Labiola', 'BFF Q1', 'BFF Q2', 'Vernetzung', ...S.parzellen.map(x => x.programm)].filter(Boolean))] },
  { k: 'schnittAb', l: 'Frühester 1. Schnitt (TT.MM.)', t: 'text', ph: '15.06.' },
  { k: 'fruehBis', l: 'Frühschnitt spätestens (TT.MM., Schnittstaffelung)', t: 'text', ph: '31.05.' },
  { k: 'schnitt2Ab', l: 'Frühester 2. Schnitt (TT.MM.)', t: 'text', ph: '' },
  { k: 'duengen', l: 'Düngung erlaubt', t: 'seg', o: [['ja', 'ja'], ['nein', 'nein']], def: 'ja' },
  { k: 'notiz', l: 'Auflagen / Notiz', t: 'textarea' }],
  hint: 'Daten aus deiner Labiola-Bewirtschaftungsvereinbarung übernehmen. Termine erscheinen im Kalender, Verstösse werden beim Erfassen gewarnt.' };

let sheetOpen = null, lockY = 0;
function lockScroll(on) {
  const b = document.body;
  if (on && !b.classList.contains('lock')) { lockY = window.scrollY; b.style.top = -lockY + 'px'; b.classList.add('lock'); }
  if (!on && b.classList.contains('lock')) { b.classList.remove('lock'); b.style.top = ''; window.scrollTo(0, lockY); }
}
function openSheet(title, body, { onSave, saveLabel = 'Sichern', onDelete } = {}) {
  closeSheet(true);
  const wrap = $('#sheets');
  wrap.innerHTML = `<div class="backdrop"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-h"><button type="button" data-x class="${onSave ? '' : 'zurueck'}">${onSave ? 'Abbrechen' : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>Zurück'}</button><b>${esc(title)}</b>${onSave ? '' : '<button type="button" data-x class="xrund" aria-label="Schliessen"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'}${onSave ? `<button type="button" class="save" data-s>${saveLabel}</button>` : '<span style="width:70px"></span>'}</div><div class="sheet-b">${body}${onDelete ? '<button type="button" class="btn danger block" data-d style="margin-top:18px">Löschen</button>' : ''}</div></div>`;
  const sh = $('.sheet', wrap), bd = $('.backdrop', wrap);
  requestAnimationFrame(() => { sh.classList.add('show'); bd.classList.add('show'); });
  bd.onclick = () => closeSheet(); $$('[data-x]', sh).forEach(b => b.onclick = () => closeSheet());
  if (onSave) $('[data-s]', sh).onclick = onSave;
  if (onDelete) $('[data-d]', sh).onclick = () => { if (confirm('Wirklich löschen?')) { onDelete(); closeSheet(); } };
  sheetOpen = sh; lockScroll(true);
  return sh;
}
function closeSheet(instant) {
  const wrap = $('#sheets'); $('#plus').classList.remove('open');
  if (!wrap.innerHTML) return;
  lockScroll(false);
  if (instant) { wrap.innerHTML = ''; sheetOpen = null; return; }
  $$('.sheet,.backdrop', wrap).forEach(e => e.classList.remove('show'));
  setTimeout(() => { wrap.innerHTML = ''; sheetOpen = null; schedule(); }, 200);
}

function plusMenu() {
  $('#plus').classList.add('open');
  const m = location.hash.match(/^#\/tier\/([^/]+)/), tid = m ? m[1] : '';
  const a = (k, l) => `<button type="button" class="act" data-act="form" data-f="${k}"${tid ? ` data-tier="${tid}"` : ''}>${IC[k] || ''}<span>${l}</span></button>`;
  const tt = tid ? tierById(tid) : null;
  openSheet('Neuer Eintrag', `<div class="sec-t" style="margin-top:0">Tiere${tt ? ' · ' + esc(tt.name || tt.ohrmarke) : ''}</div><div class="actgrid">${a('geburt', 'Geburt')}${a('brunst', 'Brunst')}${a('besamung', 'Besamung')}${a('behandlung', 'Behandlung')}${a('auslauf', 'Weide / Stall')}${a('zugang', 'Zugang')}${a('abgang', 'Abgang')}</div>
  <div class="sec-t">Feldkalender</div><div class="actgrid">${a('duengung', 'Düngung')}${a('ernte', 'Ernte')}</div>
  <div class="sec-t">Lager</div><div class="actgrid">${a('verbrauch', 'Verbrauch')}${a('kauf', 'Kauf')}</div>
  <div class="sec-t">Labiola</div><div class="actgrid">${a('aufgabe', 'Pendenz')}</div>`);
}
function fieldHtml(f, v) {
  const val = v[f.k] ?? '';
  const id = 'f_' + f.k;
  const dl = f.list ? `<datalist id="dl_${f.k}">${f.list().map(o => `<option value="${esc(o)}">`).join('')}</datalist>` : '';
  if (f.t === 'seg') return `<div class="fld"><span>${f.l}</span><div class="seg" role="radiogroup">${f.o.map(([ov, ol]) => `<label><input type="radio" name="${f.k}" value="${esc(ov)}" ${String(val) === ov ? 'checked' : ''}>${esc(ol)}</label>`).join('')}</div></div>`;
  if (f.t === 'tag') {
    const opts = f.list(); if (val && !opts.includes(val) && !f.fixed) opts.push(val);
    return `<div class="fld"><span>${f.l}</span><div class="chips" data-tag="${f.k}">${opts.map(o => `<button type="button" class="chip ${o === val ? 'on' : ''}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}${f.fixed ? (opts.length ? '' : '<span class="small muted">Zuerst unter Labiola > Parzellen erfassen.</span>') : `<input name="${f.k}__neu" placeholder="${opts.length ? '+ neu' : 'eingeben'}" autocomplete="off" style="flex:1 1 120px;min-height:36px;border:1px dashed #8A918C;border-radius:99px;padding:0 12px;background:transparent;font-size:12.5px">`}</div></div>`;
  }
  if (f.t === 'bilder') {
    const arr = Array.isArray(val) ? val : [];
    return `<div class="fld"><span>${f.l}</span><div class="thumbs" data-bilder="${f.k}">${arr.map((b, i) => `<span class="th"><img src="${b}" alt=""><button type="button" data-delbild="${i}" aria-label="Bild entfernen">×</button></span>`).join('')}<label class="th add">+<input type="file" accept="image/*" multiple data-addbild="${f.k}" class="hidden"></label></div></div>`;
  }
  if (f.t === 'sign') return `<div class="fld"><span>${f.l}</span><input type="hidden" name="${f.k}" value="${esc(val)}"><div class="sign"><canvas data-sign="${f.k}" width="600" height="200"></canvas><button type="button" class="chip" data-signclear="${f.k}">Neu unterschreiben</button></div></div>`;
  if (f.t === 'textarea') return `<label class="fld"><span>${f.l}</span><textarea name="${f.k}" rows="${f.rows || 2}">${esc(val)}</textarea></label>`;
  if (f.t === 'tier') {
    const opts = S.tiere.filter(t => (aktiv(t) || t.id === val) && (!f.filter || f.filter(t))).sort(sortName);
    return `<div class="fld"><span>${f.l}</span><input type="hidden" name="${f.k}" value="${esc(val)}"><div class="chips" data-tier1="${f.k}">${opts.length ? opts.map(t => `<button type="button" class="chip ${t.id === val ? 'on' : ''}" data-id="${t.id}">${esc(t.name || kurzOM(t.ohrmarke))}</button>`).join('') : '<span class="muted small">Keine passenden Tiere erfasst.</span>'}</div></div>`;
  }
  if (f.t === 'tiere') {
    const sel = new Set(val || []);
    const opts = S.tiere.filter(t => (aktiv(t) || sel.has(t.id)) && (!f.filter || f.filter(t))).sort(sortName);
    return `<div class="fld"><span>${f.l} <span class="muted" data-cnt="${f.k}" style="text-transform:none">(${sel.size} gewählt)</span></span>
    <div class="btns" style="margin-bottom:4px"><button type="button" class="chip" data-all="${f.k}">Alle</button><button type="button" class="chip" data-none="${f.k}">Keine</button></div>
    <div class="picker chips" data-picker="${f.k}">${opts.length ? opts.map(t => `<button type="button" class="chip ${sel.has(t.id) ? 'on' : ''}" data-id="${t.id}">${esc(t.name || t.ohrmarke)}</button>`).join('') : '<span class="muted small">Keine passenden Tiere erfasst.</span>'}</div></div>`;
  }
  const type = f.t === 'number' ? 'text" inputmode="decimal' : f.t;
  return `<label class="fld"><span>${f.l}</span><input id="${id}" name="${f.k}" type="${type}" value="${esc(val)}" ${f.ph ? `placeholder="${esc(f.ph)}"` : ''} ${f.list ? `list="dl_${f.k}"` : ''} autocomplete="off">${dl}</label>`;
}

function openForm(key, rec = null, pre = {}) {
  const def = FORMS[key]; if (!def) return;
  const isEdit = !!rec;
  const v = {};
  def.fields.forEach(f => { v[f.k] = f.t === 'date' ? today() : f.t === 'tiere' ? (f.allDefault ? aktiveTiere().filter(t => !f.filter || f.filter(t)).map(t => t.id) : []) : (typeof f.def === 'function' ? f.def() : (f.def ?? '')); });
  if (rec) { Object.assign(v, rec); if (key === 'lobjekt' && v.szp) v.szp = `${v.szp.slice(3)}.${v.szp.slice(0, 2)}.`; if (key === 'aufgabe') ['faelligMT', 'abMT'].forEach(k => { if (v[k]) v[k] = `${v[k].slice(3)}.${v[k].slice(0, 2)}.`; }); if (key === 'parzelle') ['schnittAb', 'fruehBis', 'schnitt2Ab'].forEach(k => { if (v[k]) v[k] = `${v[k].slice(3)}.${v[k].slice(0, 2)}.`; }); if (def.multi && rec.tierId) v.tierIds = [rec.tierId]; }
  if (pre.tier) { if ('tierIds' in v) v.tierIds = [pre.tier]; if ('tierId' in v) v.tierId = pre.tier; }
  if (key === 'tiere' || key === 'zugang') { if (!rec) { v.geburt = ''; v.zugang = ''; } }
  if (key === 'auslauf') { v.bis = ''; if (rec) { const nx = sortedAuslauf().find(a => a.datum > rec.datum); if (nx) v.bis = addDays(nx.datum, -1); } }
  const body = `${def.hint ? `<div class="note blue small" style="margin-bottom:14px">${def.hint}</div>` : ''}<form class="form" data-form>${def.fields.map(f => `<div data-fk="${f.k}">${fieldHtml(f, v)}</div>`).join('')}<div class="calc" data-calc></div>
  ${def.more && !isEdit ? '<button type="button" class="btn block" data-more>Sichern + nächstes Tier</button>' : ''}</form>`;
  const sh = openSheet(def.t, body, {
    onSave: () => doSave(false),
    onDelete: isEdit ? () => {
      const coll = def.coll || 'tiere';
      del(coll, rec.id);
      if (coll === 'tiere') { toast('Tier gelöscht'); location.hash = '#/tiere'; }
    } : null
  });
  const form = $('[data-form]', sh);
  if (key === 'parzelle' && rec && rec.geo) { const d = document.createElement('div'); d.className = 'karte klein'; form.prepend(d); miniKarte(d, rec); }
  const read = () => {
    const o = {};
    def.fields.forEach(f => {
      if (f.t === 'tiere') o[f.k] = $$(`[data-picker="${f.k}"] .chip.on`, form).map(b => b.dataset.id);
      else if (f.t === 'bilder') o[f.k] = $$(`[data-bilder="${f.k}"] img`, form).map(i => i.getAttribute('src'));
      else if (f.t === 'tag') { const c = $(`[data-tag="${f.k}"] .chip.on`, form); const n = form.elements[f.k + '__neu'] ? (form.elements[f.k + '__neu'].value || '').trim() : ''; o[f.k] = n || (c ? c.dataset.v : ''); }
      else if (f.t === 'seg') { const c = $(`input[name="${f.k}"]:checked`, form); o[f.k] = c ? c.value : ''; }
      else o[f.k] = (form.elements[f.k] && form.elements[f.k].value || '').trim();
    });
    return o;
  };
  const upd = () => { const cur = read(); def.fields.forEach(f => { if (f.show) $(`[data-fk="${f.k}"]`, form).classList.toggle('hidden', !f.show(cur)); }); const c = $('[data-calc]', form); if (def.calc) c.innerHTML = def.calc(read()); $$('[data-cnt]', form).forEach(el => el.textContent = `(${$$(`[data-picker="${el.dataset.cnt}"] .chip.on`, form).length} gewählt)`); };
  form.addEventListener('input', e => {
    form.dataset.dirty = '1';
    if (e.target.name && e.target.name.endsWith('__neu')) $$('.chip', e.target.closest('[data-tag]')).forEach(c => c.classList.remove('on'));
    if (e.target.name === 'zugang') form.dataset.zugTouched = '1';
    if (e.target.name === 'geburt' && form.elements.zugang && !form.dataset.zugTouched) form.elements.zugang.value = e.target.value;
    if (e.target.name === 'medikament') { const m = (S.set.medikamente || []).find(m => m.name === e.target.value); if (m && form.elements.frist) form.elements.frist.value = m.frist; }
    upd();
  });
  form.addEventListener('change', async e => {
    const inp = e.target.closest('[data-addbild]'); if (!inp) return;
    const box = $(`[data-bilder="${inp.dataset.addbild}"]`, form);
    for (const f of [...inp.files]) { const url = await bildKomprimieren(f); const sp = document.createElement('span'); sp.className = 'th'; sp.innerHTML = `<img src="${url}" alt=""><button type="button" data-delbild="x" aria-label="Bild entfernen">×</button>`; box.insertBefore(sp, box.lastElementChild); }
    inp.value = ''; form.dataset.dirty = '1';
  });
  form.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.delbild !== undefined) { b.closest('.th').remove(); form.dataset.dirty = '1'; return; }
    if (b.closest('[data-tag]')) { const on = b.classList.contains('on'); $$('.chip', b.closest('[data-tag]')).forEach(c => c.classList.remove('on')); if (!on) b.classList.add('on'); const n = b.closest('[data-tag]').querySelector('input'); if (n) n.value = ''; form.dataset.dirty = '1'; upd(); return; }
    if (b.closest('[data-picker]')) { b.classList.toggle('on'); form.dataset.dirty = '1'; upd(); }
    if (b.closest('[data-tier1]')) { const box = b.closest('[data-tier1]'), on = b.classList.contains('on'); $$('.chip', box).forEach(c => c.classList.remove('on')); if (!on) b.classList.add('on'); form.elements[box.dataset.tier1].value = on ? '' : b.dataset.id; form.dataset.dirty = '1'; if (def.onTier && !on) def.onTier(form, tierById(b.dataset.id), box.dataset.tier1); upd(); return; }
    if (b.dataset.all) { $$(`[data-picker="${b.dataset.all}"] .chip`, form).forEach(c => c.classList.add('on')); upd(); }
    if (b.dataset.none) { $$(`[data-picker="${b.dataset.none}"] .chip`, form).forEach(c => c.classList.remove('on')); upd(); }
    if ('more' in b.dataset) doSave(true);
  });
  if (def.onTier && pre.tier) def.onTier(form, tierById(pre.tier), 'tierId');
  if (isEdit) def.fields.forEach(f => { if (f.hideEdit) $(`[data-fk="${f.k}"]`, form).classList.add('hidden'); });
  $$('canvas[data-sign]', form).forEach(cv => {
    const k = cv.dataset.sign, inp = form.elements[k], ctx = cv.getContext('2d');
    ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#10201A';
    if (inp.value) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0, cv.width, cv.height); im.src = inp.value; }
    let drawing = false, used = false;
    const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * cv.width, (e.clientY - r.top) / r.height * cv.height]; };
    cv.addEventListener('pointerdown', e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); drawing = true; const [x, y] = pt(e); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1); ctx.stroke(); });
    cv.addEventListener('pointermove', e => { if (!drawing) return; e.preventDefault(); const [x, y] = pt(e); ctx.lineTo(x, y); ctx.stroke(); used = true; });
    const end = () => { if (!drawing) return; drawing = false; used = true; inp.value = cv.toDataURL('image/png'); form.dataset.dirty = '1'; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    $(`[data-signclear="${k}"]`, form).addEventListener('click', () => { ctx.clearRect(0, 0, cv.width, cv.height); inp.value = ''; form.dataset.dirty = '1'; });
  });
  upd();
  function doSave(more) {
    const o = read();
    // Pflichtfelder
    if (def.fields.some(f => f.t === 'date' && !['geburt', 'zugang', 'bis', 'faellig'].includes(f.k)) && def.fields.filter(f => f.t === 'date' && !['geburt', 'zugang', 'bis', 'faellig'].includes(f.k)).some(f => !o[f.k])) return toast('Datum fehlt');
    if ('tierIds' in o && !o.tierIds.length) return toast('Mindestens ein Tier wählen');
    if (def.fields.some(f => f.req && f.t === 'sign' && !o[f.k])) return toast('Unterschrift fehlt');
    if ('tierId' in o && !o.tierId && !def.fields.find(f => f.k === 'tierId').opt) return toast('Tier wählen');
    if ((key === 'zugang' || key === 'tiere') && !o.name && !o.ohrmarke) return toast('Name oder Ohrmarke fehlt');
    if (key === 'zugang' || key === 'tiere') { if (!o.zugang) o.zugang = o.geburt; if (!o.zugang) return toast('Geburts- oder Zugangsdatum fehlt'); }
    def.fields.forEach(f => { if (f.show && !f.show(o)) o[f.k] = ''; });
    if (JSON.stringify(o).length > 950000) return toast('Zu viele/grosse Bilder (max. ca. 1 MB pro Notiz)');
    if (def.prep) def.prep(o);
    if (def.save && (!isEdit || def.saveEdit)) def.save(o, rec);
    else if (def.multi) {
      const ids = o.tierIds; delete o.tierIds;
      ids.forEach((tid, i) => put(def.coll, { ...(isEdit && i === 0 ? rec : {}), ...o, typ: key, tierId: tid, ...(isEdit && i === 0 ? { id: rec.id } : { id: undefined }) }));
    } else {
      const base = isEdit ? { ...rec } : {};
      const obj = { ...base, ...o };
      if (def.typ) obj.typ = def.typ;
      if (def.coll === 'ereignisse' && !obj.typ) obj.typ = key;
      put(def.coll, obj);
    }
    toast('Gespeichert');
    if (more) { form.reset(); form.dataset.dirty = ''; form.dataset.zugTouched = ''; $$('input[type=date]', form).forEach(i => i.value = ['geburt', 'zugang'].includes(i.name) ? '' : today()); $$('[data-tag] .chip,[data-tier1] .chip', form).forEach(c => c.classList.remove('on')); $$('input[type=hidden]', form).forEach(i => i.value = ''); return; }
    closeSheet();
  }
}
function formKey(coll, r) {
  if (coll === 'tiere') return 'tiere';
  if (coll === 'ereignisse') return r.typ;
  if (coll === 'behandlungen') return 'behandlung';
  if (coll === 'auslauf') return 'auslauf';
  if (coll === 'feld') return r.typ;
  if (coll === 'parzellen') return 'parzelle';
  if (coll === 'labiola') return 'lobjekt';
  if (coll === 'aufgaben') return 'aufgabe';
  if (coll === 'lprotokoll') return 'lschnitt';
  if (coll === 'notizen') return 'notiz';
}

/* ---------- PDF ---------- */
let pdfLib = null;
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
async function getPdf() {
  if (!pdfLib) { await loadScript('vendor/jspdf.umd.min.js'); await loadScript('vendor/jspdf.plugin.autotable.min.js'); pdfLib = window.jspdf.jsPDF; }
  return pdfLib;
}
async function makePdf(title, sub, sections, fname, landscape = false) {
  const J = await getPdf();
  const doc = new J({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  doc.setFontSize(16); doc.text(title, 14, 16);
  doc.setFontSize(10); doc.setTextColor(90); doc.text(`${S.set.hofname} · ${sub} · erstellt ${fmt(today())}`, 14, 22); doc.setTextColor(0);
  let y = 28;
  for (const s of sections) {
    if (s.h) { if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 16; } doc.setFontSize(12); doc.text(s.h, 14, y + 4); y += 7; }
    doc.autoTable({ startY: y, head: [s.head], body: s.body.length ? s.body : [[{ content: 'Keine Einträge', colSpan: s.head.length }]], styles: { fontSize: 8.5, cellPadding: 1.6 }, headStyles: { fillColor: [31, 77, 54] }, margin: { left: 14, right: 14 } });
    y = doc.lastAutoTable.finalY + 8;
  }
  const n = doc.internal.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120); doc.text(`Seite ${i} / ${n}`, pw - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' }); }
  await pdfAusgabe(doc, title, fname);
}
async function pdfAusgabe(doc, title, fname) {
  const blob = doc.output('blob');
  const file = new File([blob], fname, { type: 'application/pdf' });
  const touch = matchMedia('(pointer:coarse)').matches;
  if (touch && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  doc.save(fname);
}
/* Querformat-Journale: Kopf, Quartals-Matrix, Seitenfuss */
async function pdfQuer() { const J = await getPdf(); return new J({ orientation: 'landscape', unit: 'mm', format: 'a4' }); }
function pdfKopf(doc, title, tvd) {
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(0); doc.text(title, 10, 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text([S.set.betrieb || DEF.betrieb, tvd ? 'TVD-Nr. ' + (S.set.tvd || DEF.tvd) : ''].filter(Boolean), 287, 9.5, { align: 'right' });
  doc.setDrawColor(31, 77, 54); doc.setLineWidth(0.4); doc.line(10, 16.5, 287, 16.5);
  return 21;
}
function pdfFuss(doc) {
  const n = doc.internal.getNumberOfPages(), w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(120); doc.text(`erstellt ${fmt(today())} · hofbuech`, 10, h - 6); doc.text(`Seite ${i} / ${n}`, w - 10, h - 6, { align: 'right' }); }
  doc.setTextColor(0);
}
const QSTART = ['01-01', '04-01', '07-01', '10-01'];
const QML = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const RH = 4.5, PDF_UNTEN = 196; // Zeilenhöhe Matrix, unterer Rand Inhalt
const qVonBis = (J, q) => [`${J}-${QSTART[q]}`, q < 3 ? addDays(`${J}-${QSTART[q + 1]}`, -1) : `${J}-12-31`];
const matrixH = rows => 9 + rows.length * RH;
// Einheitliche Tabelle (gleiches Design wie Matrix)
function pdfTabelle(doc, y, head, body, { kopf, st = {}, at = {} } = {}) {
  doc.autoTable({
    startY: y, head: [head], body: body.length ? body : [[{ content: 'Keine Einträge', colSpan: head.length }]], theme: 'grid',
    styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.1, textColor: 0, lineColor: [205, 205, 205], lineWidth: 0.05, valign: 'middle', ...st },
    headStyles: { fillColor: [222, 233, 226], textColor: 0, fontStyle: 'bold', lineColor: [90, 90, 90], lineWidth: 0.25 },
    tableLineColor: [90, 90, 90], tableLineWidth: 0.25, margin: { left: 10, right: 10, top: 22, bottom: 14 },
    didDrawPage: d => { if (d.pageNumber > 1 && kopf) kopf(); }, ...at
  });
  return doc.lastAutoTable.finalY;
}
// rows: [{ label, g (Gruppe), cell(d) -> { t, fill } | null }]
function pdfMatrix(doc, J, q, rows, y0) {
  const [von, bis] = qVonBis(J, q);
  const tage = []; for (let d = von; d <= bis; d = addDays(d, 1)) tage.push(d);
  const x0 = 10, lw = 42, dw = (277 - lw) / tage.length, hm = 5, hd = 4, rh = RH;
  const yT = y0 + hm + hd, yE = yT + rows.length * rh, xE = x0 + lw + tage.length * dw;
  // Kopfzeilen und Gruppenzeilen hinterlegen
  doc.setFillColor(222, 233, 226); doc.rect(x0, y0, xE - x0, hm + hd, 'F');
  rows.forEach((r, i) => { if (r.g) doc.rect(x0, yT + i * rh, lw, rh, 'F'); });
  // Wochenenden
  doc.setFillColor(238, 240, 236);
  tage.forEach((d, i) => { const wd = pd(d).getDay(); if (wd === 0 || wd === 6) doc.rect(x0 + lw + i * dw, yT, dw, rows.length * rh, 'F'); });
  // Zellen
  rows.forEach((r, i) => tage.forEach((d, j) => {
    const c = r.cell(d); if (!c) return;
    const x = x0 + lw + j * dw, y = yT + i * rh;
    if (c.fill) { doc.setFillColor(...c.fill); doc.rect(x, y, dw, rh, 'F'); }
    if (c.t) { const fs = c.t.length > 2 ? 4 : 5.2; doc.setFontSize(fs); doc.setFont('helvetica', 'bold'); doc.setTextColor(0); doc.text(c.t, x + dw / 2, y + rh / 2 + fs * 0.12, { align: 'center' }); }
  }));
  // Gitter
  doc.setDrawColor(205); doc.setLineWidth(0.05);
  tage.forEach((d, j) => doc.line(x0 + lw + j * dw, y0 + hm, x0 + lw + j * dw, yE));
  rows.forEach((r, i) => doc.line(x0, yT + i * rh, xE, yT + i * rh));
  doc.setDrawColor(90); doc.setLineWidth(0.25);
  doc.rect(x0, y0, xE - x0, yE - y0); doc.line(x0 + lw, y0, x0 + lw, yE); doc.line(x0, yT, xE, yT);
  // Monate + Tage
  doc.setTextColor(0);
  let start = 0;
  tage.forEach((d, j) => {
    const last = j === tage.length - 1 || tage[j + 1].slice(5, 7) !== d.slice(5, 7);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(4.6); doc.text(String(+d.slice(8)), x0 + lw + j * dw + dw / 2, y0 + hm + hd - 1.1, { align: 'center' });
    if (last) {
      const xa = x0 + lw + start * dw, xb = x0 + lw + (j + 1) * dw;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.text(`${QML[+d.slice(5, 7) - 1]} ${J}`, (xa + xb) / 2, y0 + 3.6, { align: 'center' });
      doc.setDrawColor(90); doc.setLineWidth(0.25); doc.line(xb, y0, xb, yE); doc.line(xa, y0 + hm, xb, y0 + hm);
      start = j + 1;
    }
  });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.text(`${q + 1}. Quartal`, x0 + 1.2, y0 + 6);
  rows.forEach((r, i) => { doc.setFont('helvetica', r.g ? 'bold' : 'normal'); doc.setFontSize(r.g ? 7 : 6.5); doc.text(doc.splitTextToSize((r.g ? '' : '   ') + r.label, lw - 2)[0], x0 + 1.2, yT + i * rh + rh / 2 + 1.1); });
  return yE;
}
// Ganzes Jahr: 2 Quartale pro Seite, wenn es Platz hat; legende(qs) zeichnet die Legende der Seite ab y
function pdfJahrMatrix(doc, title, J, rows, legende = null, legH = () => 0) {
  const mh = matrixH(rows); let q = 0, first = true;
  while (q < 4) {
    const zwei = q % 2 === 0 && 21 + 2 * mh + 6 + legH([q, q + 1]) <= PDF_UNTEN;
    const qs = zwei ? [q, q + 1] : [q];
    if (!first) doc.addPage(); first = false;
    let y = pdfKopf(doc, title, true);
    qs.forEach(qq => { y = pdfMatrix(doc, J, qq, rows, y) + 6; });
    if (legende) legende(qs, y - 2);
    q += qs.length;
  }
}
const tLabel = id => { const t = tierById(id); return t ? `${t.name || ''}${t.ohrmarke ? ' (' + t.ohrmarke + ')' : ''}` : '?'; };
async function pdf(p, id) {
  const J = UI.jahr;
  if (p === 'beh' || p === 'behTier') {
    const list = S.behandlungen.filter(b => p === 'behTier' ? (b.tierIds || []).includes(id) : (b.datum || '').startsWith(J)).sort((a, b) => a.datum < b.datum ? -1 : 1);
    const title = p === 'behTier' ? `Behandlungsjournal ${tName(id)}` : `Behandlungsjournal ${J}`;
    const doc = await pdfQuer(); const y = pdfKopf(doc, title, true);
    const body = [], sig = [];
    list.forEach(b => {
      const zeile = tier => { body.push([fmt(b.datum), fmt(b.bis || b.datum), tier, b.grund || '', [b.medikament, b.menge].filter(Boolean).join(' · '), String(b.frist ?? ''), fmt(freiCalc(b)), fmt(b.erfasst || (b.geaendert ? iso(new Date(b.geaendert)) : '')), b.durch || '', '']); sig.push(b.unterschrift || ''); };
      if (p !== 'behTier' && alleTiere(b.tierIds, b.datum)) return zeile(`Alle Tiere (${(b.tierIds || []).length})`);
      (b.tierIds || []).filter(t => p !== 'behTier' || t === id).forEach(tid => { const t = tierById(tid); zeile(`${t ? t.name || '' : '?'}${t && t.ohrmarke ? '\n' + t.ohrmarke : ''}`); });
    });
    pdfTabelle(doc, y, ['Beh. von', 'Beh. bis', 'Tier (Name / Nr.)', 'Behandlungsgrund', 'Arzneimittel', 'Absetzfrist Fleisch (Tage)', 'Freigabe Fleisch', 'Erfasst', 'Name', 'Unterschrift'], body, {
      kopf: () => pdfKopf(doc, title, true),
      at: { columnStyles: { 0: { cellWidth: 17 }, 1: { cellWidth: 17 }, 2: { cellWidth: 34 }, 5: { cellWidth: 19, halign: 'center' }, 6: { cellWidth: 19 }, 7: { cellWidth: 17 }, 8: { cellWidth: 26 }, 9: { cellWidth: 34 } }, bodyStyles: { minCellHeight: 11 },
        didDrawCell: d => { if (d.section === 'body' && d.column.index === 9 && sig[d.row.index]) { try { doc.addImage(sig[d.row.index], 'PNG', d.cell.x + 1, d.cell.y + 0.8, Math.min(d.cell.width - 2, (d.cell.height - 1.6) * 3), d.cell.height - 1.6); } catch (e) { } } } }
    });
    pdfFuss(doc);
    return pdfAusgabe(doc, title, p === 'behTier' ? `Behandlungen_${tName(id)}.pdf` : `Behandlungsjournal_${J}.pdf`);
  }
  if (p === 'auslaufJahr') {
    const tage = auslaufTage(J), am = Object.fromEntries(tage);
    const pz = [...new Set(tage.filter(([, a]) => a.typ === 'Weide').map(([, a]) => a.parzelle || '(ohne Parzelle)'))].sort((a, b) => a.localeCompare(b, 'de', { numeric: true }));
    const gr = [...new Set(tage.filter(([, a]) => a.typ === 'Laufhof').map(([, a]) => a.grund || '(ohne Grund)'))].sort((a, b) => a.localeCompare(b, 'de'));
    const COL = { Weide: [46, 139, 98], Laufhof: [91, 143, 214], Alp: [224, 163, 92] }, hell = c => c.map(v => Math.round(v + (255 - v) * 0.72));
    const grp = typ => ({ label: typ, g: 1, cell: d => am[d] && am[d].typ === typ ? { fill: hell(COL[typ]), t: typ === 'Alp' ? 'x' : '' } : null });
    const sub = (typ, k, v) => ({ label: v, cell: d => am[d] && am[d].typ === typ && (am[d][k] || (k === 'parzelle' ? '(ohne Parzelle)' : '(ohne Grund)')) === v ? { fill: hell(COL[typ]), t: 'x' } : null });
    const rows = [grp('Weide'), ...pz.map(v => sub('Weide', 'parzelle', v)), grp('Laufhof'), ...gr.map(v => sub('Laufhof', 'grund', v)), grp('Alp')];
    const title = `Auslaufjournal ${J}`, doc = await pdfQuer();
    pdfJahrMatrix(doc, title, J, rows);
    // Zusammenfassung
    doc.addPage(); let y = pdfKopf(doc, `${title} · Zusammenfassung`, true);
    const typs = ['Weide', 'Laufhof', 'Alp'], per = typs.map(() => Array(12).fill(0));
    tage.forEach(([d, a]) => { const k = typs.indexOf(a.typ); if (k >= 0) per[k][+d.slice(5, 7) - 1]++; });
    const tot = per.map(r => r.reduce((a, b) => a + b, 0));
    y = pdfTabelle(doc, y, ['Tage', ...MON, 'Total'], [...typs.map((t, i) => [t, ...per[i], tot[i]]), ['Total', ...MON.map((_, m) => per.reduce((a, r) => a + r[m], 0)), tot.reduce((a, b) => a + b, 0)]], { st: { halign: 'center' }, at: { columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 26, fillColor: [222, 233, 226] } }, didParseCell: d => { if (d.section === 'body' && d.row.index === 3) d.cell.styles.fontStyle = 'bold'; } } });
    // Diagramm Tage pro Monat
    y += 8; doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(0); doc.text(`Tage pro Monat ${J}`, 10, y); y += 4;
    const cx = 18, cw = 269, ch = PDF_UNTEN - y - 12, bw = cw / 12, mx = 31;
    doc.setDrawColor(205); doc.setLineWidth(0.05); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
    [0, 10, 20, 31].forEach(v => { const yy = y + ch - v / mx * ch; doc.line(cx, yy, cx + cw, yy); doc.text(String(v), cx - 2, yy + 1, { align: 'right' }); });
    MON.forEach((m, i) => {
      let yy = y + ch;
      typs.forEach((t, k) => { const v = per[k][i], hh = v / mx * ch; if (hh > 0) { yy -= hh; doc.setFillColor(...COL[t]); doc.rect(cx + i * bw + 3, yy, bw - 6, hh, 'F'); } });
      doc.text(m, cx + i * bw + bw / 2, y + ch + 4, { align: 'center' });
    });
    doc.setDrawColor(90); doc.setLineWidth(0.25); doc.line(cx, y + ch, cx + cw, y + ch);
    let lx = cx; typs.forEach(t => { doc.setFillColor(...COL[t]); doc.rect(lx, y + ch + 7, 3, 3, 'F'); doc.text(t, lx + 4.5, y + ch + 9.5); lx += 28; });
    pdfFuss(doc);
    return pdfAusgabe(doc, title, `Auslaufjournal_${J}.pdf`);
  }
  if (p === 'feld') {
    const aus = S.feld.filter(f => f.typ === 'duengung' && (f.datum || '').startsWith(J)).sort((a, b) => a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : (a.parzelle || '').localeCompare(b.parzelle || ''));
    aus.forEach((f, i) => f._id = i + 1);
    const GF = [208, 226, 243], MF = [236, 221, 196];
    const pzs = [...new Set([...parzellen(), ...aus.map(f => f.parzelle || '(ohne Parzelle)')])];
    const rows = pzs.map(z => ({ label: z, cell: d => { const e = aus.filter(f => f.datum === d && (f.parzelle || '(ohne Parzelle)') === z); if (!e.length) return null; const g = e.some(f => f.was === 'Gülle'), m = e.some(f => f.was === 'Mist'); return { t: e.map(f => f._id).join(','), fill: g && m ? [225, 225, 225] : g ? GF : MF }; } }));
    const title = `Feldkalender ${J}`, doc = await pdfQuer();
    const inQ = qs => aus.filter(f => qs.some(q => { const [v, b] = qVonBis(J, q); return f.datum >= v && f.datum <= b; }));
    const N = 3; // Einträge pro Legendenzeile
    const legH = qs => { const n = inQ(qs).length; return n ? 6 + (Math.ceil(n / N) + 1) * 4.3 : 6; };
    const legende = (qs, y) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(0); doc.text('Austräge (ID)', 10, y + 2.6);
      doc.setFont('helvetica', 'normal'); doc.setFillColor(...GF); doc.rect(32, y + 0.4, 3, 3, 'F'); doc.text('Gülle', 36.5, y + 2.6); doc.setFillColor(...MF); doc.rect(48, y + 0.4, 3, 3, 'F'); doc.text('Mist', 52.5, y + 2.6);
      const e = inQ(qs); if (!e.length) { doc.text('Keine Austräge in diesem Zeitraum.', 64, y + 2.6); return; }
      const body = []; for (let i = 0; i < e.length; i += N) { const r = []; for (let k = 0; k < N; k++) { const f = e[i + k]; r.push(...(f ? [f._id, fmt(f.datum), f.parzelle || '', f.was || '', `${nf(num(f.menge))} ${fE(f).replace('³', '3')}`] : ['', '', '', '', ''])); } body.push(r); }
      const cs = {}; for (let k = 0; k < N; k++) { cs[k * 5] = { cellWidth: 8, halign: 'center', fontStyle: 'bold', fillColor: [222, 233, 226] }; cs[k * 5 + 1] = { cellWidth: 16 }; cs[k * 5 + 3] = { cellWidth: 11 }; cs[k * 5 + 4] = { cellWidth: 15, halign: 'right' }; }
      pdfTabelle(doc, y + 5, Array(N).fill(['ID', 'Datum', 'Parzelle', 'Art', 'Menge']).flat(), body, { kopf: () => pdfKopf(doc, title, true), at: { columnStyles: cs } });
    };
    pdfJahrMatrix(doc, title, J, rows, legende, legH);
    pdfFuss(doc);
    return pdfAusgabe(doc, title, `Feldkalender_${J}.pdf`);
  }
}

/* ---------- Push ---------- */
async function pushAktivieren() {
  if (!AUTH || !window.HB_VAPID) return toast('Push ist noch nicht eingerichtet (VAPID-Schlüssel fehlt in config.js)');
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return toast('Dieser Browser kann keine Push-Nachrichten. iPhone: App zuerst zum Home-Bildschirm hinzufügen.');
  const M = await import(`https://www.gstatic.com/firebasejs/${AUTH.V}/firebase-messaging.js`);
  if (!(await M.isSupported())) return toast('Push hier nicht unterstützt. iPhone: hofbuech über das Homescreen-Icon öffnen.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return toast('Benachrichtigungen nicht erlaubt');
  const reg = await navigator.serviceWorker.ready;
  const token = await M.getToken(M.getMessaging(AUTH.app), { vapidKey: window.HB_VAPID, serviceWorkerRegistration: reg });
  const id = token.replace(/[^A-Za-z0-9]/g, '').slice(-40);
  const db = AUTH.F.getFirestore(AUTH.app);
  await AUTH.F.setDoc(AUTH.F.doc(db, 'hoefe', HOF, 'geraete', id), { token, geraet: navigator.userAgent.slice(0, 120), email: USER.email, aktualisiert: Date.now() });
  localStorage.setItem('hb-push', '1');
  toast('Push aktiviert');
  schedule();
}

/* ---------- TVD-Import (Excel/CSV aus agate.ch) ---------- */
const normOM = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
function parseDatum(v) {
  if (!v) return '';
  if (v instanceof Date) return iso(v);
  const t = String(v).trim();
  let m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0];
  return '';
}
async function tvdImport(file) {
  if (!window.XLSX) await loadScript('vendor/xlsx.mini.min.js');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: true });
  const col = (r, ...names) => { for (const k of Object.keys(r)) { const kk = k.toLowerCase(); if (names.some(n => kk.startsWith(n))) return r[k]; } return ''; };
  const neu = [], upd = [], gleich = [];
  for (const r of rows) {
    const om = String(col(r, 'ohrmarke', 'tvd-nr', 'tiernummer')).trim(); if (!om) continue;
    const g = String(col(r, 'geschlecht')).toLowerCase();
    const d = {
      ohrmarke: om, name: String(col(r, 'name')).trim(), geburt: parseDatum(col(r, 'geburt')),
      geschlecht: g.startsWith('m') ? 'm' : 'w', rasse: String(col(r, 'rasse')).trim()
    };
    const tod = parseDatum(col(r, 'todesdatum', 'abgang'));
    if (tod) { d.abgang = tod; d.abgangGrund = 'Tod'; }
    const ex = S.tiere.find(t => normOM(t.ohrmarke) === normOM(om));
    if (!ex) { d.zugang = d.geburt; neu.push(d); continue; }
    const diffs = Object.keys(d).filter(k => d[k] && d[k] !== ex[k]);
    if (diffs.length) upd.push({ ex, d, diffs }); else gleich.push(ex);
  }
  const imp = new Set(rows.map(r => normOM(col(r, 'ohrmarke', 'tvd-nr', 'tiernummer'))));
  const fehlt = aktiveTiere().filter(t => t.ohrmarke && !imp.has(normOM(t.ohrmarke)));
  const li = (t, extra = '') => `<div class="row" style="cursor:default"><div class="main"><span class="t">${esc(t.name || t.ohrmarke)}</span><span class="s mono">${esc(t.ohrmarke)}${t.geburt ? ' · ' + fmt(t.geburt) : ''}${t.rasse ? ' · ' + esc(t.rasse) : ''}</span></div>${extra}</div>`;
  openSheet('TVD-Import', `
    <div class="kpis" style="margin-bottom:12px"><div class="kpi"><span class="v">${neu.length}</span><span class="l">neu</span></div><div class="kpi"><span class="v">${upd.length}</span><span class="l">aktualisieren</span></div><div class="kpi"><span class="v">${gleich.length}</span><span class="l">unverändert</span></div></div>
    ${neu.length ? `<div class="sec-t">Neue Tiere (Zugang = Geburtsdatum)</div><div class="list">${neu.map(t => li(t)).join('')}</div>` : ''}
    ${upd.length ? `<div class="sec-t">Änderungen</div><div class="list">${upd.map(u => li({ ...u.ex, ...u.d }, `<span class="pill blue">${u.diffs.join(', ')}</span>`)).join('')}</div>` : ''}
    ${fehlt.length ? `<div class="sec-t">Im hofbuech, aber nicht im Export</div><div class="note small">Diese Tiere werden nicht verändert. Abgänge bitte selbst erfassen.</div><div class="list" style="margin-top:8px">${fehlt.map(t => li(t)).join('')}</div>` : ''}
    <p class="small muted">Mutter und Zugangsdatum sind im TVD-Export nicht enthalten und können pro Tier unter "Bearbeiten" ergänzt werden.</p>`,
    {
      saveLabel: 'Importieren', onSave: () => {
        neu.forEach(d => put('tiere', d));
        upd.forEach(u => put('tiere', { ...u.ex, ...Object.fromEntries(u.diffs.map(k => [k, u.d[k]])) }));
        toast(`${neu.length} neu, ${upd.length} aktualisiert`); closeSheet();
      }
    });
}

/* ---------- Gülle / Mist ausbringen (Checkliste Strickhof/ALN ZH "Ausbringen von Gülle und Mist im Winter") ---------- */
let ausbLaden = false;
function ausbDaten() {
  let w = null; try { w = JSON.parse(localStorage.getItem('hb-ausb') || 'null'); } catch (e) { }
  if ((!w || Date.now() - w.t > 3600e3) && !ausbLaden && navigator.onLine !== false) {
    ausbLaden = true;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${S.set.lat}&longitude=${S.set.lon}&daily=precipitation_sum,temperature_2m_mean&hourly=snow_depth,soil_temperature_6cm,soil_moisture_3_to_9cm&past_days=14&forecast_days=4&timezone=Europe%2FZurich`)
      .then(r => r.json()).then(j => { if (j.daily) localStorage.setItem('hb-ausb', JSON.stringify({ t: Date.now(), d: j.daily, h: j.hourly })); ausbLaden = false; schedule(); }).catch(() => { ausbLaden = false; });
  }
  return w;
}
// Status je Kriterium: 'nein' = Verbot, 'pruefen' = selbst kontrollieren, 'ja' = ok
function ausbBewertung(off = 0) {
  const w = ausbDaten(); if (!w || !w.d) return null;
  const D = w.d, H = w.h || {}, t0 = addDays(today(), off), iT = D.time.indexOf(t0);
  if (iT < 0) return null;
  const nowH = new Date(), hNow = !H.time ? -1 : off === 0 ? H.time.findIndex(t => new Date(t) > nowH) - 1 : H.time.indexOf(t0 + 'T23:00');
  const last24 = k => H[k] && hNow >= 0 ? H[k].slice(Math.max(0, hNow - 23), hNow + 1).filter(v => v !== null) : [];
  const K = [];
  // 1. Niederschlag > 20 mm/24 h: vor 1-2 Tagen, heute oder in den nächsten 3 Tagen
  const rr = []; for (let i = iT - 2; i <= iT + 3; i++) if (D.precipitation_sum[i] !== undefined && D.precipitation_sum[i] !== null) rr.push([D.time[i], D.precipitation_sum[i]]);
  const stark = rr.filter(([, v]) => v > 20), rMax = rr.reduce((a, b) => b[1] > a[1] ? b : a, ['', 0]);
  K.push({ id: 'regen', k: 'Starke / anhaltende Niederschläge', s: stark.length ? 'nein' : rMax[1] > 12 ? 'pruefen' : 'ja', w: stark.length ? stark.map(([d, v]) => `${fmtS(d)} ${nf(v)} mm`).join(', ') : `max. ${nf(rMax[1])} mm/Tag (${rMax[0] ? fmtS(rMax[0]) : '-'})`, e: 'Verbot bei über 20 mm in 24 h vor 1-2 Tagen, heute oder in den nächsten 3 Tagen.' });
  // 2. Schneebedeckt: Schneedecke, die länger als einen Tag liegen bleibt
  const sn = last24('snow_depth'), snNow = sn.length ? sn[sn.length - 1] : 0, snMin = sn.length ? Math.min(...sn) : 0;
  K.push({ id: 'schnee', k: 'Schneebedeckt', s: snMin >= 0.01 ? 'nein' : snNow >= 0.01 ? 'pruefen' : 'ja', w: `Schnee aktuell ${Math.round(snNow * 100)} cm`, e: 'Verbot bei geschlossener Schneedecke, die länger als einen Tag liegen bleibt.' });
  // 3. Gefroren: Bodentemperatur 6 cm
  const bt = last24('soil_temperature_6cm'), btMin = bt.length ? Math.min(...bt) : null;
  K.push({ id: 'frost', k: 'Boden gefroren', s: btMin === null ? 'pruefen' : btMin < 0 ? 'nein' : btMin < 1.5 ? 'pruefen' : 'ja', w: btMin === null ? 'keine Daten' : `Boden 6 cm: min. ${nf(btMin)} °C (24 h)`, e: 'Test: Schraubenzieher Nr. 3/4 lässt sich an mehreren Stellen mit der flachen Hand nicht in den Boden drücken = gefroren.' });
  // 4. Wassergesättigt: Bodenfeuchte + Regen der letzten 3 Tage
  const bf = last24('soil_moisture_3_to_9cm'), bfNow = bf.length ? bf[bf.length - 1] : null;
  const r3 = [iT - 3, iT - 2, iT - 1].reduce((a, i) => a + (D.precipitation_sum[i] || 0), 0);
  const nass = (bfNow !== null && bfNow >= 0.42) || r3 > 40, feucht = (bfNow !== null && bfNow >= 0.38) || r3 > 25;
  K.push({ id: 'nass', k: 'Boden wassergesättigt', s: nass ? 'nein' : feucht ? 'pruefen' : 'ja', w: `Bodenfeuchte ${bfNow === null ? '-' : Math.round(bfNow * 100) + ' Vol-%'}, Regen 3 Tage ${nf(r3)} mm`, e: 'Wassergesättigt: Wasserlachen bleiben liegen, Boden leicht knetbar oder breiig. Modellwert, vor Ort prüfen.' });
  // 5. Ausgetrocknet (nur Gülle)
  const trocken = bfNow !== null && bfNow < 0.12;
  K.push({ id: 'trocken', k: 'Boden ausgetrocknet', nurGuelle: true, s: trocken ? 'pruefen' : 'ja', w: `Bodenfeuchte ${bfNow === null ? '-' : Math.round(bfNow * 100) + ' Vol-%'}`, e: 'Gülle nicht auf ausgetrockneten Boden (Schwundrisse sichtbar).' });
  // 6. Nährstoffbedarf: Tagesmittel > 5 °C an 7 aufeinanderfolgenden Tagen (Düngefenster)
  const tm = []; for (let i = iT - 6; i <= iT; i++) tm.push(D.temperature_2m_mean[i]);
  const fenster = tm.every(v => v !== null && v !== undefined && v > 5), unter = tm.filter(v => !(v > 5)).length;
  K.push({ id: 'temp', k: 'Nährstoffbedarf (Düngefenster)', s: fenster ? 'ja' : 'nein', w: `Tagesmittel letzte 7 Tage: ${tm.map(v => v === null || v === undefined ? '-' : nf(v)).join(' / ')} °C`, e: fenster ? 'Tagesmittel 7 Tage in Folge über 5 °C: Pflanzen nehmen Nährstoffe auf.' : `Vegetationsruhe (${unter} von 7 Tagen nicht über 5 °C). Ausbringen nur bei speziellen Bedürfnissen des Pflanzenbaus, siehe unten.` });
  const res = typ => { const k = K.filter(x => typ === 'guelle' || !x.nurGuelle); return k.some(x => x.s === 'nein') ? 'nein' : k.some(x => x.s === 'pruefen') ? 'pruefen' : 'ja'; };
  return { K, guelle: res('guelle'), mist: res('mist'), stand: w.t, tag: t0 };
}
function ausbChart(id) {
  const w = ausbDaten(); if (!w || !w.d) return;
  const D = w.d, H = w.h || {}, t0 = today(), hi = D.time.indexOf(t0);
  const tagH = (k, f) => D.time.map(d => { const a = (H.time || []).map((t, i) => t.startsWith(d) ? H[k] && H[k][i] : null).filter(v => v !== null && v !== undefined); return a.length ? f(a) : null; });
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  const C = {
    regen: { t: 'Niederschlag pro Tag', v: D.precipitation_sum, u: 'mm', g: 20, gl: 'Verbot über 20 mm', bar: true },
    schnee: { t: 'Schneehöhe (max. pro Tag)', v: tagH('snow_depth', a => Math.max(...a) * 100), u: 'cm', g: 1, gl: 'Schneedecke ab 1 cm', bar: true },
    frost: { t: 'Bodentemperatur 6 cm (min. pro Tag)', v: tagH('soil_temperature_6cm', a => Math.min(...a)), u: '°C', g: 0, gl: 'gefroren unter 0 °C' },
    nass: { t: 'Bodenfeuchte 3-9 cm (Ø pro Tag)', v: tagH('soil_moisture_3_to_9cm', a => avg(a) * 100), u: 'Vol-%', g: 42, gl: 'wassergesättigt ab ca. 42 %' },
    trocken: { t: 'Bodenfeuchte 3-9 cm (Ø pro Tag)', v: tagH('soil_moisture_3_to_9cm', a => avg(a) * 100), u: 'Vol-%', g: 12, gl: 'ausgetrocknet unter ca. 12 %' },
    temp: { t: 'Tagesmitteltemperatur', v: D.temperature_2m_mean, u: '°C', g: 5, gl: 'Düngefenster: 7 Tage über 5 °C' }
  }[id];
  if (!C) return;
  const vals = C.v.map(v => v === null || v === undefined ? null : Math.round(v * 10) / 10), n = vals.length;
  const W = 340, H0 = 190, pl = 30, pr = 8, pt = 12, pb = 26, cw = (W - pl - pr) / n;
  const fin = vals.filter(v => v !== null);
  let mn = Math.min(C.g, ...fin, C.bar ? 0 : Infinity), mx = Math.max(C.g, ...fin);
  if (!C.bar) { const p = Math.max(1, (mx - mn) * 0.15); mn = Math.floor(mn - p); mx = Math.ceil(mx + p); } else { mn = 0; mx = Math.max(mx * 1.15, C.g * 1.3, 1); }
  const y = v => pt + (H0 - pt - pb) * (1 - (v - mn) / (mx - mn || 1)), x = i => pl + i * cw + cw / 2;
  const ticks = [mn, (mn + mx) / 2, mx].map(v => Math.round(v * 10) / 10);
  let g = `<rect x="${pl + hi * cw}" y="${pt}" width="${(n - hi) * cw}" height="${H0 - pt - pb}" fill="#EEF3F0"/>`;
  g += ticks.map(v => `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="#E2E4DF" stroke-width="1"/><text x="${pl - 4}" y="${y(v) + 3}" font-size="9" text-anchor="end" fill="#6B726D">${nf(v)}</text>`).join('');
  if (C.bar) g += vals.map((v, i) => v === null ? '' : `<rect x="${x(i) - cw * 0.32}" y="${y(Math.max(v, 0))}" width="${cw * 0.64}" height="${Math.max(0.5, y(0) - y(Math.max(v, 0)))}" rx="2" fill="${v > C.g || (id === 'schnee' && v >= C.g) ? '#C0392B' : i >= hi ? '#7FB89A' : '#2E8B62'}"><title>${fmt(D.time[i])}: ${nf(v)} ${C.u}</title></rect>`).join('');
  else { const pts = vals.map((v, i) => v === null ? null : [x(i), y(v)]); let d = '', on = false; pts.forEach(p => { if (!p) { on = false; return; } d += (on ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); on = true; });
    g += `<path d="${d}" fill="none" stroke="#2E8B62" stroke-width="2"/>` + vals.map((v, i) => v === null ? '' : `<circle cx="${x(i)}" cy="${y(v)}" r="2.6" fill="${(id === 'frost' && v < C.g) || (id === 'nass' && v >= C.g) || (id === 'trocken' && v < C.g) || (id === 'temp' && v <= C.g) ? '#C0392B' : '#2E8B62'}"><title>${fmt(D.time[i])}: ${nf(v)} ${C.u}</title></circle>`).join(''); }
  g += `<line x1="${pl}" x2="${W - pr}" y1="${y(C.g)}" y2="${y(C.g)}" stroke="#E08A1E" stroke-width="1.5" stroke-dasharray="4 3"/>`;
  g += `<line x1="${pl + hi * cw}" x2="${pl + hi * cw}" y1="${pt}" y2="${H0 - pb}" stroke="#1F4D36" stroke-width="1"/><text x="${pl + hi * cw + 3}" y="${pt + 9}" font-size="9" fill="#1F4D36">heute</text>`;
  g += D.time.map((d, i) => i % 2 === hi % 2 ? `<text x="${x(i)}" y="${H0 - 10}" font-size="8.5" text-anchor="middle" fill="${i === hi ? '#1F4D36' : '#6B726D'}"${i === hi ? ' font-weight="700"' : ''}>${+d.slice(8)}.${+d.slice(5, 7)}.</text>` : '').join('');
  const svg = `<svg viewBox="0 0 ${W} ${H0}" width="100%" style="display:block">${g}</svg>`;
  const tab = vals.map((v, i) => ({ d: D.time[i], v })).filter(r => r.d >= addDays(t0, -3)).map(r => `<span class="${r.d === t0 ? 'on' : ''}"><small>${['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][pd(r.d).getDay()]} ${+r.d.slice(8)}.</small><b>${r.v === null ? '-' : nf(r.v)}</b></span>`).join('');
  openSheet(C.t, `<div class="card">${svg}<div class="small muted" style="margin-top:6px;display:flex;gap:12px;flex-wrap:wrap"><span><i class="sw" style="background:#E08A1E"></i>${esc(C.gl)}</span><span><i class="sw" style="background:#EEF3F0;border:1px solid #CFDDD5"></i>Prognose</span></div></div>
    <div class="ausb-tab">${tab}</div><p class="small muted" style="margin:8px 2px">Einheit: ${C.u} · letzte 14 Tage und Prognose 3 Tage · Open-Meteo, Modellwerte für den Hof</p>`);
  const sh = $('.sheet'); if (sh) sh.classList.add('mittel');
}
const AUSB_L = { ja: 'Ja', nein: 'Nein', pruefen: 'Prüfen' }, AUSB_C = { ja: 'ok', nein: 'red', pruefen: 'warn' };
function ausbKpi() {
  const b = ausbBewertung();
  const c = (typ, l) => `<a class="stat ausb ${b ? AUSB_C[b[typ]] : ''}" href="#/journale/ausbringen"><b>${b ? AUSB_L[b[typ]] : '<i class="ld"></i>'}</b><span>${l}</span></a>`;
  return `<div class="stats-row two"><span class="stats-h">Düngen</span>${c('guelle', 'Gülle')}${c('mist', 'Mist')}</div>`;
}
function anaAusbringen() {
  const b = ausbBewertung();
  if (!b) return '<div class="empty"><i class="ld"></i> Wetter- und Bodendaten werden geladen …</div>';
  const pill = s => `<span class="pill ${s === 'ja' ? 'green' : s === 'nein' ? 'red' : 'warn'}">${AUSB_L[s]}</span>`;
  const z = new Date(b.stand);
  return `<div class="stats"><div class="stats-row two"><span class="stats-h">Heute</span><span class="stat ausb ${AUSB_C[b.guelle]}"><b>${AUSB_L[b.guelle]}</b><span>Gülle</span></span><span class="stat ausb ${AUSB_C[b.mist]}"><b>${AUSB_L[b.mist]}</b><span>Mist</span></span></div></div>
  <div class="sec-t">Prognose</div>
  <div class="list">${[1, 2, 3].map(o => ausbBewertung(o)).filter(Boolean).map(p => `<div class="row"><div class="main"><span class="t">${['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][pd(p.tag).getDay()]} ${fmt(p.tag)}</span><span class="s wrap">${esc(p.K.filter(x => x.s !== 'ja').map(x => x.k + (x.s === 'pruefen' ? ' (prüfen)' : '')).join(', ') || 'keine Einschränkung')}</span></div><span class="r">Gülle ${pill(p.guelle)}<br>Mist ${pill(p.mist)}</span></div>`).join('')}</div>
  <div class="sec-t">Kriterien heute <span class="small muted" style="text-transform:none;letter-spacing:0;font-weight:400">· antippen für Verlauf</span></div>
  <div class="list">${b.K.map(x => `<button type="button" class="row" data-act="ausbchart" data-id="${x.id}"><div class="main"><span class="t">${esc(x.k)}${x.nurGuelle ? ' <span class="small muted">(nur Gülle)</span>' : ''}</span><span class="s wrap">${esc(x.w)}<br>${esc(x.e)}</span></div><span class="r">${pill(x.s)}</span></button>`).join('')}</div>
  <p class="small muted" style="margin:8px 4px">Grundlage: Checkliste "Ausbringen von Gülle und Mist im Winter", ALN Kanton Zürich / Strickhof. Wetterdaten Open-Meteo, Stand ${String(z.getHours()).padStart(2, '0')}:${String(z.getMinutes()).padStart(2, '0')} Uhr.</p>`;
}

/* ---------- Sensoren direkt aus der App (akenza bei jedem Öffnen, Agrometeo 1x pro Tag) ---------- */
const SENS = { laedt: false, fehler: '', zuletzt: 0 };
// Tekelek: Fehlecho = SRSSI < 4, SRC 0 (kein Echo) oder SRC 1-2 mit schwachem Echo (SRSSI < 8)
const echoOk = d => { const c = typeof d.src === 'number' ? d.src : 10, r = typeof d.srssi === 'number' ? d.srssi : 10; return r >= 4 && c !== 0 && !(c <= 2 && r < 8); };
async function akenzaWeb(id, deviceId, leer, voll) {
  const now = Date.now(), von = now - 31 * 864e5, H = { 'x-api-key': S.set.akenzaKey, accept: 'application/json' };
  let ende = now + 3600e3, arr = [];
  for (let seite = 0; seite < 6; seite++) {
    const r = await fetch(`https://api.akenza.io/v3/devices/${deviceId}/query?topic=measurement&limit=2000&startDate=${encodeURIComponent(new Date(von).toISOString())}&endDate=${encodeURIComponent(new Date(ende).toISOString())}`, { headers: H });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json(), a = Array.isArray(j) ? j : (j.data || j.items || j.results || []);
    if (!a.length) break; arr = arr.concat(a);
    const min = Math.min(...a.map(x => Date.parse(x.timestamp || x.time || x.createdAt)).filter(Boolean));
    if (!isFinite(min) || min >= ende || min <= von || a.length < 2000) break; ende = min - 1;
  }
  const seen = new Set();
  const rows = arr.filter(x => { const k = x.timestamp || x.time || x.createdAt; if (seen.has(k)) return false; seen.add(k); return true; })
    .map(x => ({ t: Date.parse(x.timestamp || x.time || x.createdAt), d: x.data || x })).filter(x => x.t && x.d && typeof x.d === 'object').sort((a, b) => a.t - b.t);
  if (!rows.length) return;
  const prev = S.sensoren.find(x => x.id === id) || {};
  const keys = Object.keys(rows[rows.length - 1].d).filter(k => typeof rows[rows.length - 1].d[k] === 'number');
  const pick = (re, not) => keys.find(k => re.test(k) && !(not && not.test(k)));
  const kW = S.set['sensKey_' + id] || prev.keyWert || pick(/fill|level|percent|prozent|füll/i, /batt/i) || pick(/.*/, /batt|temp|rssi|snr|signal/i), kB = pick(/batt/i) || prev.keyBatterie;
  const pts = rows.filter(x => typeof x.d[kW] === 'number' && echoOk(x.d)).map(x => [x.t, Math.round(x.d[kW] * 10) / 10]);
  const L = parseFloat(leer), V = parseFloat(voll), ok = isFinite(L) && isFinite(V) && L !== V;
  const pct = x => ok ? Math.round((L - x) / (L - V) * 1000) / 10 : null, gut = q => q !== null && q >= 0 && q <= 100;
  const filt = a => ok ? a.filter(p => gut(pct(p[1]))) : a, conv = p => { const q = pct(p[1]); return { 0: p[0], 1: q === null ? p[1] : q }; };
  const last = rows[rows.length - 1], lastOk = ok ? [...pts].reverse().find(p => gut(pct(p[1]))) : null;
  const serie48 = pts.filter(p => p[0] >= now - 48 * 3600e3), serie30 = []; let lt = 0;
  for (const p of pts.filter(p => p[0] >= now - 30 * 864e5)) if (p[0] - lt >= 3 * 3600e3) { serie30.push(p); lt = p[0]; }
  const tag = {}; for (const p of filt(pts)) { const d = new Date(p[0] + 3600e3).toISOString().slice(0, 10); (tag[d] = tag[d] || []).push(p[1]); }
  const hm = {}; for (const p of (prev.serie365 || [])) if (p[0] >= now - 365 * 864e5) hm[p[0]] = p[1];
  for (const d of Object.keys(tag)) { const v = tag[d], m = v.reduce((a, b) => a + b, 0) / v.length, q = ok ? pct(m) : m; hm[Date.parse(d + 'T12:00:00Z')] = Math.round(q * 10) / 10; }
  const bat = kB && typeof last.d[kB] === 'number' ? last.d[kB] : prev.last ? prev.last.batterie : null;
  const gT = lastOk ? lastOk[0] : pts.length ? pts[pts.length - 1][0] : 0, fr = rows.find(x => x.t > gT);
  const fehlerSeit = fr ? fr.t : null, fehlerInfo = fr ? { wert: last.d[kW] ?? null, src: last.d.src ?? null, srssi: last.d.srssi ?? null, zeit: last.t } : null;
  put('sensoren', { ...prev, id, name: prev.name || (id === 'wasserstand' ? 'Wasserstand' : 'Tränkefass'), typ: 'fuellstand', einheit: ok ? '%' : 'cm', keyWert: kW, keyBatterie: kB || null,
    last: { zeit: lastOk ? lastOk[0] : last.t, wert: lastOk ? lastOk[1] : last.d[kW] ?? null, prozent: ok ? (lastOk ? pct(lastOk[1]) : null) : null, batterie: bat ?? null },
    serie48: filt(serie48).map(conv), serie30: filt(serie30).map(conv), serie365: Object.keys(hm).map(Number).sort((a, b) => a - b).map(t => ({ 0: t, 1: hm[t] })), fehlerSeit, fehlerInfo, aktualisiert: now, quelle: 'app' });
}
async function sensorenLaden(force = false) {
  if (SENS.laedt || !S.set.akenzaKey || !S.loaded.sensoren || !S.loaded.set || navigator.onLine === false) return;
  if (!force && Date.now() - SENS.zuletzt < 5 * 60e3) return;
  SENS.laedt = true; SENS.fehler = ''; SENS.zuletzt = Date.now(); schedule();
  const tasks = [];
  if (S.set.sensWasser !== '') tasks.push(akenzaWeb('wasserstand', S.set.sensWasser || '02bdf0b1b64b4c40', S.set.wasserLeer || 214, S.set.wasserVoll || 56));
  if (S.set.sensFass !== '') tasks.push(akenzaWeb('traenkefass', S.set.sensFass || '029412d5966ce1d4', S.set.fassLeer || 83, S.set.fassVoll || 9.3));
  const res = await Promise.allSettled(tasks);
  const err = res.find(r => r.status === 'rejected'); if (err) { SENS.fehler = err.reason && err.reason.message === 'Failed to fetch' ? 'Browser blockiert die Abfrage' : String(err.reason && err.reason.message || err.reason); console.warn('akenza', err.reason); }
  SENS.laedt = false; schedule();
  agroLaden();
}
// Agrometeo: beim ersten Start des Tages im Hintergrund, danach den ganzen Tag diese Daten
function agroReihen(j) {
  const out = [];
  const walk = x => {
    if (Array.isArray(x)) { if (x.length >= 2 && typeof x[0] === 'string' && /^\d{4}-\d{2}/.test(x[0]) && typeof x[1] === 'number') { out.push([x[0].slice(0, 7), x[1]]); return; } x.forEach(walk); return; }
    if (x && typeof x === 'object') { const dk = Object.keys(x).find(k => typeof x[k] === 'string' && /^\d{4}-\d{2}/.test(x[k])), vk = Object.keys(x).find(k => typeof x[k] === 'number' && !/^(id|station|year|month)$/i.test(k)); if (dk && vk) { out.push([x[dk].slice(0, 7), x[vk]]); return; } Object.values(x).forEach(walk); }
  };
  walk(j); return out;
}
function agroBereinigen(rows, art) {
  const [lo, hi, floor] = art === 'regen' ? [0, 450, 400] : [-20, 32, 7];
  const med = a => { const b = [...a].sort((x, y) => x - y), n = b.length; return n ? (n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2) : 0; };
  const byM = {}; rows.forEach(([ym, v]) => { if (v >= lo && v <= hi) (byM[ym.slice(5, 7)] = byM[ym.slice(5, 7)] || []).push(v); });
  return rows.filter(([ym, v]) => { const a = byM[ym.slice(5, 7)] || [], md = med(a), mad = med(a.map(x => Math.abs(x - md))); return v >= lo && v <= hi && Math.abs(v - md) <= Math.max(floor, 5 * mad); });
}
function agroJahr(rows) {
  const y = new Date().getFullYear(), akt = Array(12).fill(null), vor = Array(12).fill(null), sum = Array(12).fill(0), n = Array(12).fill(0); let seit = 9999;
  for (const [ym, v] of rows) { const yy = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1; if (m < 0 || m > 11) continue; seit = Math.min(seit, yy); if (yy === y) akt[m] = Math.round(v * 10) / 10; else { if (yy === y - 1) vor[m] = Math.round(v * 10) / 10; sum[m] += v; n[m]++; } }
  return { akt, vor, avg: sum.map((s, i) => n[i] ? Math.round(s / n[i] * 10) / 10 : null), seit };
}
let agroLaeuft = false;
async function agroLaden() {
  const a = S.sensoren.find(x => x.id === 'agrometeo'), heute = today();
  if (agroLaeuft || !S.set.agroUser || !S.set.agroPass || localStorage.getItem('hb-agro-tag') === heute || (a && a.aktualisiert && iso(new Date(a.aktualisiert)) === heute)) return;
  agroLaeuft = true; localStorage.setItem('hb-agro-tag', heute);
  try {
    const st = S.set.agroStation || '177', auth = 'Basic ' + btoa(unescape(encodeURIComponent(`${S.set.agroUser}:${S.set.agroPass}`)));
    const hol = async (sensor, fn) => { const r = await fetch(`https://vitimeteo.ch/api/stations/${st}/weatherdata.json?startdate=2004-01-01&enddate=2099-12-31&groupby=month&sen_list=[[${sensor},'${fn}']]&datastructure=json&cflag=0`, { headers: { Authorization: auth } }); if (!r.ok) throw new Error('HTTP ' + r.status); return agroReihen(await r.json()); };
    const [regen, temp] = await Promise.all([hol(6, 'sum'), hol(S.set.agroTempSensor || 1, 'avg')]);
    const R = regen.length ? agroJahr(agroBereinigen(regen, 'regen')) : null, T = temp.length ? agroJahr(agroBereinigen(temp, 'temp')) : null;
    if (R || T) put('sensoren', { id: 'agrometeo', typ: 'agrometeo', station: st, jahr: new Date().getFullYear(), seit: (R || T).seit || 2004, regen: R, temp: T, aktualisiert: Date.now(), quelle: 'app' });
  } catch (e) { console.warn('agrometeo', e); } // Fallback: Hintergrund-Job (GitHub) lädt täglich
  agroLaeuft = false;
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sensorenLaden(); });

/* ---------- Behandlungen-Import (Excel) ---------- */
// Spalten: Von, Bis, Tiere ("Alle" oder Namen/Ohrmarken mit Komma), Behandlungsgrund, Arzneimittel, Dosis, Absetzfrist Fleisch (Tage), Freigabe Fleisch, Erfasst, Name, Notiz
async function behImport(file) {
  if (!window.XLSX) await loadScript('vendor/xlsx.mini.min.js');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: true });
  const col = (r, ...names) => { for (const k of Object.keys(r)) { const kk = k.toLowerCase(); if (names.some(n => kk.startsWith(n))) return r[k]; } return ''; };
  const neu = [], fehler = [];
  rows.forEach((r, i) => {
    const von = parseDatum(col(r, 'von', 'behandlung von', 'datum')); if (!von) return;
    const bis = parseDatum(col(r, 'bis')), txt = String(col(r, 'tiere', 'tier')).trim();
    let ids = [], offen = [];
    if (!txt || /^alle/i.test(txt)) ids = aktiveTiere(von).map(t => t.id);
    else txt.split(/[,;\n]/).map(x => x.trim()).filter(Boolean).forEach(x => { const t = S.tiere.find(t => (t.name || '').toLowerCase() === x.toLowerCase() || (normOM(t.ohrmarke) && normOM(t.ohrmarke) === normOM(x)) || (x.length >= 4 && normOM(t.ohrmarke).endsWith(normOM(x)))); if (t) ids.push(t.id); else offen.push(x); });
    if (offen.length) fehler.push(`Zeile ${i + 2}: nicht gefunden ${offen.join(', ')}`);
    if (!ids.length) return;
    const frist = num(col(r, 'absetzfrist'));
    neu.push({ tierIds: [...new Set(ids)], datum: von, bis: bis && bis > von ? bis : '', grund: String(col(r, 'behandlungsgrund', 'grund')).trim(), medikament: String(col(r, 'arzneimittel', 'medikament')).trim(), menge: String(col(r, 'dosis', 'menge')).trim(), frist, freiAb: addDays(bis && bis > von ? bis : von, frist), erfasst: parseDatum(col(r, 'erfasst')) || von, durch: String(col(r, 'name')).trim(), notiz: String(col(r, 'notiz')).trim() });
  });
  const dup = b => S.behandlungen.some(x => x.datum === b.datum && (x.medikament || '').toLowerCase() === b.medikament.toLowerCase());
  const imp = neu.filter(b => !dup(b));
  openSheet('Behandlungen-Import', `
    <div class="note blue small">${imp.length} neu · ${neu.length - imp.length} schon vorhanden (gleiches Datum + Arzneimittel, wird übersprungen)</div>
    ${fehler.length ? `<div class="note small" style="margin-top:8px">${fehler.map(esc).join('<br>')}</div>` : ''}
    <div class="list" style="margin-top:8px">${imp.map(b => `<div class="row"><div class="main"><span class="t">${esc(b.medikament || '-')} · ${esc(b.grund)}</span><span class="s">${esc(tierListe(b.tierIds))} · frei ab ${fmt(b.freiAb)}</span></div><span class="r">${fmt(b.datum)}</span></div>`).join('')}</div>
    <p class="small muted">Importierte Einträge haben keine Unterschrift. Diese pro Eintrag nachtragen.</p>`,
    { saveLabel: 'Importieren', onSave: () => { imp.forEach(b => put('behandlungen', b)); toast(`${imp.length} Behandlungen importiert`); closeSheet(); } });
}

/* ---------- Events ---------- */
document.addEventListener('pointerdown', e => { const svg = e.target.closest && e.target.closest('svg[data-chart]'); if (svg) chartTap(svg, e.clientX); });
document.addEventListener('pointermove', e => { if (!e.buttons && e.pointerType !== 'mouse') return; const svg = e.target.closest && e.target.closest('svg[data-chart]'); if (svg) chartTap(svg, e.clientX); });
document.addEventListener('click', e => { const tp = e.target.closest && e.target.closest('[data-tip]'); if (tp) { toast(tp.getAttribute('data-tip')); return; }
}, true);
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'form') { e.preventDefault(); openForm(el.dataset.f, null, { tier: ['zugang', 'auslauf', 'ernte', 'kauf', 'verbrauch', 'duengung'].includes(el.dataset.f) ? '' : el.dataset.tier }); }
  else if (a === 'edit') { const c = el.dataset.c, r = S[c].find(x => x.id === el.dataset.id); if (r) openForm(formKey(c, r), r); }
  else if (a === 'filt') { const v = el.dataset.v, F = UI.tierFilter; if (['Kalb', 'Rind', 'Kuh'].includes(v)) { F.kat = F.kat === v ? '' : v; F.lakt = ''; } else { F.lakt = F.lakt === v ? '' : v; F.kat = ''; } render(); }
  else if (a === 'filtlink') { const v = el.dataset.v, F = UI.tierFilter; F.q = ''; F.abg = false; if (['Kalb', 'Rind', 'Kuh'].includes(v)) { F.kat = v; F.lakt = ''; } else { F.lakt = v; F.kat = ''; } }
  else if (a === 'reset') { Object.assign(UI.tierFilter, { kat: '', lakt: '', q: '' }); render(); }
  else if (a === 'abg') { UI.tierFilter.abg = !UI.tierFilter.abg; render(); }
  else if (a === 'jtab') { UI.jTab = el.dataset.v; if (el.tagName === 'BUTTON') render(); }
  else if (a === 'ftab') { UI.fTab = el.dataset.v; if (el.tagName === 'BUTTON') render(); }
  else if (a === 'ltab') { UI.lTab = el.dataset.v; render(); }
  else if (a === 'aufgabe') { e.preventDefault(); const r = S.aufgaben.find(x => x.id === el.dataset.id); if (r && r.teilwahl && !(r.erledigt || {})[el.dataset.y]) { labTeilSheet(r, el.dataset.y); return; } if (r) { const er = { ...(r.erledigt || {}) }; if (er[el.dataset.y]) delete er[el.dataset.y]; else er[el.dataset.y] = today(); put('aufgaben', { ...r, erledigt: er }); } }
  else if (a === 'kaltag') { e.preventDefault(); UI.kalTag = UI.kalTag === el.dataset.v ? '' : el.dataset.v; render(); }
  else if (a === 'notizkat') { UI.notizKat = el.dataset.v; render(); }
  else if (a === 'meldung') { const m = S.meldungen.find(x => x.id === el.dataset.id); if (m) meldungSheet(m); }
  else if (a === 'meldtier') { const m = S.meldungen.find(x => x.id === el.dataset.id), t = tierById(el.dataset.t); if (m && t) { put('ereignisse', { typ: 'brunst', tierId: t.id, datum: (m.zeit || today()).slice(0, 10), sicherheit: 'normal', notiz: 'CowCatcher ' + (m.kamera || ''), meldungId: m.id }); put('meldungen', { ...m, status: 'brunst', tierId: t.id, tierName: t.name || t.ohrmarke }); toast('Brunst erfasst: ' + (t.name || '')); closeSheet(); } }
  else if (a === 'meldverwerfen') { const m = S.meldungen.find(x => x.id === el.dataset.id); if (m) { put('meldungen', { ...m, status: 'verworfen' }); closeSheet(); } }
  else if (a === 'kalfilter') { UI.kalFilter = el.dataset.v; render(); }
  else if (a === 'kalmon') { const [y, m] = UI.kalMonat.split('-').map(Number); const d = new Date(y, m - 1 + Number(el.dataset.v), 1); UI.kalMonat = iso(d).slice(0, 7); UI.kalTag = ''; render(); }
  else if (a === 'pdf') { el.disabled = true; pdf(el.dataset.p, el.dataset.id).catch(showErr).finally(() => el.disabled = false); }
  else if (a === 'backup') { const d = { version: VERSION, exportiert: new Date().toISOString(), set: S.set }; COLLS.forEach(c => d[c] = S[c]); const b = new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' }); const u = URL.createObjectURL(b); const l = document.createElement('a'); l.href = u; l.download = `hofbuech_backup_${today()}.json`; l.click(); setTimeout(() => URL.revokeObjectURL(u), 2000); }
  else if (a === 'ausbchart') ausbChart(el.dataset.id);
  else if (a === 'lpz') { UI.lPz = el.dataset.v; render(); }
  else if (a === 'lgrp') { const v = el.dataset.v; UI.lOpen = UI.lPz ? (UI.lOpen === '-' + v ? '' : '-' + v) : (UI.lOpen === v ? '' : v); render(); }
  else if (a === 'lalle') { UI.lAlle = !!el.dataset.v; render(); }
  else if (a === 'linfo') labInfo(el.dataset.v);
  else if (a === 'lpend') { const r = S.aufgaben.find(x => x.id === el.dataset.id); if (r) { const y = UI.lJahr, done = (r.erledigt || {})[y], ab = labAb(r, y); labInfo(labNr(r.objekt), `<div class="card" style="margin-bottom:8px"><b>${esc(labTitel(r, y))}</b><div class="small muted" style="margin-top:4px">${esc([r.art === 'einmalig' ? 'einmalig' : 'jährlich', ab ? 'ab ' + fmt(ab) : '', r.nurAb ? '' : 'bis ' + fmt(aufgabeFaellig(r, y)), done ? 'erledigt ' + fmt(done) : 'offen'].filter(Boolean).join(' · '))}</div>${r.notiz ? `<div class="small" style="margin-top:6px">${esc(r.notiz)}</div>` : ''}<div style="margin-top:12px">${done ? `<div class="note green" style="margin:0"><b>Am ${fmt(done)} erledigt</b>${r.teilwahl && labTeil(y) ? ` · ${labTeil(y) === 'oben' ? 'oberer' : 'unterer'} Teil` : ''}</div>` : `<button class="btn pri" style="width:100%" data-act="lerledigt" data-id="${r.id}" data-y="${y}">Erledigt</button>`}</div><div class="btns" style="margin-top:10px">${r.teilwahl && done ? `<button class="btn" data-act="lteil" data-id="${r.id}" data-y="${y}" data-v="oben">Teil: oben</button><button class="btn" data-act="lteil" data-id="${r.id}" data-y="${y}" data-v="unten">Teil: unten</button>` : ''}${r.vid ? '' : `<button class="btn" data-act="edit" data-c="aufgaben" data-id="${r.id}">Bearbeiten</button>`}</div></div>`); } }
  else if (a === 'lerledigt') { const r = S.aufgaben.find(x => x.id === el.dataset.id); if (r) { const y = el.dataset.y; if (r.teilwahl) { labTeilSheet(r, y); return; } put('aufgaben', { ...r, erledigt: { ...(r.erledigt || {}), [y]: today() } }); closeSheet(); toast('Erledigt'); } }
  else if (a === 'lteil') { const r = S.aufgaben.find(x => x.id === el.dataset.id); if (r) { const y = el.dataset.y, er = { ...(r.erledigt || {}) }, dIn = $('#lteildat'); if (dIn && dIn.value) er[y] = dIn.value; else if (!er[y]) er[y] = today(); put('aufgaben', { ...r, erledigt: er, teil: { ...(r.teil || {}), [y]: el.dataset.v } }); closeSheet(); toast(`Obj. 1 ${y}: ${el.dataset.v === 'oben' ? 'oberer' : 'unterer'} Teil`); } }
  else if (a === 'push') { pushAktivieren().catch(showErr); }
  else if (a === 'logout') { if (AUTH) AUTH.A.signOut(AUTH.auth).then(() => location.reload()); }
});
document.addEventListener('input', e => {
  const a = e.target.dataset && e.target.dataset.act;
  if (a === 'q') { UI.tierFilter.q = e.target.value; clearTimeout(window._qt); window._qt = setTimeout(() => { render(); const s = $('[data-act="q"]'); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); } }, 250); }
});
document.addEventListener('change', e => {
  const a = e.target.dataset && e.target.dataset.act;
  if (a === 'sort') { UI.tierFilter.sort = e.target.value; render(); }
  if (a === 'jahr') { UI.jahr = e.target.value; render(); }
  if (a === 'ljahr') { UI.lJahr = e.target.value; render(); }
  if (a === 'lzuord') { const o = S.labiola.find(x => x.id === e.target.dataset.id); if (o && e.target.value) { put('labiola', { ...o, parzelle: e.target.value }); closeSheet(); toast('Parzelle zugeordnet'); } }
  if (a === 'behimport') { const f = e.target.files[0]; e.target.value = ''; if (f) behImport(f).catch(showErr); }
  if (a === 'tvdimport') { const f = e.target.files[0]; e.target.value = ''; if (f) tvdImport(f).catch(showErr); }
  if (a === 'restore') {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => {
      const d = JSON.parse(t);
      if (!confirm(`${d.exportiert || 'Backup'} einlesen? Bestehende Einträge mit gleicher ID werden überschrieben.${(d.ersetzen || []).map(r => `\n${r.coll}: alle Einträge ${fmt(r.von)} - ${fmt(r.bis)} werden ersetzt.`).join('')}`)) return;
      const byOM = om => S.tiere.find(t => normOM(t.ohrmarke) === normOM(om));
      (d.tierUpdates || []).forEach(u => { const t = byOM(u.ohrmarke); if (!t) return; const x = { ...t, ...u.set }; if (u.mutterOM) { const m = byOM(u.mutterOM); if (m) x.mutterId = m.id; } put('tiere', x); });
      (d.ereignisse || []).forEach(e => { if (e.tierOM) { const t = byOM(e.tierOM); if (!t) return; e.tierId = t.id; delete e.tierOM; } if (e.kalbOM) { const k = byOM(e.kalbOM); if (k) e.kalbId = k.id; } });
      d.ereignisse = (d.ereignisse || []).filter(e => e.tierId);
      (d.ersetzen || []).forEach(r => { if (!COLLS.includes(r.coll)) return; S[r.coll].filter(x => x.datum >= r.von && x.datum <= r.bis).forEach(x => W.del(r.coll, x.id)); });
      COLLS.forEach(c => (d[c] || []).forEach(o => W.put(c, o)));
      if (d.set) W.setSettings(d.set);
      toast('Backup eingelesen');
    }).catch(showErr);
  }
});
document.addEventListener('toggle', e => {
  const d = e.target; if (!d.matches || !d.matches('details.acc') || !d.open) return;
  UI.setOpen = d.dataset.acc; $$('details.acc').forEach(x => { if (x !== d) x.open = false; });
}, true);
document.addEventListener('submit', e => {
  if (e.target.id !== 'setform') return;
  e.preventDefault();
  const f = e.target.elements, lines = s => s.split('\n').map(x => x.trim()).filter(Boolean);
  W.setSettings({
    ...S.set, hofname: f.hofname.value.trim(), betrieb: f.betrieb.value.trim(), tvd: f.tvd.value.trim(), lat: num(f.lat.value) || 47.526, lon: num(f.lon.value) || 8.141,
    tragzeit: num(f.tragzeit.value) || 285, kalbMonate: num(f.kalbMonate.value) || 12, laktAbMonate: num(f.laktAbMonate.value) || 16,
    abgekalbtTage: num(f.abgekalbtTage.value) || 60, alpVon: f.alpVon.value.trim() || '06-15', alpBis: f.alpBis.value.trim() || '09-15', puffer: num(f.puffer.value), unbesamtAb: num(f.unbesamtAb.value) || 16, baldTage: num(f.baldTage.value) || 30,
    gruende: lines(f.gruende.value),
    medikamente: lines(f.medikamente.value).map(l => { const [n, d] = l.split(';'); return { name: n.trim(), frist: num(d) }; }),
    grafanaUrl: f.grafanaUrl.value.trim(), akenzaKey: f.akenzaKey.value.trim(), sensWasser: f.sensWasser.value.trim(), sensFass: f.sensFass.value.trim(), agroUser: f.agroUser.value.trim(), agroPass: f.agroPass.value, agroStation: f.agroStation.value.trim(), fassLeer: f.fassLeer.value.trim(), fassVoll: f.fassVoll.value.trim(), wasserLeer: f.wasserLeer.value.trim(), wasserVoll: f.wasserVoll.value.trim(), startHeu: num(f.startHeu.value), startSilo: num(f.startSilo.value), startStroh: num(f.startStroh.value)
  });
  toast('Einstellungen gespeichert');
});
$('#tabbar').addEventListener('click', e => {
  const l = e.target.closest('a[data-tab]'); if (!l) return;
  const t = l.dataset.tab;
  if (t === 'journale') UI.jTab = ''; if (t === 'labiola') { UI.lTab = 'pendenzen'; UI.lPz = ''; } if (t === 'kalender') { UI.kalMonat = today().slice(0, 7); UI.kalTag = ''; }
  if (location.hash === l.getAttribute('href')) { e.preventDefault(); closeSheet(true); render(); window.scrollTo(0, 0); }
});
$('#plus').addEventListener('click', () => sheetOpen ? closeSheet() : plusMenu());
$('#back').addEventListener('click', () => history.length > 1 ? history.back() : (location.hash = '#/start'));
window.addEventListener('hashchange', () => { closeSheet(true); render(); window.scrollTo(0, 0); });

/* ---------- Start ---------- */
function loginScreen(err) {
  $('#tabbar').classList.add('hidden');
  $('#title').textContent = 'hofbuech';
  $('#view').innerHTML = `<div class="setup card"><h2 style="margin-top:0">Anmelden</h2><p class="muted">Einmal pro Gerät mit deinem Google-Konto anmelden. Danach bleibst du angemeldet.</p>${err ? `<div class="note small" style="margin-bottom:12px">${esc(err)}</div>` : ''}<button class="btn pri block" id="glogin">Mit Google anmelden</button></div>`;
  $('#glogin').onclick = async () => {
    const { auth, A } = AUTH; const prov = new A.GoogleAuthProvider(); prov.setCustomParameters({ prompt: 'select_account' });
    try { await A.signInWithPopup(auth, prov); }
    catch (e) {
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) return A.signInWithRedirect(auth, prov);
      if (e.code !== 'auth/popup-closed-by-user') loginScreen(e.code === 'auth/unauthorized-domain' ? 'Domain nicht freigegeben: Firebase > Authentication > Einstellungen > Autorisierte Domains > itnesh.github.io hinzufügen.' : e.message);
    }
  };
}
async function boot() {
  localStorage.removeItem('hb-key');
  if (/^#k=/.test(location.hash)) history.replaceState(null, '', location.pathname + '#/start');
  const cfg = window.HB_FIREBASE;
  if (cfg) { try { await initFirebase(cfg); } catch (e) { showErr(e); initLocal(); } }
  else initLocal();
  render();
}
// Neue Version erkennen (iPhone-App bleibt im Hintergrund offen): beim Zurückkehren index.html prüfen und neu laden
const MEIN_V = (document.querySelector('script[src*="app.js"]') || {}).src || '';
async function updateCheck() { try { const t = await (await fetch('index.html', { cache: 'no-store' })).text(); const m = t.match(/app\.js\?v=(\d+)/); if (m && MEIN_V && !MEIN_V.includes('v=' + m[1]) && !document.querySelector('.sheet.show [data-dirty="1"]')) { if (navigator.serviceWorker) { const r = await navigator.serviceWorker.getRegistration(); if (r) await r.update().catch(() => { }); } location.reload(); } } catch (e) { } }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') updateCheck(); });
setInterval(updateCheck, 10 * 60e3);
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { }); navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.nav) { const h = e.data.nav.split('#')[1]; if (h !== undefined && location.hash !== '#' + h) location.hash = h; else render(); } }); }
boot();
