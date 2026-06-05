import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { handleClaudeRequest } from "./server/claude.js";

// Middleware di sviluppo: in `npm run dev` espone POST /api/claude usando lo
// stesso core della serverless function Vercel, così l'AI è testabile in
// locale. In produzione ci pensa Vercel (cartella /api), non questo plugin.
function claudeDevApi(apiEnv) {
  return {
    name: "claude-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/claude", (req, res, next) => {
        if (req.method !== "POST") return next();
        let raw = "";
        req.on("data", (c) => (raw += c));
        req.on("end", async () => {
          let out;
          try {
            const body = raw ? JSON.parse(raw) : {};
            out = await handleClaudeRequest({
              authHeader: req.headers.authorization,
              body,
              env: apiEnv,
            });
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
  // Carica TUTTE le env var (anche quelle non VITE_) per il middleware server.
  const e = loadEnv(mode, process.cwd(), "");
  const apiEnv = {
    SUPABASE_URL: e.SUPABASE_URL || e.VITE_SUPABASE_URL,
    SUPABASE_ANON_KEY: e.SUPABASE_ANON_KEY || e.VITE_SUPABASE_ANON_KEY,
    GEMINI_API_KEY: e.GEMINI_API_KEY,
    GEMINI_MODEL: e.GEMINI_MODEL,
  };

  return {
    plugins: [
      react(),
      claudeDevApi(apiEnv),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon-32x32.png", "apple-touch-icon.png", "icon.svg"],
        manifest: {
          name: "La Mia Dispensa",
          short_name: "Dispensa",
          description: "Gestisci la dispensa e cucina con ciò che hai.",
          lang: "it",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          theme_color: "#f59e0b",
          background_color: "#fafaf9",
          icons: [
            { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
            { src: "/maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
          navigateFallback: "index.html",
          // Le richieste a /api/* NON vengono mai servite dalla cache né
          // reindirizzate a index.html: vanno sempre alla serverless function.
          navigateFallbackDenylist: [/^\/api\//],
        },
      }),
    ],
    server: {
      port: 5173,
    },
  };
});
