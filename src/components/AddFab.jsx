// Pulsante "+" centrale della navbar. Aprendolo, le 4 azioni si dispongono a
// SEMICERCHIO sopra il pulsante, ciascuna con icona ed etichetta leggibile.
// L'overlay che chiude al tocco esterno è renderizzato dalla pagina (Dispensa)
// perché un `fixed` dentro un contenitore con transform non coprirebbe lo schermo.
import { Plus, Pencil, Camera, ScanBarcode, Mic } from "lucide-react";

// Posizioni lungo un arco superiore (x orizzontale, y negativo = in alto).
// Le due interne sono più centrate (∓33px), le esterne più larghe: ventaglio
// simmetrico, sopra il pulsante, senza finire sotto le tab della navbar.
const R = 106;
const ANGLES = [146, 108, 72, 34]; // gradi, da sinistra a destra
const pos = (deg) => ({
  x: Math.round(R * Math.cos((deg * Math.PI) / 180)),
  y: Math.round(-R * Math.sin((deg * Math.PI) / 180)),
});

export default function AddFab({ menuOpen, setMenuOpen, onManual, onPhoto, onBarcode, onVoice }) {
  const options = [
    { id: "manual", icon: Pencil, label: "A mano", action: onManual },
    { id: "photo", icon: Camera, label: "Foto", action: onPhoto },
    { id: "barcode", icon: ScanBarcode, label: "Barcode", action: onBarcode },
    { id: "voice", icon: Mic, label: "Voce", action: onVoice },
  ];

  return (
    <div className="relative z-40">
      {options.map((o, i) => {
        const Icon = o.icon;
        const { x, y } = pos(ANGLES[i]);
        return (
          <div
            key={o.id}
            className="absolute left-1/2 top-1/2 flex flex-col items-center gap-1"
            style={{
              transform: menuOpen
                ? `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1)`
                : "translate(-50%, -50%) scale(0.3)",
              opacity: menuOpen ? 1 : 0,
              pointerEvents: menuOpen ? "auto" : "none",
              transition: menuOpen
                ? "transform 0.34s cubic-bezier(0.22,1,0.36,1), opacity 0.26s ease"
                : "transform 0.22s cubic-bezier(0.4,0,0.6,1), opacity 0.18s ease",
              transitionDelay: menuOpen ? `${i * 40}ms` : `${(options.length - 1 - i) * 25}ms`,
            }}
          >
            <button
              onClick={() => { setMenuOpen(false); o.action(); }}
              aria-label={o.label}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-tomato text-[#fff] shadow-lg shadow-tomato/30 active:scale-95"
            >
              <Icon className="h-[21px] w-[21px]" />
            </button>
            <span className="whitespace-nowrap rounded-full bg-black/80 px-2 py-0.5 text-[11px] font-bold text-[#fff] shadow">
              {o.label}
            </span>
          </div>
        );
      })}

      <button
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={menuOpen ? "Chiudi" : "Aggiungi"}
        className="relative z-40 flex h-[58px] w-[58px] items-center justify-center rounded-full border-4 border-cream bg-tomato text-[#fff] shadow-xl shadow-tomato/40 transition active:scale-95"
      >
        <Plus className={`h-7 w-7 transition-transform duration-300 ${menuOpen ? "rotate-45" : ""}`} strokeWidth={2.5} />
      </button>
    </div>
  );
}
