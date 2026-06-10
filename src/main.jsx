import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { applyTheme, getTheme } from "./lib/theme.js";

// Applica subito il tema scelto (auto/chiaro/scuro) prima del primo render.
applyTheme(getTheme());

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
