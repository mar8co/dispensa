// Oggetto simbolo dell'app: sacchetto della spesa e cappello da chef (scelta
// dell'utente), come i due biglietti di Wishlist e i due scontrini di Expense
// Track. Dietro pieno (currentColor), davanti col colore `fill`. Stesso
// disegno di public/icon.svg. (Il nome del file resta storico.)
export default function Barattoli({ size = 48, fill = "#fff", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {/* dietro: sacchetto della spesa, pieno */}
      <g transform="translate(17 -1) rotate(9 14 26)" fill="currentColor" stroke="currentColor" strokeWidth="2.6">
        <path d="M8 19H28L30.5 41Q30.8 43 28.8 43H7.2Q5.2 43 5.5 41Z"/>
        <path d="M13 19V15Q13 10 18 10Q23 10 23 15V19" fill="none"/>
      </g>
      {/* davanti: cappello da chef */}
      <g transform="translate(1 3) rotate(-5 18 30)" stroke="currentColor">
        <path d="M10 31V25Q4 24 4.6 17.4Q5.4 11 12 11.8Q14 5.5 19 5.5Q24 5.5 26 11.8Q32.6 11 33.4 17.4Q34 24 28 25V31Z" fill={fill} strokeWidth="2.6"/>
        <rect x="10" y="31" width="18" height="7.5" rx="1.8" fill={fill} strokeWidth="2.6"/>
        <path d="M15 25V20.5M23 25V20.5" strokeWidth="2.2"/>
        <path d="M14 34.7h10" strokeWidth="1.7" strokeDasharray="1.6 2.4"/>
      </g>
    </svg>
  );
}
