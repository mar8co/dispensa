// Notifiche push lato client (FASE 1): opt-in dal Profilo.
//
// Design (vedi HANDOFF "Prossimo obiettivo"):
//  - Il permesso si chiede SOLO da un gesto utente (toggle nel Profilo), mai
//    all'avvio. Su iOS le push funzionano solo con PWA installata (iOS 16.4+),
//    dove `PushManager` diventa disponibile.
//  - La subscription (endpoint + chiavi) viene salvata su Supabase via il data
//    layer (db.js). L'invio vero è del cron server-side (server/push.js).
//  - La chiave VAPID pubblica arriva da VITE_VAPID_PUBLIC_KEY (client-safe).

import { savePushSubscription, deletePushSubscription } from "./db.js";

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Push utilizzabili su questo dispositivo? Su iOS Safari NON installato manca
// `PushManager`, quindi qui torna false (mostreremo un suggerimento a parte).
export function pushSupported() {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
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

// Stato per QUESTO dispositivo: attivo = esiste una subscription registrata.
export async function getPushState() {
  if (!pushSupported()) return { supported: false, enabled: false, permission: "default" };
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return { supported: true, enabled: !!sub, permission: Notification.permission };
}

// Attiva: chiede il permesso (gesto utente), si iscrive e salva la subscription.
// Lancia un errore con code "denied" se l'utente nega il permesso.
export async function enablePush() {
  if (!pushSupported()) throw new Error("Notifiche non supportate su questo dispositivo.");
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
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const { endpoint } = sub;
  try { await sub.unsubscribe(); } catch { /* comunque togliamo la riga */ }
  await deletePushSubscription(endpoint);
}
