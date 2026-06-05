// Modale di conferma per "Svuota dispensa".

export default function ConfirmClearModal({ onCancel, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-stone-900">Svuotare la dispensa?</h3>
        <p className="mt-1 text-sm text-stone-500">
          Verranno eliminati tutti i prodotti dalla dispensa. L'azione non è reversibile.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-stone-300 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Elimina tutto
          </button>
        </div>
      </div>
    </div>
  );
}
