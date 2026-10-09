// Tocco FUORI da un pannello di modifica aperto (Dispensa, Spesa): chiude il
// pannello e basta. Il tocco non deve arrivare a quello che c'è sotto (niente
// carrello, niente altra riga aperta, niente campo che prende il fuoco).
// Si ascolta in fase di cattura sul documento: così si arriva PRIMA dei
// gestori di React (che stanno sulla radice) e li si ferma.
// Eccezione: gli avvisi (il loro "Annulla" deve funzionare).

export function onOutsideTap(getPanel, close) {
  const onDown = (e) => {
    const panel = getPanel();
    if (!panel || panel.contains(e.target)) return;
    if (e.target.closest?.('[role="status"]')) { close(); return; }
    e.stopPropagation();
    if (e.pointerType === "mouse") e.preventDefault(); // niente fuoco sul campo sotto
    // Il "click" (e su iPhone il fuoco) nascono al rilascio: si fermano lì.
    const swallow = (ev) => { ev.stopPropagation(); if (ev.cancelable) ev.preventDefault(); };
    const opts = { capture: true, passive: false };
    const events = ["pointerup", "touchend", "click"];
    events.forEach((n) => document.addEventListener(n, swallow, opts));
    setTimeout(() => events.forEach((n) => document.removeEventListener(n, swallow, opts)), 700);
    close();
  };
  document.addEventListener("pointerdown", onDown, true);
  return () => document.removeEventListener("pointerdown", onDown, true);
}
