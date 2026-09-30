// Oggetto simbolo dell'app: due barattoli di conserva fatta in casa, col
// tessuto legato sul coperchio (come i due biglietti di Wishlist Viaggi e i
// due scontrini di Expense Track). Quello dietro è pieno col colore del testo
// (currentColor), quello davanti ha il colore `fill` con la marmellata e i
// frutti dentro. Stesso disegno di public/icon.svg.
export default function Barattoli({ size = 48, fill = "#fff", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {/* dietro: barattolo alto, pieno */}
      <g transform="translate(17 -1) rotate(9 14 26)" fill="currentColor" stroke="currentColor" strokeWidth="2.6">
        <path d="M7 20H25V40Q25 43 22 43H10Q7 43 7 40Z"/>
        <path d="M5 20L7 12H25L27 20L24.5 22L22 20L19.5 22L17 20L14.5 22L12 20L9.5 22L7 20Z"/>
      </g>
      {/* davanti: barattolo basso col tessuto a smerlo e la marmellata */}
      <g transform="translate(1 3) rotate(-5 18 30)" stroke="currentColor">
        <path d="M8 23H28V39Q28 43 24 43H12Q8 43 8 39Z" fill={fill} strokeWidth="2.6"/>
        <path d="M6 23L8 14H28L30 23L27 25.5L24 23L21 25.5L18 23L15 25.5L12 23L9 25.5L6 23Z" fill={fill} strokeWidth="2.6"/>
        <path d="M7.4 18.5H28.6" strokeWidth="2.2"/>
        <path d="M11 30q2.3-1.8 4.6 0t4.6 0t4.6 0" strokeWidth="2.2"/>
        <circle cx="13" cy="36" r="1.8" fill="currentColor" strokeWidth="1"/>
        <circle cx="18.5" cy="38.5" r="1.8" fill="currentColor" strokeWidth="1"/>
        <circle cx="23.5" cy="35.5" r="1.8" fill="currentColor" strokeWidth="1"/>
      </g>
    </svg>
  );
}
