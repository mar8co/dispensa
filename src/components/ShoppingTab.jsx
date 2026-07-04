// Scheda "Spesa": lista della spesa con CARRELLO.
// - Tocca una riga (intera) per metterla NEL CARRELLO (barrata); ritoccala per
//   rimetterla in lista. I prodotti nel carrello si raccolgono nel reparto
//   "Nel carrello" in fondo.
// - In alto (sotto la barra di testo): "Per reparto" e "Seleziona tutto",
//   sempre visibili. In basso: "Sposta in dispensa" + cestino, solo quando il
//   carrello non è vuoto.
// - Pressione lunga sulla riga: apre l'editor (quantità/reparto/nome).
// NB sul data layer: il "carrello" è il campo persistito `checked` degli item
// (uso solo i prop esistenti: onToggle/onToggleAll/onMoveChecked/onClearChecked).
// Nessuna query/tabella/campo modificato.
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Pencil, Mic, Check, Trash2, PackagePlus, Loader2, ListChecks, Store,
  Share2, Lightbulb, X,
} from "lucide-react";
import { AISLE_ORDER, CAT_ICON, CATALOG_NAMES } from "../constants.js";
import { atMinQty, adjustQty, formatQtyDisplay, norm } from "../lib/pantry.js";
import Button from "./Button.jsx";
import ProductFields from "./ProductFields.jsx";

// --- Riga prodotto. Gesti (stesso modello della Dispensa: tap = modifica):
// • tap sul nome = apre la modifica;
// • tap sul quadratino a destra = mette/toglie dal carrello;
// • swipe ← (verso sinistra) = elimina;
// • swipe → (verso destra) = apre la modifica.
// Accessibile (role=button, tastiera; il quadratino è un bottone reale). ---
function ShoppingRow({ it, onSelect, onEdit, onDelete }) {
  const selected = !!it.checked;
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef(null);
  const axis = useRef(null); // "h" | "v" | null
  const THRESHOLD = 72; // px oltre cui scatta l'azione
  const MAX = 104;      // limite visivo (oltre, resistenza elastica)

  function clamp(v) {
    if (v > MAX) return MAX + (v - MAX) * 0.25;
    if (v < -MAX) return -MAX + (v + MAX) * 0.25;
    return v;
  }
  function down(e) {
    start.current = { x: e.clientX, y: e.clientY };
    axis.current = null;
    setDragging(true);
  }
  function move(e) {
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
    if (axis.current === "h") setDx(clamp(ddx));
  }
  function up(e) {
    const wasH = axis.current === "h";
    const ddx = start.current ? e.clientX - start.current.x : 0;
    const wasTap = start.current && axis.current == null;
    start.current = null;
    setDragging(false);
    if (wasH) {
      if (ddx <= -THRESHOLD) { // swipe ← : elimina (scivola fuori, poi rimosso)
        const w = typeof window !== "undefined" ? window.innerWidth : 400;
        setDx(-w);
        setTimeout(() => onDelete(it.id), 200);
        return;
      }
      if (ddx >= THRESHOLD) { setDx(0); onEdit(it); return; } // swipe → : modifica
      setDx(0); // sotto soglia: torna a posto
      return;
    }
    if (wasTap) onEdit(it);
  }
  function cancel() {
    start.current = null;
    axis.current = null;
    setDragging(false);
    setDx(0);
  }
  function onKey(e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEdit(it); }
  }

  return (
    <li className="relative overflow-hidden">
      {/* Sfondi azione, rivelati dallo scorrimento: modifica (sx, arancione
          acceso) / elimina (dx, rosso pomodoro) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-between text-sm">
        <span className={`flex items-center gap-1.5 pl-3 font-extrabold text-orange-500 transition-opacity ${dx > 4 ? "opacity-100" : "opacity-0"}`}>
          <Pencil className="h-4 w-4" strokeWidth={2.4} /> Modifica
        </span>
        <span className={`flex items-center gap-1.5 pr-3 font-bold text-tomato transition-opacity ${dx < -4 ? "opacity-100" : "opacity-0"}`}>
          Elimina <Trash2 className="h-4 w-4" />
        </span>
      </div>

      {/* Riga in primo piano, traslata dallo swipe (sfondo opaco = copre gli
          hint). Il tap sulla riga apre la MODIFICA (come in Dispensa). */}
      <div
        role="button"
        tabIndex={0}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
        onKeyDown={onKey}
        style={{
          touchAction: "pan-y",
          transform: `translateX(${dx}px)`,
          transition: dragging ? "none" : "transform 0.2s ease",
        }}
        className="relative flex min-h-[44px] cursor-pointer select-none items-center gap-3 bg-cream py-2 outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-tomato/30"
      >
        <span className={`min-w-0 flex-1 truncate text-[15px] font-semibold ${selected ? "text-stone-400 line-through" : "text-ink"}`}>
          {it.name}
        </span>
        {/* Badge quantità in spazio dedicato (solo se impostata, ≠ "1") */}
        {it.qty && it.qty !== "1" && (
          <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-stone-600">
            {formatQtyDisplay(it.qty)}
          </span>
        )}
        {/* Quadratino carrello: bottone REALE (area di tocco 44px, riquadro
            26px centrato). stopPropagation così il tocco non apre la modifica
            e non avvia lo swipe. */}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onSelect(it); }}
          aria-pressed={selected}
          aria-label={selected ? "Rimetti in lista" : "Metti nel carrello"}
          className="-mr-[9px] flex h-11 w-11 shrink-0 items-center justify-center"
        >
          <span
            aria-hidden="true"
            className={`flex h-[26px] w-[26px] items-center justify-center rounded-md border transition ${
              selected ? "border-tomato bg-tomato text-[#fff]" : "border-stone-300 bg-paper text-transparent"
            }`}
          >
            <Check className="h-4 w-4" />
          </span>
        </button>
      </div>
    </li>
  );
}

