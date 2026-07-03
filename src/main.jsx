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

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
