/* Handler push del service worker (notifiche scadenze, FASE 1).
 *
 * Questo file NON è il service worker: viene *importato* dentro il SW generato
 * da Workbox tramite `workbox.importScripts` (vedi vite.config.js). Così
 * aggiungiamo push + notificationclick senza passare a un SW custom
 * (injectManifest), lasciando intatto il precaching PWA esistente.
 *
 * Il contenuto della notifica (titolo, testo, deep-link) arriva già pronto dal
 * server (server/push.js): qui ci limitiamo a mostrarlo e a gestire il tap.
 */

self.addEventListener("push", (event) => {
  let data;
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }

  const title = data.title || "Dispensa";
  const options = {
    body: data.body || "",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag: data.tag || "dispensa",
    // Se arriva un nuovo avviso con lo stesso tag, sostituisce il precedente
    // e ri-notifica (utile per lo stesso "slot" del giorno).
    renotify: true,
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // Se l'app è già aperta, la porto in primo piano (e provo a navigare al
    // deep-link, es. /?view=ricette). Altrimenti apro una nuova finestra.
    for (const client of clientList) {
      if ("focus" in client) {
        await client.focus();
        if ("navigate" in client && target) {
          try { await client.navigate(target); } catch { /* SPA già sul posto */ }
        }
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
