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
import { useState, useEffect } from "react";
import { Drawer } from "vaul";

export default function Sheet({ onClose, locked = false, panelClass = "bg-cream", handleClass = "bg-stone-300", children }) {
  // Montiamo GIÀ aperto (open=true): così il contenuto del foglio è subito nel
  // DOM. È fondamentale per i fogli con fotocamera (barcode/scontrino): l'effetto
  // che avvia la camera gira al mount e ha bisogno del <video> già presente —
  // con un'apertura ritardata di un frame la camera non si agganciava.
  // Vaul anima comunque l'ingresso. Lo smontaggio (onClose del genitore) avviene
  // dopo l'animazione di chiusura (onAnimationEnd con open=false).
  const [open, setOpen] = useState(true);
  const close = () => { if (!locked) setOpen(false); };

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
    setTimeout(() => {
      if (!document.querySelector("[data-vaul-drawer]") &&
          document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "";
      }
    }, 0);
  }, []);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o) => { if (!o) close(); }}
      onAnimationEnd={(o) => { if (!o) onClose(); }}
      dismissible={!locked}
      repositionInputs={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content
          aria-describedby={undefined}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          className={`fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl shadow-2xl outline-none ${panelClass}`}
        >
          {/* Titolo nascosto: soddisfa l'accessibilità di Radix (il titolo
              visibile è dentro ogni foglio). */}
          <Drawer.Title className="sr-only">Pannello</Drawer.Title>
          <div className="flex shrink-0 cursor-grab justify-center pb-1.5 pt-2.5 active:cursor-grabbing" aria-hidden="true">
            <div className={`h-1 w-10 rounded-full ${handleClass}`} />
          </div>
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
