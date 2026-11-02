// hofbuech - Hof-App (PWA). Daten lokal oder in Firestore (hoefe/{schluessel}/...).
const VERSION = '1.0.0';

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
  alpVon: '06-15', alpBis: '09-15', puffer: 14,
  parzellen: ['Parzelle 1', 'Parzelle 2'], orte: ['Weide 1', 'Weide 2', 'Stall mit Laufhof'],
  medikamente: [], startHeu: 0, startSilo: 0, rasse: 'Galloway'
};

/* ---------- Datenhaltung ---------- */
const COLLS = ['tiere', 'ereignisse', 'behandlungen', 'auslauf', 'feld'];
const S = { tiere: [], ereignisse: [], behandlungen: [], auslauf: [], feld: [], set: { ...DEF } };
let W = null; // writer
let mode = 'local';
let KEY = localStorage.getItem('hb-key') || '';

function setSync(state, title) { const el = $('#sync'); el.className = 'sync ' + state; el.title = title || ''; }
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
function showErr(e) { console.error(e); setSync('err', String(e && e.message || e)); toast('Fehler: ' + (e && e.code || e && e.message || e)); }

function initLocal() {
  mode = 'local';
  try { const d = JSON.parse(localStorage.getItem('hb-local') || '{}'); COLLS.forEach(c => S[c] = d[c] || []); S.set = { ...DEF, ...(d.set || {}) }; } catch (e) { }
  const persist = () => { const d = { set: S.set }; COLLS.forEach(c => d[c] = S[c]); localStorage.setItem('hb-local', JSON.stringify(d)); schedule(); };
  W = {
    put: (c, o) => { const i = S[c].findIndex(x => x.id === o.id); if (i >= 0) S[c][i] = o; else S[c].push(o); persist(); },
    del: (c, id) => { S[c] = S[c].filter(x => x.id !== id); persist(); },
    setSettings: o => { S.set = { ...DEF, ...o }; persist(); }
  };
  setSync('off', 'Nur lokal gespeichert (Firebase nicht eingerichtet)');
}

async function initFirebase(cfg) {
  mode = 'firebase';
  setSync('', 'Verbinde...');
  const V = '10.12.2';
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const F = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
  const app = initializeApp(cfg);
  let db;
  try { db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) }); }
  catch (e) { db = F.getFirestore(app); }
  const ref = c => F.collection(db, 'hoefe', KEY, c);
  COLLS.forEach(c => F.onSnapshot(ref(c), { includeMetadataChanges: true }, snap => {
    S[c] = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    setSync(snap.metadata.fromCache ? 'off' : 'ok', snap.metadata.fromCache ? 'Offline - wird später synchronisiert' : 'Synchronisiert');
    schedule();
  }, showErr));
  F.onSnapshot(F.doc(db, 'hoefe', KEY, 'einstellungen', 'main'), d => { S.set = { ...DEF, ...(d.data() || {}) }; schedule(); }, showErr);
  W = {
    put: (c, o) => { F.setDoc(F.doc(db, 'hoefe', KEY, c, o.id), clean(o)).catch(showErr); },
    del: (c, id) => { F.deleteDoc(F.doc(db, 'hoefe', KEY, c, id)).catch(showErr); },
    setSettings: o => { F.setDoc(F.doc(db, 'hoefe', KEY, 'einstellungen', 'main'), clean(o)).catch(showErr); }
  };
}

function put(c, o) { o.id = o.id || uid(); o.geaendert = Date.now(); W.put(c, o); return o; }
function del(c, id) { W.del(c, id); }

/* ---------- Fachlogik ---------- */
const tierById = id => S.tiere.find(t => t.id === id);
const tName = id => { const t = tierById(id); return t ? (t.name || t.ohrmarke || '?') : '?'; };
const aktiv = (t, d = today()) => (!t.zugang || t.zugang <= d) && (!t.geburt || t.geburt <= d) && (!t.abgang || t.abgang > d);
const aktiveTiere = (d = today()) => S.tiere.filter(t => aktiv(t, d)).sort(sortName);
const sortName = (a, b) => (a.name || a.ohrmarke || '').localeCompare(b.name || b.ohrmarke || '', 'de');
const evOf = (id, typ) => S.ereignisse.filter(e => e.tierId === id && (!typ || e.typ === typ)).sort((a, b) => a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0);
const alterMt = (t, d = today()) => t.geburt ? months(t.geburt, d) : null;

