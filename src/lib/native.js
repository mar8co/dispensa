// Ponte fra l'app web e il guscio nativo (Capacitor, fase 3).
//
// Il problema che risolve: sul web il login torna su `window.location.origin`
// e supabase-js legge i token dall'URL da solo (`detectSessionInUrl`). Dentro
// l'app nativa l'origine è `capacitor://localhost` — un indirizzo che Supabase
// non può richiamare — e il ritorno dal browser di sistema NON è una
// navigazione della pagina, ma un evento `appUrlOpen`. Servono quindi due cose:
// un redirect con schema custom (`dispensa://auth`) e qualcuno che raccolga
// quell'URL e apra la sessione a mano.
import { App } from "@capacitor/app";
import { supabase } from "./supabase.js";

// Schema registrato in ios/App/App/Info.plist (CFBundleURLTypes).
const NATIVE_SCHEME = "dispensa";
export const NATIVE_AUTH_REDIRECT = `${NATIVE_SCHEME}://auth`;

export function isNative() {
  return !!window.Capacitor?.isNativePlatform?.();
}

// Dove deve tornare il login: sul web l'origine di sempre, nel nativo lo
// schema custom. NB: `dispensa://auth` va aggiunto ai Redirect URL consentiti
// nel dashboard Supabase (Authentication → URL Configuration).
export function authRedirectUrl() {
  return isNative() ? NATIVE_AUTH_REDIRECT : window.location.origin;
}

// Apre la sessione a partire dall'URL di ritorno. Gestisce entrambi i formati:
// implicit flow (token nel frammento, quello in uso oggi) e PKCE (`?code=`),
// così un domani cambiare `flowType` non rompe il nativo.
async function completeAuthFromUrl(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch { return false; }

  const hash = new URLSearchParams((url.hash || "").replace(/^#/, ""));
  const access_token = hash.get("access_token");
  const refresh_token = hash.get("refresh_token");
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) console.error("Sessione non aperta dal deep link:", error.message);
    return !error;
  }

  const code = url.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error("Scambio del codice fallito:", error.message);
    return !error;
  }

  const errDesc = hash.get("error_description") || url.searchParams.get("error_description");
  if (errDesc) console.error("Login annullato o fallito:", errDesc);
  return false;
}

// Da chiamare una volta all'avvio (main.jsx). Sul web non fa nulla.
export function installNativeAuthBridge() {
  if (!isNative()) return;
  App.addListener("appUrlOpen", ({ url }) => {
    if (url?.startsWith(`${NATIVE_SCHEME}://`)) completeAuthFromUrl(url);
  });
}
