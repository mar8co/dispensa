// "Domanda" (al posto di confirm()), come in Second Brain: una scheda dal basso
// con titolo enorme (2.3rem, peso 800, -0.06em, interlinea 0.95), testo sotto
// (1.05rem, peso 600, 18px sopra) e due pulsanti affiancati a 30px di distanza:
// Annulla a sinistra (col bordo), la conferma a destra (nera; rossa se elimina).
// Nessuna X: si chiude toccando fuori, trascinando giù o con Annulla.
// `color`: classe del fondo (giallo di serie, come in Second Brain).
import Sheet from "./Sheet.jsx";

export default function Domanda({ titolo, testo, si, rosso = false, color = "bg-giallo", extra, onSi, onClose }) {
  return (
    <Sheet onClose={onClose} panelClass={color}>
      {(close) => (
        <div className="px-[18px] pb-5 pt-1">
          <h3 className="text-[2.3rem] font-extrabold leading-[0.95] tracking-[-0.06em] [word-spacing:0.08em]">{titolo}</h3>
          {testo && <p className="mt-[18px] text-[1.05rem] font-semibold leading-[1.38] text-ink">{testo}</p>}
          <div className="mt-[30px] grid grid-cols-2 gap-2">
            <button type="button" onClick={close} className="bottone-chiaro">Annulla</button>
            <button
              type="button"
              onClick={() => { close(); onSi?.(); }}
              className={rosso ? "bottone-rosso" : "bottone"}
            >
              {si}
            </button>
          </div>
          {/* Azione rara collegata alla domanda (es. "Voglio solo svuotare la
              dispensa" sotto "Elimina account"): testo sottolineato. */}
          {extra && (
            <button type="button" onClick={() => { close(); extra.run(); }} className="link mt-4 block w-full text-center text-[0.92rem]">
              {extra.label}
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}
