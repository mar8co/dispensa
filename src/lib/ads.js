// Pubblicità (AdMob) — solo nel guscio nativo, solo per il piano gratuito.
//
// Regole di prodotto (fase 3): SOLO banner, e SOLO su Dispensa e Spesa —
// mai in fotocamera, cucina, Ricette o Piano Alimentare. Il banner sparisce
// per i Premium. Sul web non esiste (la PWA resta pulita).
//
// Finché non c'è l'account AdMob si usano gli ID di TEST ufficiali di Google
// (`VITE_ADMOB_*` assenti = test). Con l'account basta popolare le env.
import { isNative } from "./native.js";

// ID di test ufficiali Google: mostrano annunci veri "di prova", senza
// rischiare il ban dell'account che si prende cliccando i propri annunci reali.
const TEST_BANNER = "ca-app-pub-3940256099942544/2934735716";

const BANNER_ID = import.meta.env.VITE_ADMOB_BANNER_IOS || TEST_BANNER;
// `1` quando gli ID sono quelli veri: disattiva la modalità test.
const IS_TEST = import.meta.env.VITE_ADMOB_PROD !== "1";

let mod = null;         // il plugin, caricato pigramente solo nel nativo
let initialized = false;
let shown = false;      // per non chiedere due volte lo stesso banner

async function plugin() {
  if (!isNative()) return null;
  if (!mod) mod = await import("@capacitor-community/admob");
  if (!initialized) {
    await mod.AdMob.initialize();
    // App Tracking Transparency: Apple obbliga a chiedere il permesso prima di
    // usare l'IDFA per la pubblicità personalizzata. Se l'utente rifiuta gli
    // annunci restano (non personalizzati): nessun blocco, solo meno resa.
    // Chiesto qui, alla prima comparsa di un banner — un momento naturale —
    // e non all'avvio a freddo.
    try {
      const { status } = await mod.AdMob.trackingAuthorizationStatus();
      if (status === "notDetermined") await mod.AdMob.requestTrackingAuthorization();
    } catch { /* device senza ATT o permesso già gestito */ }
    initialized = true;
  }
  return mod;
}

// Mostra il banner in fondo (sopra la navbar). Idempotente: chiamarla più
// volte non impila banner.
export async function showBanner() {
  const m = await plugin();
  if (!m || shown) return;
  try {
    await m.AdMob.showBanner({
      adId: BANNER_ID,
      adSize: m.BannerAdSize.ADAPTIVE_BANNER,
      position: m.BannerAdPosition.BOTTOM_CENTER,
      // Margine per non finire sotto la navbar fissa dell'app.
      margin: 56,
      isTesting: IS_TEST,
    });
    shown = true;
  } catch (e) {
    console.warn("Banner non mostrato:", e?.message || e);
  }
}

// Toglie il banner dallo schermo (es. quando si passa a una scheda senza ads,
// o quando l'utente diventa Premium).
export async function hideBanner() {
  if (!shown || !mod) return;
  try { await mod.AdMob.removeBanner(); } catch { /* già via */ }
  shown = false;
}
