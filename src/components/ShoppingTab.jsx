// Scheda "Spesa" (stile editoriale): lista con spunta, contatore, swipe-to-delete,
// raggruppamento per reparto (nell'ordine personalizzato della dispensa),
// sezione "Nel carrello" per gli articoli presi, modifica nome/reparto con un
// tap, condivisione della lista e blocco dello spegnimento schermo.
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Plus, Trash2, Check, Minus, PackagePlus, Loader2, ListChecks, Store,
  Share2, Lightbulb, Mic, X,
} from "lucide-react";
import { CATEGORIES, CAT_ICON, AISLE_ORDER } from "../constants.js";
import { norm, atMinQty } from "../lib/pantry.js";

const editCls =
  "w-full rounded-xl border border-hair bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-stone-400 focus:ring-2 focus:ring-tomato/15";

// Riga con gesto di scorrimento orizzontale per eliminare; toccando il nome
// si modificano nome e reparto.
function SwipeItem({ it, category, onToggle, onAdjustQty, onDelete, onEdit }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [out, setOut] = useState(false);       // fase 1: scivola fuori dallo schermo
  const [removing, setRemoving] = useState(false); // fase 2: la riga si richiude
  const [editing, setEditing] = useState(false);
  const [eName, setEName] = useState("");
  const [eCat, setECat] = useState(category);
  const start = useRef(null);
  const axis = useRef(null);
  const THRESHOLD = 80;

  function onPointerDown(e) {
    start.current = { x: e.clientX, y: e.clientY };
    axis.current = null;
    setDragging(true);
  }
  function onPointerMove(e) {
    if (!start.current) return;
    const ddx = e.clientX - start.current.x;
    const ddy = e.clientY - start.current.y;
    if (axis.current == null) {
      if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return;
      axis.current = Math.abs(ddx) > Math.abs(ddy) ? "h" : "v";
      if (axis.current === "h") {
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignora */ }
      }
    }
    if (axis.current === "h") setDx(ddx);
  }
  function onPointerEnd(e) {
    if (!start.current) return;
    const ddx = e.clientX - start.current.x;
    start.current = null;
    setDragging(false);
    if (axis.current === "h" && Math.abs(ddx) > THRESHOLD) {
      const w = typeof window !== "undefined" ? window.innerWidth : 400;
      // Due tempi, come iOS: la riga esce di lato, poi lo spazio si richiude.
      setOut(true);
      setDx(ddx > 0 ? w : -w);
      setTimeout(() => setRemoving(true), 200);
      setTimeout(() => onDelete(it.id), 500);
    } else {
      setDx(0);
    }
    axis.current = null;
  }

  function startEdit() {
    setEName(it.name);
    setECat(category);
    setEditing(true);
  }
  function saveEdit() {
    onEdit(it, eName, eCat);
    setEditing(false);
  }

  const atMin = atMinQty(it.qty);

  if (editing) {
    return (
      <li data-noswipe className="space-y-2 py-3">
        <input
          autoFocus
          className={editCls}
          value={eName}
          onChange={(e) => setEName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && saveEdit()}
          placeholder="Nome"
        />
        <div className="flex gap-2">
          <select className={`${editCls} flex-1`} value={eCat} onChange={(e) => setECat(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_ICON[c]} {c}</option>)}
          </select>
          <button onClick={saveEdit} className="flex items-center justify-center rounded-xl bg-ink px-3.5 text-white hover:opacity-90" aria-label="Salva">
            <Check className="h-4 w-4" />
          </button>
          <button onClick={() => setEditing(false)} className="flex items-center justify-center rounded-xl border border-hair px-3.5 text-stone-500 hover:bg-stone-50" aria-label="Annulla">
            <X className="h-4 w-4" />
          </button>
        </div>
      </li>
    );
  }

  return (
    <li
      data-noswipe
      className="relative overflow-hidden"
      style={{
        maxHeight: removing ? 0 : "6rem",
        opacity: removing ? 0 : 1,
        transition: "max-height 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease",
      }}
    >
      <div
        className={`absolute inset-0 flex items-center bg-tomato px-5 text-white transition-opacity duration-200 ${dx > 0 ? "justify-start" : "justify-end"} ${out ? "opacity-0" : "opacity-100"}`}
      >
        <Trash2 className="h-5 w-5" />
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        style={{
          transform: `translateX(${dx}px)`,
          touchAction: "pan-y",
          transition: dragging
            ? "none"
            : out
              ? "transform 0.22s cubic-bezier(0.55, 0, 1, 0.45)"   // esce accelerando
              : "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",  // rientro morbido
        }}
        className="relative flex items-center gap-3 bg-cream py-3"
      >
        <button
          onClick={() => onToggle(it.id, !it.checked)}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
            it.checked ? "border-ink bg-ink text-white" : "border-stone-300 bg-white text-transparent hover:border-stone-500"
          }`}
          aria-label={it.checked ? "Segna da comprare" : "Segna come preso"}
        >
          <Check className="h-4 w-4" />
        </button>
        {/* Tap sul nome = modifica; la spunta si fa col quadratino a sinistra */}
        <p
          onClick={startEdit}
          title="Tocca per modificare"
          className={`min-w-0 flex-1 cursor-pointer truncate text-[15px] font-semibold ${it.checked ? "text-stone-400 line-through" : "text-ink"}`}
        >
          {it.name}
        </p>
        <div className="shrink-0">
          {/\d/.test(it.qty) ? (
            <div className="inline-flex items-center gap-1.5">
              <button
                onClick={() => onAdjustQty(it, -1)}
                disabled={atMin}
                className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
                  atMin ? "border-hair text-stone-300" : "border-stone-300 text-stone-600 hover:border-ink hover:text-ink active:scale-95"
                }`}
                aria-label="Diminuisci"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[1.75rem] px-0.5 text-center text-sm font-bold tabular-nums text-ink">{it.qty}</span>
              <button
                onClick={() => onAdjustQty(it, 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 text-stone-600 transition hover:border-tomato hover:bg-tomato/5 hover:text-tomato active:scale-95"
                aria-label="Aumenta"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            it.qty && it.qty !== "1" && <span className="text-xs text-stone-500">{it.qty}</span>
          )}
        </div>
      </div>
    </li>
  );
}

