// Navigazione principale: pillola nera flottante con Dispensa · Spesa · [+] ·
// Ricette · Profilo (solo parole, la scheda aperta "accesa" in crema). Il "+"
// è un pulsante centrale rialzato sopra la barra (lo slot addSlot lo riceve):
// lo spazio al centro resta riservato anche dove il "+" non c'è, così le
// schede non si spostano cambiando pagina.

function Tab({ active, onClick, label, badge, tourId }) {
  return (
    <button
      onClick={onClick}
      data-tour={tourId}
      aria-current={active ? "page" : undefined}
      className={`relative flex h-[46px] min-w-0 flex-1 items-center justify-center rounded-full px-1 text-[0.9rem] font-[650] tracking-[-0.01em] transition-colors duration-200 ${
        active ? "bg-crema text-ink" : "text-crema"
      }`}
    >
      {label}
      {badge > 0 && (
        <span className="absolute right-0.5 top-0.5 min-w-[17px] rounded-full bg-rosso-azione px-1 text-center text-[10.5px] font-extrabold leading-[17px] text-white">
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
        {/* Barra: 2 schede · spazio centrale · 2 schede. Il numero sulla
            Dispensa conta i prodotti GIÀ scaduti (richiamo a rientrare
            nell'app), quello sulla Spesa i prodotti ancora da prendere. */}
        <div className="flex items-center gap-1 rounded-full bg-ink p-[5px] shadow-barra">
          <Tab active={view === "dispensa"} onClick={() => setView("dispensa")} label="Dispensa" badge={expiredCount} tourId="tab-dispensa" />
          <Tab active={view === "spesa"} onClick={() => setView("spesa")} label="Spesa" badge={shoppingCount} tourId="tab-spesa" />
          <div className="w-16 shrink-0" aria-hidden="true" />
          <Tab active={view === "ricette"} onClick={() => setView("ricette")} label="Ricette" tourId="tab-ricette" />
          <Tab active={false} onClick={onProfile} label="Profilo" tourId="tab-profilo" />
        </div>

        {/* "+" centrale rialzato */}
        {addSlot && (
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[26px]">{addSlot}</div>
        )}
      </div>
    </div>
  );
}
