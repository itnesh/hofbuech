"""
hofbuech-Waechter fuer CowCatcher (schlank, ohne firebase-admin).

- Ueberwacht detections/<cam>/approved/<zeitstempel>/ (best.jpg, clean.jpg, metadata.json, video.mp4)
- Neues, vollstaendiges Event -> Meldung in hofbuech (Firestore REST) + Push (FCM v1)
  meldungen/<id>: Daten + kleines Vorschaubild (Ausschnitt), meldvideos/<id>: Video H.264 (iPhone-tauglich, < 700 kB)
- Idempotent: Dokument-ID = cc_<cam>_<zeitstempel>, Versand wird in gesendet.json gemerkt
- Kein Netz: Event bleibt offen und wird beim naechsten Durchlauf erneut versucht
- Nebenbei: alte CowCatcher-Logs aufraeumen (Alter + Gesamtgroesse)

Abhaengigkeiten: google-auth, requests, pillow, imageio-ffmpeg
Aufruf:
  python waechter.py            Dauerbetrieb (Dienst)
  python waechter.py --test     neuestes approved-Event einmal als TEST senden und beenden
  python waechter.py --einmal   ein Durchlauf (alles Neue senden) und beenden
"""
import base64, datetime, io, json, logging, logging.handlers, os, subprocess, sys, tempfile, time

HIER = os.path.dirname(os.path.abspath(__file__))
BASIS = os.path.dirname(HIER)  # C:\CowCatcher
CFG = {
    'key': os.path.join(BASIS, 'hofbuech-key.json'),
    'hof': 'bannhalde',
    'detections': os.path.join(BASIS, 'detections'),
    'logs': os.path.join(BASIS, 'logs'),
    'kameras': {'cam1': 'Kamera 1', 'cam2': 'Kamera 2', 'cam3': 'Kamera 3'},
    'bild': 'clean.jpg',         # Quelle Vorschaubild (Ausschnitt um die Tiere)
    'thumb_px': 360, 'thumb_q': 65,
    'video_px': 960, 'video_crf': 28, 'video_max_kb': 700,
    'intervall_s': 10,           # Abfrage-Intervall
    'ruhe_s': 8,                 # Event erst senden, wenn so lange unveraendert
    'log_tage': 3, 'log_max_mb': 200,  # Log-Bereinigung CowCatcher
    'dryrun': False,             # True: nichts senden, nur loggen (Test)
}
try:
    CFG.update(json.load(open(os.path.join(HIER, 'waechter.json'), encoding='utf-8')))
except FileNotFoundError:
    pass
STAND = os.path.join(HIER, 'gesendet.json')

os.makedirs(CFG['logs'], exist_ok=True)
log = logging.getLogger('waechter')
log.setLevel(logging.INFO)
_h = logging.handlers.RotatingFileHandler(os.path.join(CFG['logs'], 'hofbuech_waechter.log'),
                                          maxBytes=1_000_000, backupCount=3, encoding='utf-8')
_h.setFormatter(logging.Formatter('%(asctime)s %(levelname)s %(message)s'))
log.addHandler(_h)
log.addHandler(logging.StreamHandler(sys.stdout))

_sess = None
_projekt = None


def sitzung():
    global _sess, _projekt
    if _sess is None:
        from google.oauth2 import service_account
        from google.auth.transport.requests import AuthorizedSession
        cred = service_account.Credentials.from_service_account_file(
            CFG['key'], scopes=['https://www.googleapis.com/auth/cloud-platform'])
        _projekt = cred.project_id
        _sess = AuthorizedSession(cred)
    return _sess


def fs_url(pfad=''):
    return f'https://firestore.googleapis.com/v1/projects/{_projekt}/databases/(default)/documents/hoefe/{CFG["hof"]}/{pfad}'


def fs_wert(v):
    if isinstance(v, bool): return {'booleanValue': v}
    if isinstance(v, int): return {'integerValue': str(v)}
    if isinstance(v, float): return {'doubleValue': v}
    return {'stringValue': str(v)}


