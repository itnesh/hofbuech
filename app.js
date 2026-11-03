// hofbuech - Hof-App (PWA). Daten lokal oder in Firestore (hoefe/{schluessel}/...).
const VERSION = '1.6.0';

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
const nf = n => (Math.round(n * 10) / 10).toLocaleString('de-CH');
const MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const clean = o => JSON.parse(JSON.stringify(o));
const kurzOM = om => { const d = String(om || '').replace(/\D/g, ''); return d.length >= 5 ? d.slice(-5, -1) : d; };
const alterTxt = m => m === null || m === undefined ? '' : m <= 25 ? `${m} Mt.` : `${(m / 12).toFixed(1)} J.`;
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
};

/* ---------- Einstellungen ---------- */
const DEF = {
  hofname: 'Hof Bannhalde', tragzeit: 285, kalbMonate: 12, laktAbMonate: 16, abgekalbtTage: 60,
  alpVon: '05-25', alpBis: '10-05', puffer: 14, unbesamtAb: 16, baldTage: 30,
  parzellen: [], gruende: ['Winter / Vegetation', 'Zu nass', 'Kein Futter', 'Geburt', 'Eingriff am Tier', 'Kälte', 'Sturm'],
  medikamente: [], startHeu: 0, startSilo: 0
};

/* ---------- Datenhaltung ---------- */
const COLLS = ['tiere', 'ereignisse', 'behandlungen', 'auslauf', 'feld', 'parzellen'];
const S = { tiere: [], ereignisse: [], behandlungen: [], auslauf: [], feld: [], parzellen: [], set: { ...DEF } };
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
  try { const d = JSON.parse(localStorage.getItem('hb-local') || '{}'); COLLS.forEach(c => S[c] = d[c] || []); S.set = mergeSet(d.set); } catch (e) { }
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
    S[c] = snap.docs.map(d => ({ ...d.data(), id: d.id })); if (!snap.metadata.fromCache && lastErr) { lastErr = null; }
    setSync(snap.metadata.fromCache ? 'off' : 'ok', snap.metadata.fromCache ? 'Offline - wird später synchronisiert' : 'Synchronisiert');
    schedule();
  }, showErr));
  F.onSnapshot(F.doc(db, 'hoefe', HOF, 'einstellungen', 'main'), d => { S.set = mergeSet(d.data()); schedule(); }, showErr);
  W = {
    put: (c, o) => { F.setDoc(F.doc(db, 'hoefe', HOF, c, o.id), clean(o)).catch(showErr); },
    del: (c, id) => { F.deleteDoc(F.doc(db, 'hoefe', HOF, c, id)).catch(showErr); },
    setSettings: o => { F.setDoc(F.doc(db, 'hoefe', HOF, 'einstellungen', 'main'), clean(o)).catch(showErr); }
  };
}

function put(c, o) { o.id = o.id || uid(); o.geaendert = Date.now(); W.put(c, o); return o; }
function del(c, id) { W.del(c, id); }

/* ---------- Fachlogik ---------- */
const parzellen = () => [...new Set([...S.parzellen.map(x => x.name), ...(S.set.parzellen || []), ...S.feld.map(f => f.parzelle), ...S.auslauf.map(a => a.parzelle)].filter(Boolean))];
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

