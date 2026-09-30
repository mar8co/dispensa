// Pulsante "+" della Dispensa: un tondo a destra, appena sopra la barra in
// basso (fuori dalla barra, come richiesto il 30/09). Aprendolo, le 4 azioni
// salgono in COLONNA sopra il "+" (la più usata, "A mano", è la più vicina al
// pollice), con l'etichetta a sinistra di ogni tondo: col "+" sul bordo destro
// un ventaglio a quarto di cerchio faceva sovrapporre le etichette. Il velo che
// chiude al tocco esterno è renderizzato dalla pagina (Dispensa.jsx).
import { Plus, Pencil, Camera, ScanBarcode, Mic } from "lucide-react";
import { tourSignal } from "../lib/tour.js";

// Passo verticale tra un tondo e l'altro (tondo 48px + 12px d'aria).
const STEP = 60;

export default function AddFab({ menuOpen, setMenuOpen, onManual, onPhoto, onBarcode, onVoice }) {
  const options = [
    { id: "manual", icon: Pencil, label: "A mano", action: onManual },
    { id: "barcode", icon: ScanBarcode, label: "Barcode", action: onBarcode },
    { id: "photo", icon: Camera, label: "Foto", action: onPhoto },
    { id: "voice", icon: Mic, label: "Voce", action: onVoice },
  ];

  return (
    <div
      className="fixed right-4 z-40 h-14 w-14"
      style={{ bottom: "calc(var(--sopra-nav) + var(--banner-h))" }}
    >
      {options.map((o, i) => {
        const Icon = o.icon;
        return (
          <div
            key={o.id}
            className="absolute bottom-1 right-1 flex origin-right items-center gap-2"
            style={{
              transform: menuOpen
                ? `translateY(${-(i + 1) * STEP}px) scale(1)`
                : "translateY(0) scale(0.3)",
              opacity: menuOpen ? 1 : 0,
              pointerEvents: menuOpen ? "auto" : "none",
              transition: menuOpen
                ? "transform 0.34s cubic-bezier(0.22,1,0.36,1), opacity 0.26s ease"
                : "transform 0.22s cubic-bezier(0.4,0,0.6,1), opacity 0.18s ease",
              transitionDelay: menuOpen ? `${i * 40}ms` : `${(options.length - 1 - i) * 25}ms`,
            }}
          >
            <span className="whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[0.8rem] font-bold text-crema">
              {o.label}
            </span>
            <button
              data-tour={o.id === "manual" ? "add-manual-option" : undefined}
              onClick={() => {
                if (o.id === "manual") tourSignal("add-manual-chosen");
                setMenuOpen(false);
                o.action();
              }}
              aria-label={o.label}
              className="flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-ink bg-white text-ink shadow-card active:scale-95"
            >
              <Icon className="h-[21px] w-[21px]" />
            </button>
          </div>
        );
      })}

      <button
        data-tour="add-fab"
        onClick={() => setMenuOpen((v) => { const next = !v; if (next) tourSignal("add-menu-opened"); return next; })}
        aria-label={menuOpen ? "Chiudi" : "Aggiungi"}
        className="relative flex h-14 w-14 items-center justify-center rounded-full border-[2.5px] border-ink bg-arancio text-ink shadow-barra transition active:scale-95"
      >
        <Plus className={`h-7 w-7 transition-transform duration-300 ${menuOpen ? "rotate-45" : ""}`} />
      </button>
    </div>
  );
}