export default function ShoppingTab({
  shopping,
  onAdd, onToggle, onDelete, onAdjustQty, onToggleAll, onMoveChecked, onClearChecked,
  movingChecked, byAisle, setByAisle,
  catFor, onEdit, onOpenVoice, onNotify, historyNames, pantryNames,
}) {
  const [name, setName] = useState(""); // campo di inserimento in linea
  const inputRef = useRef(null);
  const [awake, setAwake] = useState(false);
  const wakeRef = useRef(null);
  // L'hint sullo swipe sparisce dopo la prima eliminazione col gesto.
  const [showHint, setShowHint] = useState(() => {
    try { return localStorage.getItem("dispensa-swipe-hint") !== "1"; } catch { return true; }
  });

  const toBuy = shopping.filter((s) => !s.checked);
  const inCart = shopping.filter((s) => s.checked);
  const checkedCount = inCart.length;
  const allChecked = shopping.length > 0 && checkedCount === shopping.length;

  // Wake Lock: tiene lo schermo acceso mentre fai la spesa (se supportato).
  const wakeSupported = typeof navigator !== "undefined" && "wakeLock" in navigator;
  useEffect(() => {
    if (!awake) {
      wakeRef.current?.release?.().catch(() => {});
      wakeRef.current = null;
      return;
    }
    const acquire = async () => {
      try { wakeRef.current = await navigator.wakeLock.request("screen"); }
      catch { setAwake(false); }
    };
    acquire();
    // iOS rilascia il lock quando l'app va in background: lo riprendiamo.
    const onVis = () => { if (document.visibilityState === "visible") acquire(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      wakeRef.current?.release?.().catch(() => {});
      wakeRef.current = null;
    };
  }, [awake]);

  function handleDelete(id) {
    if (showHint) {
      try { localStorage.setItem("dispensa-swipe-hint", "1"); } catch { /* */ }
      setShowHint(false);
    }
    onDelete(id);
  }

  // --- Inserimento in linea: i nuovi prodotti appaiono subito qui sotto ---
  const pool = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const n of [...(historyNames || []), ...(pantryNames || [])]) {
      const k = norm(n);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(n);
    }
    return out;
  }, [historyNames, pantryNames]);

  const q = norm(name);
  const listSet = useMemo(() => new Set(shopping.map((x) => norm(x.name))), [shopping]);
  // Scrivendo: completamenti; campo vuoto (ma attivo): i frequenti non in lista.
  const suggestions = q
    ? pool.filter((n) => norm(n).includes(q) && norm(n) !== q).slice(0, 5)
    : (historyNames || []).filter((n) => !listSet.has(norm(n))).slice(0, 4);

  async function add(n) {
    const clean = String(n ?? name).trim();
    if (!clean) return;
    const res = await onAdd(clean, "1");
    if (res?.merged) onNotify(<><strong>{clean}</strong> era già in lista: quantità aumentata</>);
    setName("");
    inputRef.current?.focus(); // resta pronto per il prossimo
  }

  // Condivide la lista (o la copia negli appunti se share non c'è).
  function shareList() {
    const lines = toBuy.map((x) => `• ${x.name}${x.qty && x.qty !== "1" ? ` — ${x.qty}` : ""}`);
    const text = `🛒 Lista della spesa:\n${lines.join("\n")}`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => { /* condivisione annullata */ });
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => onNotify("Lista copiata negli appunti."),
        () => {}
      );
    }
  }

  // Reparti nell'ordine del giro classico del supermercato (frutta e
  // verdura all'ingresso, freschi, scaffali, surgelati e bevande in fondo).
  const groups = AISLE_ORDER
    .map((c) => ({ cat: c, list: toBuy.filter((s) => catFor(s.name) === c) }))
    .filter((g) => g.list.length > 0);

  const renderItems = (list) =>
    list.map((it) => (
      <SwipeItem
        key={it.id} it={it} category={catFor(it.name)}
        onToggle={onToggle} onAdjustQty={onAdjustQty} onDelete={handleDelete} onEdit={onEdit}
      />
    ));

  return (
    <div className="pt-2">
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-tomato">La tua lista</div>
        <div className="-mr-1 -mt-1 flex gap-0.5">
          {wakeSupported && shopping.length > 0 && (
            <button
              onClick={() => {
                const next = !awake;
                setAwake(next);
                onNotify(next
                  ? "💡 Schermo sempre acceso mentre fai la spesa"
                  : "Lo schermo può spegnersi di nuovo");
              }}
              aria-pressed={awake}
              className={`rounded-lg p-1.5 transition ${awake ? "bg-tomato/10 text-tomato" : "text-stone-300 hover:bg-stone-100 hover:text-stone-600"}`}
              title="Tieni lo schermo acceso"
              aria-label="Tieni lo schermo acceso"
            >
              <Lightbulb className="h-5 w-5" />
            </button>
          )}
          {toBuy.length > 0 && (
            <button
              onClick={shareList}
              className="rounded-lg p-1.5 text-stone-300 transition hover:bg-stone-100 hover:text-stone-600"
              title="Condividi la lista"
              aria-label="Condividi la lista"
            >
              <Share2 className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      <h1 className="mt-1 font-display text-[40px] font-extrabold leading-[0.98] tracking-tight text-ink">La spesa</h1>

      {/* Inserimento in linea, FISSO in alto durante lo scroll: scrivi e il
          prodotto appare qui sotto. È nel flusso della pagina (sticky, non
          fixed in basso), quindi la tastiera iOS non lo copre. */}
      <div className="sticky top-0 z-20 -mx-5 mt-2 bg-cream/95 px-5 pb-2.5 pt-2.5 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Plus className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-tomato" />
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Scrivi cosa ti manca…"
              className="w-full border-0 border-b border-ink/20 bg-transparent py-2.5 pl-7 pr-2 text-sm text-ink outline-none focus:border-ink"
            />
          </div>
          {name.trim() ? (
            <button
              onClick={() => add()}
              className="flex h-11 shrink-0 items-center justify-center rounded-full bg-tomato px-4 text-xs font-bold text-white shadow-lg shadow-tomato/30 transition hover:bg-tomato-700 active:scale-95"
            >
              Aggiungi
            </button>
          ) : (
            <button
              onClick={onOpenVoice}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tomato text-white shadow-lg shadow-tomato/30 transition hover:bg-tomato-700 active:scale-95"
              aria-label="Aggiungi a voce"
              title="Aggiungi a voce"
            >
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Completamenti / acquisti frequenti: un tap e sono in lista */}
        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestions.map((n) => (
              <button
                key={n}
                // pointerdown + preventDefault: scatta subito, senza far
                // perdere il focus all'input (il click normale veniva
                // "mangiato" dal reflow quando la tastiera iOS è aperta).
                onPointerDown={(e) => { e.preventDefault(); add(n); }}
                className="rounded-full border border-hair bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-tomato hover:text-tomato"
              >
                {q ? n : `+ ${n}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {shopping.length === 0 && (
        <p className="py-12 text-center text-sm text-stone-400">
          La lista è vuota. Scrivi qui sopra cosa ti manca, dettalo col microfono
          o aggiungi i mancanti da una ricetta.
        </p>
      )}

      <div className="mt-5">
        {toBuy.length > 0 && (
          byAisle ? (
            <div className="space-y-6">
              {groups.map(({ cat, list }) => (
                <section key={cat}>
                  <div className="flex items-center gap-2 border-b border-ink/15 pb-2">
                    <span className="text-base">{CAT_ICON[cat]}</span>
                    <h4 className="font-display text-base font-bold uppercase tracking-wide text-ink">{cat}</h4>
                    <span className="font-display text-sm font-bold text-tomato">{String(list.length).padStart(2, "0")}</span>
                  </div>
                  <ul className="divide-y divide-hair">{renderItems(list)}</ul>
                </section>
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-hair border-t border-ink/15">{renderItems(toBuy)}</ul>
          )
        )}

        {toBuy.length === 0 && inCart.length > 0 && (
          <p className="py-6 text-center text-sm text-stone-400">Hai preso tutto! 🎉</p>
        )}

        {/* Gli articoli presi scivolano qui in fondo */}
        {inCart.length > 0 && (
          <section className="mt-7">
            <div className="flex items-center gap-2 border-b border-ink/15 pb-2">
              <span className="text-base">🛒</span>
              <h4 className="font-display text-base font-bold uppercase tracking-wide text-stone-400">Nel carrello</h4>
              <span className="font-display text-sm font-bold text-tomato">{String(inCart.length).padStart(2, "0")}</span>
            </div>
            <ul className="divide-y divide-hair">{renderItems(inCart)}</ul>
          </section>
        )}
      </div>

      {shopping.length > 0 && showHint && (
        <p className="mt-3 text-center text-[11px] text-stone-400">
          Spunta il quadratino quando lo prendi · tocca il nome per modificarlo · scorri di lato per eliminarlo
        </p>
      )}

      <div className={checkedCount > 0 ? "h-44" : "h-28"} />

      {/* Barra in basso (sopra la navigazione): l'azione di chiusura della
          spesa appare qui, grande e sempre visibile, appena spunti qualcosa. */}
      {shopping.length > 0 && (
        <div
          className="fixed inset-x-0 z-20 border-t border-hair bg-cream/95 backdrop-blur"
          style={{ bottom: "calc(60px + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto max-w-md px-5 py-2.5">
            {checkedCount > 0 && (
              <div className="animate-fade-in mb-2 flex gap-2">
                <button
                  onClick={onMoveChecked}
                  disabled={movingChecked}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-tomato px-3 py-3 text-sm font-bold text-white transition hover:bg-tomato-700 active:scale-[0.99] disabled:opacity-60"
                >
                  {movingChecked
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <>
                        <PackagePlus className="h-4 w-4" />
                        {allChecked ? "Sposta tutto in dispensa" : `Sposta ${checkedCount} in dispensa`}
                      </>}
                </button>
                <button
                  onClick={onClearChecked}
                  className="rounded-xl border border-hair px-3 py-3 text-sm font-semibold text-stone-500 transition hover:bg-stone-50"
                >
                  Rimuovi
                </button>
              </div>
            )}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setByAisle((v) => !v)}
                aria-pressed={byAisle}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                  byAisle ? "border-ink bg-ink text-white" : "border-hair bg-paper text-stone-500 hover:bg-stone-50"
                }`}
              >
                <Store className="h-3.5 w-3.5" /> Per reparto
              </button>
              <button
                onClick={onToggleAll}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-ink"
              >
                <ListChecks className="h-3.5 w-3.5" />
                {allChecked ? "Deseleziona tutto" : "Seleziona tutto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