function agenda(tage = 150) {
  const d = today(), end = addDays(d, tage), it = [];
  for (const t of aktiveTiere()) {
    const n = t.name || t.ohrmarke, l = lakt(t), f = frist(t.id);
    if (f) it.push({ d: f.freiAb, t: 'Absetzfrist endet', s: `${n} · ${f.medikament || ''}`, id: t.id, c: 'warn' });
    if (!l) continue;
    if (l.status === 'Besamt') {
      it.push({ d: l.erwartet, t: 'Abkalbung erwartet', s: n + (inAlp(l.erwartet) ? ' · während Alp!' : ''), id: t.id, c: inAlp(l.erwartet) ? 'red' : 'green' });
      const k = addDays(l.bes.datum, 21); if (k >= addDays(d, -2)) it.push({ d: k, t: 'Brunstkontrolle', s: `${n} · 21 T. nach Besamung`, id: t.id, c: 'blue' });
    } else {
      const br = evOf(t.id, 'brunst').filter(e => !l.cal || e.datum > l.cal.datum).pop();
      if (br) { let nx = addDays(br.datum, 21); while (nx < addDays(d, -1)) nx = addDays(nx, 21); it.push({ d: nx, t: 'Brunst erwartet', s: n + (imVerbot(nx) ? ' · Besamungsverbot' : ''), id: t.id, c: imVerbot(nx) ? 'red' : 'blue' }); }
    }
  }
  for (const y of [+d.slice(0, 4), +d.slice(0, 4) + 1]) { const [a, b] = alpFenster(y); const ist = alpIst()[String(y)]; if (!ist) it.push({ d: a, t: 'Alpauffahrt (geplant)', s: '', c: 'grey' }); if (!ist || !ist[1]) it.push({ d: b, t: 'Alpabfahrt (geplant)', s: '', c: 'grey' }); }
  for (const y of [+d.slice(0, 4), +d.slice(0, 4) + 1]) it.push(...pzRegeln(y));
  return it.filter(x => x.d >= addDays(d, -2) && x.d <= end).sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0);
}
// '15.6.' oder '15.06' = Tag.Monat, '06-15' = Monat-Tag -> 'MM-TT'
function mmtt(x) { const t = String(x || '').trim(); let m = t.match(/^(\d{1,2})\.(\d{1,2})\.?$/); if (m) return `${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; m = t.match(/^(\d{1,2})-(\d{1,2})$/); return m ? `${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : ''; }
const pzInfo = n => S.parzellen.find(x => x.name === n);
function pzRegeln(y) {
  const out = [];
  for (const z of S.parzellen) {
    if (z.schnittAb) out.push({ d: `${y}-${z.schnittAb}`, t: `Schnitt erlaubt ab heute`, s: `${z.name}${z.programm ? ' · ' + z.programm : ''}`, c: 'green', pz: z.name });
    if (z.fruehBis) out.push({ d: `${y}-${z.fruehBis}`, t: `Frühschnitt spätestens`, s: `${z.name}${z.programm ? ' · ' + z.programm : ''}`, c: 'warn', pz: z.name });
    if (z.schnitt2Ab) out.push({ d: `${y}-${z.schnitt2Ab}`, t: `2. Schnitt ab`, s: z.name, c: 'green', pz: z.name });
  }
  return out;
}
function feldWarnung(typ, pz, datum) {
  const z = pzInfo(pz); if (!z || !datum) return '';
  const w = [];
  if ((typ === 'guellen' || typ === 'misten') && z.duengen === 'nein') w.push(`Düngung auf ${z.name} nicht erlaubt (${z.programm || 'Vertrag'})`);
  if ((typ === 'heuen' || typ === 'silieren') && z.schnittAb && datum.slice(5) < z.schnittAb) w.push(`Frühester Schnitt auf ${z.name}: ${z.schnittAb.slice(3)}.${z.schnittAb.slice(0, 2)}.`);
  return w.map(x => `<div class="note" style="margin-top:6px"><b>Achtung:</b> ${esc(x)}</div>`).join('');
}
function frist(tid, d = today()) {
  return S.behandlungen.filter(b => (b.tierIds || []).includes(tid) && b.freiAb && b.freiAb > d).sort((a, b) => a.freiAb < b.freiAb ? 1 : -1)[0];
}
function lager() {
  let heu = num(S.set.startHeu), silo = num(S.set.startSilo);
  for (const f of S.feld) { const m = num(f.menge); if (f.typ === 'heuen') heu += m; if (f.typ === 'bezugHeu') heu -= m; if (f.typ === 'silieren') silo += m; if (f.typ === 'bezugSilage') silo -= m; }
  return { heu, silo };
}
function kpis(list = aktiveTiere()) {
  const k = { Kalb: 0, Rind: 0, Kuh: 0, Unbesamt: 0, Besamt: 0, Abgekalbt: 0 };
  for (const t of list) { k[kategorie(t)]++; const l = lakt(t); if (l) k[l.status]++; }
  return k;
}
function sortedAuslauf() { return [...S.auslauf].sort((a, b) => (a.datum + (a.zeit || '')) < (b.datum + (b.zeit || '')) ? -1 : 1); }
function herdeAm(d = today(), list = sortedAuslauf()) { let best = null; for (const a of list) { if (a.datum > d) break; best = a; } return best; }
const ortTxt = a => !a ? 'Kein Eintrag' : a.typ + (a.typ === 'Weide' && a.parzelle ? ' · ' + a.parzelle : (a.typ === 'Stall' || a.typ === 'Laufhof') && a.grund ? ' · ' + a.grund : a.ort ? ' · ' + a.ort : '');
function ortAm(tid, d, list = sortedAuslauf()) { let best = null; for (const a of list) { if (a.datum > d) break; if ((a.tierIds || []).includes(tid)) best = a; } return best; }

/* ---------- Router ---------- */
let rq = false;
function schedule() { if (rq) return; rq = true; requestAnimationFrame(() => { rq = false; render(); }); }
const UI = { tierFilter: { kat: '', lakt: '', q: '', sort: 'name', abg: false }, jTab: 'auslauf', kalMonat: today().slice(0, 7), kalTag: '', fTab: 'austrag', jahr: String(new Date().getFullYear()) };

function render() {
  if (mode === 'firebase' && !USER) return;
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
    else if (p[0] === 'journale') { title = 'Journale'; html = vJournale(); }
    else if (p[0] === 'feld') { title = 'Bewirtschaftung'; html = vFeld(); }
    else if (p[0] === 'kalender') { title = 'Kalender'; html = vKalender(); }
    else if (p[0] === 'analyse') { title = 'Analyse'; html = vAnalyse(); }
    else if (p[0] === 'einstellungen') { title = 'Einstellungen'; html = vSettings(); showBack = true; tab = ''; }
    else { html = vStart(); tab = 'start'; }
  } catch (e) { console.error(e); html = `<div class="note">Anzeigefehler: ${esc(e.message)}</div>`; }
  $('#title').textContent = title;
  back.classList.toggle('hidden', !showBack);
  $$('#tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  const sx = window.scrollY, same = view.dataset.route === h;
  view.innerHTML = errBanner() + html; view.dataset.route = h;
  if (same) window.scrollTo(0, sx);
  afterRender();
}
function afterRender() {
  const sc = $('.tl-scroll');
  if (sc && sc.dataset.today && !sc.dataset.done) { sc.scrollLeft = Math.max(0, +sc.dataset.today - sc.clientWidth * 0.45); sc.dataset.done = 1; }
}

/* ---------- Views ---------- */
function kpiBlock(k, link = false, L = null) {
  const c = (key, label) => link
    ? `<button type="button" class="stat ${UI.tierFilter.kat === key || UI.tierFilter.lakt === key ? 'sel' : ''}" data-act="filt" data-v="${key}"><b>${k[key]}</b><span>${label}</span></button>`
    : `<a class="stat" href="#/tiere" data-act="filtlink" data-v="${key}"><b>${k[key]}</b><span>${label}</span></a>`;
  const lg = L ? `<div class="stats-row"><span class="stats-h">Lager</span><a class="stat ${L.heu <= 5 ? 'low' : ''}" href="#/feld" data-act="ftab" data-v="lager"><b>${nf(L.heu)}</b><span>Heu</span></a><a class="stat ${L.silo <= 5 ? 'low' : ''}" href="#/feld" data-act="ftab" data-v="lager"><b>${nf(L.silo)}</b><span>Silo</span></a><span class="stat ghost"></span></div>` : '';
  return `<div class="stats"><div class="stats-row"><span class="stats-h">Bestand</span>${c('Kalb', 'Kälber')}${c('Rind', 'Rinder')}${c('Kuh', 'Kühe')}</div><div class="stats-row"><span class="stats-h">Laktation</span>${c('Unbesamt', 'Unbesamt')}${c('Besamt', 'Besamt')}${c('Abgekalbt', 'Abgekalbt')}</div>${lg}</div>`;
}
function herdeBanner() {
  const a = herdeAm(), ic = !a ? '?' : a.typ === 'Weide' ? IC.heuen : a.typ === 'Alp' ? I('<path d="M3 20l6-10 4 6 3-4 5 8z"/>') : I('<path d="M4 11l8-7 8 7v9H4z"/>');
  return `<button type="button" class="herde ${a ? a.typ.toLowerCase() : ''}" data-act="form" data-f="auslauf"><span class="herde-ic">${ic}</span><span class="herde-t"><b>${esc(ortTxt(a))}</b><small>${a ? 'Herde seit ' + fmt(a.datum) + ' · ' + diff(a.datum, today()) + ' T.' : 'Auslaufjournal: ersten Eintrag erfassen'}</small></span><span class="herde-go">Wechseln</span></button>`;
}
function agendaRows(items) {
  return items.map(x => `<${x.id ? `a href="#/tier/${x.id}"` : 'div'} class="row ag"><span class="dt ${x.c}"><b>${x.d.slice(8, 10)}</b><small>${MON[+x.d.slice(5, 7) - 1]}</small></span><div class="main"><span class="t">${esc(x.t)}</span><span class="s">${esc(x.s)}${x.s ? ' · ' : ''}${relTag(x.d)}</span></div></${x.id ? 'a' : 'div'}>`).join('');
}
function vStart() {
  const k = kpis(), L = lager();
  if (!S.tiere.length) {
    return `${kpiBlock(k, false, L)}
    <div class="card" style="margin-top:16px"><b>Los geht's</b><p class="muted" style="margin:6px 0 12px">Bestand als Excel aus agate.ch importieren oder einzeln über den + Button erfassen.</p><div class="btns"><label class="btn pri">TVD-Bestand importieren<input type="file" accept=".xlsx,.xls,.csv" data-act="tvdimport" class="hidden"></label><button class="btn" data-act="form" data-f="zugang">Tier erfassen</button></div></div>`;
  }
  const ag = agenda();
  return `${herdeBanner()}${kpiBlock(k, false, L)}
  <div class="sec-t">Demnächst</div>
  <div class="list">${ag.length ? agendaRows(ag.slice(0, 12)) : '<div class="empty">Nichts geplant. Brunst und Besamung erfassen, dann erscheinen hier die nächsten Termine.</div>'}</div>`;
}
function lagerKpi(L) {
  return `<div class="stats"><div class="stats-row"><span class="stats-h">Lager</span><span class="stat ${L.heu <= 5 ? 'low' : ''}"><b>${nf(L.heu)}</b><span>Heuballen</span></span><span class="stat ${L.silo <= 5 ? 'low' : ''}"><b>${nf(L.silo)}</b><span>Siloballen</span></span><span class="stat ghost"></span></div></div>`;
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
    <input class="search" type="search" placeholder="Suchen" value="${esc(F.q)}" data-act="q" aria-label="Suche">
    <select class="sel" data-act="sort" aria-label="Sortierung">${[['name', 'Name'], ['ohrmarke', 'Ohrmarke'], ['alter', 'Alter'], ['abkalbung', 'Nächste Abkalbung']].map(([v, l]) => `<option value="${v}" ${F.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <button type="button" class="chip ${F.abg ? 'on' : ''}" data-act="abg">Abgänge</button>
    <label class="chip">TVD-Import<input type="file" accept=".xlsx,.xls,.csv" data-act="tvdimport" class="hidden"></label>
    ${F.kat || F.lakt || F.q ? '<button type="button" class="chip" data-act="reset">Filter löschen</button>' : ''}
  </div>
  ${tlTiere.length ? `<div class="sec-t">Zeitachse (heute ±365 Tage)</div>${timeline(tlTiere)}` : ''}
  <div class="sec-t">${list.length} Tiere</div>
  <div class="list">${list.length ? list.map(t => tierRow(t, d)).join('') : '<div class="empty">Keine Tiere.</div>'}</div>`;
}
function tierRow(t, d = today()) {
  const l = lakt(t), f = frist(t.id), kat = kategorie(t);
  const sub = [kat, alterTxt(alterMt(t)), t.rasse].filter(Boolean).join(' · ');
  let pill = '';
  if (!aktiv(t)) pill = `<span class="pill grey">${esc(t.abgangGrund || 'Abgang')} ${fmtS(t.abgang)}</span>`;
  else if (f) pill = `<span class="pill warn">Frist ${fmtS(f.freiAb)}</span>`;
  else if (l) pill = l.status === 'Besamt' ? `<span class="pill ${inAlp(l.erwartet) ? 'red' : 'blue'}">Abk. ${fmtS(l.erwartet)}</span>` : l.status === 'Abgekalbt' ? `<span class="pill">Abgekalbt</span>` : `<span class="pill grey">Unbesamt</span>`;
  const m = alterMt(t);
  const hl = aktiv(t) && l && ((l.status === 'Unbesamt' && (m === null || m >= S.set.unbesamtAb)) || (l.status === 'Besamt' && diff(d, l.erwartet) <= S.set.baldTage));
  return `<a class="row ${hl ? 'hl' : ''}" href="#/tier/${t.id}"><span class="av ${kat.toLowerCase()}">${esc((t.name || '?').slice(0, 1).toUpperCase())}</span><div class="main"><span class="t">${esc(t.name || t.ohrmarke)}${t.ohrmarke ? ` <span class="om">${kurzOM(t.ohrmarke)}</span>` : ''}${t.geschlecht === 'm' ? ' <span class="om">♂</span>' : ''}</span><span class="s">${esc(sub)}</span></div>${pill}</a>`;
}
function timeline(tiere) {
  const d = today(), start = addDays(d, -365), end = addDays(d, 365);
  const ppd = 1.3, W = Math.round(730 * ppd), rowH = 28, head = 30, H = head + tiere.length * rowH;
  const x = s => Math.round(diff(start, s) * ppd * 10) / 10;
  const clip = (a, b) => [a < start ? start : a, b > end ? end : b];
  let g = '';
  const y0 = +start.slice(0, 4), y1 = +end.slice(0, 4) + 1;
  for (let y = y0; y <= y1; y++) {
    for (let [a, b] of verbotSegmente(y)) if (b >= start && a <= end) { [a, b] = clip(a, b); g += `<rect x="${x(a)}" y="${head}" width="${x(b) - x(a)}" height="${H - head}" fill="url(#hatch)"/>`; }
    let [a, b] = alpFenster(y);
    if (b >= start && a <= end) { [a, b] = clip(a, b); g += `<rect x="${x(a)}" y="${head}" width="${x(b) - x(a)}" height="${H - head}" fill="#CFE3D5" opacity=".7"/><text x="${x(a) + 4}" y="${head + 12}" font-size="10" fill="#1F4D36">Alp</text>`; }
  }
  // Monatsraster
  const m0 = pd(start); m0.setDate(1); m0.setMonth(m0.getMonth() + 1);
  for (let m = new Date(m0); iso(m) <= end; m.setMonth(m.getMonth() + 1)) {
    const s = iso(m), xx = x(s);
    g += `<line x1="${xx}" x2="${xx}" y1="${head - 6}" y2="${H}" stroke="#EEF0EC"/><text x="${xx + 3}" y="${head - 10}" font-size="11" fill="#59605B">${MON[m.getMonth()]}${m.getMonth() === 0 ? ' ' + String(m.getFullYear()).slice(2) : ''}</text>`;
  }
  tiere.forEach((t, i) => {
    const cy = head + i * rowH + rowH / 2;
    g += `<line x1="0" x2="${W}" y1="${head + (i + 1) * rowH}" y2="${head + (i + 1) * rowH}" stroke="#EEF0EC"/>`;
    for (const e of evOf(t.id)) {
      if (e.datum < start || e.datum > end) continue;
      const xx = x(e.datum);
      if (e.typ === 'brunst') g += `<line x1="${xx}" x2="${xx}" y1="${cy - 7}" y2="${cy + 7}" stroke="#B8641A" stroke-width="2"><title>Brunst ${fmt(e.datum)}</title></line>`;
      if (e.typ === 'besamung') g += `<circle cx="${xx}" cy="${cy}" r="5.5" fill="${imVerbot(e.datum) ? '#A12A1F' : '#1D4F91'}"><title>Besamung ${fmt(e.datum)}${e.stier ? ' · ' + esc(e.stier) : ''}</title></circle>`;
      if (e.typ === 'abkalbung') g += `<path d="M${xx} ${cy - 7}L${xx + 7} ${cy + 6}L${xx - 7} ${cy + 6}Z" fill="#1F4D36"><title>Abkalbung ${fmt(e.datum)}</title></path>`;
    }
    const l = lakt(t);
    if (l && l.status === 'Besamt' && l.erwartet <= end) {
      const xx = x(l.erwartet), bad = inAlp(l.erwartet);
      g += `<line x1="${x(l.bes.datum)}" x2="${xx}" y1="${cy}" y2="${cy}" stroke="${bad ? '#A12A1F' : '#1D4F91'}" stroke-dasharray="3 3" opacity=".6"/><path d="M${xx} ${cy - 7}L${xx + 7} ${cy + 6}L${xx - 7} ${cy + 6}Z" fill="#fff" stroke="${bad ? '#A12A1F' : '#1F4D36'}" stroke-width="2"><title>Erwartete Abkalbung ${fmt(l.erwartet)}</title></path>`;
    }
  });
  const tx = x(d);
  g += `<line x1="${tx}" x2="${tx}" y1="${head - 6}" y2="${H}" stroke="#1A1F1C" stroke-width="1.5"/><text x="${tx + 3}" y="${H - 4}" font-size="10" fill="#1A1F1C">heute</text>`;
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Zeitachse Besamung und Abkalbung"><defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#F8E1DE"/><line x1="0" y1="0" x2="0" y2="6" stroke="#E3A79F" stroke-width="2"/></pattern></defs>${g}</svg>`;
  return `<div class="tl"><div class="tl-names"><div>Tier</div>${tiere.map(t => `<div><a href="#/tier/${t.id}" style="color:inherit;text-decoration:none">${esc(t.name || t.ohrmarke)}</a></div>`).join('')}</div><div class="tl-scroll" data-today="${tx}">${svg}</div></div>
  <div class="legend"><span><i class="sw" style="background:#1D4F91;border-radius:99px"></i>Besamung</span><span><i class="sw" style="background:#B8641A;width:3px"></i>Brunst</span><span><i class="sw" style="background:#1F4D36"></i>Abkalbung</span><span><i class="sw" style="border:2px solid #1F4D36;background:#fff"></i>erwartet</span><span><i class="sw" style="background:#CFE3D5"></i>Alp</span><span><i class="sw" style="background:#F8E1DE;border:1px solid #E3A79F"></i>Besamungsverbot</span></div>`;
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
  <div class="btns" style="margin-top:12px">
    ${t.geschlecht === 'w' ? `<button class="btn" data-act="form" data-f="besamung" data-tier="${t.id}">+ Besamung</button><button class="btn" data-act="form" data-f="brunst" data-tier="${t.id}">+ Brunst</button><button class="btn" data-act="form" data-f="geburt" data-tier="${t.id}">+ Geburt</button>` : ''}
    <button class="btn" data-act="form" data-f="behandlung" data-tier="${t.id}">+ Behandlung</button>
    <button class="btn" data-act="edit" data-c="tiere" data-id="${t.id}">Bearbeiten</button>
  </div>`;
}
function evLabel(e) {
  if (e.typ === 'abkalbung') { const k = e.kalbId ? tierById(e.kalbId) : null; return ['Abkalbung', [k ? (k.geschlecht === 'm' ? '♂ ' : '♀ ') + (k.name || k.ohrmarke) : '', e.verlauf].filter(Boolean).join(' · ')]; }
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
  <div class="btns" style="margin:12px 0"><button class="btn" data-act="form" data-f="besamung" data-tier="${t.id}">+ Besamung</button><button class="btn" data-act="form" data-f="brunst" data-tier="${t.id}">+ Brunst</button><button class="btn" data-act="form" data-f="geburt" data-tier="${t.id}">+ Geburt</button></div>
  <div class="list">${ev.length ? ev.map(e => { const [a, b] = evLabel(e); return `<button type="button" class="row" data-act="edit" data-c="ereignisse" data-id="${e.id}"><div class="main"><span class="t">${a}</span><span class="s">${esc(b)}</span></div><span class="r">${fmt(e.datum)}</span></button>`; }).join('') : '<div class="empty">Keine Meldungen.</div>'}</div>`;
}
function vNachkommen(t) {
  const k = S.tiere.filter(x => x.mutterId === t.id).sort((a, b) => (a.geburt || '') < (b.geburt || '') ? 1 : -1);
  return `<div class="sec-t">Nachkommen von ${esc(t.name || t.ohrmarke)}</div><div class="list">${k.length ? k.map(x => tierRow(x)).join('') : '<div class="empty">Keine Nachkommen erfasst.</div>'}</div>`;
}
function behRows(list) {
  return list.length ? list.map(b => `<button type="button" class="row" data-act="edit" data-c="behandlungen" data-id="${b.id}"><div class="main"><span class="t">${esc(b.medikament || '-')}${b.grund ? ' · ' + esc(b.grund) : ''}</span><span class="s">${esc(tierListe(b.tierIds))} · ${esc([b.menge, b.art, b.durch].filter(Boolean).join(' · '))}</span></div><div class="r">${fmt(b.datum)}<br>${b.freiAb && b.freiAb > today() ? `<span class="pill warn">frei ab ${fmtS(b.freiAb)}</span>` : `<span class="pill">frei</span>`}</div></button>`).join('') : '<div class="empty">Keine Behandlungen.</div>';
}
function tierListe(ids = []) { const a = aktiveTiere(); if (ids.length > 3 && a.length && a.every(t => ids.includes(t.id))) return `Alle (${ids.length})`; return ids.length > 3 ? `${ids.length} Tiere` : ids.map(tName).join(', '); }
function vTierBeh(t) {
  const list = S.behandlungen.filter(b => (b.tierIds || []).includes(t.id)).sort((a, b) => a.datum < b.datum ? 1 : -1);
  return `<div class="sec-t">${esc(t.name || t.ohrmarke)}</div><div class="btns" style="margin-bottom:12px"><button class="btn" data-act="form" data-f="behandlung" data-tier="${t.id}">+ Behandlung</button><button class="btn" data-act="pdf" data-p="behTier" data-id="${t.id}">PDF</button></div><div class="list">${behRows(list)}</div>`;
}

function jahre(listen) { const s = new Set([String(new Date().getFullYear())]); listen.forEach(l => l.forEach(x => x.datum && s.add(x.datum.slice(0, 4)))); return [...s].sort().reverse(); }
function jahrSel() { return `<select class="sel" data-act="jahr" aria-label="Jahr">${jahre([S.behandlungen, S.auslauf, S.feld]).map(j => `<option ${j === UI.jahr ? 'selected' : ''}>${j}</option>`).join('')}</select>`; }

function vJournale() {
  const tabs = `<div class="seg" style="margin:8px 0 12px">${[['auslauf', 'Auslaufjournal'], ['behandlung', 'Behandlungsjournal']].map(([v, l]) => `<button type="button" class="${UI.jTab === v ? 'on' : ''}" data-act="jtab" data-v="${v}">${l}</button>`).join('')}</div>`;
  if (UI.jTab === 'auslauf') return tabs + vAuslauf();
  const list = S.behandlungen.filter(b => (b.datum || '').startsWith(UI.jahr)).sort((a, b) => a.datum < b.datum ? 1 : -1);
  const offen = S.behandlungen.filter(b => b.freiAb && b.freiAb > today());
  return `${tabs}
  ${offen.length ? `<div class="note" style="margin-bottom:12px">${offen.length} laufende Absetzfrist(en), letzte endet ${fmt(offen.map(b => b.freiAb).sort().pop())}</div>` : ''}
  <div class="toolbar">${jahrSel()}<button class="btn pri" data-act="form" data-f="behandlung">+ Behandlung</button><button class="btn" data-act="pdf" data-p="beh">PDF ${UI.jahr}</button></div>
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
  return `${herdeBanner()}
  <div class="stats"><div class="stats-row four"><span class="stats-h">Tage ${UI.jahr}</span>${cell('Weide')}${cell('Laufhof')}${cell('Stall')}${cell('Alp')}</div></div>
  <div class="toolbar">${jahrSel()}<button class="btn pri" data-act="form" data-f="auslauf">+ Eintrag</button><button class="btn" data-act="pdf" data-p="auslaufJahr">PDF ${UI.jahr}</button></div>
  <div class="toolbar"><input class="search" type="date" value="${d}" id="auslaufTag" aria-label="Tag" style="flex:0 1 180px"><button class="btn" data-act="pdf" data-p="auslaufTag">PDF Tag</button></div>
  <div class="list">${per.length ? per.map(p => { const dauer = diff(p.a.datum, p.bis || addDays(d, 1)); return `<button type="button" class="row" data-act="edit" data-c="auslauf" data-id="${p.a.id}"><span class="av ${p.a.typ.toLowerCase()}">${esc(p.a.typ.slice(0, 1))}</span><div class="main"><span class="t">${esc(ortTxt(p.a))}</span><span class="s">${fmt(p.a.datum)} – ${p.bis ? fmt(addDays(p.bis, -1)) : 'heute'}</span></div><span class="r"><b>${dauer}</b> T.</span></button>`; }).join('') : '<div class="empty">Keine Einträge in diesem Jahr.</div>'}</div>`;
}
const FELD = {
  guellen: { l: 'Güllen', e: 'm³', g: 'austrag' }, misten: { l: 'Misten', e: 't', g: 'austrag' },
  heuen: { l: 'Heuen', e: 'Ballen', g: 'ernte' }, silieren: { l: 'Silieren', e: 'Ballen', g: 'ernte' },
  bezugHeu: { l: 'Lagerbezug Heu', e: 'Ballen', g: 'lager' }, bezugSilage: { l: 'Lagerbezug Silage', e: 'Ballen', g: 'lager' }
};
function vFeld() {
  if (UI.fTab === 'parzellen') return vParzellen();
  const tabs = `<div class="seg" style="margin:8px 0 12px">${[['austrag', 'Austragung'], ['ernte', 'Ernte'], ['lager', 'Lager'], ['parzellen', 'Parzellen']].map(([v, l]) => `<button type="button" class="${UI.fTab === v ? 'on' : ''}" data-act="ftab" data-v="${v}">${l}</button>`).join('')}</div>`;
  const L = lager();
  const inJahr = S.feld.filter(f => (f.datum || '').startsWith(UI.jahr));
  const list = inJahr.filter(f => FELD[f.typ] && FELD[f.typ].g === UI.fTab).sort((a, b) => a.datum < b.datum ? 1 : -1);
  const rows = list.length ? list.map(f => `<button type="button" class="row" data-act="edit" data-c="feld" data-id="${f.id}"><div class="main"><span class="t">${FELD[f.typ].l}</span><span class="s">${esc(f.parzelle || f.zweck || '')}${f.notiz ? ' · ' + esc(f.notiz) : ''}</span></div><div class="r"><b>${f.typ.startsWith('bezug') ? '− ' : ''}${nf(num(f.menge))} ${FELD[f.typ].e}</b><br><span class="small muted">${fmt(f.datum)}</span></div></button>`).join('') : '<div class="empty">Keine Einträge.</div>';
  let top = '';
  if (UI.fTab === 'lager') {
    top = `${lagerKpi(L)}<div class="btns" style="margin:12px 0"><button class="btn" data-act="form" data-f="bezugHeu">− Heu beziehen</button><button class="btn" data-act="form" data-f="bezugSilage">− Silage beziehen</button></div>
    <div class="small muted" style="margin-bottom:8px">Bestand = Startbestand (Einstellungen) + Ernte − Bezüge, über alle Jahre.</div>`;
  } else {
    const sum = {};
    inJahr.filter(f => FELD[f.typ].g === UI.fTab).forEach(f => { const k = f.parzelle || '-'; sum[k] = sum[k] || {}; sum[k][f.typ] = (sum[k][f.typ] || 0) + num(f.menge); });
    const typs = Object.keys(FELD).filter(k => FELD[k].g === UI.fTab);
    top = `<div class="btns" style="margin-bottom:12px">${typs.map(k => `<button class="btn pri" data-act="form" data-f="${k}">+ ${FELD[k].l}</button>`).join('')}</div>
    ${Object.keys(sum).length ? `<div class="sec-t">Total ${UI.jahr} pro Parzelle</div><div class="list">${Object.entries(sum).map(([p, v]) => `<div class="row"><div class="main"><span class="t">${esc(p)}</span></div><span class="r">${typs.filter(k => v[k]).map(k => `${FELD[k].l.replace('Lagerbezug ', '')}: <b>${nf(v[k])} ${FELD[k].e}</b>`).join('<br>')}</span></div>`).join('')}</div>` : ''}`;
  }
  return `${tabs}${top}<div class="toolbar">${jahrSel()}<button class="btn" data-act="pdf" data-p="feld">Feldkalender PDF ${UI.jahr}</button></div><div class="list">${rows}</div>`;
}

function vParzellen() {
  const tabs = `<div class="seg" style="margin:8px 0 12px">${[['austrag', 'Austragung'], ['ernte', 'Ernte'], ['lager', 'Lager'], ['parzellen', 'Parzellen']].map(([v, l]) => `<button type="button" class="${UI.fTab === v ? 'on' : ''}" data-act="ftab" data-v="${v}">${l}</button>`).join('')}</div>`;
  const y = UI.jahr, list = [...S.parzellen].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));
  const tot = list.reduce((a, z) => a + num(z.ha), 0);
  const md = x => x ? `${x.slice(3)}.${x.slice(0, 2)}.` : '';
  return `${tabs}<div class="toolbar"><button class="btn pri" data-act="form" data-f="parzelle">+ Parzelle</button><span class="muted small">${list.length} Parzellen · ${nf(tot)} ha</span></div>
  <div class="list">${list.length ? list.map(z => {
    const f = S.feld.filter(x => x.parzelle === z.name && (x.datum || '').startsWith(y));
    const sum = t => f.filter(x => x.typ === t).reduce((a, x) => a + num(x.menge), 0);
    const info = [z.nutzung, z.ha ? nf(num(z.ha)) + ' ha' : '', z.schnittAb ? 'Schnitt ab ' + md(z.schnittAb) : '', z.fruehBis ? 'Frühschnitt bis ' + md(z.fruehBis) : '', z.duengen === 'nein' ? 'keine Düngung' : ''].filter(Boolean).join(' · ');
    const bil = [sum('guellen') ? nf(sum('guellen')) + ' m³ Gülle' : '', sum('misten') ? nf(sum('misten')) + ' t Mist' : '', sum('heuen') ? nf(sum('heuen')) + ' Heu' : '', sum('silieren') ? nf(sum('silieren')) + ' Silo' : ''].filter(Boolean).join(' · ');
    return `<button type="button" class="row" data-act="edit" data-c="parzellen" data-id="${z.id}"><span class="av weide">${esc((z.name || '?').slice(0, 1).toUpperCase())}</span><div class="main"><span class="t">${esc(z.name)}${z.programm ? ` <span class="pill ${z.programm === 'Labiola' ? '' : 'blue'}">${esc(z.programm)}</span>` : ''}</span><span class="s">${esc(info || 'keine Auflagen')}</span>${bil ? `<span class="s">${y}: ${esc(bil)}</span>` : ''}</div></button>`;
  }).join('') : '<div class="empty">Noch keine Parzellen. Mit Programm (z.B. Labiola), Schnittzeitpunkt und Düngeverbot erfassen, dann warnt die App beim Güllen und Mähen.</div>'}</div>`;
}

function kalItems(from, to) {
  const it = [];
  for (const e of S.ereignisse) { const [a] = evLabel(e); it.push({ d: e.datum, t: a, s: tName(e.tierId), id: e.tierId, c: e.typ === 'abkalbung' ? 'green' : e.typ === 'besamung' ? 'blue' : 'warn' }); }
  for (const b of S.behandlungen) it.push({ d: b.datum, t: 'Behandlung', s: `${tierListe(b.tierIds)} · ${b.medikament || ''}`, c: 'red' });
  for (const f of S.feld) if (FELD[f.typ]) it.push({ d: f.datum, t: FELD[f.typ].l, s: [f.parzelle || f.zweck, nf(num(f.menge)) + ' ' + FELD[f.typ].e].filter(Boolean).join(' · '), c: 'grey' });
  for (const a of S.auslauf) it.push({ d: a.datum, t: ortTxt(a), s: 'Auslaufjournal', c: 'grey' });
  for (const t of S.tiere) { if (t.geburt && t.zugang === t.geburt) continue; if (t.zugang) it.push({ d: t.zugang, t: 'Zugang', s: t.name || t.ohrmarke, id: t.id, c: 'grey' }); }
  for (const t of S.tiere) if (t.abgang) it.push({ d: t.abgang, t: 'Abgang ' + (t.abgangGrund || ''), s: t.name || t.ohrmarke, id: t.id, c: 'grey' });
  it.push(...agenda(800).map(x => ({ ...x, plan: true })));
  const cy = +today().slice(0, 4);
  for (let y = +from.slice(0, 4); y <= +to.slice(0, 4); y++) if (y < cy) it.push(...pzRegeln(y).map(x => ({ ...x, plan: true })));
  return it.filter(x => x.d && x.d >= from && x.d <= to).sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0);
}
function vKalender() {
  const [Y, M] = UI.kalMonat.split('-').map(Number);
  const first = `${UI.kalMonat}-01`, nDays = new Date(Y, M, 0).getDate(), last = `${UI.kalMonat}-${String(nDays).padStart(2, '0')}`;
  const items = kalItems(first, last), byDay = {};
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
  const rows = show.map(x => `<${x.id ? `a href="#/tier/${x.id}"` : 'div'} class="row ag"><span class="dt ${x.c}"><b>${x.d.slice(8, 10)}</b><small>${MON[+x.d.slice(5, 7) - 1]}</small></span><div class="main"><span class="t">${esc(x.t)}${x.plan ? ' <span class="pill grey">geplant</span>' : ''}</span><span class="s">${esc(x.s || '')}</span></div></${x.id ? 'a' : 'div'}>`).join('');
  return `<div class="kal">
    <div class="kal-h"><button type="button" class="iconbtn" data-act="kalmon" data-v="-1" aria-label="Vormonat">‹</button><b>${['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][M - 1]} ${Y}</b><button type="button" class="iconbtn" data-act="kalmon" data-v="1" aria-label="Folgemonat">›</button></div>
    <div class="kal-w"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div>
    <div class="kal-g">${cells}</div>
  </div>
  <div class="legend"><span><i class="sw" style="background:var(--green)"></i>Abkalbung / Schnitt</span><span><i class="sw" style="background:var(--blue)"></i>Besamung / Brunst</span><span><i class="sw" style="background:var(--red)"></i>Behandlung</span><span><i class="sw" style="background:#C9CCC6"></i>Feld / Auslauf</span><span><i class="sw" style="background:#FCEEDD"></i>Alp</span></div>
  <div class="sec-t">${UI.kalTag && UI.kalTag.startsWith(UI.kalMonat) ? fmt(UI.kalTag) + ' <a href="#/kalender" data-act="kaltag" data-v="" style="font-weight:500;text-transform:none;letter-spacing:0">ganzer Monat</a>' : 'Ganzer Monat'}</div>
  <div class="list">${rows || '<div class="empty">Keine Einträge.</div>'}</div>`;
}

