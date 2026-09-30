// Foglio di conferma per "Esci" (dall'icona in alto a destra, come Wishlist):
// stessa veste di ConfirmClearModal (foglio giallo, domanda grande, Annulla
// col bordo + azione rossa).
import Sheet from "./Sheet.jsx";

export default function ConfirmLogoutModal({ onCancel, onConfirm }) {
  return (
    <Sheet onClose={onCancel} panelClass="bg-giallo">
      {(close) => (
        <div className="px-[18px] pb-5 pt-1">
          <h3 className="text-[2.3rem] font-extrabold leading-[0.95] tracking-[-0.06em] [word-spacing:0.08em]">Vuoi uscire?</h3>
          <p className="mt-[18px] text-[1.05rem] font-semibold leading-[1.38] text-ink">
            Dispensa, lista e ricette restano salvate: per rientrare basta accedere di nuovo.
          </p>
          <div className="mt-[30px] flex gap-2">
            <button onClick={close} className="bottone-chiaro flex-1">
              Annulla
            </button>
            <button onClick={onConfirm} className="bottone-rosso flex-1">
              Esci
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
