"""
Fressgitter Kamera 3 (wird vom hofbuech-Waechter alle 5 Minuten aufgerufen)

- Holt ein Standbild per RTSP (URL automatisch aus der CowCatcher-config.json, Kamera cam3)
- Gitterstatus je Gitter (Kuehe links, Kaelber rechts): Vergleich der Hebel-Ausschnitte mit Referenzbildern
  (fressgitter_ref\\<gitter>_<zu|offen>_<zeit>.png, erstellt mit FRESSGITTER_REF_ZU.bat / _OFFEN.bat)
- Anzahl fressende Tiere je Gitter: YOLO (COCO, ONNX auf CPU), gezaehlt wird nur, wer mit dem Kopf
  durchs Gitter in den Futtertisch reicht (Box unten tiefer als die Gitterlinie)
- Schreibt hoefe/<hof>/sensoren/fressgitter (Status, Anzahl, kleines Bild) und meldet per Push,
  wenn ein Gitter laenger als alarm_h zu ist (danach alle alarm_wdh_min wieder)

Koordinaten sind relativ (0..1) zum Kamerabild, damit unabhaengig von der Aufloesung.
Aufruf zum Testen:  venv\\Scripts\\python.exe waechter.py --fressgitter-test
"""
import base64, datetime, glob, io, json, os, re, subprocess, tempfile, time

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HIER = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HIER, 'fressgitter_ref')
TRAIN = os.path.join(HIER, 'fressgitter_training')
STAND = os.path.join(HIER, 'fressgitter_stand.json')

STD = {
    'aktiv': True,
    'kamera': 'cam3',
    'rtsp': '',                  # leer = automatisch aus CowCatcher config.json
    'intervall_s': 300,
    'alarm_h': 2.0,              # Push, wenn Gitter so lange zu
    'alarm_wdh_min': 30,         # danach wiederholen
    'modell': os.path.join(HIER, 'modelle', 'yolo11s.onnx'),
    # eigenes Kopf-Modell (auf Bannhalde-Bildern trainiert): zaehlt Koepfe durchs Gitter, hat Vorrang
    'kopfmodell': os.path.join(HIER, 'modelle', 'fg_kopf.onnx'),
    'kopf_conf': 0.25,
    'zaehlen': False,                                     # Tiere zaehlen aus (zu ungenau), nur Gitterstatus
    'kopf_band': [0.4167, 0.868],                         # y-Bereich Gitter + Futtertisch
    'kopf_kacheln': [[0.0, 0.5156], [0.4844, 1.0]],       # x-Bereiche, je halbe Aufloesung
    'kopf_skala': 0.5,
    'trennung': 0.707,                                    # x Mittelpfosten: links 8 Plaetze Kuehe, rechts 4 Kaelber
    'conf': 0.25,
    'bild_px': 640, 'bild_q': 60,
    'training': False,           # True = stuendlich ein Bild zum Beurteilen; sonst nur auf Anfrage aus Hofpuls (fgauftrag/aktuell)
    'training_px': 1280, 'training_q': 70,
    'kacheln': [[0.0, 0.30, 0.56, 1.0], [0.44, 0.30, 1.0, 1.0]],  # Futtertisch links/rechts in hoher Aufloesung
    'gitter': {
        # hebel: Ausschnitt um den roten Hebel; zone: Futtertisch vor dem Gitter (x1,y1,x2,y2);
        # linie: y der Gitterunterkante, Tier zaehlt, wenn seine Box unten tiefer reicht
        'kuehe':   {'name': 'Kühe',   'hebel': [0.656, 0.408, 0.720, 0.668], 'zone': [0.08, 0.0, 0.707, 1.0], 'linie': 0.645},
        'kaelber': {'name': 'Kälber', 'hebel': [0.945, 0.453, 1.000, 0.566], 'zone': [0.707, 0.0, 1.00, 1.0], 'linie': 0.645},
    },
}
TIERKLASSEN = set(range(14, 24))  # COCO: bird..giraffe (Kaelber von oben landen teils bei dog/sheep/horse)