// --- Controlli in alto (sotto la barra di testo): "Per reparto" e "Seleziona
// tutto", SEMPRE visibili (non spariscono quando metti roba nel carrello). ---
function TopControls({ byAisle, setByAisle, allSelected, onSelectAll }) {
  return (
    <div className="mt-2 flex items-center justify-between">
      {/* Chip toggle "Per reparto": arancione pieno quando attivo */}
      <button
        onClick={() => setByAisle((v) => !v)}
        aria-pressed={byAisle}
        className={`flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition ${
          byAisle ? "border-tomato bg-tomato text-[#fff]" : "border-hair bg-paper text-stone-600 hover:bg-stone-50"
        }`}
      >
        <Store className="h-4 w-4" /> Per reparto
      </button>
      {/* Azione testuale (niente box): grigio come il testo di "Per reparto" */}
      {/* "Rimetti in lista" (deseleziona, reversibile) e NON "Svuota
          carrello": quella dicitura si confondeva col cestino della barra in
          basso, che invece ELIMINA i prodotti presi. */}
      <button
        onClick={onSelectAll}
        className="flex h-9 items-center gap-1.5 px-2 text-sm font-semibold text-stone-600 transition hover:text-ink"
      >
        <ListChecks className="h-4 w-4" /> {allSelected ? "Rimetti in lista" : "Seleziona tutto"}
      </button>
    </div>
  );
}

