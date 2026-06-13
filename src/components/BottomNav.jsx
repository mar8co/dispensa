// Navigazione principale: barra flottante a pillola, staccata dal bordo,
// con indicatore (pillola pomodoro) sulla scheda attiva.
import { Package, ShoppingCart, ChefHat } from "lucide-react";

function Tab({ id, view, setView, icon: Icon, label, badge }) {
  const active = view === id;
  return (
    <button onClick={() => setView(id)} className="relative flex flex-1 flex-col items-center gap-0.5 py-1">
      <div className={`flex items-center justify-center rounded-full px-4 py-1 transition ${active ? "bg-tomato/10" : ""}`}>
        <Icon
          className={`h-[22px] w-[22px] ${active ? "text-tomato" : "text-stone-400"}`}
          strokeWidth={active ? 2.3 : 1.9}
        />
      </div>
      <span className={`text-[10px] font-semibold tracking-wide ${active ? "text-tomato" : "text-stone-400"}`}>
        {label}
      </span>
      {badge > 0 && (
        <span className="absolute right-4 top-0 min-w-[16px] rounded-full bg-tomato px-1 text-center text-[9px] font-bold leading-4 text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

export default function BottomNav({ view, setView, shoppingCount }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 px-3"
      style={{ paddingBottom: "calc(3px + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around rounded-[26px] border border-hair bg-cream/90 px-2 py-1.5 shadow-[0_4px_22px_rgba(0,0,0,0.12)] backdrop-blur">
        <Tab id="dispensa" view={view} setView={setView} icon={Package} label="Dispensa" />
        <Tab id="spesa" view={view} setView={setView} icon={ShoppingCart} label="Spesa" badge={shoppingCount} />
        <Tab id="ricette" view={view} setView={setView} icon={ChefHat} label="Ricette" />
      </div>
    </div>
  );
}