def cfg(CFG):
    c = json.loads(json.dumps(STD))
    eig = dict(CFG.get('fressgitter') or {})
    try:  # fressgitter.json wirkt sofort (ohne Neustart), z.B. {"alarm": false}
        eig.update(json.load(open(os.path.join(HIER, 'fressgitter.json'), encoding='utf-8')))
    except FileNotFoundError:
        pass
    except Exception:
        pass
    for k, v in eig.items():
        if k == 'gitter':
            for g, w in v.items():
                c['gitter'].setdefault(g, {}).update(w)
        else:
            c[k] = v
    return c


# ---------- Bild holen ----------
def rtsp_url(c, basis):
    if c['rtsp']:
        return c['rtsp']
    funde = []

    def walk(o, pfad):
        if isinstance(o, dict):
            for k, v in o.items():
                walk(v, pfad + [str(k)])
        elif isinstance(o, list):
            for i, v in enumerate(o):
                walk(v, pfad + [str(i)])
        elif isinstance(o, str) and o.lower().startswith('rtsp://'):
            funde.append((pfad, o))

    for f in ('config.json', os.path.join('aidetector', 'config.json')):
        p = os.path.join(basis, f)
        if os.path.exists(p):
            try:
                walk(json.load(open(p, encoding='utf-8')), [])
            except Exception:
                pass
    if not funde:
        raise RuntimeError('keine RTSP-URL in config.json gefunden, bitte "fressgitter": {"rtsp": "..."} in waechter.json')
    # Kamera cam3: Pfad oder Nachbarschluessel enthaelt "cam3" bzw. "3"
    kam = c['kamera']
    for pfad, u in funde:
        if any(kam in p.lower() for p in pfad):
            return u
    nr = re.sub(r'\D', '', kam)
    if nr and len(funde) >= int(nr):
        return funde[int(nr) - 1][1]
    raise RuntimeError(f'RTSP-URL fuer {kam} nicht eindeutig, bitte in waechter.json setzen')


def maskiert(u):
    return re.sub(r'//[^@/]*@', '//***@', u)


