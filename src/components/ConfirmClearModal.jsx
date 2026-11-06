// Conferma per "Svuota dispensa": una Domanda (vedi Domanda.jsx) col pulsante
// rosso, perché elimina tutto.
import Domanda from "./Domanda.jsx";

export default function ConfirmClearModal({ onCancel, onConfirm }) {
  return (
    <Domanda
      titolo="Svuotare la dispensa?"
      testo="Verranno eliminati tutti i prodotti dalla dispensa. L'azione non è reversibile."
      si="Elimina tutto"
      rosso
      onSi={onConfirm}
      onClose={onCancel}
    />
  );
}
