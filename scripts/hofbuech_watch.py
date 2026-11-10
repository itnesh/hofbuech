"""
hofbuech-Wächter für den CowCatcher-PC.
Überwacht C:\\CowCatcher\\detections. Legt CowCatcher dort ein neues Bild ab,
geht es als Meldung (mit Push) an hofbuech. CowCatcher und Telegram bleiben unverändert.

Start (Test im Vordergrund):   python C:\\CowCatcher\\hofbuech_watch.py
Beenden:                       Ctrl+C
Liegt im gleichen Ordner wie cowcatcher_hofbuech.py.
"""
import json, os, sys, time, traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cowcatcher_hofbuech import melden

ORDNER = os.environ.get('HOFBUECH_DETECTIONS', r'C:\CowCatcher\detections')
PAUSE = int(os.environ.get('HOFBUECH_PAUSE', '120'))  # Sekunden: Bilder derselben Erkennung nur 1x melden
BILD = ('.jpg', '.jpeg', '.png')
STAND = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hofbuech_watch_stand.json')


def log(*a):
    print(time.strftime('%Y-%m-%d %H:%M:%S'), *a, flush=True)


def bilder():
    for wurzel, _, dateien in os.walk(ORDNER):
        for d in dateien:
            if d.lower().endswith(BILD):
                p = os.path.join(wurzel, d)
                try:
                    yield p, os.path.getmtime(p)
                except OSError:
                    pass


def kamera_von(pfad):
    rel = os.path.relpath(os.path.dirname(pfad), ORDNER)
    return 'Stall' if rel in ('.', '') else rel.split(os.sep)[0]


def main():
    try:
        seit = json.load(open(STAND))['seit']
    except Exception:
        seit = time.time()  # beim allerersten Start: alte Bilder nicht melden
    letzte = 0
    log('hofbuech-Wächter läuft, Ordner:', ORDNER)
    while True:
        try:
            neu = sorted((m, p) for p, m in bilder() if m > seit and time.time() - m > 3)
            for m, p in neu:
                if m - letzte >= PAUSE:
                    log('melde', p, '->', melden(p, kamera=kamera_von(p)))
                    letzte = m
                else:
                    log('übersprungen (gleiche Erkennung)', p)
                seit = m
            if neu:
                json.dump({'seit': seit}, open(STAND, 'w'))
        except Exception:
            log('Fehler:', traceback.format_exc())
        time.sleep(5)


if __name__ == '__main__':
    main()
