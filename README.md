# hofbuech

Hof-App für Hof Bannhalde: Tiere/TVD (Geburt, Brunst, Besamung, Abkalbung), Behandlungsjournal, Auslaufjournal, Bewirtschaftung mit Lager. PWA für iPhone und Browser. Google-Login, kein Build, kein Dev-Setup.

## Architektur
- Statische Dateien (HTML/CSS/JS), gehostet auf **GitHub Pages**
- Daten in **Firestore** unter `hoefe/bannhalde/...`, offline-fähig, Zugriff per Google-Konto
- Ohne Firebase-Konfiguration läuft die App **nur lokal** auf dem Gerät (zum Testen)
- PDF-Export im Browser (jsPDF, liegt in `vendor/`)

## Einrichtung (einmalig, ca. 15 Min.)

### 1. GitHub
1. Neues Repo `hofbuech` anlegen (public, für Gratis-Pages).
2. Alle Dateien hochladen (ohne Firestore-Regeln, siehe unten).
3. Repo > Settings > Pages > Source "Deploy from a branch" > Branch `main` / `(root)` > Save.
4. URL nach ca. 1 Min.: `https://itnesh.github.io/hofbuech/`

### 2. Firebase
1. Projekt `hofbuech` anlegen, Firestore in `europe-west6 (Zürich)` erstellen.
2. Web-App registrieren, `firebaseConfig` in `config.js` eintragen.
3. Authentication > Sign-in method > **Google** aktivieren.
4. Authentication > Einstellungen > **Autorisierte Domains** > `itnesh.github.io` hinzufügen.
5. Firestore > Regeln (E-Mail-Adressen anpassen) > Veröffentlichen:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /hoefe/{hof}/{document=**} {
      allow read, write: if request.auth != null
        && request.auth.token.email_verified == true
        && request.auth.token.email in ['erdinmatthias@gmail.com', 'sandra.huerbin@gmail.com'];
    }
  }
}
```
Weitere Personen (z.B. Familie): E-Mail in der Liste ergänzen.

### 3. Geräte
`https://itnesh.github.io/hofbuech/` öffnen > "Mit Google anmelden". Einmal pro Gerät, danach bleibt man angemeldet.
iPhone: Safari > Teilen > "Zum Home-Bildschirm".

## Sicherheit
Zugriff nur für die Google-Konten, die in den Firestore-Regeln stehen. Die Firebase-Config im Code ist öffentlich, das ist bei Web-Apps normal.

## Backup
Einstellungen > "Backup herunterladen (JSON)". Empfehlung: 1x pro Monat.

## Fachliche Regeln (in Einstellungen anpassbar)
- Kalb: jünger als 12 Monate. Kuh: mind. 1 Abkalbung. Rind: Rest.
- Laktations-KPI nur weibliche Tiere ab 16 Monaten:
  Besamt = Besamung nach letzter Abkalbung. Abgekalbt = Abkalbung vor max. 60 Tagen. Sonst Unbesamt.
- Erwartete Abkalbung = Besamung + 285 Tage.
- Besamungsverbot = Zeitraum, in dem eine Besamung zur Abkalbung während der Alp führt (Alp von/bis minus Tragzeit, plus Puffer).
- Lager = Startbestand + Heuen/Silieren − Lagerbezug.
- Auslauf: ein Eintrag gilt ab Datum bis zum nächsten Eintrag (alle Tiere). Mit "Bis" überschreibt er die Einträge in diesem Zeitraum. Gleiche Folgeeinträge werden automatisch zusammengefasst.

## Updates
Datei ändern, committen. Die App holt neue Versionen automatisch (Netzwerk zuerst, Cache als Offline-Fallback).
