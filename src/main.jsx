import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { applyTheme, getTheme } from "./lib/theme.js";
import { installViewportFix } from "./lib/viewportFix.js";

// Applica subito il tema scelto (auto/chiaro/scuro) prima del primo render.
applyTheme(getTheme());

// Niente ripristino automatico della posizione di scroll tra le aperture:
// ogni sezione riparte dall'alto (lo gestiamo noi).
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

// Ri-ancoraggio della navbar fixed al ritorno in primo piano (bug iOS PWA:
// navbar a metà schermo dopo chiudi/riapri l'app).
installViewportFix();

// Service worker SOLO sul web (PWA installabile e offline shell). Nel guscio
// nativo Capacitor gli asset sono già locali: un SW che precacha aggiungerebbe
// solo il rischio di servire una build vecchia dopo un update dallo store.
// `injectRegister: null` in vite.config lascia a noi questa scelta.
if (!window.Capacitor?.isNativePlatform?.()) {
  import("virtual:pwa-register")
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => { /* in dev il modulo virtuale può non esserci: irrilevante */ });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
