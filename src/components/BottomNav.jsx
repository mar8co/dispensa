// Navigazione principale in basso (stile editoriale): Dispensa · Spesa · (+) ·
// Ricette · Profilo. Il "+" centrale apre il menù di aggiunta.
import { Package, ShoppingCart, ChefHat, User, Plus } from "lucide-react";

function Tab({ id, view, setView, icon: Icon, label, badge }) {
  const active = view === id;
  return (
    <button
      onClick={() => setView(id)}
      className="relative flex flex-1 flex-col items-center gap-1 py-2.5"
    >
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

export default function BottomNav({ view, setView, onAdd, shoppingCount }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30">
      <div className="mx-auto flex max-w-md items-center border-t border-hair bg-cream/95 px-2 backdrop-blur"
           style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <Tab id="dispensa" view={view} setView={setView} icon={Package} label="Dispensa" />
        <Tab id="spesa" view={view} setView={setView} icon={ShoppingCart} label="Spesa" badge={shoppingCount} />

        <div className="flex w-16 shrink-0 justify-center">
          <button
            onClick={onAdd}
            aria-label="Aggiungi"
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-tomato text-white shadow-lg shadow-tomato/30 transition active:scale-95"
          >
            <Plus className="h-7 w-7" strokeWidth={2.4} />
          </button>
        </div>

        <Tab id="ricette" view={view} setView={setView} icon={ChefHat} label="Ricette" />
        <Tab id="profilo" view={view} setView={setView} icon={User} label="Profilo" />
      </div>
    </div>
  );
}
