// Pulsante "+" fluttuante in basso a destra: aprendolo, i 4 modi di aggiunta
// si impilano in verticale (speed-dial), ognuno con l'etichetta accanto —
// così le etichette non vengono mai coperte dagli altri bollini.
import { Plus, Pencil, Camera, ScanBarcode, Mic } from "lucide-react";

export default function AddFab({ menuOpen, setMenuOpen, onManual, onPhoto, onBarcode, onVoice }) {
  const options = [
    { id: "manual", icon: Pencil, label: "A mano", action: onManual },
    { id: "photo", icon: Camera, label: "Foto", action: onPhoto },
    { id: "barcode", icon: ScanBarcode, label: "Barcode", action: onBarcode },
    { id: "voice", icon: Mic, label: "Voce", action: onVoice },
  ];

  return (
    <>
      {/* Sfondo sempre montato: sfuma in entrata e in uscita (niente scatto). */}
      <button
        onClick={() => setMenuOpen(false)}
        aria-label="Chiudi"
        tabIndex={menuOpen ? 0 : -1}
        className={`fixed inset-0 z-30 bg-black/25 backdrop-blur-[2px] transition-opacity duration-300 ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        className="fixed z-40"
        style={{ right: "18px", bottom: "calc(80px + env(safe-area-inset-bottom))" }}
      >
        <div className="relative h-14 w-14">
          {options.map((o, i) => {
            const Icon = o.icon;
            // Distanza verticale dal "+": l'ultima opzione è la più vicina.
            const lift = 58 * (options.length - i) + 8;
            return (
              <div
                key={o.id}
                className="absolute bottom-1 right-1 flex items-center gap-2"
                style={{
                  transform: menuOpen ? `translateY(${-lift}px)` : "translateY(0) scale(0.4)",
                  transformOrigin: "100% 100%",
                  opacity: menuOpen ? 1 : 0,
                  pointerEvents: menuOpen ? "auto" : "none",
                  transition: menuOpen
                    ? "transform 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.28s ease"
                    : "transform 0.24s cubic-bezier(0.4,0,0.6,1), opacity 0.2s ease",
                  // stagger in apertura e in chiusura (ordine inverso, più rapido)
                  transitionDelay: menuOpen ? `${i * 40}ms` : `${(options.length - 1 - i) * 25}ms`,
                }}
              >
                {/* Bianco letterale: il token "white" del tema si scurisce in
                    dark mode e sparirebbe sulla chip nera. */}
                <span className="pointer-events-none whitespace-nowrap rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-[#fff]">
                  {o.label}
                </span>
                <button
                  onClick={() => { setMenuOpen(false); o.action(); }}
                  aria-label={o.label}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-paper text-tomato shadow-lg"
                >
                  <Icon className="h-[22px] w-[22px]" />
                </button>
              </div>
            );
          })}

          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Aggiungi"
            className="relative z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-tomato text-white shadow-xl shadow-tomato/30 transition active:scale-95"
          >
            <Plus className={`h-7 w-7 transition-transform duration-300 ${menuOpen ? "rotate-45" : ""}`} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </>
  );
}
