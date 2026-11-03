// Täglicher Push-Versand (GitHub Actions). Liest hoefe/{HOF} aus Firestore und schickt die Termine des Tages per FCM.
import admin from 'firebase-admin';

const HOF = process.env.HB_HOF || 'bannhalde';
const TEST = process.env.TEST === 'true';
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

const iso = d => d.toISOString().slice(0, 10);
const tz = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Zurich' }));
const today = `${tz.getFullYear()}-${String(tz.getMonth() + 1).padStart(2, '0')}-${String(tz.getDate()).padStart(2, '0')}`;
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const diff = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000);
const fmt = s => `${s.slice(8, 10)}.${s.slice(5, 7)}.`;

const load = async c => (await db.collection('hoefe').doc(HOF).collection(c).get()).docs.map(d => ({ id: d.id, ...d.data() }));
const [tiere, ev, beh, pz, aus, geraete, setDoc] = await Promise.all(['tiere', 'ereignisse', 'behandlungen', 'parzellen', 'auslauf', 'geraete'].map(load).concat([db.doc(`hoefe/${HOF}/einstellungen/main`).get()]));
const set = { tragzeit: 285, alpVon: '05-25', alpBis: '10-05', ...(setDoc.exists ? setDoc.data() : {}) };
if (set.alpVon === '06-15' && set.alpBis === '09-15') { set.alpVon = '05-25'; set.alpBis = '10-05'; }

const aktiv = t => (!t.zugang || t.zugang <= today) && (!t.geburt || t.geburt <= today) && (!t.abgang || t.abgang > today);
const evOf = (id, typ) => ev.filter(e => e.tierId === id && e.typ === typ).sort((a, b) => a.datum < b.datum ? -1 : 1);
const name = t => t.name || t.ohrmarke || '?';
const msgs = [];
const hit = (d, offsets, text) => { for (const o of offsets) if (diff(today, d) === o) { msgs.push(o === 0 ? text : `${text} (in ${o} T., ${fmt(d)})`); return; } };

for (const t of tiere.filter(aktiv)) {
  if (t.geschlecht !== 'w') continue;
  const cal = evOf(t.id, 'abkalbung').filter(e => e.datum <= today).pop();
  const bes = evOf(t.id, 'besamung').filter(e => e.datum <= today && (!cal || e.datum > cal.datum)).pop();
  if (bes) {
    hit(addDays(bes.datum, set.tragzeit), [7, 1, 0], `Gepl. Abkalbung: ${name(t)}`);
    hit(addDays(bes.datum, 21), [0], `Brunstkontrolle: ${name(t)} (21 T. nach Besamung)`);
  } else {
    const br = evOf(t.id, 'brunst').filter(e => !cal || e.datum > cal.datum).pop();
    if (br) { let nx = addDays(br.datum, 21); while (nx < today) nx = addDays(nx, 21); hit(nx, [1, 0], `Gepl. Brunst: ${name(t)}`); }
  }
}
for (const b of beh) if (b.freiAb) hit(b.freiAb, [0], `Absetzfrist endet: ${(b.tierIds || []).map(id => name(tiere.find(t => t.id === id) || {})).join(', ')} (${b.medikament || ''})`);
const y = today.slice(0, 4);
for (const z of pz) {
  if (z.schnittAb) hit(`${y}-${z.schnittAb}`, [3, 0], `Schnitt erlaubt ab heute: ${z.name}`);
  if (z.fruehBis) hit(`${y}-${z.fruehBis}`, [7, 2, 0], `Frühschnitt spätestens: ${z.name}`);
  if (z.schnitt2Ab) hit(`${y}-${z.schnitt2Ab}`, [0], `2. Schnitt erlaubt: ${z.name}`);
}
const [lab, auf] = await Promise.all(['labiola', 'aufgaben'].map(load));
for (const o of lab) if (o.szp) hit(`${y}-${o.szp}`, [3, 0], `Labiola Obj. ${o.nr} ${o.flurname || ''}: Schnitt erlaubt`);
for (const a of auf) {
  const due = a.art === 'einmalig' ? a.faellig : (a.faelligMT ? `${y}-${a.faelligMT}` : null);
  if (!due || !due.startsWith(y) || (a.erledigt || {})[y]) continue;
  hit(due, [14, 3, 0], `Labiola-Pendenz: ${a.titel}`);
  if (diff(due, today) > 0 && diff(due, today) % 7 === 0) msgs.push(`Überfällig: ${a.titel}`);
}
const alpIst = aus.some(a => a.typ === 'Alp' && a.datum.startsWith(y));
if (!alpIst) hit(`${y}-${set.alpVon}`, [7, 0], 'Alpauffahrt (geplant)');
hit(`${y}-${set.alpBis}`, [7, 0], 'Alpabfahrt (geplant)');

if (TEST && !msgs.length) msgs.push('Test: Push funktioniert.');
console.log(today, msgs);
if (!msgs.length || !geraete.length) process.exit(0);

const title = msgs.length === 1 ? 'hofbuech' : `hofbuech: ${msgs.length} Termine`;
const body = msgs.join('\n');
for (const g of geraete) {
  try {
    await admin.messaging().send({ token: g.token, data: { title, body, url: './#/kalender', tag: 'tag-' + today }, webpush: { headers: { Urgency: 'high', TTL: '43200' } } });
    console.log('gesendet an', g.id);
  } catch (e) {
    console.log('Fehler', g.id, e.code);
    if (['messaging/registration-token-not-registered', 'messaging/invalid-argument'].includes(e.code)) await db.doc(`hoefe/${HOF}/geraete/${g.id}`).delete();
  }
}
