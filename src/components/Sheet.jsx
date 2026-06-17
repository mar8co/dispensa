// Bottom sheet riutilizzabile in stile iOS: sale dal basso con molla morbida,
// maniglia di trascinamento in alto, si chiude toccando lo sfondo o
// trascinando verso il basso. I figli ricevono la funzione `close` (chiusura
// animata) da usare al posto di onClose nei pulsanti interni.
import { useEffect, useRef, useState } from "react";

// Blocco dello scroll di sfondo mentre un foglio è aperto (stile modale nativa).
// Su iOS `overflow:hidden` sul body NON basta: l'unico modo affidabile è fissare
// il body con position:fixed conservando lo scroll, e ripristinarlo alla chiusura.
// Un contatore gestisce eventuali fogli sovrapposti (sblocca solo l'ultimo).
let lockCount = 0;
let savedScrollY = 0;
function lockBodyScroll() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    const b = document.body;
    b.style.position = "fixed";
    b.style.top = `-${savedScrollY}px`;
    b.style.left = "0";
    b.style.right = "0";
    b.style.width = "100%";
  }
  lockCount += 1;
}
function unlockBodyScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    const b = document.body;
    b.style.position = "";
    b.style.top = "";
    b.style.left = "";
    b.style.right = "";
    b.style.width = "";
    window.scrollTo(0, savedScrollY);
  }
}

export default function Sheet({ onClose, locked = false, children }) {
  const [shown, setShown] = useState(false);   // anima l'ingresso al mount
  const [closing, setClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Blocca lo scroll della pagina sottostante finché il foglio è aperto.
  useEffect(() => {
    lockBodyScroll();
    return unlockBodyScroll;
  }, []);

  function close() {
    if (locked || closing) return;
    setClosing(true);
    setTimeout(onClose, 280);
  }

  // Trascinamento dalla maniglia: segue il dito, oltre la soglia chiude.
  function onPointerDown(e) {
    startY.current = e.clientY;
    setDragging(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignora */ }
  }
  function onPointerMove(e) {
    if (startY.current == null) return;
    setDragY(Math.max(0, e.clientY - startY.current));
  }
  function onPointerEnd() {
    if (startY.current == null) return;
    startY.current = null;
    setDragging(false);
    if (dragY > 90) close();
    else setDragY(0);
  }

  const open = shown && !closing;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        onClick={close}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className="relative flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl bg-cream shadow-2xl"
        style={{
          transform: open ? `translateY(${dragY}px)` : "translateY(105%)",
          transition: dragging ? "none" : "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          style={{ touchAction: "none" }}
          className="flex shrink-0 cursor-grab justify-center pb-1.5 pt-2.5 active:cursor-grabbing"
          aria-hidden="true"
        >
          <div className="h-1 w-10 rounded-full bg-stone-300" />
        </div>
        {/* Area scorrevole interna: se il contenuto supera l'altezza del foglio
            scorre qui dentro, senza propagare lo scroll alla pagina sotto. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {typeof children === "function" ? children(close) : children}
        </div>
      </div>
    </div>
  );
}
