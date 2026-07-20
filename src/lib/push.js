// Notifiche push lato client (FASE 1): opt-in dal Profilo.
//
// Design (vedi HANDOFF "Prossimo obiettivo"):
//  - Il permesso si chiede SOLO da un gesto utente (toggle nel Profilo), mai
//    all'avvio. Su iOS le push funzionano solo con PWA installata (iOS 16.4+),
//    dove `PushManager` diventa disponibile.
//  - La subscription (endpoint + chiavi) viene salvata su Supabase via il data
//    layer (db.js). L'invio vero è del cron server-side (server/push.js).
//  - La chiave VAPID pubblica arriva da VITE_VAPID_PUBLIC_KEY (client-safe).

import { PushNotifications } from "@capacitor/push-notifications";
import { savePushSubscription, deletePushSubscription, saveApnsToken, deleteApnsToken } from "./db.js";
import { isNative } from "./native.js";

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY;
// Il token APNs di questo dispositivo: serve a sapere se le push sono attive e
// a cancellare la riga giusta al momento dell'opt-out.
const APNS_KEY = "dispensa-apns-token";

// Push utilizzabili su questo dispositivo? Nell'app nativa sempre (ci pensa
// APNs); sul web servono service worker e PushManager — su iOS Safari NON
// installato PushManager manca, quindi torna false (c'è un suggerimento a parte).
export function pushSupported() {
  if (typeof window === "undefined") return false;
  if (isNative()) return true;
  return "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

// iPhone/iPad in Safari ma NON installato come PWA: è il caso in cui le push
// non sono ancora disponibili e va suggerito "Aggiungi alla Home".
export function isIosNotInstalled() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS moderno
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches
    || window.navigator.standalone === true;
  return iOS && !standalone && !pushSupported();
}

// La spec VAPID vuole la chiave come Uint8Array (base64url → bytes).
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// --- Sponda NATIVA (iOS, APNs) ---------------------------------------------

function storedApnsToken() {
  try { return localStorage.getItem(APNS_KEY) || null; } catch { return null; }
}

// `register()` non restituisce il token: arriva in modo asincrono sull'evento
// "registration". Lo impacchettiamo in una Promise, con timeout perché senza
// rete o senza permesso l'evento potrebbe non arrivare mai.
async function enableNative() {
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") {
    const e = new Error("Permesso notifiche negato.");
    e.code = "denied";
    throw e;
  }
  const token = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Registrazione APNs non completata.")), 15000);
    let ok, ko;
    PushNotifications.addListener("registration", (t) => {
      clearTimeout(timer); ok?.remove(); ko?.remove(); resolve(t.value);
    }).then((h) => { ok = h; });
    PushNotifications.addListener("registrationError", (e) => {
      clearTimeout(timer); ok?.remove(); ko?.remove();
      reject(new Error(e?.error || "Registrazione APNs fallita."));
    }).then((h) => { ko = h; });
    PushNotifications.register();
  });
  await saveApnsToken(token);
  try { localStorage.setItem(APNS_KEY, token); } catch { /* stato ricavabile comunque */ }
  return true;
}

async function disableNative() {
  const token = storedApnsToken();
  try { await PushNotifications.unregister(); } catch { /* togliamo comunque la riga */ }
  if (token) await deleteApnsToken(token);
  try { localStorage.removeItem(APNS_KEY); } catch { /* */ }
}

// Al tocco della notifica: apre la scheda giusta (stesso deep-link del web,
// es. /?view=piano). L'app è già in esecuzione, quindi navighiamo davvero.
export function installNativePushTapHandler() {
  if (!isNative()) return;
  PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
    const url = notification?.data?.url;
    if (url) window.location.assign(url);
  });
}

// --- Stato ------------------------------------------------------------------

// Stato per QUESTO dispositivo: attivo = esiste una subscription registrata.
export async function getPushState() {
  if (!pushSupported()) return { supported: false, enabled: false, permission: "default" };
  if (isNative()) {
    const perm = await PushNotifications.checkPermissions();
    return {
      supported: true,
      enabled: perm.receive === "granted" && !!storedApnsToken(),
      permission: perm.receive,
    };
  }
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return { supported: true, enabled: !!sub, permission: Notification.permission };
}

// Attiva: chiede il permesso (gesto utente), si iscrive e salva la subscription.
// Lancia un errore con code "denied" se l'utente nega il permesso.
export async function enablePush() {
  if (!pushSupported()) throw new Error("Notifiche non supportate su questo dispositivo.");
  if (isNative()) return enableNative();
  if (!VAPID_PUBLIC) throw new Error("Chiave VAPID pubblica mancante.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    const e = new Error("Permesso notifiche negato.");
    e.code = "denied";
    throw e;
  }

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    });
  }

  const json = sub.toJSON();
  await savePushSubscription({
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
  });
  return true;
}

// Disattiva: annulla l'iscrizione del browser e rimuove la riga dal DB.
export async function disablePush() {
  if (!pushSupported()) return;
  if (isNative()) return disableNative();
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const { endpoint } = sub;
  try { await sub.unsubscribe(); } catch { /* comunque togliamo la riga */ }
  await deletePushSubscription(endpoint);
}