def standbild(url):
    import imageio_ffmpeg
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    fd, out = tempfile.mkstemp(suffix='.jpg'); os.close(fd)
    try:
        subprocess.run([ff, '-y', '-loglevel', 'error', '-rtsp_transport', 'tcp', '-i', url,
                        '-frames:v', '1', '-q:v', '2', out], check=True, timeout=40,
                       creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        im = Image.open(out); im.load()
        return im.convert('RGB')
    finally:
        try: os.remove(out)
        except OSError: pass


def px(box, im):
    W, H = im.size
    return (int(box[0] * W), int(box[1] * H), int(box[2] * W), int(box[3] * H))


# ---------- Gitterstatus ----------
def kanten(im):
    """Graustufen-Kantenbild (robust gegen Tag/Nacht-IR und Helligkeit)"""
    g = np.asarray(im.convert('L').filter(ImageFilter.GaussianBlur(1.5)), dtype=np.float32)
    gx = np.zeros_like(g); gy = np.zeros_like(g)
    gx[:, 1:-1] = g[:, 2:] - g[:, :-2]
    gy[1:-1, :] = g[2:, :] - g[:-2, :]
    return np.hypot(gx, gy)


def ncc(a, b):
    a = a - a.mean(); b = b - b.mean()
    n = np.sqrt((a * a).sum() * (b * b).sum())
    return float((a * b).sum() / n) if n > 0 else 0.0


def vergleich(akt, ref, schub=12):
    """beste Uebereinstimmung bei kleiner Verschiebung (Kamera wackelt/zoomt minimal)"""
    h, w = ref.shape
    best = -1.0
    for dy in range(-schub, schub + 1, 3):
        for dx in range(-schub, schub + 1, 3):
            y0, x0 = schub + dy, schub + dx
            t = akt[y0:y0 + h, x0:x0 + w]
            if t.shape == ref.shape:
                best = max(best, ncc(t, ref))
    return best


def hebel_ausschnitt(im, box, rand=0):
    x1, y1, x2, y2 = px(box, im)
    return im.crop((x1 - rand, y1 - rand, x2 + rand, y2 + rand))


def farbig(crop):
    """Tagbild (Farbe) oder Nacht (Infrarot, Graustufen)"""
    a = np.asarray(crop.convert('RGB'), dtype=np.int16)
    return float(np.abs(a[..., 0] - a[..., 1]).mean() + np.abs(a[..., 2] - a[..., 1]).mean()) > 4


def rot_merkmal(crop):
    """Lage des roten Hebelgriffs im Ausschnitt: (x, y, Winkel) relativ, oder None wenn kein Rot sichtbar"""
    a = np.asarray(crop.convert('RGB'), dtype=np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = (r > 60) & (r - g > 22) & (r - b > 0) & (b >= g - 5)  # roter/pinker Griff, braunes Fell (b < g) nicht
    if m.sum() < 15:
        return None
    ys, xs = np.nonzero(m)
    h, w = m.shape
    ang = 0.0
    if len(xs) > 3:
        cov = np.cov(np.vstack([xs, ys]).astype(float))
        ev, vec = np.linalg.eigh(cov)
        vx, vy = vec[:, 1]
        ang = float(np.degrees(np.arctan2(vx, vy)))  # 0 = senkrecht
        ang = (ang + 90) % 180 - 90
    return (xs.mean() / w, ys.mean() / h, ang)


def hell_merkmal(crop):
    """Nacht: Lage des Reflexaufklebers (hellster Fleck im Infrarotbild) relativ, oder None"""
    g = np.asarray(crop.convert('L'), dtype=np.float32)
    thr = max(200.0, float(np.percentile(g, 99.7)))
    m = (g >= thr) & (g > float(np.median(g)) + 80)
    if m.sum() < 4:
        return None
    ys, xs = np.nonzero(m)
    # nur den Fleck um das hellste Pixel (andere helle Stellen ignorieren)
    i = int(np.argmax(g[ys, xs])); cy, cx = ys[i], xs[i]
    k = (np.abs(ys - cy) < 15) & (np.abs(xs - cx) < 15)
    h, w = g.shape
    return (float(xs[k].mean()) / w, float(ys[k].mean()) / h, 0.0)


def merkmal_abstand(a, b):
    da = abs(a[2] - b[2]); da = min(da, 180 - da)
    return float(np.hypot(np.hypot(a[0] - b[0], a[1] - b[1]), da / 90))


def gitter_status(im, gid, g):
    """True = zu, False = offen, None = unsicher. Tag: Lage/Winkel des roten Griffs, Nacht: Kantenvergleich.
    Verglichen wird nur mit Referenzen derselben Art (Tag mit Tag, Nacht mit Nacht)."""
    crop = hebel_ausschnitt(im, g['hebel'])
    tag = farbig(crop)
    if not tag and not g.get('nacht', True):
        return None, {'nacht': 'aus'}
    refs = {'zu': [], 'offen': []}
    for f in glob.glob(os.path.join(REF, f'{gid}_*.png')):
        z = os.path.basename(f).split('_')[1]
        if z in refs:
            ri = Image.open(f).convert('RGB')
            if farbig(ri) == tag:
                refs[z].append(ri)
    if not refs['zu'] or not refs['offen']:
        return None, {'fehlt': 'Referenz ' + ('Tag' if tag else 'Nacht')}
    if tag:
        m = rot_merkmal(crop)
        if m is None:
            return None, {'rot': 0.0}  # Griff verdeckt
        d = {}
        for z, rs in refs.items():
            mm = [rot_merkmal(r) for r in rs]
            mm = [x for x in mm if x]
            d[z] = min(merkmal_abstand(m, x) for x in mm) if mm else 9.0
        if min(d.values()) > 0.35 or abs(d['zu'] - d['offen']) < 0.05:
            return None, {'abst_' + k: v for k, v in d.items()}
        return d['zu'] < d['offen'], {'abst_' + k: v for k, v in d.items()}
    if not g.get('nacht', True):
        return None, {'nacht': 'aus'}
    # Nacht mit Reflexaufkleber: Lage des hellen Flecks
    m = hell_merkmal(crop)
    rm = {z: [x for x in (hell_merkmal(r) for r in rs) if x] for z, rs in refs.items()}
    if rm['zu'] and rm['offen']:
        if m is None:
            return None, {'reflex': 'nicht sichtbar'}
        d = {z: min(merkmal_abstand(m, x) for x in xs) for z, xs in rm.items()}
        if min(d.values()) > 0.30 or abs(d['zu'] - d['offen']) < 0.05:
            return None, {'nabst_' + k: v for k, v in d.items()}
        return d['zu'] < d['offen'], {'nabst_' + k: v for k, v in d.items()}
    akt = kanten(hebel_ausschnitt(im, g['hebel'], 12))
    s = {z: max(vergleich(akt, kanten(r)) for r in rs) for z, rs in refs.items()}
    if max(s.values()) < 0.35 or abs(s['zu'] - s['offen']) < 0.06:
        return None, s  # unsicher (Tier verdeckt Hebel o.ae.) -> letzter Status bleibt
    return s['zu'] > s['offen'], s


def referenz_speichern(im, zustand, c):
    os.makedirs(REF, exist_ok=True)
    ts = datetime.datetime.now().strftime('%Y%m%d-%H%M') + ('-tag' if farbig(im.crop((0, 0, 400, 400))) else '-nacht')
    out = []
    for gid, g in c['gitter'].items():
        p = os.path.join(REF, f'{gid}_{zustand}_{ts}.png')
        crop = hebel_ausschnitt(im, g['hebel'])
        if farbig(crop) and rot_merkmal(crop) is None:
            out.append(f'{gid}: WARNUNG roter Griff nicht sichtbar (verdeckt?), Referenz trotzdem gespeichert: {p}')
        crop.save(p)
        out.append(p)
    return out


# ---------- Tiere zaehlen ----------
_sess = None


def _infer(im, c):
    """eine YOLO-Auswertung, liefert Boxen in Pixeln von im + Konfidenz"""
    global _sess
    import onnxruntime as ort
    if _sess is None:
        _sess = ort.InferenceSession(c['modell'], providers=['CPUExecutionProvider'])
    inp = _sess.get_inputs()[0]
    S = inp.shape[2] if isinstance(inp.shape[2], int) else 1280
    W, H = im.size
    r = S / max(W, H)
    nw, nh = int(W * r), int(H * r)
    can = Image.new('RGB', (S, S), (114, 114, 114))
    can.paste(im.resize((nw, nh), Image.BILINEAR), ((S - nw) // 2, (S - nh) // 2))
    x = np.asarray(can, dtype=np.float32).transpose(2, 0, 1)[None] / 255.0
    out = _sess.run(None, {inp.name: x})[0][0].T  # (N, 4+80)
    sc = out[:, 4:]
    kl = sc.argmax(1); cf = sc.max(1)
    keep = (cf >= c['conf']) & np.isin(kl, list(TIERKLASSEN))
    b = out[keep, :4]; cf = cf[keep]
    ox, oy = (S - nw) / 2, (S - nh) / 2
    xy = np.stack([(b[:, 0] - b[:, 2] / 2 - ox) / r, (b[:, 1] - b[:, 3] / 2 - oy) / r,
                   (b[:, 0] + b[:, 2] / 2 - ox) / r, (b[:, 1] + b[:, 3] / 2 - oy) / r], 1) if len(b) else np.zeros((0, 4))
    return xy, cf


def yolo(im, c):
    """Ganzes Bild + 2 Kacheln vom Futtertisch in voller Aufloesung (Koepfe/Kaelber sonst zu klein)"""
    W, H = im.size
    alle, alle_cf = [], []
    for k in [None] + c.get('kacheln', []):
        if k is None:
            xy, cf = _infer(im, c)
        else:
            x0, y0, x1, y1 = px(k, im)
            xy, cf = _infer(im.crop((x0, y0, x1, y1)), c)
            xy = xy + [x0, y0, x0, y0]
            # Boxen am Kachelrand abgeschnitten -> verwerfen (ganzes Bild liefert sie)
            rand = 6
            ok = ((xy[:, 0] > x0 + rand) | (x0 == 0)) & ((xy[:, 2] < x1 - rand) | (x1 >= W)) & ((xy[:, 1] > y0 + rand) | (y0 == 0))
            xy, cf = xy[ok], cf[ok]
        alle.append(xy); alle_cf.append(cf)
    xy = np.concatenate(alle); cf = np.concatenate(alle_cf)
    if not len(xy):
        return []
    # NMS klassenuebergreifend (ein Tier = eine Box)
    idx = cf.argsort()[::-1]; fertig = []
    while len(idx):
        i = idx[0]; fertig.append(i)
        a = xy[i]; rest = xy[idx[1:]]
        ix = np.clip(np.minimum(a[2], rest[:, 2]) - np.maximum(a[0], rest[:, 0]), 0, None)
        iy = np.clip(np.minimum(a[3], rest[:, 3]) - np.maximum(a[1], rest[:, 1]), 0, None)
        inter = ix * iy
        fa = (a[2] - a[0]) * (a[3] - a[1]); fr = (rest[:, 2] - rest[:, 0]) * (rest[:, 3] - rest[:, 1])
        u = fa + fr - inter
        # gleiche Box (IoU) oder fast ganz in der staerkeren enthalten
        idx = idx[1:][(inter / np.maximum(u, 1) < 0.45) & (inter / np.maximum(fr, 1) < 0.8)]
    # Sammelboxen weg: Box, die ein anderes Tier fast ganz enthaelt (2 Tiere als eines erkannt)
    fl = lambda a: (a[2] - a[0]) * (a[3] - a[1])
    weg = set()
    for i in fertig:
        for j in fertig:
            if i != j and fl(xy[j]) < fl(xy[i]):
                a, b = xy[i], xy[j]
                ix = max(0, min(a[2], b[2]) - max(a[0], b[0])); iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
                if ix * iy > 0.8 * fl(b):
                    weg.add(i)
    return [(xy[i] / [W, H, W, H], float(cf[i])) for i in fertig if i not in weg]


_ksess = None


def koepfe(im, c):
    """Eigenes Modell: Boxen der Koepfe, die durchs Gitter reichen (rel. Koordinaten, Konfidenz)"""
    global _ksess
    import onnxruntime as ort
    if _ksess is None:
        _ksess = ort.InferenceSession(c['kopfmodell'], providers=['CPUExecutionProvider'])
    inp = _ksess.get_inputs()[0]
    S = inp.shape[2] if isinstance(inp.shape[2], int) else 640
    W, H = im.size
    y0, y1 = int(c['kopf_band'][0] * H), int(c['kopf_band'][1] * H)
    alle, cfs = [], []
    for kx0, kx1 in c['kopf_kacheln']:
        x0, x1 = int(kx0 * W), int(kx1 * W)
        t = im.crop((x0, y0, x1, y1))
        t = t.resize((max(1, int(t.width * c['kopf_skala'])), max(1, int(t.height * c['kopf_skala']))), Image.BILINEAR)
        r = S / max(t.size)
        nw, nh = int(t.width * r), int(t.height * r)
        can = Image.new('RGB', (S, S), (114, 114, 114))
        ox, oy = (S - nw) // 2, (S - nh) // 2
        can.paste(t.resize((nw, nh), Image.BILINEAR), (ox, oy))
        x = np.asarray(can, dtype=np.float32).transpose(2, 0, 1)[None] / 255.0
        out = _ksess.run(None, {inp.name: x})[0][0].T  # (N, 5)
        cf = out[:, 4]; k = cf >= c['kopf_conf']
        b = out[k, :4]; cf = cf[k]
        f = 1 / (r * c['kopf_skala'])
        xy = np.stack([(b[:, 0] - b[:, 2] / 2 - ox) * f + x0, (b[:, 1] - b[:, 3] / 2 - oy) * f + y0,
                       (b[:, 0] + b[:, 2] / 2 - ox) * f + x0, (b[:, 1] + b[:, 3] / 2 - oy) * f + y0], 1) if len(b) else np.zeros((0, 4))
        alle.append(xy); cfs.append(cf)
    xy = np.concatenate(alle); cf = np.concatenate(cfs)
    idx = cf.argsort()[::-1]; fertig = []
    while len(idx):
        i = idx[0]; fertig.append(i)
        a = xy[i]; rest = xy[idx[1:]]
        ix = np.clip(np.minimum(a[2], rest[:, 2]) - np.maximum(a[0], rest[:, 0]), 0, None)
        iy = np.clip(np.minimum(a[3], rest[:, 3]) - np.maximum(a[1], rest[:, 1]), 0, None)
        inter = ix * iy
        fr = (rest[:, 2] - rest[:, 0]) * (rest[:, 3] - rest[:, 1])
        u = (a[2] - a[0]) * (a[3] - a[1]) + fr - inter
        idx = idx[1:][(inter / np.maximum(u, 1) < 0.4) & (inter / np.maximum(fr, 1) < 0.7)]
    return [(xy[i] / [W, H, W, H], float(cf[i])) for i in fertig]


def koepfe_zaehlen(boxen, c):
    n = {'kuehe': 0, 'kaelber': 0}; zu = {}
    for b, cf in boxen:
        gid = 'kuehe' if (b[0] + b[2]) / 2 < c['trennung'] else 'kaelber'
        n[gid] += 1; zu[tuple(b)] = gid
    return n, zu


def zaehlen(boxen, c):
    """Tier zaehlt, wenn es mit dem Kopf durchs Gitter reicht (Box unten tiefer als die Gitterlinie).
    Nur-Kopf-Boxen im Futter (ganz unter der Linie) zaehlen nicht doppelt, wenn darueber schon ein Tier zaehlt."""
    n = {gid: 0 for gid in c['gitter']}
    zu = {}
    kand = []
    for b, cf in boxen:
        cx = (b[0] + b[2]) / 2
        for gid, g in c['gitter'].items():
            z = g['zone']
            if z[0] <= cx < z[2] and b[3] > g['linie']:
                kand.append((b, gid, b[1] > g['linie']))
                break
    for b, gid, nur_kopf in sorted(kand, key=lambda k: k[2]):  # Koerper zuerst
        if nur_kopf and any(min(b[2], a[2]) - max(b[0], a[0]) > 0.3 * (b[2] - b[0]) for a in zu):
            continue
        n[gid] += 1; zu[tuple(b)] = gid
    return n, zu


# ---------- Stand + Alarm ----------
def stand_laden():
    try:
        return json.load(open(STAND, encoding='utf-8'))
    except Exception:
        return {}


def stand_speichern(s):
    tmp = STAND + '.tmp'
    json.dump(s, open(tmp, 'w', encoding='utf-8'))
    os.replace(tmp, STAND)


def dauer_txt(sek):
    m = int(sek // 60)
    return f'{m // 60} h {m % 60:02d} min' if m >= 60 else f'{m} min'


def bild_data_url(im, c, boxen=None, zuord=None, px_=None, q=None):
    im = im.copy()
    im.thumbnail((px_ or c['bild_px'], px_ or c['bild_px']))
    b = io.BytesIO()
    im.save(b, 'JPEG', quality=q or c['bild_q'], optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()


def debug_bild(im, c, boxen, zuord, pfad):
    d = im.copy(); dr = ImageDraw.Draw(d); W, H = d.size
    for gid, g in c['gitter'].items():
        dr.rectangle(px(g['hebel'], d), outline=(255, 0, 0), width=4)
        z = px(g['zone'], d)
        dr.rectangle(z, outline=(0, 160, 255), width=3)
        dr.line((z[0], g['linie'] * H, z[2], g['linie'] * H), fill=(255, 255, 0), width=3)
    for b, cf in boxen:
        col = (0, 220, 0) if tuple(b) in zuord else (160, 160, 160)
        dr.rectangle((b[0] * W, b[1] * H, b[2] * W, b[3] * H), outline=col, width=3)
        dr.text((b[0] * W + 4, b[1] * H + 4), f'{cf:.2f}', fill=col)
    d.save(pfad, quality=85)


def lauf(CFG, basis, log, sitzung, fs_url, fs_wert, push, test=False, training_id=None):
    c = cfg(CFG)
    url = rtsp_url(c, basis)
    im = standbild(url)
    jetzt = time.time()
    st = stand_laden()
    boxen, kopf = [], False
    if c.get('zaehlen') and os.path.exists(c['kopfmodell']):
        try:
            boxen = koepfe(im, c); kopf = True
        except Exception as e:
            log.warning('Fressgitter: Kopfmodell fehlgeschlagen: %s', e)
    if c.get('zaehlen') and not kopf and os.path.exists(c['modell']):
        try:
            boxen = yolo(im, c)
        except Exception as e:
            log.warning('Fressgitter: Zaehlung fehlgeschlagen: %s', e)
    anz, zuord = koepfe_zaehlen(boxen, c) if kopf else zaehlen(boxen, c)
    felder = {'typ': 'fressgitter', 'name': 'Fressgitter', 'kamera': CFG['kameras'].get(c['kamera'], c['kamera']),
              'zeit': datetime.datetime.now().isoformat(timespec='seconds'), 'aktualisiert': int(jetzt * 1000),
              'quelle': 'cowcatcher', 'alarm_h': float(c['alarm_h']), 'alarm': bool(c.get('alarm', True))}
    info = []
    for gid, g in c['gitter'].items():
        zu, s = gitter_status(im, gid, g)
        alt = st.get(gid, {})
        if zu is None:
            zu = alt.get('zu')  # unsicher/nicht kalibriert: letzter Stand
        if zu != alt.get('zu') or 'seit' not in alt:
            alt = {'zu': zu, 'seit': jetzt}
        if zu and c.get('alarm', True) and jetzt - alt['seit'] >= c['alarm_h'] * 3600 and \
                jetzt - alt.get('alarm', 0) >= c['alarm_wdh_min'] * 60 - 30 and not test:
            dt = dauer_txt(jetzt - alt['seit'])
            try:
                n = push(f'Fressgitter {g["name"]} seit {dt} zu', 'Gitter öffnen oder in Hofpuls prüfen.',
                         './#/start', 'fressgitter-' + gid)
                alt['alarm'] = jetzt
                log.info('Fressgitter %s seit %s zu: Push an %d Geraet(e)', gid, dt, n)
            except Exception as e:
                log.warning('Fressgitter-Push fehlgeschlagen: %s', e)
        st[gid] = alt
        felder[f'{gid}_zu'] = zu
        felder[f'{gid}_seit'] = int(alt['seit'] * 1000)
        felder[f'{gid}_anzahl'] = anz[gid]
        info.append(f'{gid}: {"zu" if zu else "offen" if zu is False else "?"} '
                    f'({", ".join(f"{k} {v:.2f}" if isinstance(v, float) else f"{k} {v}" for k, v in s.items()) or "keine Referenz"}), {anz[gid]} Tier(e)')
    felder['bild'] = bild_data_url(im, c)
    if test:
        p = os.path.join(HIER, 'fressgitter_test.jpg')
        im.save(os.path.join(HIER, 'fressgitter_test_roh.jpg'), quality=92)
        debug_bild(im, c, boxen, zuord, p)
        log.info('FRESSGITTER-TEST %s | %s | Bild: %s', maskiert(url), ' | '.join(info), p)
        return felder
    stand_speichern(st)
    if CFG.get('dryrun'):
        log.info('DRYRUN Fressgitter %s', ' | '.join(info)); return felder
    s = sitzung()
    r = s.patch(fs_url('sensoren/fressgitter'), json={'fields': {k: fs_wert(v) for k, v in felder.items()}}, timeout=30)
    r.raise_for_status()
    log.info('Fressgitter %s', ' | '.join(info))
    if training_id:  # auf Anfrage aus Hofpuls
        training_speichern(im, felder, boxen, c, s, fs_url, fs_wert, training_id)
        log.info('Fressgitter-Bild auf Anfrage %s gespeichert', training_id)
    elif c.get('training'):
        h = datetime.datetime.now().strftime('%Y%m%d-%H')
        if st.get('training_h') != h:
            try:
                training_speichern(im, felder, boxen, c, s, fs_url, fs_wert, 'fg_' + h)
                st['training_h'] = h
                stand_speichern(st)
                log.info('Fressgitter-Trainingsbild fg_%s gespeichert', h)
            except Exception as e:
                log.warning('Fressgitter-Trainingsbild: %s', e)
    return felder


def training_speichern(im, felder, boxen, c, s, fs_url, fs_wert, tid):
    """Bild zum Beurteilen: lokal in voller Aufloesung + Modellboxen, in Hofpuls fgbilder (Bild) + fgtraining (Daten)"""
    os.makedirs(TRAIN, exist_ok=True)
    im.save(os.path.join(TRAIN, tid + '.jpg'), quality=90)
    meta = {'id': tid, 'zeit': felder['zeit'], 'tag': farbig(im.crop((0, int(im.size[1] * 0.3), im.size[0], im.size[1]))),
            'modell_kuehe': felder['kuehe_anzahl'], 'modell_kaelber': felder['kaelber_anzahl'],
            'modell_kuehe_zu': felder['kuehe_zu'], 'modell_kaelber_zu': felder['kaelber_zu'], 'geprueft': False,
            'erstellt': int(time.time() * 1000)}
    json.dump({**meta, 'boxen': [[round(float(v), 4) for v in b] + [round(cf, 3)] for b, cf in boxen]},
              open(os.path.join(TRAIN, tid + '.json'), 'w', encoding='utf-8'))
    bf = {'bild': bild_data_url(im, c, px_=c['training_px'], q=c['training_q'])}
    for gid, g in c['gitter'].items():  # Hebel in voller Aufloesung mit etwas Umgebung, zum Beurteilen in der App
        hc = hebel_ausschnitt(im, g['hebel'], 60)
        hc = hc.resize((hc.width * 2, hc.height * 2), Image.LANCZOS) if hc.height < 300 else hc
        b = io.BytesIO(); hc.save(b, 'JPEG', quality=85)
        bf['hebel_' + gid] = 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
    r = s.patch(fs_url('fgbilder/' + tid), json={'fields': {k: fs_wert(v) for k, v in bf.items()}}, timeout=60)
    r.raise_for_status()
    r = s.patch(fs_url('fgtraining/' + tid), json={'fields': {k: fs_wert(v) for k, v in meta.items() if k != 'id'}}, timeout=30)
    r.raise_for_status()


def anfrage(CFG, basis, log, sitzung, fs_url, fs_wert, push):
    """Hofpuls-Button 'Bild aufnehmen': fgauftrag/aktuell mit status 'offen' -> Bild + Erkennung -> fgtraining"""
    s = sitzung()
    r = s.get(fs_url('fgauftrag/aktuell'), timeout=20)
    if r.status_code == 404:
        return
    r.raise_for_status()
    f = r.json().get('fields', {})
    if f.get('status', {}).get('stringValue') != 'offen':
        return
    tid = 'fg_' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
    try:
        lauf(CFG, basis, log, sitzung, fs_url, fs_wert, push, training_id=tid)
        neu = {'status': 'erledigt', 'id': tid}
    except Exception as e:
        log.warning('Fressgitter-Anfrage fehlgeschlagen: %s', e)
        neu = {'status': 'fehler', 'fehler': str(e)[:200]}
    neu['erledigt'] = int(time.time() * 1000)
    s.patch(fs_url('fgauftrag/aktuell'), json={'fields': {k: fs_wert(v) for k, v in {**{k: list(v.values())[0] for k, v in f.items() if k not in neu}, **neu}.items()}}, timeout=20).raise_for_status()
