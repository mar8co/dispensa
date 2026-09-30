// Ingresso della pagina di prova (anteprima.html, solo sviluppo).
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter-tight/wght.css";
import "../index.css";
import Anteprima from "./Anteprima.jsx";

createRoot(document.getElementById("root")).render(<Anteprima />);
