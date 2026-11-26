const CACHE = "linfa-v6";
const FILES = ["./", "index.html", "app.js", "tasks.js", "icons.js", "style.css", "manifest.webmanifest", "icon-180-v2.png", "icon-192-v2.png"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
// Prima la rete, la copia salvata solo se sei offline.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request)));
});
self.addEventListener("push", e => {
  let m = {};
  try { m = e.data.json(); } catch (x) {}
  e.waitUntil(Promise.all([
    self.registration.showNotification(m.title || "Linfa", { body: m.body || "Dai un'occhiata alla pianta.", icon: "icon-192-v2.png", badge: "icon-192-v2.png", tag: "promemoria-giornaliero" }),
    // Segna che il collegamento funziona: l'app nasconde la configurazione.
    caches.open("linfa-state").then(c => c.put("push-ok", new Response("1")))
      .then(() => self.clients.matchAll({ type: "window" })).then(l => l.forEach(w => w.postMessage("push-ok")))
  ]));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then(l => l.length ? l[0].focus() : self.clients.openWindow("./")));
});
