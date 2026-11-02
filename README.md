# hofbuech

Hof-App für Hof Bannhalde: Tiere/TVD (Geburt, Brunst, Besamung, Abkalbung), Behandlungsjournal, Auslaufjournal, Bewirtschaftung mit Lager. PWA für iPhone und Browser. Kein Login, kein Build, kein Dev-Setup.

## Architektur
- Statische Dateien (HTML/CSS/JS), gehostet auf **GitHub Pages**
- Daten in **Firestore** unter `hoefe/{HOF-SCHLUESSEL}/...`, offline-fähig (Sync, sobald wieder Netz)
- Ohne Firebase-Konfiguration läuft die App **nur lokal** auf dem Gerät (zum Testen)
- PDF-Export im Browser (jsPDF, liegt in `vendor/`)

## Einrichtung (einmalig, ca. 15 Min.)

### 1. GitHub
1. Neues Repo `hofbuech` anlegen (public, für Gratis-Pages).
2. Alle Dateien hochladen (ohne Firestore-Regeln, siehe unten).
3. Repo > Settings > Pages > Source "Deploy from a branch" > Branch `main` / `(root)` > Save.
4. URL nach ca. 1 Min.: `https://itnesh.github.io/hofbuech/`

### 2. Firebase
1. https://console.firebase.google.com > Projekt hinzufügen > Name `hofbuech` (Analytics aus).
2. Build > Firestore Database > Datenbank erstellen > Standort `europe-west6 (Zürich)` > Produktionsmodus.
3. Projekteinstellungen (Zahnrad) > Meine Apps > `</>` > Name "hofbuech" > Registrieren.
   Die angezeigte `firebaseConfig` in `config.js` bei `window.HB_FIREBASE = {...}` eintragen und committen.
4. Hof-Schlüssel erzeugen: zufälliger Text, mind. 24 Zeichen, nur `A-Z a-z 0-9 - _`
   (z.B. PowerShell: `-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 28 | % {[char]$_})`).
5. Firestore > Regeln > folgendes einfügen, Schlüssel ersetzen, Veröffentlichen:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /hoefe/{hof}/{document=**} {
      allow read, write: if hof == 'HIER-DEIN-HOF-SCHLUESSEL';
    }
  }
}
```

Den Schlüssel **nie ins Repo** schreiben. Er existiert nur in den Firestore-Regeln und auf deinen Geräten.

### 3. Geräte verbinden
Pro Gerät einmal diesen Link öffnen:
`https://itnesh.github.io/hofbuech/#k=HIER-DEIN-HOF-SCHLUESSEL`

- iPhone: in Safari öffnen > Teilen > "Zum Home-Bildschirm"
- PC: im Browser öffnen, als Lesezeichen oder "App installieren" (Chrome/Edge)

Danach nie mehr eingeben. Weitere Geräte: Einstellungen > "Link für weiteres Gerät kopieren".

## Sicherheit (bewusst einfach)
Kein Login. Wer den Hof-Schlüssel kennt, kann lesen und schreiben. Link also nur an eigene Geräte senden.
Schlüssel kompromittiert: neuen Schlüssel in den Regeln setzen, Daten via Backup (Einstellungen) exportieren und mit neuem Schlüssel wieder einlesen.

## Backup
Einstellungen > "Backup herunterladen (JSON)". Empfehlung: 1x pro Monat.

## Fachliche Regeln (in Einstellungen anpassbar)
- Kalb: jünger als 12 Monate. Kuh: mind. 1 Abkalbung. Rind: Rest.
- Laktations-KPI nur weibliche Tiere ab 16 Monaten:
  Besamt = Besamung nach letzter Abkalbung. Abgekalbt = Abkalbung vor max. 60 Tagen. Sonst Unbesamt.
- Erwartete Abkalbung = Besamung + 285 Tage.
- Besamungsverbot = Zeitraum, in dem eine Besamung zur Abkalbung während der Alp führt (Alp von/bis minus Tragzeit, plus Puffer).
- Lager = Startbestand + Heuen/Silieren − Lagerbezug.
- Auslauf: ein Eintrag gilt ab Datum bis zum nächsten Eintrag für dieselben Tiere.

## Updates
Datei ändern, committen. Die App holt neue Versionen automatisch (Netzwerk zuerst, Cache als Offline-Fallback).