def thumb_data_url(pfad, crop=None):
    from PIL import Image
    im = Image.open(pfad).convert('RGB')
    if crop:  # Ausschnitt um Erkennung, 60 % Rand, mind. 16:9-tauglich
        x1, y1, x2, y2 = crop['x1'], crop['y1'], crop['x2'], crop['y2']
        w, h = x2 - x1, y2 - y1
        cx, cy, s = (x1 + x2) / 2, (y1 + y2) / 2, max(w, h) * 1.6
        box = [max(0, cx - s * 0.8), max(0, cy - s / 2), min(im.width, cx + s * 0.8), min(im.height, cy + s / 2)]
        im = im.crop(tuple(int(v) for v in box))
    im.thumbnail((CFG['thumb_px'], CFG['thumb_px']))
    b = io.BytesIO()
    im.save(b, 'JPEG', quality=CFG['thumb_q'], optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()


def video_data_url(pfad):
    """H.264/yuv420p (iPhone), verkleinert; CRF steigt bis unter video_max_kb"""
    import imageio_ffmpeg
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    fd, out = tempfile.mkstemp(suffix='.mp4'); os.close(fd)
    try:
        for crf, px in ((CFG['video_crf'], CFG['video_px']), (32, 720), (36, 640), (40, 480)):
            subprocess.run([ff, '-y', '-loglevel', 'error', '-i', pfad, '-an',
                            '-vf', f"scale='min({px},iw)':-2", '-c:v', 'libx264', '-preset', 'veryfast',
                            '-crf', str(crf), '-pix_fmt', 'yuv420p', '-profile:v', 'main',
                            '-movflags', '+faststart', out], check=True, timeout=120,
                           creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
            data = open(out, 'rb').read()
            if len(data) <= CFG['video_max_kb'] * 1024:
                return 'data:video/mp4;base64,' + base64.b64encode(data).decode()
        log.warning('Video zu gross (%d kB), ohne Video gesendet', len(data) // 1024)
        return None
    finally:
        try: os.remove(out)
        except OSError: pass


def events():
    """liefert (event_id, cam, ordner) aller approved-Events"""
    d = CFG['detections']
    for cam in sorted(os.listdir(d)) if os.path.isdir(d) else []:
        ap = os.path.join(d, cam, 'approved')
        if not os.path.isdir(ap):
            continue
        for ts in sorted(os.listdir(ap)):
            o = os.path.join(ap, ts)
            if os.path.isdir(o):
                yield f'{cam}_{ts}', cam, o


def fertig(ordner):
    """vollstaendig und seit ruhe_s unveraendert?"""
    try:
        dat = os.listdir(ordner)
        if 'metadata.json' not in dat or not any(f.endswith('.jpg') for f in dat):
            return False
        neu = max(os.path.getmtime(os.path.join(ordner, f)) for f in dat)
        return time.time() - neu >= CFG['ruhe_s']
    except OSError:
        return False


def senden(eid, cam, ordner, test=False):
    meta = {}
    try:
        meta = json.load(open(os.path.join(ordner, 'metadata.json'), encoding='utf-8'))
    except Exception:
        pass
    ts = os.path.basename(ordner)  # 2026-11-10T17-27-56 (Lokalzeit)
    zeit = ts[:11] + ts[11:].replace('-', ':')
    kamera = CFG['kameras'].get(cam, cam) + (' (TEST)' if test else '')
    doc = {'zeit': zeit, 'kamera': kamera, 'quelle': 'CowCatcher', 'status': '', 'event': eid}
    if meta.get('confidence') is not None:
        doc['score'] = round(float(meta['confidence']), 2)
    if meta.get('duration') is not None:
        doc['dauer_s'] = round(float(meta['duration']), 1)
    bild = next((os.path.join(ordner, f) for f in (CFG['bild'], 'clean.jpg', 'best.jpg')
                 if os.path.exists(os.path.join(ordner, f))), None)
    if bild:
        doc['thumb'] = thumb_data_url(bild, meta.get('crop'))
    video = None
    if os.path.exists(os.path.join(ordner, 'video.mp4')):
        try:
            video = video_data_url(os.path.join(ordner, 'video.mp4'))
        except Exception as e:
            log.warning('Video-Umwandlung fehlgeschlagen %s: %s', eid, e)
    doc['video'] = bool(video)
    doc_id = ('test_' + datetime.datetime.now().strftime('%H%M%S') + '_' if test else 'cc_') + eid
    if CFG['dryrun']:
        log.info('DRYRUN %s %s Thumb=%s kB Video=%s kB', doc_id, {k: v for k, v in doc.items() if k != 'thumb'},
                 len(doc.get('thumb', '')) // 1024, len(video or '') // 1024)
        return doc_id
    s = sitzung()
    if video:
        r = s.patch(fs_url(f'meldvideos/{doc_id}'), json={'fields': {'video': fs_wert(video)}}, timeout=60)
        r.raise_for_status()
    r = s.patch(fs_url(f'meldungen/{doc_id}'), json={'fields': {k: fs_wert(v) for k, v in doc.items()}}, timeout=30)
    r.raise_for_status()
    # Push an alle Geraete
    r = s.get(fs_url('geraete'), params={'pageSize': 100}, timeout=30)
    r.raise_for_status()
    n = 0
    for g in r.json().get('documents', []):
        tok = g.get('fields', {}).get('token', {}).get('stringValue')
        if not tok:
            continue
        msg = {'message': {'token': tok, 'data': {
            'title': 'CowCatcher: Aufspringen erkannt',
            'body': f'{kamera} · {zeit[11:16]} Uhr. In hofbuech Tier zuordnen.',
            'url': './#/meldung/' + doc_id, 'tag': 'cowcatcher'},
            'webpush': {'headers': {'Urgency': 'high', 'TTL': '3600'}}}}
        p = s.post(f'https://fcm.googleapis.com/v1/projects/{_projekt}/messages:send', json=msg, timeout=30)
        if p.ok:
            n += 1
        elif p.status_code == 404 or 'UNREGISTERED' in p.text:
            s.delete('https://firestore.googleapis.com/v1/' + g['name'], timeout=30)
            log.info('Geraet abgemeldet, entfernt: %s', g['name'].rsplit('/', 1)[-1])
        else:
            log.warning('Push-Fehler %s: %s', p.status_code, p.text[:200])
    log.info('gemeldet %s (%s, Score %s, Video %s kB) Push an %d Geraet(e)', doc_id, kamera, doc.get('score'), len(video or '') * 3 // 4096, n)
    return doc_id


def stand_laden():
    try:
        return set(json.load(open(STAND, encoding='utf-8')))
    except FileNotFoundError:
        return None


def stand_speichern(s):
    tmp = STAND + '.tmp'
    json.dump(sorted(s)[-2000:], open(tmp, 'w', encoding='utf-8'))
    os.replace(tmp, STAND)


def logs_aufraeumen():
    """rotierte CowCatcher-Logs (mit Zeitstempel im Namen) nach Alter und Gesamtgroesse loeschen"""
    d = CFG['logs']
    alt = time.time() - CFG['log_tage'] * 86400
    dateien = []
    for f in os.listdir(d):
        p = os.path.join(d, f)
        if f.startswith('cowcatcher_') and '-' in f and f.endswith('.log') and os.path.isfile(p):
            dateien.append((os.path.getmtime(p), os.path.getsize(p), p))
    dateien.sort()
    summe = sum(x[1] for x in dateien)
    weg = 0
    for m, g, p in dateien:
        if m < alt or summe > CFG['log_max_mb'] * 1_048_576:
            try:
                os.remove(p)
                summe -= g
                weg += 1
            except OSError as e:
                log.warning('Log nicht loeschbar %s: %s', p, e)
    if weg:
        log.info('Logs aufgeraeumt: %d Datei(en), Rest %.0f MB', weg, summe / 1_048_576)


def durchlauf(gesendet):
    neu = 0
    for eid, cam, o in events():
        if eid in gesendet or not fertig(o):
            continue
        try:
            senden(eid, cam, o)
            gesendet.add(eid)
            stand_speichern(gesendet)
            neu += 1
        except Exception as e:
            log.error('Senden fehlgeschlagen %s: %s (neuer Versuch spaeter)', eid, e)
            break  # Netz weg o.ae.: Rest im naechsten Durchlauf
    return neu


def main():
    args = sys.argv[1:]
    if '--test' in args:
        ev = sorted(events(), key=lambda x: os.path.basename(x[2]))
        if not ev:
            log.error('TEST: kein approved-Event gefunden'); return 1
        eid, cam, o = ev[-1]
        log.info('TEST mit %s -> %s', eid, senden(eid, cam, o, test=True))
        return 0
    gesendet = stand_laden()
    if gesendet is None:  # erster Start: Bestand nicht nachsenden
        gesendet = {e for e, _, _ in events()}
        stand_speichern(gesendet)
        log.info('Erststart: %d vorhandene Events als erledigt markiert', len(gesendet))
    if '--einmal' in args:
        durchlauf(gesendet); return 0
    log.info('Waechter laeuft: %s (Hof %s)', CFG['detections'], CFG['hof'])
    letzte_pflege = 0
    while True:
        try:
            durchlauf(gesendet)
            if time.time() - letzte_pflege > 3600:
                logs_aufraeumen()
                letzte_pflege = time.time()
        except Exception:
            log.exception('Fehler im Durchlauf')
        time.sleep(CFG['intervall_s'])


if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:  # Dienst-Stopp (nssm sendet Ctrl+C)
        log.info('Waechter gestoppt')
        os._exit(0)
