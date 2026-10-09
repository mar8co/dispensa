// Avviso breve: pillola nera con l'eventuale azione in giallo ("Annulla" per
// gli undo, oppure un'etichetta personalizzata, es. "Stop").
//
// Posizione (dall'11/10, scelta dell'utente): IN ALTO, nello spazio vuoto
// della testata tra l'avatar (a sinistra) e le azioni della scheda (a destra,
// es. "condividi" nella Spesa). Lì non copre né la lista né la barra in
// basso, e con la tastiera aperta resta visibile senza casi speciali. È
// fissato allo schermo: si vede anche dopo aver scorso la pagina. I margini
// laterali (62px) lasciano liberi avatar e azioni; non tocca il bordo alto
// (iOS colorerebbe la barra di stato col suo colore).
// Colore: pillola nera con l'azione gialla; `tone="verde"` o `tone="giallo"`
// = pillola colorata col bordo e il testo neri e l'azione sottolineata.
export default function Toast({ message, onUndo, actionLabel = "Annulla", tone }) {
  const chiaro = tone === "verde" || tone === "giallo";
  const fondo = tone === "giallo" ? "bg-giallo" : "bg-verde";

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[60] mx-auto flex max-w-md justify-center px-[62px]"
      style={{ top: "calc(env(safe-area-inset-top) + 26px)" }}
    >
      {/* Alta almeno quanto l'avatar (40px); raggio 20px: su una riga è una
          pillola, se il testo va a capo resta morbida. */}
      <div role="status" className={`animate-drop-in pointer-events-auto flex min-h-[40px] max-w-full items-center gap-2.5 rounded-[20px] px-3.5 py-1.5 text-[0.84rem] font-[650] leading-tight shadow-barra ${chiaro ? `border-[1.5px] border-ink ${fondo} text-ink` : "bg-ink text-white"}`}>
        <span className="min-w-0 break-words">{message}</span>
        {onUndo && (
          <button onClick={onUndo} className={`-my-2 shrink-0 py-2 text-[0.86rem] font-extrabold ${chiaro ? "text-ink underline underline-offset-2" : "text-giallo"}`}>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