function svgBars(series, labels, colors, h = 150) {
  const n = labels.length, W = 340, pad = 22, bw = (W - pad) / n;
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
function svgLines(series, labels, colors, h = 150) {
  const W = 340, pad = 26, n = labels.length, all = series.flat(), mx = Math.max(1, ...all), mn = Math.min(0, ...all);
  const x = i => pad + i * (W - pad - 6) / Math.max(1, n - 1), y = v => 8 + (mx - v) / (mx - mn || 1) * (h - 30);
  let g = `<line x1="${pad}" x2="${W}" y1="${y(0)}" y2="${y(0)}" stroke="#E2E4DF"/><text x="0" y="12" font-size="9" fill="#5F6862">${nf(mx)}</text>`;
  series.forEach((s, k) => { g += `<polyline fill="none" stroke="${colors[k]}" stroke-width="2.2" stroke-linejoin="round" points="${s.map((v, i) => `${x(i)},${y(v)}`).join(' ')}"/>`; });
  labels.forEach((l, i) => { if (i % Math.ceil(n / 8) === 0) g += `<text x="${x(i)}" y="${h - 4}" font-size="9" text-anchor="middle" fill="#5F6862">${l}</text>`; });
  return `<svg viewBox="0 0 ${W} ${h}" width="100%" role="img" aria-label="Diagramm">${g}</svg>`;
}
function vAnalyse() {
  const J = UI.jahr, now = new Date();
  // Lagerverlauf 24 Monate
  const mons = []; for (let i = 23; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 0); mons.push(iso(d)); }
  const bal = (typ, plus, minus, start) => mons.map(e => num(start) + S.feld.filter(f => f.datum <= e).reduce((a, f) => a + (f.typ === plus ? num(f.menge) : f.typ === minus ? -num(f.menge) : 0), 0));
  const heu = bal('h', 'heuen', 'bezugHeu', S.set.startHeu), silo = bal('s', 'silieren', 'bezugSilage', S.set.startSilo);
  const ml = mons.map(m => MON[+m.slice(5, 7) - 1]);
  // Auslauf pro Monat
  const typs = ['Weide', 'Laufhof', 'Stall', 'Alp'], cols = ['#2E8B62', '#5B8FD6', '#1F4E8C', '#E0A35C'];
  const per = typs.map(() => Array(12).fill(0));
  auslaufTage(J).forEach(([d, a]) => { const k = typs.indexOf(a.typ); if (k >= 0) per[k][+d.slice(5, 7) - 1]++; });
  // Zucht
  const yrs = jahre([S.ereignisse]).sort();
  const cnt = (typ, y) => S.ereignisse.filter(e => e.typ === typ && e.datum.startsWith(y)).length;
  const zk = []; S.tiere.forEach(t => { const c = evOf(t.id, 'abkalbung'); for (let i = 1; i < c.length; i++) zk.push(diff(c[i - 1].datum, c[i].datum)); });
  const bes = cnt('besamung', J), abk = cnt('abkalbung', J);
  const graf = S.set.grafanaUrl ? `<div class="sec-t">Sensoren (Grafana)</div><div class="card" style="padding:0;overflow:hidden"><iframe src="${esc(S.set.grafanaUrl)}" style="width:100%;height:320px;border:0" loading="lazy" title="Grafana"></iframe></div>` : '';
  return `<div class="toolbar">${jahrSel()}</div>
  <div class="sec-t">Lagerverlauf (24 Monate)</div>
  <div class="card">${svgLines([heu, silo], ml, ['#2E8B62', '#E0A35C'])}<div class="legend"><span><i class="sw" style="background:#2E8B62"></i>Heuballen</span><span><i class="sw" style="background:#E0A35C"></i>Siloballen</span></div></div>
  <div class="sec-t">Auslauf ${J} (Tage pro Monat)</div>
  <div class="card">${svgBars(per, MON.map(m => m.slice(0, 1)), cols)}<div class="legend">${typs.map((t, i) => `<span><i class="sw" style="background:${cols[i]}"></i>${t}</span>`).join('')}</div></div>
  <div class="sec-t">Zucht ${J} (Index = Besamungen pro Abkalbung, ZKZ = Zwischenkalbezeit in Tagen)</div>
  <div class="stats"><div class="stats-row four"><span class="stats-h">Zucht</span><span class="stat"><b>${abk}</b><span>Abkalb.</span></span><span class="stat"><b>${bes}</b><span>Besam.</span></span><span class="stat"><b>${abk ? nf(bes / abk) : '-'}</b><span>Index</span></span><span class="stat"><b>${zk.length ? Math.round(zk.reduce((a, b) => a + b, 0) / zk.length) : '-'}</b><span>Ø ZKZ</span></span></div></div>
  ${yrs.length > 1 ? `<div class="card" style="margin-top:8px">${svgBars([yrs.map(y => cnt('abkalbung', y)), yrs.map(y => cnt('besamung', y))], yrs.map(y => y.slice(2)), ['#2E8B62', '#5B8FD6'], 120)}<div class="legend"><span><i class="sw" style="background:#2E8B62"></i>Abkalbungen</span><span><i class="sw" style="background:#5B8FD6"></i>Besamungen</span></div></div>` : ''}
  ${graf}`;
}

