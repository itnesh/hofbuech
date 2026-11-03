// Firebase-Konfiguration (oeffentlich, kein Geheimnis). Zugriffsschutz ueber den Hof-Schluessel in den Firestore-Regeln.
window.HB_FIREBASE = {
  apiKey: "AIzaSyDmrHNhrMIYMkTXaaK2wa1jxMHN6CMq8lA",
  authDomain: "hofbuech-8a0a3.firebaseapp.com",
  projectId: "hofbuech-8a0a3",
  storageBucket: "hofbuech-8a0a3.firebasestorage.app",
  messagingSenderId: "413202535680",
  appId: "1:413202535680:web:4919bad6572b217ced4fe5"
};

// Hof-ID: Pfad der Daten in Firestore (hoefe/{HB_HOF}/...)
window.HB_HOF = 'bannhalde';

// Web-Push-Zertifikat (Firebase > Projekteinstellungen > Cloud Messaging > Web-Push-Zertifikate > Schlüsselpaar)
window.HB_VAPID = 'BL7WGUPjE_DH8mcrjZH31v7-2BbGKmZ4UvXeXEGontTyEDHUpFnFQFwu-S3yjiDu3Jkso_gZOflCI3EaS_eDErE';
