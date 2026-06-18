import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { handleClaudeRequest } from "./server/claude.js";
import { handlePhotoRequest } from "./server/photo.js";

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
  };

  return {
    plugins: [
      react(),
      devApi("/api/claude", handleClaudeRequest, apiEnv),
      devApi("/api/photo", handlePhotoRequest, apiEnv),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon-32x32.png", "apple-touch-icon.png", "icon.svg"],
        manifest: {
          name: "Dispensa",
          short_name: "Dispensa",
          description: "Gestisci la dispensa e cucina con ciò che hai.",
          lang: "it",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          theme_color: "#ffffff",
          background_color: "#ffffff",
          icons: [
            { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
            { src: "/maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
          navigateFallback: "index.html",
          navigateFallbackDenylist: [/^\/api\//],
        },
      }),
    ],
    server: {
      port: 5173,
    },
  };
});
