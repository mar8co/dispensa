// Pulsante "+": un tondo BIANCO col bordo spesso (2,5px, come il "+" di
// Expense Track) e il "+" nero, su tutte le schede, sulla
// stessa riga della barra in basso, separato da lei (vive nello slot `addSlot`
// di BottomNav, alto quanto la barra). Aggiunge sempre ALLA DISPENSA. Aprendolo, le 4 azioni
// salgono in COLONNA sopra il "+" (la più usata, "A mano", è la più vicina al
// pollice), con l'etichetta a sinistra di ogni tondo: col "+" sul bordo destro
// un ventaglio a quarto di cerchio faceva sovrapporre le etichette. Il velo che
// chiude al tocco esterno è renderizzato dalla pagina (Dispensa.jsx).
import { Plus, Pencil, Camera, ScanBarcode, Mic } from "lucide-react";

// Passo verticale tra un tondo e l'altro (tondo 48px + 12px d'aria).
const STEP = 60;

export default function AddFab({ menuOpen, setMenuOpen, onManual, onPhoto, onBarcode, onVoice, online = true }) {
  // Barcode, foto e voce hanno bisogno della rete (ricerca del prodotto, AI,
  // dettatura): offline si spengono qui, invece di fallire dopo il tocco.
  const options = [
    // Dal basso verso l'alto (la prima è la più vicina al pollice): scelta
    // dell'utente del 09/10.
    { id: "manual", icon: Pencil, label: "A mano", action: onManual },
    { id: "voice", icon: Mic, label: "Voce", action: onVoice, needsNet: true },
    { id: "barcode", icon: ScanBarcode, label: "Barcode", action: onBarcode, needsNet: true },
    { id: "photo", icon: Camera, label: "Foto", action: onPhoto, needsNet: true },
  ];

  return (
    <div className="absolute inset-0">
      {options.map((o, i) => {
        const Icon = o.icon;
        const off = o.needsNet && !online;
        return (
          <div
            key={o.id}
            className="absolute bottom-0.5 right-0.5 flex origin-right items-center gap-2"
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
              {off ? `${o.label} · offline` : o.label}
            </span>
            <button
              onClick={() => {
                setMenuOpen(false);
                o.action();
              }}
              aria-label={o.label}
              disabled={off}
              className="flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-ink bg-white text-ink shadow-card active:scale-95 disabled:opacity-50"
            >
              <Icon className="h-[21px] w-[21px]" />
            </button>
          </div>
        );
      })}

      <button
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={menuOpen ? "Chiudi" : "Aggiungi"}
        className="relative flex h-full w-full items-center justify-center rounded-full border-[2.5px] border-ink bg-white text-ink shadow-barra transition active:scale-95"
      >
        <Plus strokeWidth={3} className={`h-[26px] w-[26px] transition-transform duration-300 ${menuOpen ? "rotate-45" : ""}`} />
      </button>
    </div>
  );
}
