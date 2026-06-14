// Navigazione principale: barra flottante a pillola, staccata dal bordo,
// con indicatore (pillola pomodoro) sulla scheda attiva.
import { Package, ShoppingCart, ChefHat } from "lucide-react";

function Tab({ id, view, setView, icon: Icon, label, badge }) {
  const active = view === id;
  return (
    <button onClick={() => setView(id)} className="relative flex flex-col items-center gap-0.5 px-2 py-1">
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

export default function BottomNav({ view, setView, shoppingCount, addSlot }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 px-4"
      style={{ paddingBottom: "max(4px, calc(env(safe-area-inset-bottom) - 12px))" }}
    >
      {/* La pillola resta CENTRATA; il "+" (solo in Dispensa) è staccato e
          ancorato a destra, sulla stessa riga. */}
      <div className="relative flex justify-center">
        <div className="flex w-fit items-center gap-1 rounded-[26px] border border-hair bg-cream/70 px-2 py-1.5 shadow-[0_4px_22px_rgba(0,0,0,0.12)] backdrop-blur-md">
          <Tab id="dispensa" view={view} setView={setView} icon={Package} label="Dispensa" />
          <Tab id="spesa" view={view} setView={setView} icon={ShoppingCart} label="Spesa" badge={shoppingCount} />
          <Tab id="ricette" view={view} setView={setView} icon={ChefHat} label="Ricette" />
        </div>
        {addSlot && (
          <div className="absolute right-0 top-1/2 -translate-y-[calc(50%+24px)]">{addSlot}</div>
        )}
      </div>
    </div>
  );
}