function vSettings() {
  const s = S.set;
  return `<form class="form" id="setform" style="margin-top:8px">
  <div class="card form">
  <label class="fld"><span>Hofname</span><input name="hofname" value="${esc(s.hofname)}"></label>
  </div>
  <div class="sec-t">Zucht</div><div class="card form">
  <label class="fld"><span>Tragzeit (Tage)</span><input name="tragzeit" type="number" inputmode="numeric" value="${s.tragzeit}"></label>
  <label class="fld"><span>Kalb bis (Monate)</span><input name="kalbMonate" type="number" inputmode="numeric" value="${s.kalbMonate}"></label>
  <label class="fld"><span>Laktations-KPI ab (Monate)</span><input name="laktAbMonate" type="number" inputmode="numeric" value="${s.laktAbMonate}"></label>
  <label class="fld"><span>Status "Abgekalbt" während (Tage)</span><input name="abgekalbtTage" type="number" inputmode="numeric" value="${s.abgekalbtTage}"></label>
  <label class="fld"><span>Alp von (MM-TT)</span><input name="alpVon" value="${esc(s.alpVon)}" placeholder="05-25"></label>
  <label class="fld"><span>Alp bis (MM-TT)</span><input name="alpBis" value="${esc(s.alpBis)}" placeholder="10-05"></label>
  <label class="fld"><span>Tierliste: unbesamt markieren ab (Monate)</span><input name="unbesamtAb" type="number" inputmode="numeric" value="${s.unbesamtAb}"></label>
  <label class="fld"><span>Tierliste: Abkalbung markieren (Tage vorher)</span><input name="baldTage" type="number" inputmode="numeric" value="${s.baldTage}"></label>
  <label class="fld"><span>Puffer Besamungsverbot (Tage)</span><input name="puffer" type="number" inputmode="numeric" value="${s.puffer}"></label>
  </div>
  <div class="sec-t">Listen (eine Zeile pro Eintrag)</div><div class="card form">
  <label class="fld"><span>Parzellen</span><textarea name="parzellen" rows="4">${esc((s.parzellen || []).join('\n'))}</textarea></label>
  <label class="fld"><span>Gründe Stall / Laufhof</span><textarea name="gruende" rows="4">${esc((s.gruende || []).join('\n'))}</textarea></label>
  <label class="fld"><span>Medikamente (Name ; Absetzfrist Tage)</span><textarea name="medikamente" rows="4" placeholder="Beispielpräparat ; 21">${esc((s.medikamente || []).map(m => `${m.name} ; ${m.frist}`).join('\n'))}</textarea></label>
  </div>
  <div class="sec-t">Analyse</div><div class="card form">
  <label class="fld"><span>Grafana-Link zum Einbetten (optional)</span><input name="grafanaUrl" value="${esc(s.grafanaUrl || '')}" placeholder="https://...grafana.net/public-dashboards/..."></label>
  </div>
  <div class="sec-t">Lager</div><div class="card form">
  <label class="fld"><span>Startbestand Heuballen</span><input name="startHeu" type="number" inputmode="decimal" value="${s.startHeu}"></label>
  <label class="fld"><span>Startbestand Siloballen</span><input name="startSilo" type="number" inputmode="decimal" value="${s.startSilo}"></label>
  </div>
  <button class="btn pri block" type="submit">Einstellungen speichern</button>
  </form>
  <div class="sec-t">Daten</div>
  <div class="card"><p class="small muted" style="margin:0 0 10px">Speicherort: <b>${mode === 'firebase' ? 'Firebase (synchronisiert)' : 'nur dieses Gerät'}</b>${mode === 'firebase' && USER ? ` · angemeldet als <b>${esc(USER.email)}</b>` : ''} · Version ${VERSION}</p>
  <div class="btns"><button class="btn" data-act="backup">Backup herunterladen (JSON)</button><label class="btn">TVD-Import (Excel)<input type="file" accept=".xlsx,.xls,.csv" data-act="tvdimport" class="hidden"></label><label class="btn">Backup einlesen<input type="file" accept="application/json" data-act="restore" class="hidden"></label>${mode === 'firebase' ? '<button class="btn" data-act="logout">Abmelden</button>' : ''}</div></div>
  <div class="sec-t">Benachrichtigungen</div>
  <div class="card"><p class="small muted" style="margin:0 0 10px">Täglich am Morgen eine Push-Nachricht mit den Terminen: Abkalbung (7 Tage, 1 Tag vorher und am Tag), Brunst, Brunstkontrolle, Ende Absetzfrist, Schnitttermine der Parzellen, Alp. Auf dem iPhone nur über das Homescreen-Icon möglich.</p>
  <button class="btn ${localStorage.getItem('hb-push') ? '' : 'pri'}" data-act="push">${localStorage.getItem('hb-push') ? 'Push auf diesem Gerät erneuern' : 'Push auf diesem Gerät aktivieren'}</button></div>`;
}

