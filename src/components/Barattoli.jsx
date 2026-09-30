// Oggetto simbolo dell'app: cappello da chef davanti e sacchetto della spesa
// dietro (scelta dell'utente), come i due biglietti di Wishlist Viaggi e i due
// scontrini di Expense Track. Griglia 48, tratto 2.6 come nelle altre app.
// Dietro pieno (currentColor), davanti col colore `fill` della superficie.
// Stesso disegno di public/icon.svg. (Il nome del file resta storico.)
//
// Lo sbuffo del cappello è l'unione di tre lobi e del corpo: si disegnano una
// volta col tratto doppio (5.2) e poi di nuovo solo pieni, così resta il solo
// contorno esterno da 2.6 e spariscono le linee interne tra i lobi.
const Sbuffo = () => (
  <>
    <circle cx="12" cy="15.5" r="6" />
    <circle cx="19" cy="11" r="7.2" />
    <circle cx="26" cy="15.5" r="6" />
    <path d="M12 15H26V35H12Z" />
  </>
);

export default function Barattoli({ size = 48, fill = "#fff", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {/* dietro: sacchetto della spesa col manico e l'orlo in controluce */}
      <g transform="translate(16.5 -1.5) rotate(11 18 26)">
        <path d="M12.5 17V12.5Q12.5 6.5 18 6.5Q23.5 6.5 23.5 12.5V17" stroke="currentColor" strokeWidth="2.6" />
        <path d="M6.5 17H29.5L28 42.5Q27.9 44 26.4 44H9.6Q8.1 44 8 42.5Z" fill="currentColor" stroke="currentColor" strokeWidth="2.6" />
        <path d="M9 21.5H27" stroke={fill} strokeWidth="1.8" />
      </g>
      {/* davanti: cappello da chef (sbuffo, corpo alto con pieghe, fascia) */}
      <g transform="translate(0.5 3) rotate(-6 19 26)">
        <g fill={fill} stroke="currentColor" strokeWidth="5.2"><Sbuffo /></g>
        <g fill={fill}><Sbuffo /></g>
        <rect x="10.5" y="34" width="17" height="6.5" rx="2" fill={fill} stroke="currentColor" strokeWidth="2.6" />
        <path d="M15.5 34V21.5M22.5 34V21.5" stroke="currentColor" strokeWidth="2.2" />
      </g>
    </svg>
  );
}
