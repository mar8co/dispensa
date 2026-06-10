// Foglio di conferma per "Svuota dispensa".
import Sheet from "./Sheet.jsx";

export default function ConfirmClearModal({ onCancel, onConfirm }) {
  return (
    <Sheet onClose={onCancel}>
      {(close) => (
        <div className="px-5 pb-7 pt-1">
          <h3 className="text-base font-semibold text-ink">Svuotare la dispensa?</h3>
          <p className="mt-1 text-sm text-stone-500">
            Verranno eliminati tutti i prodotti dalla dispensa. L'azione non è reversibile.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={close}
              className="flex-1 rounded-xl border border-stone-300 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
            >
              Annulla
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded-xl bg-tomato py-2.5 text-sm font-medium text-white hover:bg-tomato-700"
            >
              Elimina tutto
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
