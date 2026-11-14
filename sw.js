// Netzwerk zuerst, Cache als Fallback (offline im Stall). Firebase-Daten cached Firestore selbst.
const C = 'hofbuech-v82';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'wq.js', 'config.js', 'manifest.json', 'icons/icon-192.png', 'icons/logo-hofpuls.png', 'vendor/jspdf.umd.min.js', 'vendor/jspdf.plugin.autotable.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const same = u.origin === location.origin, fbLib = u.hostname === 'www.gstatic.com' || u.hostname === 'fonts.gstatic.com' || u.hostname === 'fonts.googleapis.com';
  if (!same && !fbLib) return;
  // eigene Dateien immer beim Server nachfragen (kein veralteter Browser-Cache nach Updates)
  e.respondWith((same ? fetch(e.request.url, { cache: 'no-cache' }) : fetch(e.request)).then(r => { if (r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});

// Push (FCM Web Push, Daten-Nachricht vom täglichen GitHub-Job)
self.addEventListener('push', e => {
  let d = {}; try { d = e.data.json(); } catch (x) { d = { notification: { title: 'Hofpuls', body: e.data && e.data.text() } }; }
  const n = d.notification || {}, data = d.data || {};
  const title = n.title || data.title || 'Hofpuls', body = n.body || data.body || '';
  // alte CowCatcher-Skripte schicken nur '#/start': direkt die neuste offene Meldung öffnen
  if (data.tag === 'cowcatcher' && (!data.url || /#\/start$/.test(data.url))) data.url = './#/meldung/neu';
  e.waitUntil(self.registration.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: data.url || './#/kalender' }, tag: data.tag || 'hofbuech' }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data && e.notification.data.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { for (const c of cs) { if ('focus' in c) { c.postMessage({ nav: url }); return c.focus().catch(() => self.clients.openWindow(url)); } } return self.clients.openWindow(url); }));
});
