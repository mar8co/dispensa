// Foglio di conferma per "Svuota dispensa" (messaggio dell'app: foglio
// giallo, titolo-domanda grande, Annulla col bordo + azione rossa).
import Sheet from "./Sheet.jsx";

export default function ConfirmClearModal({ onCancel, onConfirm }) {
  return (
    <Sheet onClose={onCancel} panelClass="bg-giallo">
      {(close) => (
        <div className="px-[18px] pb-5 pt-1">
          <h3 className="text-[2.3rem] font-extrabold leading-[0.95] tracking-[-0.06em] [word-spacing:0.08em]">Svuotare la dispensa?</h3>
          <p className="mt-[18px] text-[1.05rem] font-semibold leading-[1.38] text-ink">
            Verranno eliminati tutti i prodotti dalla dispensa. L'azione non è reversibile.
          </p>
          <div className="mt-[30px] flex gap-2">
            <button onClick={close} className="bottone-chiaro flex-1">
              Annulla
            </button>
            <button
              onClick={onConfirm}
              className="bottone-rosso flex-1"
            >
              Elimina tutto
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
