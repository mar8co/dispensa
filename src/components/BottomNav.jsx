// Navigazione principale: barra con Dispensa · Spesa · [+] · Ricette · Profilo.
// Il "+" è un pulsante centrale rialzato (lo slot addSlot lo riceve).
import { Package, ShoppingCart, ChefHat, User } from "lucide-react";

function Tab({ active, onClick, icon: Icon, label, badge, tourId }) {
  return (
    <button onClick={onClick} data-tour={tourId} className="relative flex flex-1 flex-col items-center gap-0.5 py-1">
      <span className={`flex items-center justify-center rounded-full px-3 py-1 transition ${active ? "bg-tomato/10" : ""}`}>
        <Icon className={`h-[21px] w-[21px] ${active ? "text-tomato" : "text-stone-500"}`} strokeWidth={active ? 2.3 : 1.9} />
      </span>
      <span className={`text-[10px] font-semibold tracking-wide ${active ? "text-tomato" : "text-stone-500"}`}>
        {label}
      </span>
      {badge > 0 && (
        <span className="absolute right-3 top-0 min-w-[16px] rounded-full bg-tomato px-1 text-center text-[9px] font-bold leading-4 text-[#fff]">
          {badge}
        </span>
      )}
    </button>
  );
}

export default function BottomNav({ view, setView, onProfile, shoppingCount, expiredCount = 0, addSlot }) {
  return (
    <div
      data-navbar
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3"
      style={{ paddingBottom: "max(4px, calc(env(safe-area-inset-bottom) - 12px))" }}
    >
      <div className="relative w-full max-w-md">
        {/* Barra: 2 tab · spazio centrale · 2 tab. Il badge sulla Dispensa
            conta i prodotti GIÀ scaduti (richiamo a rientrare nell'app). */}
        <div className="flex items-stretch rounded-[26px] border border-hair bg-cream/80 px-1.5 py-1.5 shadow-[0_4px_22px_rgba(0,0,0,0.12)] backdrop-blur-md">
          <Tab active={view === "dispensa"} onClick={() => setView("dispensa")} icon={Package} label="Dispensa" badge={expiredCount} tourId="tab-dispensa" />
          <Tab active={view === "spesa"} onClick={() => setView("spesa")} icon={ShoppingCart} label="Spesa" badge={shoppingCount} tourId="tab-spesa" />
          <div className="w-14 shrink-0" aria-hidden="true" />
          <Tab active={view === "ricette"} onClick={() => setView("ricette")} icon={ChefHat} label="Ricette" tourId="tab-ricette" />
          <Tab active={false} onClick={onProfile} icon={User} label="Profilo" tourId="tab-profilo" />
        </div>

        {/* "+" centrale rialzato */}
        {addSlot && (
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[26px]">{addSlot}</div>
        )}
      </div>
    </div>
  );
}
