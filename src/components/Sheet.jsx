// Bottom sheet condiviso, basato su Vaul (drag-to-dismiss collaudato, su Radix
// Dialog). Usato da TUTTI i fogli dell'app (Profilo, scontrino, barcode, ecc.):
// potenziando questo componente, il trascinamento funziona ovunque.
//
// Comportamento: sale dal basso; si trascina giù dall'handle/header (e dal
// contenuto quando è già in cima — scroll-aware di Vaul); al rilascio chiude
// se superi soglia o fai un flick veloce, altrimenti torna elastico; lo scrim
// si schiarisce in proporzione; verso l'alto fa resistenza (rubber-band). Si
// chiude anche col tap sullo scrim, con Esc e con la X interna. Accessibilità
// (focus trap, role dialog, aria-modal) gestita da Radix sotto Vaul.
//
// API invariata rispetto a prima: i figli ricevono `close` (chiusura animata)
// da usare nei pulsanti interni; `locked` blocca ogni chiusura (es. durante
// un'elaborazione); `panelClass`/`handleClass` per il tema (es. scuro).
import { useState, useEffect, useRef } from "react";
import { Drawer } from "vaul";

// `side` ("left" | "right"; `true` = destra): pannello LATERALE. Il Profilo
// entra da sinistra (l'avatar è lì), le Impostazioni da destra (come
// il menu di Expense Track): alto quanto lo schermo, largo l'88%, angoli
// interni arrotondati, niente maniglia; si chiude toccando fuori o
// trascinandolo verso destra.
//
// Colore del foglio (veste manifesto): bianco per i fogli dove si scrive
// (default); gli altri passano il loro colore pieno in `panelClass`
// (Profilo blu, Impostazioni arancio, Privacy beige, Premium rosa, conferme gialle, fotocamere nere).
// Distanza dei pannelli laterali dal bordo alto (vedi il commento sul velo).
const STACCO = "max(env(safe-area-inset-top), 14px)";

export default function Sheet({ onClose, locked = false, side = false, panelClass = "bg-white", handleClass = "bg-ink/25", children }) {
  // Montiamo GIÀ aperto (open=true): così il contenuto del foglio è subito nel
  // DOM. È fondamentale per i fogli con fotocamera (barcode/scontrino): l'effetto
  // che avvia la camera gira al mount e ha bisogno del <video> già presente —
  // con un'apertura ritardata di un frame la camera non si agganciava.
  // Vaul anima comunque l'ingresso. Lo smontaggio (onClose del genitore) avviene
  // dopo l'animazione di chiusura (onAnimationEnd con open=false).
  const lato = side === "left" ? "left" : "right";
  const [open, setOpen] = useState(true);
  const close = () => { if (!locked) setOpen(false); };

  // onClose deve partire UNA volta sola, ma soprattutto deve partire SEMPRE.
  // Vaul a volte NON emette onAnimationEnd (animazione interrotta, tab in
  // background): il genitore restava con lo stato "aperto" su un foglio ormai
  // invisibile e il tap successivo (setX(true) su stato già true) non
  // re-renderizzava nulla — sintomo: "il Profilo non si apre finché non tocco
  // un altro punto". Il fallback qui sotto completa comunque la chiusura.
  const closedRef = useRef(false);
  const finishClose = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose();
  };
  useEffect(() => {
    if (open) return;
    const t = setTimeout(finishClose, 700); // poco oltre la durata dell'animazione
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Invariante anti-freeze: quando l'ULTIMO drawer lascia il DOM, il body non
  // deve restare con pointer-events:none (= tutta l'app sorda ai tocchi).
  // Radix lo imposta all'apertura e lo ripristina a un valore salvato in una
  // variabile condivisa tra tutti i layer; Vaul ci scrive sopra "auto" con
  // timer propri. Con smontaggi fuori sequenza (foglio rimosso mentre è ancora
  // aperto: analisi scontrino/barcode/voce, chiusure forzate del tutorial) o
  // fogli sovrapposti (Profilo+Privacy) il ripristino può saltare. Il timeout
  // rimanda il controllo a dopo i cleanup di Radix e gli eventuali mount di
  // fogli successivi nello stesso tick: se un altro drawer esiste ancora, non
  // si tocca nulla (ci penserà il suo smontaggio).
  useEffect(() => () => {
    const fix = () => {
      if (!document.querySelector("[data-vaul-drawer]") &&
          document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "";
      }
    };
    setTimeout(fix, 0);
    // Secondo passaggio dopo i timer interni di Vaul/Radix (~500ms): coprono
    // il caso in cui il residuo venga riscritto DOPO il primo controllo
    // (sintomo: il primo tap dopo la chiusura di un foglio cade nel vuoto).
    setTimeout(fix, 600);
  }, []);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o) => { if (!o) close(); }}
      onAnimationEnd={(o) => { if (!o) finishClose(); }}
      dismissible={!locked}
      repositionInputs={false}
      direction={side ? lato : "bottom"}
    >
      <Drawer.Portal>
        {/* Pannelli laterali: velo e pannello NON toccano il bordo alto della
            pagina (restano 14px sotto, o sotto la zona sicura se è più alta).
            iOS colora la barra di stato col colore degli elementi fissi che
            toccano quel bordo: staccandoli, resta il colore della pagina.
            (Nell'app installata la pagina comincia già sotto la barra di
            stato, quindi la zona sicura lì vale 0: da sola non bastava.) */}
        {/* Sulla pagina BIANCA (Spesa) lo stacco da solo non bastava: senza un
            colore "vero" in cima, iOS andava a prendere quello del pannello.
            Questa fascia fissa, larga quanto lo schermo e del colore della
            pagina, riempie lo stacco: è lei l'elemento che iOS trova sul bordo. */}
        {side && (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 top-0 z-50 bg-sfondo"
            style={{ height: STACCO }}
          />
        )}
        <Drawer.Overlay
          className={`fixed inset-x-0 bottom-0 z-50 bg-black/45 ${side ? "" : "top-0"}`}
          style={side ? { top: STACCO } : undefined}
        />
        <Drawer.Content
          aria-describedby={undefined}
          style={side
            ? { top: STACCO, paddingTop: "10px", paddingBottom: "env(safe-area-inset-bottom)" }
            : { paddingBottom: "env(safe-area-inset-bottom)" }}
          className={side
            ? `fixed bottom-0 z-50 flex w-[88%] max-w-sm flex-col outline-none ${lato === "left" ? "left-0 rounded-tr-[28px] rounded-br-[28px]" : "right-0 rounded-tl-[28px] rounded-bl-[28px]"} ${panelClass}`
            : `fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-foglio outline-none ${panelClass}`}
        >
          {/* Titolo nascosto: soddisfa l'accessibilità di Radix (il titolo
              visibile è dentro ogni foglio). */}
          <Drawer.Title className="sr-only">Pannello</Drawer.Title>
          {!side && (
            <div className="flex shrink-0 cursor-grab justify-center pb-1.5 pt-2.5 active:cursor-grabbing" aria-hidden="true">
              <div className={`h-[5px] w-11 rounded-full ${handleClass}`} />
            </div>
          )}
          {/* Area scorrevole interna: se il contenuto supera l'altezza del
              foglio scorre qui dentro; Vaul evita di chiudere se non sei in
              cima (così il drag non ruba lo scroll). */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {typeof children === "function" ? children(close) : children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