/* ---------- Formulare ---------- */
const ART = ['i.m.', 's.c.', 'i.v.', 'oral', 'äusserlich', 'intramammär'];
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
    { k: 'verlauf', l: 'Verlauf', t: 'seg', o: [['leicht', 'leicht'], ['mittel', 'mittel'], ['schwer', 'schwer'], ['Kaiserschnitt', 'Kaiserschnitt']], def: 'leicht' },
    { k: 'kalbName', l: 'Name Kalb', t: 'text' }, { k: 'kalbOhrmarke', l: 'Ohrmarke Kalb', t: 'text' },
    { k: 'kalbGeschlecht', l: 'Geschlecht Kalb', t: 'seg', o: [['w', 'weiblich'], ['m', 'männlich']], def: 'w' },
    { k: 'kalbRasse', l: 'Rasse Kalb', t: 'tag', list: rassen },
    { k: 'notiz', l: 'Notiz', t: 'textarea' }],
    hint: 'Legt das Kalb als neues Tier an und meldet die Abkalbung bei der Mutter. TVD-Meldung nicht vergessen.',
    save(v) {
      const k = put('tiere', { name: v.kalbName, ohrmarke: v.kalbOhrmarke, geschlecht: v.kalbGeschlecht, geburt: v.datum, zugang: v.datum, mutterId: v.tierId, rasse: v.kalbRasse });
      put('ereignisse', { typ: 'abkalbung', tierId: v.tierId, datum: v.datum, verlauf: v.verlauf, kalbId: k.id, notiz: v.notiz });
    } },
  abkalbung: { t: 'Abkalbung', coll: 'ereignisse', fields: [
    { k: 'tierId', l: 'Mutter', t: 'tier', filter: t => t.geschlecht === 'w' }, { k: 'datum', l: 'Datum', t: 'date' },
    { k: 'verlauf', l: 'Verlauf', t: 'seg', o: [['leicht', 'leicht'], ['mittel', 'mittel'], ['schwer', 'schwer'], ['Kaiserschnitt', 'Kaiserschnitt']] },
    { k: 'notiz', l: 'Notiz', t: 'textarea' }] },
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
    { k: 'typ', l: 'Wo (alle Tiere)', t: 'seg', o: [['Weide', 'Weide'], ['Laufhof', 'Laufhof'], ['Stall', 'Stall'], ['Alp', 'Alp']], def: 'Weide' },
    { k: 'parzelle', l: 'Parzelle', t: 'tag', list: parzellen, show: v => v.typ === 'Weide' },
    { k: 'grund', l: 'Grund', t: 'tag', list: gruende, show: v => v.typ === 'Stall' || v.typ === 'Laufhof' },
    { k: 'notiz', l: 'Notiz', t: 'textarea' }],
    hint: 'Gilt für alle Tiere ab diesem Datum bis zum nächsten Eintrag.' },
  behandlung: { t: 'Behandlung', coll: 'behandlungen', fields: [
    { k: 'tierIds', l: 'Tiere', t: 'tiere' }, { k: 'datum', l: 'Datum', t: 'date' },
    { k: 'grund', l: 'Grund / Diagnose', t: 'text' },
    { k: 'medikament', l: 'Medikament', t: 'text', list: () => (S.set.medikamente || []).map(m => m.name) },
    { k: 'menge', l: 'Menge pro Tier', t: 'text', ph: 'z.B. 20 ml' },
    { k: 'art', l: 'Verabreichung', t: 'seg', o: ART.map(a => [a, a]), def: 'i.m.' },
    { k: 'durch', l: 'Verabreicht durch', t: 'text', def: 'Tierhalter', list: () => ['Tierhalter', ...new Set(S.behandlungen.map(b => b.durch).filter(Boolean))] },
    { k: 'frist', l: 'Absetzfrist Fleisch (Tage)', t: 'number', def: '0' }, { k: 'notiz', l: 'Notiz', t: 'textarea' }],
    calc: v => v.datum ? `Frei ab: <b>${fmt(addDays(v.datum, num(v.frist)))}</b>` : '',
    prep: v => { v.freiAb = addDays(v.datum, num(v.frist)); v.frist = num(v.frist); } },
};
for (const [k, d] of Object.entries(FELD)) {
  FORMS[k] = { t: d.l, coll: 'feld', typ: k, fields: [
    { k: 'datum', l: 'Datum', t: 'date' },
    ...(d.g === 'lager' ? [{ k: 'zweck', l: 'Zweck', t: 'text', def: 'Fütterung', list: () => ['Fütterung', 'Verkauf', 'Einstreu'] }] : [{ k: 'parzelle', l: 'Parzelle', t: 'tag', list: parzellen }]),
    { k: 'menge', l: `Menge (${d.e})`, t: 'number' }, { k: 'notiz', l: 'Notiz', t: 'textarea' }],
    calc: v => { const w = feldWarnung(k, v.parzelle, v.datum); if (d.g === 'austrag') return w; const L = lager(); const cur = k === 'heuen' || k === 'bezugHeu' ? L.heu : L.silo; const sign = d.g === 'lager' ? -1 : 1; return `Lager ${k.includes('eu') || k === 'heuen' ? 'Heu' : 'Silage'}: ${nf(cur)} → <b>${nf(cur + sign * num(v.menge))}</b> Ballen` + w; } };
}
FORMS.tiere = { ...FORMS.zugang, t: 'Tier bearbeiten', more: false };
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
  wrap.innerHTML = `<div class="backdrop"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-h"><button type="button" data-x>Abbrechen</button><b>${esc(title)}</b>${onSave ? `<button type="button" class="save" data-s>${saveLabel}</button>` : '<span style="width:70px"></span>'}</div><div class="sheet-b">${body}${onDelete ? '<button type="button" class="btn danger block" data-d style="margin-top:18px">Löschen</button>' : ''}</div></div>`;
  const sh = $('.sheet', wrap), bd = $('.backdrop', wrap);
  requestAnimationFrame(() => { sh.classList.add('show'); bd.classList.add('show'); });
  bd.onclick = () => closeSheet(); $('[data-x]', sh).onclick = () => closeSheet();
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
  const a = (k, l) => `<button type="button" class="act" data-act="form" data-f="${k}">${IC[k] || ''}<span>${l}</span></button>`;
  openSheet('Neuer Eintrag', `<div class="sec-t" style="margin-top:0">Tiere</div><div class="actgrid">${a('geburt', 'Geburt')}${a('brunst', 'Brunst')}${a('besamung', 'Besamung')}${a('behandlung', 'Behandlung')}${a('auslauf', 'Auslauf')}${a('zugang', 'Zugang')}${a('abgang', 'Abgang')}</div>
  <div class="sec-t">Bewirtschaftung</div><div class="actgrid">${a('guellen', 'Güllen')}${a('misten', 'Misten')}${a('heuen', 'Heuen')}${a('silieren', 'Silieren')}${a('bezugHeu', 'Bezug Heu')}${a('bezugSilage', 'Bezug Silage')}</div>`);
}