function kategorie(t, d = today()) {
  if (evOf(t.id, 'abkalbung').some(e => e.datum <= d)) return 'Kuh';
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
function alpFenster(y) { return [`${y}-${S.set.alpVon}`, `${y}-${S.set.alpBis}`]; }
function inAlp(d) { const [a, b] = alpFenster(d.slice(0, 4)); return d >= a && d <= b; }
function verbotFenster(y) { const [a, b] = alpFenster(y); return [addDays(a, -S.set.tragzeit - S.set.puffer), addDays(b, -S.set.tragzeit + S.set.puffer)]; }
function imVerbot(d) { for (const y of [+d.slice(0, 4), +d.slice(0, 4) + 1]) { const [a, b] = verbotFenster(y); if (d >= a && d <= b) return true; } return false; }

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
function ortAm(tid, d, list = sortedAuslauf()) { let best = null; for (const a of list) { if (a.datum > d) break; if ((a.tierIds || []).includes(tid)) best = a; } return best; }

/* ---------- Router ---------- */
let rq = false;
function schedule() { if (rq) return; rq = true; requestAnimationFrame(() => { rq = false; render(); }); }
const UI = { tierFilter: { kat: '', lakt: '', q: '', sort: 'name', abg: false }, jTab: 'behandlung', fTab: 'austrag', jahr: String(new Date().getFullYear()) };

function render() {
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
    else if (p[0] === 'einstellungen') { title = 'Einstellungen'; html = vSettings(); showBack = true; tab = ''; }
    else { html = vStart(); tab = 'start'; }
  } catch (e) { console.error(e); html = `<div class="note">Anzeigefehler: ${esc(e.message)}</div>`; }
  $('#title').textContent = title;
  back.classList.toggle('hidden', !showBack);
  $$('#tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  const sx = window.scrollY, same = view.dataset.route === h;
  view.innerHTML = html; view.dataset.route = h;
  if (same) window.scrollTo(0, sx);
  afterRender();
}
function afterRender() {
  const sc = $('.tl-scroll');
  if (sc && sc.dataset.today && !sc.dataset.done) { sc.scrollLeft = Math.max(0, +sc.dataset.today - sc.clientWidth * 0.45); sc.dataset.done = 1; }
}

/* ---------- Views ---------- */
function kpiBlock(k, link = false) {
  const a = (key, label, cls = '') => link
    ? `<button type="button" class="kpi ${cls} ${UI.tierFilter.kat === key || UI.tierFilter.lakt === key ? 'sel' : ''}" data-act="filt" data-v="${key}" style="text-align:left;cursor:pointer"><span class="v">${k[key]}</span><span class="l">${label}</span></button>`
    : `<a class="kpi ${cls}" href="#/tiere" data-act="filtlink" data-v="${key}"><span class="v">${k[key]}</span><span class="l">${label}</span></a>`;
  return `<div class="sec-t">Bestand</div><div class="kpis">${a('Kalb', 'Kälber')}${a('Rind', 'Rinder')}${a('Kuh', 'Kühe')}</div>
  <div class="sec-t">Laktation (ab ${S.set.laktAbMonate} Mt.)</div><div class="kpis">${a('Unbesamt', 'Unbesamt')}${a('Besamt', 'Besamt')}${a('Abgekalbt', 'Abgekalbt')}</div>`;
}

function vStart() {
  const k = kpis(), L = lager(), d = today();
  const tiere = aktiveTiere();
  if (!S.tiere.length) {
    return `${kpiBlock(k)}<div class="sec-t">Lager</div>${lagerKpi(L)}
    <div class="card" style="margin-top:16px"><b>Los geht's</b><p class="muted" style="margin:6px 0 12px">Noch keine Tiere erfasst. Über den grossen + Button unten: "Zugang" für jedes Tier. Parzellen, Weiden und Medikamente unter Einstellungen.</p><div class="btns"><button class="btn pri" data-act="form" data-f="zugang">Erstes Tier erfassen</button><a class="btn" href="#/einstellungen">Einstellungen</a></div></div>`;
  }
  const naechste = tiere.map(t => ({ t, l: lakt(t) })).filter(x => x.l && x.l.status === 'Besamt').sort((a, b) => a.l.erwartet < b.l.erwartet ? -1 : 1).slice(0, 5);
  const fr = tiere.map(t => ({ t, b: frist(t.id) })).filter(x => x.b);
  const sl = sortedAuslauf(); const orte = {};
  tiere.forEach(t => { const a = ortAm(t.id, d, sl); const key = a ? `${a.typ}|${a.ort || ''}` : '|'; orte[key] = (orte[key] || 0) + 1; });
  return `${kpiBlock(k)}
  <div class="sec-t">Lager</div>${lagerKpi(L)}
  ${fr.length ? `<div class="sec-t">Absetzfrist läuft</div><div class="list">${fr.map(x => `<a class="row" href="#/tier/${x.t.id}"><div class="main"><span class="t">${esc(x.t.name || x.t.ohrmarke)}</span><span class="s">${esc(x.b.medikament)}</span></div><span class="pill warn">frei ab ${fmt(x.b.freiAb)}</span></a>`).join('')}</div>` : ''}
  <div class="cols"><div>
  <div class="sec-t">Nächste Abkalbungen</div>
  <div class="list">${naechste.length ? naechste.map(x => { const dd = diff(d, x.l.erwartet); return `<a class="row" href="#/tier/${x.t.id}"><div class="main"><span class="t">${esc(x.t.name || x.t.ohrmarke)}</span><span class="s">besamt ${fmt(x.l.bes.datum)}${x.l.bes.stier ? ' · ' + esc(x.l.bes.stier) : ''}</span></div><div class="r"><b>${fmt(x.l.erwartet)}</b><br><span class="pill ${inAlp(x.l.erwartet) ? 'red' : dd <= 30 ? 'warn' : ''}">${dd >= 0 ? 'in ' + dd + ' T.' : 'überfällig ' + (-dd) + ' T.'}${inAlp(x.l.erwartet) ? ' · Alp!' : ''}</span></div></a>`; }).join('') : '<div class="empty">Keine besamten Tiere.</div>'}</div>
  </div><div>
  <div class="sec-t">Standort heute</div>
  <div class="list">${Object.entries(orte).map(([key, n]) => { const [typ, ort] = key.split('|'); return `<a class="row" href="#/journale" data-act="jtab" data-v="auslauf"><div class="main"><span class="t">${typ ? esc(ort || typ) : 'Kein Eintrag'}</span><span class="s">${esc(typ || 'Auslaufjournal erfassen')}</span></div><b>${n}</b></a>`; }).join('')}</div>
  </div></div>`;
}
function lagerKpi(L) {
  return `<div class="grid2"><a class="kpi ${L.heu <= 5 ? 'warn' : ''}" href="#/feld" data-act="ftab" data-v="lager"><span class="v">${nf(L.heu)}</span><span class="l">Heuballen</span></a><a class="kpi ${L.silo <= 5 ? 'warn' : ''}" href="#/feld" data-act="ftab" data-v="lager"><span class="v">${nf(L.silo)}</span><span class="l">Siloballen</span></a></div>`;
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
    <input class="search" type="search" placeholder="Name oder Ohrmarke" value="${esc(F.q)}" data-act="q" aria-label="Suche">
    <select class="sel" data-act="sort" aria-label="Sortierung">${[['name', 'Name'], ['ohrmarke', 'Ohrmarke'], ['alter', 'Alter'], ['abkalbung', 'Nächste Abkalbung']].map(([v, l]) => `<option value="${v}" ${F.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <button type="button" class="chip ${F.abg ? 'on' : ''}" data-act="abg">Abgänge</button>
    ${F.kat || F.lakt || F.q ? '<button type="button" class="chip" data-act="reset">Filter löschen</button>' : ''}
  </div>
  ${tlTiere.length ? `<div class="sec-t">Zeitachse (heute ±365 Tage)</div>${timeline(tlTiere)}` : ''}
  <div class="sec-t">${list.length} Tiere</div>
  <div class="list">${list.length ? list.map(t => tierRow(t, d)).join('') : '<div class="empty">Keine Tiere.</div>'}</div>`;
}
function tierRow(t, d = today()) {
  const l = lakt(t), f = frist(t.id), m = alterMt(t);
  const sub = [t.ohrmarke, kategorie(t), m !== null ? (m < 24 ? m + ' Mt.' : Math.floor(m / 12) + ' J.') : ''].filter(Boolean).join(' · ');
  let pill = '';
  if (!aktiv(t)) pill = `<span class="pill grey">${esc(t.abgangGrund || 'Abgang')} ${fmt(t.abgang)}</span>`;
  else if (f) pill = `<span class="pill warn">Frist bis ${fmtS(f.freiAb)}</span>`;
  else if (l) pill = l.status === 'Besamt' ? `<span class="pill ${inAlp(l.erwartet) ? 'red' : 'blue'}">Abk. ${fmt(l.erwartet)}</span>` : l.status === 'Abgekalbt' ? `<span class="pill">Abgekalbt</span>` : `<span class="pill grey">Unbesamt</span>`;
  return `<a class="row" href="#/tier/${t.id}"><div class="main"><span class="t">${esc(t.name || t.ohrmarke)} ${t.geschlecht === 'm' ? '<span class="small muted">♂</span>' : ''}</span><span class="s mono">${esc(sub)}</span></div>${pill}</a>`;
}

function timeline(tiere) {
  const d = today(), start = addDays(d, -365), end = addDays(d, 365);
  const ppd = 1.3, W = Math.round(730 * ppd), rowH = 28, head = 30, H = head + tiere.length * rowH;
  const x = s => Math.round(diff(start, s) * ppd * 10) / 10;
  const clip = (a, b) => [a < start ? start : a, b > end ? end : b];
  let g = '';
  const y0 = +start.slice(0, 4), y1 = +end.slice(0, 4) + 1;
  for (let y = y0; y <= y1; y++) {
    let [a, b] = verbotFenster(y);
    if (b >= start && a <= end) { [a, b] = clip(a, b); g += `<rect x="${x(a)}" y="${head}" width="${x(b) - x(a)}" height="${H - head}" fill="url(#hatch)"/>`; }
    [a, b] = alpFenster(y);
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
  const sl = sortedAuslauf(); const ort = ortAm(t.id, today(), sl);
  return `
  ${f ? `<div class="note" style="margin-top:8px"><b>Absetzfrist läuft</b> bis ${fmt(f.freiAb)} (${esc(f.medikament)})</div>` : ''}
  ${!aktiv(t) ? `<div class="note blue" style="margin-top:8px">Abgang ${fmt(t.abgang)} · ${esc(t.abgangGrund || '')}</div>` : ''}
  <div class="card" style="margin-top:8px"><dl class="info">
    <dt>Name</dt><dd>${esc(t.name || '-')}</dd>
    <dt>Ohrmarke</dt><dd class="mono">${esc(t.ohrmarke || '-')}</dd>
    <dt>Mutter</dt><dd>${mutter ? `<a href="#/tier/${mutter.id}">${esc(mutter.name || mutter.ohrmarke)}</a>` : esc(t.mutterName || '-')}</dd>
    <dt>Geburtsdatum</dt><dd>${fmt(t.geburt) || '-'}${m !== null ? ` <span class="muted small">(${m} Mt.)</span>` : ''}</dd>
    <dt>Zugangsdatum</dt><dd>${fmt(t.zugang) || '-'}</dd>
    <dt>Geschlecht</dt><dd>${t.geschlecht === 'm' ? 'männlich' : 'weiblich'}${t.rasse ? ' · ' + esc(t.rasse) : ''}</dd>
    <dt>Kategorie</dt><dd>${kategorie(t)}</dd>
    ${l ? `<dt>Status</dt><dd>${l.status}${l.status === 'Besamt' ? `<br><span class="small ${inAlp(l.erwartet) ? '' : 'muted'}" style="${inAlp(l.erwartet) ? 'color:var(--red)' : ''}">Abkalbung ca. ${fmt(l.erwartet)}${inAlp(l.erwartet) ? ' (während Alp!)' : ''}</span>` : ''}</dd>` : ''}
    <dt>Standort</dt><dd>${ort ? esc(ort.ort || ort.typ) : '-'}</dd>
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
  if (e.typ === 'besamung') return ['Besamung', [e.art, e.stier].filter(Boolean).join(' · ')];
  if (e.typ === 'brunst') return ['Brunst', e.notiz || ''];
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
  const tabs = `<div class="seg" style="margin:8px 0 12px">${[['behandlung', 'Behandlungsjournal'], ['auslauf', 'Auslaufjournal']].map(([v, l]) => `<button type="button" class="${UI.jTab === v ? 'on' : ''}" data-act="jtab" data-v="${v}">${l}</button>`).join('')}</div>`;
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
  return sl.map((a, i) => {
    const nx = sl.slice(i + 1).find(b => (a.tierIds || []).every(id => (b.tierIds || []).includes(id)));
    return { a, bis: nx ? nx.datum : null };
  }).reverse();
}
function vAuslauf() {
  const d = today(), sl = sortedAuslauf(), tiere = aktiveTiere(), orte = {};
  tiere.forEach(t => { const a = ortAm(t.id, d, sl); if (a) { const k = a.ort || a.typ; (orte[k] = orte[k] || { typ: a.typ, n: 0, seit: a.datum }).n++; } });
  const per = auslaufPerioden().filter(p => p.a.datum.startsWith(UI.jahr) || (p.bis || '9999') >= UI.jahr + '-01-01' && p.a.datum <= UI.jahr + '-12-31');
  return `<div class="sec-t">Heute</div><div class="list">${Object.keys(orte).length ? Object.entries(orte).map(([o, v]) => `<div class="row"><div class="main"><span class="t">${esc(o)}</span><span class="s">${esc(v.typ)} · seit ${fmt(v.seit)}</span></div><b>${v.n}</b></div>`).join('') : '<div class="empty">Noch kein Eintrag.</div>'}</div>
  <div class="toolbar" style="margin-top:14px">${jahrSel()}<button class="btn pri" data-act="form" data-f="auslauf">+ Eintrag</button><button class="btn" data-act="pdf" data-p="auslaufJahr">PDF ${UI.jahr}</button></div>
  <div class="toolbar"><input class="search" type="date" value="${d}" id="auslaufTag" aria-label="Tag" style="flex:0 1 180px"><button class="btn" data-act="pdf" data-p="auslaufTag">PDF Tag</button></div>
  <div class="list">${per.length ? per.map(p => { const dauer = diff(p.a.datum, p.bis || d) + (p.bis ? 0 : 1); return `<button type="button" class="row" data-act="edit" data-c="auslauf" data-id="${p.a.id}"><div class="main"><span class="t">${esc(p.a.ort || p.a.typ)} <span class="pill ${p.a.typ === 'Stall' ? 'blue' : p.a.typ === 'Alp' ? 'warn' : ''}">${esc(p.a.typ)}</span></span><span class="s">${esc(tierListe(p.a.tierIds))}</span></div><div class="r">${fmt(p.a.datum)}<br><span class="small muted">${p.bis ? 'bis ' + fmtS(p.bis) + ' · ' : 'aktuell · '}${dauer} T.</span></div></button>`; }).join('') : '<div class="empty">Keine Einträge in diesem Jahr.</div>'}</div>`;
}

const FELD = {
  guellen: { l: 'Güllen', e: 'm³', g: 'austrag' }, misten: { l: 'Misten', e: 't', g: 'austrag' },
  heuen: { l: 'Heuen', e: 'Ballen', g: 'ernte' }, silieren: { l: 'Silieren', e: 'Ballen', g: 'ernte' },
  bezugHeu: { l: 'Lagerbezug Heu', e: 'Ballen', g: 'lager' }, bezugSilage: { l: 'Lagerbezug Silage', e: 'Ballen', g: 'lager' }
};
function vFeld() {
  const tabs = `<div class="seg" style="margin:8px 0 12px">${[['austrag', 'Austragung'], ['ernte', 'Ernte'], ['lager', 'Lager']].map(([v, l]) => `<button type="button" class="${UI.fTab === v ? 'on' : ''}" data-act="ftab" data-v="${v}">${l}</button>`).join('')}</div>`;
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

function vSettings() {
  const s = S.set;
  return `<form class="form" id="setform" style="margin-top:8px">
  <div class="card form">
  <label class="fld"><span>Hofname</span><input name="hofname" value="${esc(s.hofname)}"></label>
  <label class="fld"><span>Standard-Rasse</span><input name="rasse" value="${esc(s.rasse)}"></label>
  </div>
  <div class="sec-t">Zucht</div><div class="card form">
  <label class="fld"><span>Tragzeit (Tage)</span><input name="tragzeit" type="number" inputmode="numeric" value="${s.tragzeit}"></label>
  <label class="fld"><span>Kalb bis (Monate)</span><input name="kalbMonate" type="number" inputmode="numeric" value="${s.kalbMonate}"></label>
  <label class="fld"><span>Laktations-KPI ab (Monate)</span><input name="laktAbMonate" type="number" inputmode="numeric" value="${s.laktAbMonate}"></label>
  <label class="fld"><span>Status "Abgekalbt" während (Tage)</span><input name="abgekalbtTage" type="number" inputmode="numeric" value="${s.abgekalbtTage}"></label>
  <label class="fld"><span>Alp von (MM-TT)</span><input name="alpVon" value="${esc(s.alpVon)}" placeholder="06-15"></label>
  <label class="fld"><span>Alp bis (MM-TT)</span><input name="alpBis" value="${esc(s.alpBis)}" placeholder="09-15"></label>
  <label class="fld"><span>Puffer Besamungsverbot (Tage)</span><input name="puffer" type="number" inputmode="numeric" value="${s.puffer}"></label>
  </div>
  <div class="sec-t">Listen (eine Zeile pro Eintrag)</div><div class="card form">
  <label class="fld"><span>Parzellen</span><textarea name="parzellen" rows="4">${esc((s.parzellen || []).join('\n'))}</textarea></label>
  <label class="fld"><span>Weiden / Ställe</span><textarea name="orte" rows="4">${esc((s.orte || []).join('\n'))}</textarea></label>
  <label class="fld"><span>Medikamente (Name ; Absetzfrist Tage)</span><textarea name="medikamente" rows="4" placeholder="Beispielpräparat ; 21">${esc((s.medikamente || []).map(m => `${m.name} ; ${m.frist}`).join('\n'))}</textarea></label>
  </div>
  <div class="sec-t">Lager</div><div class="card form">
  <label class="fld"><span>Startbestand Heuballen</span><input name="startHeu" type="number" inputmode="decimal" value="${s.startHeu}"></label>
  <label class="fld"><span>Startbestand Siloballen</span><input name="startSilo" type="number" inputmode="decimal" value="${s.startSilo}"></label>
  </div>
  <button class="btn pri block" type="submit">Einstellungen speichern</button>
  </form>
  <div class="sec-t">Daten</div>
  <div class="card"><p class="small muted" style="margin:0 0 10px">Speicherort: <b>${mode === 'firebase' ? 'Firebase (synchronisiert)' : 'nur dieses Gerät'}</b>${mode === 'firebase' ? ` · Hof-Schlüssel: <span class="mono">${esc(KEY.slice(0, 4))}…</span>` : ''} · Version ${VERSION}</p>
  <div class="btns"><button class="btn" data-act="backup">Backup herunterladen (JSON)</button><label class="btn">Backup einlesen<input type="file" accept="application/json" data-act="restore" class="hidden"></label>${mode === 'firebase' ? '<button class="btn" data-act="copylink">Link für weiteres Gerät kopieren</button>' : ''}</div></div>`;
}

/* ---------- Formulare ---------- */
const ART = ['i.m.', 's.c.', 'i.v.', 'oral', 'äusserlich', 'intramammär'];
const FORMS = {
  zugang: { t: 'Zugang', coll: 'tiere', fields: [
    { k: 'name', l: 'Name', t: 'text' }, { k: 'ohrmarke', l: 'Ohrmarke', t: 'text', ph: 'CH 120.1234.5678.9' },
    { k: 'geschlecht', l: 'Geschlecht', t: 'seg', o: [['w', 'weiblich'], ['m', 'männlich']], def: 'w' },
    { k: 'geburt', l: 'Geburtsdatum', t: 'date', def: '' }, { k: 'zugang', l: 'Zugangsdatum', t: 'date' },
    { k: 'mutterId', l: 'Mutter (falls im Bestand)', t: 'tier', opt: true, filter: t => t.geschlecht === 'w' },
    { k: 'mutterName', l: 'Mutter (Name, falls nicht im Bestand)', t: 'text' },
    { k: 'rasse', l: 'Rasse', t: 'text', def: () => S.set.rasse }, { k: 'notiz', l: 'Notiz', t: 'textarea' }],
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
    { k: 'notiz', l: 'Notiz', t: 'textarea' }],
    hint: 'Legt das Kalb als neues Tier an und meldet die Abkalbung bei der Mutter. TVD-Meldung nicht vergessen.',
    save(v) {
      const m = tierById(v.tierId);
      const k = put('tiere', { name: v.kalbName, ohrmarke: v.kalbOhrmarke, geschlecht: v.kalbGeschlecht, geburt: v.datum, zugang: v.datum, mutterId: v.tierId, rasse: m && m.rasse || S.set.rasse });
      put('ereignisse', { typ: 'abkalbung', tierId: v.tierId, datum: v.datum, verlauf: v.verlauf, kalbId: k.id, notiz: v.notiz });
    } },
  abkalbung: { t: 'Abkalbung', coll: 'ereignisse', fields: [
    { k: 'tierId', l: 'Mutter', t: 'tier', filter: t => t.geschlecht === 'w' }, { k: 'datum', l: 'Datum', t: 'date' },
    { k: 'verlauf', l: 'Verlauf', t: 'seg', o: [['leicht', 'leicht'], ['mittel', 'mittel'], ['schwer', 'schwer'], ['Kaiserschnitt', 'Kaiserschnitt']] },
    { k: 'notiz', l: 'Notiz', t: 'textarea' }] },
  brunst: { t: 'Brunst', coll: 'ereignisse', multi: true, fields: [
    { k: 'tierIds', l: 'Tiere', t: 'tiere', filter: t => lakt(t) || (t.geschlecht === 'w' && kategorie(t) !== 'Kalb') },
    { k: 'datum', l: 'Datum', t: 'date' }, { k: 'notiz', l: 'Notiz', t: 'textarea' }] },
  besamung: { t: 'Besamung', coll: 'ereignisse', multi: true, fields: [
    { k: 'tierIds', l: 'Tiere', t: 'tiere', filter: t => lakt(t) || (t.geschlecht === 'w' && kategorie(t) !== 'Kalb') },
    { k: 'datum', l: 'Datum', t: 'date' },
    { k: 'art', l: 'Art', t: 'seg', o: [['KB', 'KB'], ['Natursprung', 'Natursprung']], def: 'KB' },
    { k: 'stier', l: 'Stier / Samen', t: 'text', list: () => [...new Set(S.ereignisse.filter(e => e.stier).map(e => e.stier))] },
    { k: 'notiz', l: 'Notiz', t: 'textarea' }],
    calc: v => v.datum ? `Erwartete Abkalbung: <b>${fmt(addDays(v.datum, S.set.tragzeit))}</b>${inAlp(addDays(v.datum, S.set.tragzeit)) ? ' <span class="pill red">während Alp!</span>' : ''}` : '' },
  auslauf: { t: 'Auslaufjournal', coll: 'auslauf', fields: [
    { k: 'tierIds', l: 'Tiere', t: 'tiere', allDefault: true },
    { k: 'datum', l: 'Ab Datum', t: 'date' }, { k: 'zeit', l: 'Zeit (optional)', t: 'time' },
    { k: 'typ', l: 'Wo', t: 'seg', o: [['Weide', 'Weide'], ['Stall', 'Stall'], ['Alp', 'Alp']], def: 'Weide' },
    { k: 'ort', l: 'Weide / Stall', t: 'text', list: () => S.set.orte || [] }, { k: 'notiz', l: 'Notiz', t: 'textarea' }],
    hint: 'Gilt ab diesem Datum bis zum nächsten Eintrag für dieselben Tiere.' },
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
    ...(d.g === 'lager' ? [{ k: 'zweck', l: 'Zweck', t: 'text', def: 'Fütterung', list: () => ['Fütterung', 'Verkauf', 'Einstreu'] }] : [{ k: 'parzelle', l: 'Parzelle', t: 'text', list: () => S.set.parzellen || [] }]),
    { k: 'menge', l: `Menge (${d.e})`, t: 'number' }, { k: 'notiz', l: 'Notiz', t: 'textarea' }],
    calc: v => { if (d.g === 'austrag') return ''; const L = lager(); const cur = k === 'heuen' || k === 'bezugHeu' ? L.heu : L.silo; const sign = d.g === 'lager' ? -1 : 1; return `Lager ${k.includes('eu') || k === 'heuen' ? 'Heu' : 'Silage'}: ${nf(cur)} → <b>${nf(cur + sign * num(v.menge))}</b> Ballen`; } };
}
FORMS.tiere = { ...FORMS.zugang, t: 'Tier bearbeiten', more: false };

let sheetOpen = null;
function openSheet(title, body, { onSave, saveLabel = 'Sichern', onDelete } = {}) {
  closeSheet(true);
  const wrap = $('#sheets');
  wrap.innerHTML = `<div class="backdrop"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-h"><button type="button" data-x>Abbrechen</button><b>${esc(title)}</b>${onSave ? `<button type="button" class="save" data-s>${saveLabel}</button>` : '<span style="width:70px"></span>'}</div><div class="sheet-b">${body}${onDelete ? '<button type="button" class="btn danger block" data-d style="margin-top:18px">Löschen</button>' : ''}</div></div>`;
  const sh = $('.sheet', wrap), bd = $('.backdrop', wrap);
  requestAnimationFrame(() => { sh.classList.add('show'); bd.classList.add('show'); });
  bd.onclick = () => closeSheet(); $('[data-x]', sh).onclick = () => closeSheet();
  if (onSave) $('[data-s]', sh).onclick = onSave;
  if (onDelete) $('[data-d]', sh).onclick = () => { if (confirm('Wirklich löschen?')) { onDelete(); closeSheet(); } };
  sheetOpen = sh;
  return sh;
}
function closeSheet(instant) {
  const wrap = $('#sheets'); $('#plus').classList.remove('open');
  if (!wrap.innerHTML) return;
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
  if (rec) { Object.assign(v, rec); if (def.multi && rec.tierId) v.tierIds = [rec.tierId]; }
  if (pre.tier) { if ('tierIds' in v) v.tierIds = [pre.tier]; if ('tierId' in v) v.tierId = pre.tier; }
  if (key === 'tiere' || key === 'zugang') { if (!rec) v.geburt = ''; }
  const body = `${def.hint ? `<div class="note blue small" style="margin-bottom:14px">${def.hint}</div>` : ''}<form class="form" data-form>${def.fields.map(f => fieldHtml(f, v)).join('')}<div class="calc" data-calc></div>
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
      else if (f.t === 'seg') { const c = $(`input[name="${f.k}"]:checked`, form); o[f.k] = c ? c.value : ''; }
      else o[f.k] = (form.elements[f.k] && form.elements[f.k].value || '').trim();
    });
    return o;
  };
  const upd = () => { const c = $('[data-calc]', form); if (def.calc) c.innerHTML = def.calc(read()); $$('[data-cnt]', form).forEach(el => el.textContent = `(${$$(`[data-picker="${el.dataset.cnt}"] .chip.on`, form).length} gewählt)`); };
  form.addEventListener('input', e => {
    form.dataset.dirty = '1';
    if (e.target.name === 'medikament') { const m = (S.set.medikamente || []).find(m => m.name === e.target.value); if (m && form.elements.frist) form.elements.frist.value = m.frist; }
    upd();
  });
  form.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.closest('[data-picker]')) { b.classList.toggle('on'); form.dataset.dirty = '1'; upd(); }
    if (b.dataset.all) { $$(`[data-picker="${b.dataset.all}"] .chip`, form).forEach(c => c.classList.add('on')); upd(); }
    if (b.dataset.none) { $$(`[data-picker="${b.dataset.none}"] .chip`, form).forEach(c => c.classList.remove('on')); upd(); }
    if ('more' in b.dataset) doSave(true);
  });
  upd();
  function doSave(more) {
    const o = read();
    // Pflichtfelder
    if (def.fields.some(f => f.t === 'date' && f.k !== 'geburt') && def.fields.filter(f => f.t === 'date' && f.k !== 'geburt').some(f => !o[f.k])) return toast('Datum fehlt');
    if ('tierIds' in o && !o.tierIds.length) return toast('Mindestens ein Tier wählen');
    if ('tierId' in o && !o.tierId && !def.fields.find(f => f.k === 'tierId').opt) return toast('Tier wählen');
    if ((key === 'zugang' || key === 'tiere') && !o.name && !o.ohrmarke) return toast('Name oder Ohrmarke fehlt');
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
    if (more) { form.reset(); form.dataset.dirty = ''; $$('input[type=date]', form).forEach(i => i.value = today()); return; }
    closeSheet();
  }
}
function formKey(coll, r) {
  if (coll === 'tiere') return 'tiere';
  if (coll === 'ereignisse') return r.typ;
  if (coll === 'behandlungen') return 'behandlung';
  if (coll === 'auslauf') return 'auslauf';
  if (coll === 'feld') return r.typ;
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
    const d = ($('#auslaufTag') || {}).value || today(); const sl = sortedAuslauf();
    const body = aktiveTiere(d).map(t => { const a = ortAm(t.id, d, sl); return [t.name || '', t.ohrmarke || '', a ? a.typ : '-', a ? (a.ort || '') : '', a ? fmt(a.datum) : '']; });
    await makePdf(`Auslaufjournal ${fmt(d)}`, `Tag ${fmt(d)}`, [{ head: ['Tier', 'Ohrmarke', 'Wo', 'Weide / Stall', 'seit'], body }], `Auslauf_${d}.pdf`);
  }
  if (p === 'auslaufJahr') {
    const sl = sortedAuslauf(); const body = []; const tage = {};
    const end = J === String(new Date().getFullYear()) ? today() : `${J}-12-31`;
    for (let d = `${J}-01-01`; d <= end; d = addDays(d, 1)) {
      const g = {};
      aktiveTiere(d).forEach(t => { const a = ortAm(t.id, d, sl); if (!a) return; const k = a.typ + '|' + (a.ort || ''); (g[k] = g[k] || []).push(t.name || t.ohrmarke); });
      Object.entries(g).forEach(([k, names]) => { const [typ, ort] = k.split('|'); body.push([fmt(d), typ, ort, names.length, names.length > 8 ? '' : names.join(', ')]); tage[k] = (tage[k] || 0) + 1; });
    }
    await makePdf(`Auslaufjournal ${J}`, `Jahr ${J}`, [
      { h: 'Zusammenfassung', head: ['Wo', 'Weide / Stall', 'Tage'], body: Object.entries(tage).map(([k, n]) => { const [a, b] = k.split('|'); return [a, b, n]; }) },
      { h: 'Pro Tag', head: ['Datum', 'Wo', 'Weide / Stall', 'Anzahl', 'Tiere'], body }
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
  else if (a === 'pdf') { el.disabled = true; pdf(el.dataset.p, el.dataset.id).catch(showErr).finally(() => el.disabled = false); }
  else if (a === 'backup') { const d = { version: VERSION, exportiert: new Date().toISOString(), set: S.set }; COLLS.forEach(c => d[c] = S[c]); const b = new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' }); const u = URL.createObjectURL(b); const l = document.createElement('a'); l.href = u; l.download = `hofbuech_backup_${today()}.json`; l.click(); setTimeout(() => URL.revokeObjectURL(u), 2000); }
  else if (a === 'copylink') { const u = location.origin + location.pathname + '#k=' + KEY; navigator.clipboard.writeText(u).then(() => toast('Link kopiert - nur an eigene Geräte senden'), () => prompt('Link kopieren:', u)); }
});
document.addEventListener('input', e => {
  const a = e.target.dataset && e.target.dataset.act;
  if (a === 'q') { UI.tierFilter.q = e.target.value; clearTimeout(window._qt); window._qt = setTimeout(() => { render(); const s = $('[data-act="q"]'); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); } }, 250); }
});
document.addEventListener('change', e => {
  const a = e.target.dataset && e.target.dataset.act;
  if (a === 'sort') { UI.tierFilter.sort = e.target.value; render(); }
  if (a === 'jahr') { UI.jahr = e.target.value; render(); }
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
    ...S.set, hofname: f.hofname.value.trim(), rasse: f.rasse.value.trim(),
    tragzeit: num(f.tragzeit.value) || 285, kalbMonate: num(f.kalbMonate.value) || 12, laktAbMonate: num(f.laktAbMonate.value) || 16,
    abgekalbtTage: num(f.abgekalbtTage.value) || 60, alpVon: f.alpVon.value.trim() || '06-15', alpBis: f.alpBis.value.trim() || '09-15', puffer: num(f.puffer.value),
    parzellen: lines(f.parzellen.value), orte: lines(f.orte.value),
    medikamente: lines(f.medikamente.value).map(l => { const [n, d] = l.split(';'); return { name: n.trim(), frist: num(d) }; }),
    startHeu: num(f.startHeu.value), startSilo: num(f.startSilo.value)
  });
  toast('Einstellungen gespeichert');
});
$('#plus').addEventListener('click', () => sheetOpen ? closeSheet() : plusMenu());
$('#back').addEventListener('click', () => history.length > 1 ? history.back() : (location.hash = '#/start'));
window.addEventListener('hashchange', () => { closeSheet(true); render(); window.scrollTo(0, 0); });

/* ---------- Start ---------- */
function setupScreen() {
  $('#view').innerHTML = `<div class="setup card"><h2 style="margin-top:0">Hof-Schlüssel</h2><p class="muted">Einmalig pro Gerät. Am einfachsten den Link mit <span class="mono">#k=...</span> öffnen, dann ist der Schlüssel automatisch gesetzt.</p><form class="form" id="keyform"><label class="fld"><span>Schlüssel</span><input name="k" autocomplete="off" autocapitalize="off"></label><button class="btn pri block">Weiter</button></form></div>`;
  $('#keyform').onsubmit = e => { e.preventDefault(); const k = e.target.k.value.trim(); if (k) { localStorage.setItem('hb-key', k); location.reload(); } };
}
async function boot() {
  const m = location.hash.match(/^#k=([A-Za-z0-9_-]{8,})/);
  if (m) { KEY = m[1]; localStorage.setItem('hb-key', KEY); history.replaceState(null, '', location.pathname + '#/start'); }
  const cfg = window.HB_FIREBASE;
  if (cfg && !KEY) { setupScreen(); return; }
  if (cfg) { try { await initFirebase(cfg); } catch (e) { showErr(e); initLocal(); } }
  else initLocal();
  render();
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
boot();
