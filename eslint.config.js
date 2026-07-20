import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  // dist, progetto nativo e file legacy non vengono analizzati.
  // `ios` contiene la copia della build web fatta da `cap sync` (minificata):
  // non è codice sorgente nostro.
  { ignores: ["dist", "dev-dist", "node_modules", "dispensa-ui.jsx", "ios", "android"] },

  js.configs.recommended,

  // App client (browser)
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      // Le due regole che contano (rules-of-hooks coglie errori veri;
      // exhaustive-deps avrebbe colto il bug stale-closure della scadenza).
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "no-unused-vars": ["warn", { varsIgnorePattern: "^[A-Z_]", argsIgnorePattern: "^_" }],
    },
  },

  // Codice Node (config, proxy, serverless, script di build)
  {
    files: ["vite.config.js", "server/**/*.js", "api/**/*.js", "scripts/**/*.{js,mjs}", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },

  // Service worker: handler push importati nel SW generato da Workbox.
  {
    files: ["public/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: { ...globals.serviceworker, ...globals.browser },
    },
  },

  // Test (Vitest, ambiente node)
  {
    files: ["**/*.test.{js,jsx}"],
    languageOptions: { globals: { ...globals.node } },
  },
];
