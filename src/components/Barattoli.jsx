// Oggetto simbolo dell'app: due barattoli (come i due biglietti di Wishlist
// Viaggi e i due scontrini di Expense Track). Quello dietro è pieno col colore
// del testo (currentColor), quello davanti ha il colore `fill` (di solito
// quello della superficie) con coperchio ed etichetta. Stesso disegno di
// public/icon.svg.
export default function Barattoli({ size = 48, fill = "#fff", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <g transform="translate(15.5 0.5) rotate(12 17 26)">
        <rect x="8.5" y="9" width="17" height="6.5" rx="1.8" fill="currentColor" stroke="currentColor" strokeWidth="2.6" />
        <path d="M11 15.5H23V16.8Q23 18.2 26 19.4Q30.5 21.2 30.5 25.5V37.5Q30.5 41.5 26.5 41.5H7.5Q3.5 41.5 3.5 37.5V25.5Q3.5 21.2 8 19.4Q11 18.2 11 16.8Z" fill="currentColor" stroke="currentColor" strokeWidth="2.6" />
        {/* stacco del coperchio e riflesso del vetro, nel colore della superficie */}
        <path d="M9.5 15.6h15" stroke={fill} strokeWidth="1.6" />
        <path d="M26.5 25.5v8" stroke={fill} strokeWidth="2.2" />
      </g>
      <g transform="translate(2 2.5) rotate(-6 16 24)" stroke="currentColor">
        <path d="M9.5 11.5H22.5V13Q22.5 14.5 25 15.5Q28 16.8 28 20V37.5Q28 41.5 24 41.5H8Q4 41.5 4 37.5V20Q4 16.8 7 15.5Q9.5 14.5 9.5 13Z" fill={fill} strokeWidth="2.6" />
        <rect x="7.5" y="5" width="17" height="6.5" rx="2" fill={fill} strokeWidth="2.6" />
        <path d="M10.5 8.3h11" strokeWidth="1.7" strokeDasharray="1.6 2.4" />
        <rect x="7.5" y="22.5" width="17" height="11" rx="1.6" strokeWidth="2.2" />
        <path d="M11 26.8h10M11 30.2h5.5" strokeWidth="2.2" />
      </g>
    </svg>
  );
}
