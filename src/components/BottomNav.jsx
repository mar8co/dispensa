// Navigazione principale, come quella di Wishlist Viaggi: una pillola nera
// centrata con le sole parole Dispensa · Spesa · Ricette (la scheda aperta
// "accesa" in crema). Il Profilo è l'avatar in alto a sinistra (Dispensa.jsx),
// il "+" un tondo a destra sopra la barra (AddFab.jsx). Pallino rosso, senza
// numero, sulla Dispensa se ci sono prodotti scaduti e sulla Spesa se c'è
// qualcosa da prendere.

function Tab({ active, onClick, label, dot, dotLabel, tourId }) {
  return (
    <button
      onClick={onClick}
      data-tour={tourId}
      aria-current={active ? "page" : undefined}
      className={`relative whitespace-nowrap rounded-full px-[1.05rem] py-[0.7rem] text-[0.92rem] font-[650] leading-[1.35] tracking-[-0.01em] transition-colors duration-[180ms] ${
        active ? "bg-crema text-ink" : "text-crema"
      }`}
    >
      {label}
      {dot && <span className="absolute right-2 top-[7px] h-2 w-2 rounded-full bg-rosso" aria-label={dotLabel} />}
    </button>
  );
}

export default function BottomNav({ view, setView, shoppingCount = 0, expiredCount = 0 }) {
  return (
    <div
      data-navbar
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3"
      style={{ paddingBottom: "var(--nav-bottom)" }}
    >
      <nav
        aria-label="Navigazione principale"
        className="pointer-events-auto flex gap-1 rounded-full bg-ink p-[5px] shadow-barra"
      >
        <Tab active={view === "dispensa"} onClick={() => setView("dispensa")} label="Dispensa" dot={expiredCount > 0} dotLabel="Prodotti scaduti" tourId="tab-dispensa" />
        <Tab active={view === "spesa"} onClick={() => setView("spesa")} label="Spesa" dot={shoppingCount > 0} dotLabel="Prodotti da prendere" tourId="tab-spesa" />
        <Tab active={view === "ricette"} onClick={() => setView("ricette")} label="Ricette" tourId="tab-ricette" />
      </nav>
    </div>
  );
}
