// Oggetto simbolo dell'app: sacchetto della spesa e cappello da chef (logo
// scelto dall'utente il 01/10), come i due biglietti di Wishlist e i due
// scontrini di Expense Track. Un solo colore (currentColor): i vuoti lasciano
// vedere il fondo. Stesso disegno di public/icon.svg. (Il nome del file resta
// storico.)
import { LOGO_D } from "./logoPath.js";

export default function Barattoli({ size = 48, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1000 1000" className={className} aria-hidden="true">
      <path fill="currentColor" fillRule="evenodd" d={LOGO_D} />
    </svg>
  );
}
