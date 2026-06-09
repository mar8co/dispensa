// Navigazione principale in basso (stile editoriale): Dispensa · Spesa · (+) ·
// Ricette · Cerca. Il "+" apre un menù radiale ad arco con i 4 modi di
// aggiunta; "Cerca" porta alla Dispensa mostrando/mettendo a fuoco la ricerca.
import { Package, ShoppingCart, ChefHat, Search, Plus, Pencil, Camera, ScanBarcode, Mic } from "lucide-react";

function Tab({ id, view, setView, icon: Icon, label, badge }) {
  const active = view === id;
  return (
    <button onClick={() => setView(id)} className="relative flex flex-1 flex-col items-center gap-1 py-2.5">
      <Icon className={active ? "h-[22px] w-[22px] text-ink" : "h-[22px] w-[22px] text-stone-400"} strokeWidth={active ? 2.3 : 1.9} />
      <span className={`text-[10px] font-semibold tracking-wide ${active ? "text-ink" : "text-stone-400"}`}>{label}</span>
      {badge > 0 && (
        <span className="absolute right-3 top-1.5 min-w-[16px] rounded-full bg-tomato px-1 text-center text-[9px] font-bold leading-4 text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

export default function BottomNav({
  view, setView, onSearch, shoppingCount,
  menuOpen, setMenuOpen, onManual, onPhoto, onBarcode, onVoice,
}) {
  // Posizioni ad arco (semicerchio) sopra il +. y negativo = verso l'alto.
  const options = [
    { id: "manual", icon: Pencil, label: "A mano", action: onManual, x: -78, y: -48 },
    { id: "photo", icon: Camera, label: "Foto", action: onPhoto, x: -28, y: -88 },
    { id: "barcode", icon: ScanBarcode, label: "Barcode", action: onBarcode, x: 28, y: -88 },
    { id: "voice", icon: Mic, label: "Voce", action: onVoice, x: 78, y: -48 },
  ];

  return (
    <>
      {/* Sfondo che chiude il menù */}
      {menuOpen && (
        <button
          onClick={() => setMenuOpen(false)}
          aria-label="Chiudi"
          className="fixed inset-0 z-30 bg-black/20"
        />
      )}

      <div className="fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto flex max-w-md items-center border-t border-hair bg-cream/95 px-2 backdrop-blur"
             style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <Tab id="dispensa" view={view} setView={setView} icon={Package} label="Dispensa" />
          <Tab id="spesa" view={view} setView={setView} icon={ShoppingCart} label="Spesa" badge={shoppingCount} />

          {/* Slot centrale con + e menù radiale */}
          <div className="relative flex w-16 shrink-0 justify-center">
            {options.map((o, i) => {
              const Icon = o.icon;
              return (
                <button
                  key={o.id}
                  onClick={() => { setMenuOpen(false); o.action(); }}
                  aria-label={o.label}
                  className="absolute left-1/2 bottom-2 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-paper text-tomato shadow-lg transition-all duration-200 ease-out"
                  style={{
                    transform: menuOpen
                      ? `translate(calc(-50% + ${o.x}px), ${o.y}px) scale(1)`
                      : "translate(-50%, 0) scale(0.3)",
                    opacity: menuOpen ? 1 : 0,
                    pointerEvents: menuOpen ? "auto" : "none",
                    transitionDelay: menuOpen ? `${i * 35}ms` : "0ms",
                  }}
                >
                  <Icon className="h-[22px] w-[22px]" />
                </button>
              );
            })}

            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Aggiungi"
              className="relative z-50 -mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-tomato text-white shadow-lg shadow-tomato/30 transition active:scale-95"
            >
              <Plus className={`h-7 w-7 transition-transform duration-200 ${menuOpen ? "rotate-45" : ""}`} strokeWidth={2.4} />
            </button>
          </div>

          <Tab id="ricette" view={view} setView={setView} icon={ChefHat} label="Ricette" />

          <button onClick={onSearch} className="flex flex-1 flex-col items-center gap-1 py-2.5">
            <Search className="h-[22px] w-[22px] text-stone-400" strokeWidth={1.9} />
            <span className="text-[10px] font-semibold tracking-wide text-stone-400">Cerca</span>
          </button>
        </div>
      </div>
    </>
  );
}