function fieldHtml(f, v) {
  const val = v[f.k] ?? '';
  const id = 'f_' + f.k;
  const dl = f.list ? `<datalist id="dl_${f.k}">${f.list().map(o => `<option value="${esc(o)}">`).join('')}</datalist>` : '';
  if (f.t === 'seg') return `<div class="fld"><span>${f.l}</span><div class="seg" role="radiogroup">${f.o.map(([ov, ol]) => `<label><input type="radio" name="${f.k}" value="${esc(ov)}" ${String(val) === ov ? 'checked' : ''}>${esc(ol)}</label>`).join('')}</div></div>`;
  if (f.t === 'tag') {
    const opts = f.list(); if (val && !opts.includes(val)) opts.push(val);
    return `<div class="fld"><span>${f.l}</span><div class="chips" data-tag="${f.k}">${opts.map(o => `<button type="button" class="chip ${o === val ? 'on' : ''}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}<input name="${f.k}__neu" placeholder="${opts.length ? '+ neu' : 'eingeben'}" autocomplete="off" style="flex:1 1 120px;min-height:36px;border:1px dashed #8A918C;border-radius:99px;padding:0 12px;background:transparent;font-size:14px"></div></div>`;
  }
  if (f.t === 'textarea') return `<label class="fld"><span>${f.l}</span><textarea name="${f.k}" rows="2">${esc(val)}</textarea></label>`;
  if (f.t === 'tier') {
    const opts = S.tiere.filter(t => (aktiv(t) || t.id === val) && (!f.filter || f.filter(t))).sort(sortName);
    return `<label class="fld"><span>${f.l}</span><select name="${f.k}"><option value="">${f.opt ? '- keine -' : 'Bitte wählen'}</option>${opts.map(t => `<option value="${t.id}" ${t.id === val ? 'selected' : ''}>${esc((t.name || '') + (t.ohrmarke ? ' · ' + t.ohrmarke : ''))}</option>`).join('')}</select></label>`;
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
  if (rec) { Object.assign(v, rec); if (key === 'parzelle') ['schnittAb', 'fruehBis', 'schnitt2Ab'].forEach(k => { if (v[k]) v[k] = `${v[k].slice(3)}.${v[k].slice(0, 2)}.`; }); if (def.multi && rec.tierId) v.tierIds = [rec.tierId]; }
  if (pre.tier) { if ('tierIds' in v) v.tierIds = [pre.tier]; if ('tierId' in v) v.tierId = pre.tier; }
  if (key === 'tiere' || key === 'zugang') { if (!rec) { v.geburt = ''; v.zugang = ''; } }
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
  const read = () => {
    const o = {};
    def.fields.forEach(f => {
      if (f.t === 'tiere') o[f.k] = $$(`[data-picker="${f.k}"] .chip.on`, form).map(b => b.dataset.id);
      else if (f.t === 'tag') { const c = $(`[data-tag="${f.k}"] .chip.on`, form); const n = (form.elements[f.k + '__neu'].value || '').trim(); o[f.k] = n || (c ? c.dataset.v : ''); }
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
  form.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.closest('[data-tag]')) { const on = b.classList.contains('on'); $$('.chip', b.closest('[data-tag]')).forEach(c => c.classList.remove('on')); if (!on) b.classList.add('on'); const n = b.closest('[data-tag]').querySelector('input'); if (n) n.value = ''; form.dataset.dirty = '1'; upd(); return; }
    if (b.closest('[data-picker]')) { b.classList.toggle('on'); form.dataset.dirty = '1'; upd(); }
    if (b.dataset.all) { $$(`[data-picker="${b.dataset.all}"] .chip`, form).forEach(c => c.classList.add('on')); upd(); }
    if (b.dataset.none) { $$(`[data-picker="${b.dataset.none}"] .chip`, form).forEach(c => c.classList.remove('on')); upd(); }
    if ('more' in b.dataset) doSave(true);
  });
  upd();
  function doSave(more) {
    const o = read();
    // Pflichtfelder
    if (def.fields.some(f => f.t === 'date' && !['geburt', 'zugang'].includes(f.k)) && def.fields.filter(f => f.t === 'date' && !['geburt', 'zugang'].includes(f.k)).some(f => !o[f.k])) return toast('Datum fehlt');
    if ('tierIds' in o && !o.tierIds.length) return toast('Mindestens ein Tier wählen');
    if ('tierId' in o && !o.tierId && !def.fields.find(f => f.k === 'tierId').opt) return toast('Tier wählen');
    if ((key === 'zugang' || key === 'tiere') && !o.name && !o.ohrmarke) return toast('Name oder Ohrmarke fehlt');
    if (key === 'zugang' || key === 'tiere') { if (!o.zugang) o.zugang = o.geburt; if (!o.zugang) return toast('Geburts- oder Zugangsdatum fehlt'); }
    def.fields.forEach(f => { if (f.show && !f.show(o)) o[f.k] = ''; });
    if (def.prep) def.prep(o);
    if (def.save && !isEdit) def.save(o);
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
    if (more) { form.reset(); form.dataset.dirty = ''; form.dataset.zugTouched = ''; $$('input[type=date]', form).forEach(i => i.value = ['geburt', 'zugang'].includes(i.name) ? '' : today()); $$('[data-tag] .chip', form).forEach(c => c.classList.remove('on')); return; }
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
  if (sections.sign) { doc.setPage(n); }
  const blob = doc.output('blob');
  const file = new File([blob], fname, { type: 'application/pdf' });
  const touch = matchMedia('(pointer:coarse)').matches;
  if (touch && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  doc.save(fname);
}
const tLabel = id => { const t = tierById(id); return t ? `${t.name || ''}${t.ohrmarke ? ' (' + t.ohrmarke + ')' : ''}` : '?'; };
async function pdf(p, id) {
  const J = UI.jahr;
  if (p === 'beh' || p === 'behTier') {
    let list = S.behandlungen.filter(b => p === 'behTier' ? (b.tierIds || []).includes(id) : (b.datum || '').startsWith(J)).sort((a, b) => a.datum < b.datum ? -1 : 1);
    const body = [];
    list.forEach(b => (b.tierIds || []).forEach(tid => body.push([fmt(b.datum), tLabel(tid), b.grund || '', b.medikament || '', b.menge || '', b.art || '', b.durch || '', String(b.frist ?? ''), fmt(b.freiAb)])));
    const sum = {}; list.forEach(b => { const k = b.medikament || '-'; sum[k] = sum[k] || { n: 0, t: 0 }; sum[k].n++; sum[k].t += (b.tierIds || []).length; });
    await makePdf(p === 'behTier' ? `Behandlungen ${tName(id)}` : `Behandlungsjournal ${J}`, p === 'behTier' ? tLabel(id) : `Jahr ${J}`, [
      { head: ['Datum', 'Tier', 'Grund', 'Medikament', 'Menge', 'Verabr.', 'Durch', 'Frist T.', 'Frei ab'], body },
      { h: 'Zusammenfassung pro Medikament', head: ['Medikament', 'Behandlungen', 'Tierbehandlungen'], body: Object.entries(sum).map(([k, v]) => [k, v.n, v.t]) }
    ], p === 'behTier' ? `Behandlungen_${tName(id)}.pdf` : `Behandlungsjournal_${J}.pdf`, true);
  }
  if (p === 'auslaufTag') {
    const d = ($('#auslaufTag') || {}).value || today(); const a = herdeAm(d);
    await makePdf(`Auslaufjournal ${fmt(d)}`, `Tag ${fmt(d)} · ${ortTxt(a)}`, [
      { h: 'Herde', head: ['Datum', 'Wo', 'Parzelle / Grund', 'seit'], body: [[fmt(d), a ? a.typ : '-', a ? (a.parzelle || a.grund || a.ort || '') : '', a ? fmt(a.datum) : '']] },
      { h: 'Tiere (alle)', head: ['Tier', 'Ohrmarke', 'Kategorie'], body: aktiveTiere(d).map(t => [t.name || '', t.ohrmarke || '', kategorie(t, d)]) }
    ], `Auslauf_${d}.pdf`);
  }
  if (p === 'auslaufJahr') {
    const tage = auslaufTage(J), sum = {};
    const body = tage.map(([d, a]) => { const k = a.typ + '|' + (a.parzelle || a.grund || ''); sum[k] = (sum[k] || 0) + 1; return [fmt(d), a.typ, a.parzelle || a.grund || '', aktiveTiere(d).length]; });
    await makePdf(`Auslaufjournal ${J}`, `Jahr ${J} · alle Tiere`, [
      { h: 'Zusammenfassung', head: ['Wo', 'Parzelle / Grund', 'Tage'], body: Object.entries(sum).sort().map(([k, n]) => { const [a, b] = k.split('|'); return [a, b, n]; }) },
      { h: 'Pro Tag', head: ['Datum', 'Wo', 'Parzelle / Grund', 'Anzahl Tiere'], body }
    ], `Auslaufjournal_${J}.pdf`);
  }
  if (p === 'feld') {
    const list = S.feld.filter(f => (f.datum || '').startsWith(J)).sort((a, b) => a.datum < b.datum ? -1 : 1);
    const sum = {}; list.forEach(f => { if (FELD[f.typ].g === 'lager') return; const k = (f.parzelle || '-') + '|' + f.typ; sum[k] = (sum[k] || 0) + num(f.menge); });
    await makePdf(`Feldkalender ${J}`, `Jahr ${J}`, [
      { head: ['Datum', 'Massnahme', 'Parzelle / Zweck', 'Menge', 'Einheit', 'Notiz'], body: list.map(f => [fmt(f.datum), FELD[f.typ].l, f.parzelle || f.zweck || '', nf(num(f.menge)), FELD[f.typ].e, f.notiz || '']) },
      { h: 'Total pro Parzelle', head: ['Parzelle', 'Massnahme', 'Menge'], body: Object.entries(sum).sort().map(([k, v]) => { const [pz, t] = k.split('|'); return [pz, FELD[t].l, `${nf(v)} ${FELD[t].e}`]; }) }
    ], `Feldkalender_${J}.pdf`);
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

/* ---------- Events ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'form') { e.preventDefault(); openForm(el.dataset.f, null, { tier: el.dataset.tier }); }
  else if (a === 'edit') { const c = el.dataset.c, r = S[c].find(x => x.id === el.dataset.id); if (r) openForm(formKey(c, r), r); }
  else if (a === 'filt') { const v = el.dataset.v, F = UI.tierFilter; if (['Kalb', 'Rind', 'Kuh'].includes(v)) { F.kat = F.kat === v ? '' : v; F.lakt = ''; } else { F.lakt = F.lakt === v ? '' : v; F.kat = ''; } render(); }
  else if (a === 'filtlink') { const v = el.dataset.v, F = UI.tierFilter; F.q = ''; F.abg = false; if (['Kalb', 'Rind', 'Kuh'].includes(v)) { F.kat = v; F.lakt = ''; } else { F.lakt = v; F.kat = ''; } }
  else if (a === 'reset') { Object.assign(UI.tierFilter, { kat: '', lakt: '', q: '' }); render(); }
  else if (a === 'abg') { UI.tierFilter.abg = !UI.tierFilter.abg; render(); }
  else if (a === 'jtab') { UI.jTab = el.dataset.v; if (el.tagName === 'BUTTON') render(); }
  else if (a === 'ftab') { UI.fTab = el.dataset.v; if (el.tagName === 'BUTTON') render(); }
  else if (a === 'kaltag') { e.preventDefault(); UI.kalTag = UI.kalTag === el.dataset.v ? '' : el.dataset.v; render(); }
  else if (a === 'kalmon') { const [y, m] = UI.kalMonat.split('-').map(Number); const d = new Date(y, m - 1 + Number(el.dataset.v), 1); UI.kalMonat = iso(d).slice(0, 7); UI.kalTag = ''; render(); }
  else if (a === 'pdf') { el.disabled = true; pdf(el.dataset.p, el.dataset.id).catch(showErr).finally(() => el.disabled = false); }
  else if (a === 'backup') { const d = { version: VERSION, exportiert: new Date().toISOString(), set: S.set }; COLLS.forEach(c => d[c] = S[c]); const b = new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' }); const u = URL.createObjectURL(b); const l = document.createElement('a'); l.href = u; l.download = `hofbuech_backup_${today()}.json`; l.click(); setTimeout(() => URL.revokeObjectURL(u), 2000); }
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
  if (a === 'tvdimport') { const f = e.target.files[0]; e.target.value = ''; if (f) tvdImport(f).catch(showErr); }
  if (a === 'restore') {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => {
      const d = JSON.parse(t);
      if (!confirm(`Backup vom ${d.exportiert || '?'} einlesen? Bestehende Einträge mit gleicher ID werden überschrieben.`)) return;
      COLLS.forEach(c => (d[c] || []).forEach(o => W.put(c, o)));
      if (d.set) W.setSettings(d.set);
      toast('Backup eingelesen');
    }).catch(showErr);
  }
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'setform') return;
  e.preventDefault();
  const f = e.target.elements, lines = s => s.split('\n').map(x => x.trim()).filter(Boolean);
  W.setSettings({
    ...S.set, hofname: f.hofname.value.trim(),
    tragzeit: num(f.tragzeit.value) || 285, kalbMonate: num(f.kalbMonate.value) || 12, laktAbMonate: num(f.laktAbMonate.value) || 16,
    abgekalbtTage: num(f.abgekalbtTage.value) || 60, alpVon: f.alpVon.value.trim() || '06-15', alpBis: f.alpBis.value.trim() || '09-15', puffer: num(f.puffer.value), unbesamtAb: num(f.unbesamtAb.value) || 16, baldTage: num(f.baldTage.value) || 30,
    parzellen: lines(f.parzellen.value), gruende: lines(f.gruende.value),
    medikamente: lines(f.medikamente.value).map(l => { const [n, d] = l.split(';'); return { name: n.trim(), frist: num(d) }; }),
    grafanaUrl: f.grafanaUrl.value.trim(), startHeu: num(f.startHeu.value), startSilo: num(f.startSilo.value)
  });
  toast('Einstellungen gespeichert');
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
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
boot();