// --- Barra in basso: appare solo quando il carrello NON è vuoto. Solo due
// azioni: "Sposta in dispensa" (prende tutto il pieno schermo) + cestino.
// Niente X (annullare = ritoccare la riga). Dock fisso (la nav ci galleggia
// sopra). ---
function BottomBar({ cartCount, allInCart, moving, onMove, onRemove }) {
  if (cartCount === 0) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 border-t border-hair bg-cream"
      style={{ paddingBottom: "calc(76px + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-md items-center gap-2 px-5 py-2">
        <Button variant="primary" className="h-11 flex-1" onClick={onMove} disabled={moving}>
          {moving
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <><PackagePlus className="h-4 w-4" /> {allInCart ? "Sposta tutto in dispensa" : `Sposta ${cartCount} in dispensa`}</>}
        </Button>
        <button
          onClick={onRemove}
          aria-label="Rimuovi dal carrello"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-hair text-stone-500 transition hover:bg-tomato/10 hover:text-tomato"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default function ShoppingTab({
  shared = false,
  shopping,
  onAdd, onToggle, onDelete, onToggleAll, onMoveChecked, onClearChecked,
  movingChecked, byAisle, setByAisle,
  catFor, onAutoSave, onOpenVoice, onNotify,
  historyNames = [], pantryNames = [],
}) {
  const [name, setName] = useState(""); // campo di inserimento in linea
  const inputRef = useRef(null);
  const [awake, setAwake] = useState(false);
  const wakeRef = useRef(null);

  // Carrello = articoli `checked`; lista = quelli ancora da prendere.
  const cart = shopping.filter((s) => s.checked);
  const todo = shopping.filter((s) => !s.checked);
  const cartCount = cart.length;
  const allInCart = shopping.length > 0 && cartCount === shopping.length;

  // --- Autocompletamento del campo: mentre scrivi, suggerisce da storico
  // acquisti → dispensa → catalogo prodotti comuni (in quest'ordine di
  // priorità, deduplicati). Tutto offline e istantaneo, niente AI. ---
  const suggestPool = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const n of [...historyNames, ...pantryNames, ...CATALOG_NAMES]) {
      const k = norm(n);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(n);
    }
    return out;
  }, [historyNames, pantryNames]);
  // Ciò che è già in lista non va ri-suggerito (sarebbe rumore).
  const inList = useMemo(() => new Set(shopping.map((s) => norm(s.name))), [shopping]);
  const suggestions = useMemo(() => {
    const q = norm(name);
    if (!q) return [];
    // Tre livelli di pertinenza: prefisso del nome intero, prefisso di una
    // parola qualsiasi (es. "cotto" → "Prosciutto cotto"), match a metà parola.
    const starts = [], wordStarts = [], contains = [];
    for (const n of suggestPool) {
      const k = norm(n);
      if (k === q || inList.has(k)) continue;
      if (k.startsWith(q)) starts.push(n);
      else if (k.split(" ").some((w) => w.startsWith(q))) wordStarts.push(n);
      else if (k.includes(q)) contains.push(n);
    }
    return [...starts, ...wordStarts, ...contains].slice(0, 6);
  }, [suggestPool, inList, name]);

  // Wake Lock: tiene lo schermo acceso mentre fai la spesa (se supportato).
  const wakeSupported = typeof navigator !== "undefined" && "wakeLock" in navigator;

  // La lampadina è icona-sola e il suo significato non si scopre da soli:
  // UNA volta per dispositivo, alla prima lista non vuota, un toast spiega
  // a cosa serve. Il flag si scrive solo quando l'hint viene mostrato.
  const hasItems = shopping.length > 0;
  useEffect(() => {
    if (!wakeSupported || !hasItems) return;
    try {
      if (localStorage.getItem("dispensa-wake-hint")) return;
      localStorage.setItem("dispensa-wake-hint", "1");
      onNotify("💡 Tocca la lampadina in alto per tenere lo schermo acceso mentre fai la spesa");
    } catch { /* niente hint */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasItems]);
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
    const onVis = () => { if (document.visibilityState === "visible") acquire(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      wakeRef.current?.release?.().catch(() => {});
      wakeRef.current = null;
    };
  }, [awake]);

  // Tocco sulla riga: mette nel carrello / rimette in lista.
  const selectItem = (it) => onToggle(it.id, !it.checked);

  // --- Pannello di modifica (si apre col tap sul nome; senza scadenze) ---
  const [editId, setEditId] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [qtyDraft, setQtyDraft] = useState("");
  const panelRef = useRef(null);
  const openItemRef = useRef(null);
  const snapRef = useRef({});
  const lastRef = useRef({});
  const qtyTimer = useRef(null);

  function commitQtyNow(v) {
    const it = openItemRef.current;
    const val = String(v).trim();
    if (!it || !val || val === String(lastRef.current.qty)) return;
    lastRef.current.qty = val;
    onAutoSave(it, { qty: val }, { qty: snapRef.current.qty });
  }
  function scheduleQty(v) {
    setQtyDraft(v);
    clearTimeout(qtyTimer.current);
    qtyTimer.current = setTimeout(() => commitQtyNow(v), 800);
  }
  function commitNameNow() {
    const it = openItemRef.current;
    if (!it) return;
    const val = draftName.trim();
    if (!val || val === lastRef.current.name) return;
    const cap = val.charAt(0).toUpperCase() + val.slice(1);
    lastRef.current.name = cap;
    setDraftName(cap);
    onAutoSave(it, { name: cap }, { name: snapRef.current.name });
  }
  function flushEdit() {
    clearTimeout(qtyTimer.current);
    if (!openItemRef.current) return;
    commitQtyNow(qtyDraft);
    commitNameNow();
  }
  function openEdit(it) {
    flushEdit();
    setEditId(it.id);
    openItemRef.current = it;
    snapRef.current = { name: it.name, qty: it.qty, category: catFor(it.name) };
    lastRef.current = { name: it.name, qty: it.qty };
    setDraftName(it.name);
    setQtyDraft(it.qty);
    // Porta il pannello in vista appena sopra il FAB (block:"nearest" = scroll
    // minimo; lo scroll-margin-bottom del pannello riserva lo spazio per
    // navbar/FAB/barra azioni). Niente centratura: evita il vuoto sotto.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }));
  }
  function closeEdit(flush = true) {
    if (flush) flushEdit();
    clearTimeout(qtyTimer.current);
    setEditId(null);
    openItemRef.current = null;
  }
  function chooseCategory(c) {
    const it = openItemRef.current;
    if (!it || c === catFor(it.name)) return;
    onAutoSave(it, { category: c }, { category: snapRef.current.category });
  }
  function applyUnit(u) {
    const DEFAULTS = { "": "1", g: "100 g", kg: "1 kg", l: "1 l" };
    const v = DEFAULTS[u] ?? "1";
    setQtyDraft(v);
    clearTimeout(qtyTimer.current);
    commitQtyNow(v);
  }

  // Il pannello si chiude toccando un punto qualsiasi fuori da esso.
  useEffect(() => {
    if (!editId) return;
    const onDoc = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) closeEdit();
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, qtyDraft, draftName]);

  function renderEditPanel(it) {
    const curUnit = String(qtyDraft).replace(/-?\d+([.,]\d+)?/, "").trim().toLowerCase();
    return (
      <li key={it.id} ref={panelRef} className="-mx-1 my-1 scroll-mb-[150px] rounded-xl bg-stone-50 p-3">
        {/* Vista prodotto standard (ProductFields), come Dispensa/Aggiungi/
            Revisione. Qui niente scadenza: è una lista della spesa. */}
        <ProductFields
          name={draftName}
          onName={setDraftName}
          onNameBlur={commitNameNow}
          category={catFor(it.name)}
          onCategory={chooseCategory}
          onDelete={() => { closeEdit(false); onDelete(it.id); }}
          qtyValue={formatQtyDisplay(qtyDraft)}
          onQtyInput={(v) => scheduleQty(v.replace("½", "0,5"))}
          onMinus={() => scheduleQty(adjustQty(qtyDraft, -1))}
          onPlus={() => scheduleQty(adjustQty(qtyDraft, 1))}
          minusDisabled={atMinQty(qtyDraft)}
          unitActive={curUnit}
          onUnit={applyUnit}
        />
      </li>
    );
  }

  // --- Inserimento in linea ---
  async function add(n) {
    const clean = String(n ?? name).trim();
    if (!clean) return;
    const res = await onAdd(clean, "1");
    if (res?.merged) onNotify(<><strong>{clean}</strong> era già in lista: quantità aumentata</>);
    setName("");
    inputRef.current?.focus();
  }

  function shareList() {
    const lines = shopping.map((x) => `• ${x.name}${x.qty && x.qty !== "1" ? ` — ${x.qty}` : ""}`);
    const text = `🛒 Lista della spesa:\n${lines.join("\n")}`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => { /* condivisione annullata */ });
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => onNotify("Lista copiata negli appunti."), () => {});
    }
  }

  // Reparti nell'ordine del giro classico del supermercato. Solo i prodotti
  // ancora da prendere; quelli nel carrello vanno nel reparto "Nel carrello".
  const groups = AISLE_ORDER
    .map((c) => ({ cat: c, list: todo.filter((s) => catFor(s.name) === c) }))
    .filter((g) => g.list.length > 0);

  const renderItems = (list) =>
    list.map((it) =>
      editId === it.id
        ? renderEditPanel(it)
        : <ShoppingRow key={it.id} it={it} onSelect={selectItem} onEdit={openEdit} onDelete={onDelete} />
    );

  return (
    <div className="pt-2">
      <div className="flex items-start justify-between">
        <h1 className="font-display text-[40px] font-extrabold leading-[0.98] tracking-tight text-ink">La spesa</h1>
        <div className="-mr-1 mt-1 flex gap-0.5">
          {wakeSupported && shopping.length > 0 && (
            <button
              onClick={() => {
                const next = !awake;
                setAwake(next);
                onNotify(next ? "💡 Schermo sempre acceso mentre fai la spesa" : "Lo schermo può spegnersi di nuovo");
              }}
              aria-pressed={awake}
              className={`rounded-lg p-1.5 transition ${awake ? "bg-tomato/10 text-tomato" : "text-stone-500 hover:bg-stone-100 hover:text-ink"}`}
              title="Tieni lo schermo acceso"
              aria-label="Tieni lo schermo acceso"
            >
              <Lightbulb className="h-5 w-5" />
            </button>
          )}
          {shopping.length > 0 && (
            <button
              onClick={shareList}
              className="rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-100 hover:text-ink"
              title="Condividi la lista"
              aria-label="Condividi la lista"
            >
              <Share2 className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Occhiello + inserimento: bloccati in alto durante lo scroll. */}
      <div className="sticky top-0 z-20 -mx-5 mt-2 bg-cream/95 px-5 pb-1.5 pt-2.5 backdrop-blur">
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-tomato">{shared ? "La nostra lista" : "La tua lista"}</div>
        <div data-tour="shopping-input" className="relative">
          <Pencil className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-tomato" />
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Scrivi o dimmi cosa ti manca…"
            className="w-full border-0 border-b border-ink/20 bg-transparent py-2.5 pl-7 pr-10 text-sm text-ink outline-none focus:border-ink"
          />
          {/* Mentre scrivi il microfono diventa una X per svuotare il campo; a
              campo vuoto torna microfono (dettatura). Coerenza voce↔manuale. */}
          {name ? (
            <button
              type="button"
              onClick={() => { setName(""); inputRef.current?.focus(); }}
              aria-label="Cancella"
              title="Cancella"
              className="absolute right-0 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-stone-500 transition hover:text-ink active:scale-90"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenVoice}
              aria-label="Aggiungi a voce"
              title="Aggiungi a voce"
              className="absolute right-0 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-tomato transition active:scale-90"
            >
              <Mic className="h-[22px] w-[22px]" />
            </button>
          )}
        </div>

        {/* Autocompletamento: le stesse chip di "Aggiungi a mano". Un tap e il
            prodotto entra in lista (pointerdown: funziona con la tastiera iOS
            aperta, senza che il blur chiuda le chip prima del tocco). */}
        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestions.map((n) => (
              <button
                key={n}
                onPointerDown={(e) => { e.preventDefault(); add(n); }}
                className="flex items-center gap-1.5 rounded-full border border-hair bg-paper px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-tomato hover:text-tomato"
              >
                <span className="text-sm leading-none">{CAT_ICON[catFor(n)] || "🍽️"}</span>
                {n}
              </button>
            ))}
          </div>
        )}

        {/* Controlli sempre in alto, sotto la barra di testo. */}
        {shopping.length > 0 && (
          <TopControls
            byAisle={byAisle}
            setByAisle={setByAisle}
            allSelected={allInCart}
            onSelectAll={onToggleAll}
          />
        )}
      </div>

      {shopping.length === 0 && (
        <p className="py-12 text-center text-sm text-stone-500">
          La lista è vuota. Scrivi qui sopra cosa ti manca, dettalo col microfono
          o aggiungi i mancanti da una ricetta.
        </p>
      )}

      {/* La lista inizia sotto l'input; un filo di margine in più così la prima
          categoria non finisce sotto la fascia dei controlli. */}
      <div className="mt-2">
        {shopping.length > 0 && (
          <>
            {byAisle ? (
              <div className="space-y-5">
                {groups.map(({ cat, list }) => (
                  <section key={cat}>
                    <div className="flex items-center gap-2 border-b border-ink/10 pb-2">
                      <span className="text-base">{CAT_ICON[cat]}</span>
                      <h4 className="font-display text-base font-bold uppercase tracking-wide text-ink">{cat}</h4>
                      <span className="font-display text-sm font-bold text-tomato">{list.length}</span>
                    </div>
                    <ul className="divide-y divide-hair">{renderItems(list)}</ul>
                  </section>
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-hair">{renderItems(todo)}</ul>
            )}

            {/* Tutto preso: messaggio al centro dov'erano i prodotti. */}
            {todo.length === 0 && cart.length > 0 && (
              <p className="py-6 text-center text-sm text-stone-500">Hai preso tutto! 🎉</p>
            )}

            {/* Reparto "Nel carrello": gli articoli presi, barrati. */}
            {cart.length > 0 && (
              <section className="mt-6">
                <div className="flex items-center gap-2 border-b border-tomato/30 pb-2">
                  <span className="text-base">🛒</span>
                  <h4 className="font-display text-base font-bold uppercase tracking-wide text-tomato">Nel carrello</h4>
                  <span className="font-display text-sm font-bold text-tomato">{cart.length}</span>
                </div>
                <ul className="divide-y divide-hair">{renderItems(cart)}</ul>
              </section>
            )}
          </>
        )}
      </div>

      {/* Spazio in fondo: l'ultimo prodotto resta visibile sopra la nav (e
          sopra la barra "Sposta in dispensa" quando il carrello è pieno).
          Durante la modifica un filo di spazio in più, così l'ultima riga può
          salire appena sopra il FAB (il parcheggio lo fa scroll-margin-bottom). */}
      {shopping.length > 0 && (
        <div aria-hidden="true" style={{ height: editId ? "104px" : "calc(72px + env(safe-area-inset-bottom))" }} />
      )}

      <BottomBar
        cartCount={cartCount}
        allInCart={allInCart}
        moving={movingChecked}
        onMove={onMoveChecked}
        onRemove={onClearChecked}
      />
    </div>
  );
}
