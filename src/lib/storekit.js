// Ponte JS verso il plugin nativo StoreKit 2 (ios/App/App/StoreKitPlugin.swift).
// Esiste SOLO nell'app iOS nativa: sul web le funzioni non vengono chiamate
// (il paywall resta visibile per provare la UI, ma l'acquisto dice chiaramente
// che si fa dall'app). La VERIFICA della ricevuta è server-side: qui non si
// decide nulla sul Premium, si passa solo la transazione firmata al backend.
import { registerPlugin } from "@capacitor/core";
import { supabase } from "./supabase.js";
import { apiUrl } from "./api.js";
import { isNative } from "./native.js";

// Il nome "StoreKit" deve combaciare con `jsName` nel plugin Swift.
const StoreKit = registerPlugin("StoreKit");

// StoreKit 2 esiste solo nel guscio nativo iOS (iOS 15+).
export function storeKitAvailable() {
  return isNative() && window.Capacitor?.getPlatform?.() === "ios";
}

// Prezzi/nomi localizzati dallo Store (fallback: le costanti di premium.js).
export async function getProducts(ids) {
  const { products } = await StoreKit.getProducts({ ids });
  return products || [];
}

// Avvia l'acquisto. `appAccountToken` (l'uid Supabase) lega la ricevuta
// all'utente in modo verificabile dal server. Ritorna { status, jws,
// transactionId, originalTransactionId, productId }.
export async function purchaseProduct(id, appAccountToken) {
  return StoreKit.purchase({ id, appAccountToken });
}

// Ripristina gli abbonamenti attivi (nuovo dispositivo/reinstallazione):
// restituisce le transazioni correnti da risincronizzare col server.
export async function restorePurchases() {
  const { entitlements } = await StoreKit.restore();
  return entitlements || [];
}

// Ascolta le transazioni in arrivo mentre l'app è aperta (rinnovi, Ask-to-Buy).
// Ritorna una Promise<PluginListenerHandle> (chiamare .remove() per staccarsi).
export function onTransactionUpdate(cb) {
  return StoreKit.addListener("transactionUpdated", cb);
}

// Manda la transazione firmata al nostro endpoint, che la verifica con Apple
// (App Store Server API) e scrive l'entitlement col service role. È il vero
// giudice: il client non decide nulla sul Premium.
export async function syncReceipt(payload) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const res = await fetch(apiUrl("/api/receipt"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const info = await res.json().catch(() => null);
    const err = new Error(info?.error || `Verifica ricevuta fallita (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json().catch(() => ({}));
}
