// Avviso breve: pillola nera con l'eventuale azione in giallo ("Annulla" per
// gli undo, oppure un'etichetta personalizzata, es. "Stop").
//
// Posizione: IN ALTO, fisso, all'altezza della testata (dall'11/10, scelta
// dell'utente). Dal 27/10 è MOLTO più grande — quasi tutta la larghezza dello
// schermo (16px di margine per lato), testo 1.1rem, pallino e "Annulla" in
// proporzione — così si vede e si legge al volo; per i pochi secondi in cui è
// aperto copre avatar e azioni della testata. Non tocca il bordo alto (iOS
// colorerebbe la barra di stato col suo colore) e non occupa lo schermo: una
// pillola alta ~60px (due righe se il testo è lungo).
// Colore: SEMPRE pillola nera, come in Expense Track e Wishlist. Il tono
// (`tone="giallo" | "verde" | "rosso"`) è solo un PALLINO davanti al testo.
const PALLINO = { giallo: "bg-giallo", verde: "bg-verde", rosso: "bg-rosso" };

export default function Toast({ message, onUndo, actionLabel = "Annulla", tone }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[60] mx-auto flex max-w-md justify-center px-4"
      style={{ top: "calc(env(safe-area-inset-top) + 14px)" }}
    >
      {/* Larga quanto serve fino al bordo (max-w-full), alta almeno 60px;
          raggio 30px: su una riga è una pillola, se il testo va a capo resta
          morbida. */}
      <div role="status" className="animate-drop-in pointer-events-auto flex min-h-[60px] w-full items-center gap-3.5 rounded-[30px] bg-ink px-5 py-3 text-[1.1rem] font-[650] leading-snug text-white shadow-barra">
        {PALLINO[tone] && <i aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 rounded-full ${PALLINO[tone]}`} />}
        <span className="min-w-0 flex-1 break-words">{message}</span>
        {onUndo && (
          <button onClick={onUndo} className="-my-3 shrink-0 py-3 pl-2 text-[1.1rem] font-extrabold text-giallo">
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
