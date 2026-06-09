// Pulsante "+" fluttuante in basso a destra: aprendolo, i 4 modi di aggiunta
// compaiono ad arco (quarto di cerchio) verso l'alto-sinistra.
import { Plus, Pencil, Camera, ScanBarcode, Mic } from "lucide-react";

export default function AddFab({ menuOpen, setMenuOpen, onManual, onPhoto, onBarcode, onVoice }) {
  // Posizioni ad arco (verso alto-sinistra). x<0 = sinistra, y<0 = alto.
  const options = [
    { id: "manual", icon: Pencil, label: "A mano", action: onManual, x: -6, y: -90 },
    { id: "photo", icon: Camera, label: "Foto", action: onPhoto, x: -48, y: -76 },
    { id: "barcode", icon: ScanBarcode, label: "Barcode", action: onBarcode, x: -76, y: -48 },
    { id: "voice", icon: Mic, label: "Voce", action: onVoice, x: -90, y: -6 },
  ];

  return (
    <>
      {menuOpen && (
        <button
          onClick={() => setMenuOpen(false)}
          aria-label="Chiudi"
          className="fixed inset-0 z-30 bg-black/20"
        />
      )}

      <div
        className="fixed z-40"
        style={{ right: "18px", bottom: "calc(80px + env(safe-area-inset-bottom))" }}
      >
        <div className="relative h-14 w-14">
          {options.map((o, i) => {
            const Icon = o.icon;
            return (
              <button
                key={o.id}
                onClick={() => { setMenuOpen(false); o.action(); }}
                aria-label={o.label}
                className="absolute bottom-1 right-1 flex h-12 w-12 items-center justify-center rounded-full bg-paper text-tomato shadow-lg transition-all duration-200 ease-out"
                style={{
                  transform: menuOpen
                    ? `translate(${o.x}px, ${o.y}px) scale(1)`
                    : "translate(0,0) scale(0.3)",
                  opacity: menuOpen ? 1 : 0,
                  pointerEvents: menuOpen ? "auto" : "none",
                  // stagger in apertura e in chiusura (ordine inverso)
                  transitionDelay: menuOpen ? `${i * 40}ms` : `${(options.length - 1 - i) * 40}ms`,
                }}
              >
                <Icon className="h-[22px] w-[22px]" />
              </button>
            );
          })}

          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Aggiungi"
            className="relative z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-tomato text-white shadow-xl shadow-tomato/30 transition active:scale-95"
          >
            <Plus className={`h-7 w-7 transition-transform duration-200 ${menuOpen ? "rotate-45" : ""}`} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </>
  );
}
