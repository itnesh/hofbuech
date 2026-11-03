"""
CowCatcher -> hofbuech
Schickt eine Brunst-Meldung mit Bild an hofbuech (Firestore) und als Push aufs iPhone.
Läuft auf dem CowCatcher-PC. Ersetzt oder ergänzt den Telegram-Versand.

Einrichtung (einmalig, auf dem CowCatcher-PC):
  pip install firebase-admin pillow
  Dienstkonto-JSON (Firebase > Projekteinstellungen > Dienstkonten) als
  C:\\CowCatcher\\hofbuech-key.json ablegen (nicht weitergeben, nicht ins Repo).

Aufruf von der Kommandozeile (Test):
  python cowcatcher_hofbuech.py --bild C:\\pfad\\bild.jpg --kamera "Stall links" --score 0.83

Aufruf aus CowCatcher (Python), dort wo heute das Telegram-Bild verschickt wird:
  from cowcatcher_hofbuech import melden
  melden(bild_pfad, kamera="Stall links", score=konfidenz)
"""
import argparse, base64, datetime, io, os
import firebase_admin
from firebase_admin import credentials, firestore, messaging
from PIL import Image

KEY = os.environ.get('HOFBUECH_KEY', r'C:\CowCatcher\hofbuech-key.json')
HOF = os.environ.get('HOFBUECH_HOF', 'bannhalde')

if not firebase_admin._apps:
    firebase_admin.initialize_app(credentials.Certificate(KEY))
_db = firestore.client()


def _bild_data_url(pfad, max_px=1024, q=72):
    im = Image.open(pfad).convert('RGB')
    im.thumbnail((max_px, max_px))
    b = io.BytesIO()
    im.save(b, 'JPEG', quality=q)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()


def melden(bild_pfad=None, kamera='Stall', score=None):
    zeit = datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
    doc = {'zeit': zeit, 'kamera': kamera, 'quelle': 'CowCatcher', 'status': ''}
    if score is not None:
        doc['score'] = round(float(score), 2)
    if bild_pfad and os.path.exists(bild_pfad):
        doc['bild'] = _bild_data_url(bild_pfad)
    ref = _db.collection('hoefe').document(HOF).collection('meldungen').document()
    ref.set(doc)
    link = './#/meldung/' + ref.id
    geraete = _db.collection('hoefe').document(HOF).collection('geraete').stream()
    for g in geraete:
        tok = g.to_dict().get('token')
        if not tok:
            continue
        try:
            messaging.send(messaging.Message(token=tok, data={
                'title': 'CowCatcher: Aufspringen erkannt',
                'body': f'{kamera} · {zeit[11:16]} Uhr. In hofbuech Tier zuordnen.',
                'url': link, 'tag': 'cowcatcher'},
                webpush=messaging.WebpushConfig(headers={'Urgency': 'high', 'TTL': '3600'})))
        except Exception as e:  # Gerät abgemeldet o.ä.
            print('Push-Fehler', g.id, e)
    return ref.id


if __name__ == '__main__':
    a = argparse.ArgumentParser()
    a.add_argument('--bild')
    a.add_argument('--kamera', default='Stall')
    a.add_argument('--score', type=float)
    x = a.parse_args()
    print('gemeldet:', melden(x.bild, x.kamera, x.score))
