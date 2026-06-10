// Bottom sheet riutilizzabile in stile iOS: sale dal basso con molla morbida,
// maniglia di trascinamento in alto, si chiude toccando lo sfondo o
// trascinando verso il basso. I figli ricevono la funzione `close` (chiusura
// animata) da usare al posto di onClose nei pulsanti interni.
import { useEffect, useRef, useState } from "react";

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
        {typeof children === "function" ? children(close) : children}
      </div>
    </div>
  );
}
