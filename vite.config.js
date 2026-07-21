import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { handleClaudeRequest } from "./server/claude.js";
import { handlePhotoRequest } from "./server/photo.js";
import { handleDeleteAccount } from "./server/account.js";
import { handleReceipt, handleAppStoreNotification } from "./server/receipt.js";

// Middleware di sviluppo: in `npm run dev` espone gli endpoint /api/* usando lo
// stesso core delle serverless function Vercel, così sono testabili in locale.
function devApi(path, handler, apiEnv) {
  return {
    name: `dev-api${path.replace(/\//g, "-")}`,
    configureServer(server) {
      server.middlewares.use(path, (req, res, next) => {
        if (req.method !== "POST") return next();
        let raw = "";
        req.on("data", (c) => (raw += c));
        req.on("end", async () => {
          let out;
          try {
            const body = raw ? JSON.parse(raw) : {};
            out = await handler({ authHeader: req.headers.authorization, body, env: apiEnv });
          } catch (e) {
            out = { status: 500, json: { error: "Errore proxy locale.", detail: String(e) } };
          }
          res.statusCode = out.status;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(out.json));
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const e = loadEnv(mode, process.cwd(), "");
  const apiEnv = {
    SUPABASE_URL: e.SUPABASE_URL || e.VITE_SUPABASE_URL,
    SUPABASE_ANON_KEY: e.SUPABASE_ANON_KEY || e.VITE_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: e.SUPABASE_SERVICE_ROLE_KEY,
    AI_DAILY_LIMIT: e.AI_DAILY_LIMIT,
    GEMINI_API_KEY: e.GEMINI_API_KEY,
    GEMINI_MODEL: e.GEMINI_MODEL,
    PEXELS_API_KEY: e.PEXELS_API_KEY,
    APPSTORE_KEY_ID: e.APPSTORE_KEY_ID,
    APPSTORE_ISSUER_ID: e.APPSTORE_ISSUER_ID,
    APPSTORE_KEY_P8: e.APPSTORE_KEY_P8,
    APPSTORE_BUNDLE_ID: e.APPSTORE_BUNDLE_ID,
    APPSTORE_ENVIRONMENT: e.APPSTORE_ENVIRONMENT,
  };

  return {
    plugins: [
      react(),
      devApi("/api/claude", handleClaudeRequest, apiEnv),
      devApi("/api/photo", handlePhotoRequest, apiEnv),
      devApi("/api/account", handleDeleteAccount, apiEnv),
      devApi("/api/receipt", handleReceipt, apiEnv),
      devApi("/api/appstore-notify", handleAppStoreNotification, apiEnv),
      VitePWA({
        registerType: "autoUpdate",
        // La registrazione del SW NON è più iniettata in automatico: la fa
        // main.jsx solo sul web. Nel guscio nativo (Capacitor) gli asset sono
        // già dentro l'app e un SW che precacha rischierebbe di servire una
        // versione vecchia dopo un aggiornamento dallo store.
        injectRegister: null,
        includeAssets: ["favicon-32x32.png", "apple-touch-icon.png", "icon.svg"],
        manifest: {
          id: "/",
          name: "Dispensa",
          short_name: "Dispensa",
          description: "Gestisci la dispensa di casa e cucina con quello che hai: spesa, scadenze e ricette con l'AI.",
          lang: "it",
          dir: "ltr",
          categories: ["food", "lifestyle", "productivity"],
          start_url: "/",
          scope: "/",
          display: "standalone",
          display_override: ["standalone"],
          orientation: "portrait",
          theme_color: "#F4F1E9",
          background_color: "#F4F1E9",
          icons: [
            { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
            { src: "/maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
          // Le splash iOS (public/splash/*) NON vanno nel precache: le usa solo
          // il lancio da Home e Safari le gestisce all'installazione. Tenerle
          // fuori evita di gonfiare la cache e il churn del SW a ogni deploy.
          globIgnores: ["**/splash/**"],
          navigateFallback: "index.html",
          navigateFallbackDenylist: [/^\/api\//],
          // Inietta gli handler push/notificationclick nel SW generato, senza
          // passare a un service worker custom (injectManifest). Vedi
          // public/push-sw.js. NB: se un domani cambi push-sw.js, il SW si
          // aggiorna solo quando cambia anche sw.js (bump del precache).
          importScripts: ["push-sw.js"],
        },
      }),
    ],
    server: {
      port: 5173,
    },
  };
});
