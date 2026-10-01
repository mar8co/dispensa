// Scheda "Spesa": lista della spesa con CARRELLO.
// - Tocca una riga (intera) per metterla NEL CARRELLO (barrata); ritoccala per
//   rimetterla in lista. I prodotti nel carrello si raccolgono nel reparto
//   "Nel carrello" in fondo.
// - In alto (sotto la barra di testo): "Per reparto" e "Seleziona tutto",
//   sempre visibili. In fondo alla lista (non fissa): "Sposta in dispensa" +
//   cestino, solo quando il carrello non è vuoto. Luce e condivisione stanno
//   sulla riga dell'avatar (portal in #testata-azioni).
// - Pressione lunga sulla riga: apre l'editor (quantità/reparto/nome).
// NB sul data layer: il "carrello" è il campo persistito `checked` degli item
// (uso solo i prop esistenti: onToggle/onToggleAll/onMoveChecked/onClearChecked).
// Nessuna query/tabella/campo modificato.
import { onOutsideTap } from "../lib/outsideTap.js";
import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Pencil, Mic, Check, Trash2, Loader2, Store,
  Share, Lightbulb, X,
} from "lucide-react";
import { AISLE_ORDER, CAT_ICON, CATALOG_NAMES } from "../constants.js";
import { atMinQty, adjustQty, formatQtyDisplay, matchKey } from "../lib/pantry.js";
import Button from "./Button.jsx";
import ProductFields from "./ProductFields.jsx";
import Barattoli from "./Barattoli.jsx";

// --- Riga prodotto. Gesti:
// • tap sul nome = apre la modifica;
// • tap sul resto della riga (o sul pallino a destra) = mette/toglie dal carrello;
// • swipe ← (verso sinistra) = elimina;
// • swipe → (verso destra) = apre la modifica.
// Accessibile (role=button, tastiera = modifica; il pallino è un bottone reale). ---
function ShoppingRow({ it, onSelect, onEdit, onDelete }) {
  const selected = !!it.checked;
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef(null);
  const axis = useRef(null); // "h" | "v" | null
  const nameRef = useRef(null); // zona "modifica" della riga
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
    // Tocco: sul nome = modifica; sul resto della riga = carrello (30/09).
    if (wasTap) {
      if (nameRef.current?.contains(e.target)) onEdit(it);
      else onSelect(it);
    }
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
      {/* Sfondi azione, rivelati dallo scorrimento: modifica (sx, nero) /
          elimina (dx, rosso). Il colore esiste solo mentre la riga è spostata. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 flex items-center justify-between text-[0.95rem] font-extrabold tracking-[-0.01em] ${
          dx > 4 ? "bg-ink text-crema" : dx < -4 ? "bg-rosso-elimina text-white" : ""
        }`}
      >
        <span className={`flex items-center gap-1.5 pl-4 transition-opacity ${dx > 4 ? "opacity-100" : "opacity-0"}`}>
          <Pencil className="h-4 w-4" /> Modifica
        </span>
        <span className={`flex items-center gap-1.5 pr-4 transition-opacity ${dx < -4 ? "opacity-100" : "opacity-0"}`}>
          Elimina <Trash2 className="h-4 w-4" />
        </span>
      </div>

      {/* Riga in primo piano, traslata dallo swipe (sfondo opaco = copre gli
          hint). Tap sul nome = modifica, altrove = carrello (vedi up()). */}
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
        className="relative flex min-h-[50px] cursor-pointer select-none items-center gap-3 bg-sfondo py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
      >
        {/* Il nome (con un filo d'aria in più per il dito) apre la modifica; il
            resto della riga, spazio vuoto compreso, mette nel carrello. */}
        <span ref={nameRef} className={`min-w-0 truncate py-2 pr-4 text-[1.06rem] font-[650] tracking-[-0.02em] ${selected ? "text-ink/45 line-through" : "text-ink"}`}>
          {it.name}
        </span>
        <span aria-hidden="true" className="flex-1 self-stretch" />
        {/* Quantità in spazio dedicato (solo se impostata, ≠ "1") */}
        {it.qty && it.qty !== "1" && (
          <span className={`num shrink-0 text-[0.95rem] font-bold tracking-[-0.01em] ${selected ? "text-ink/45 line-through" : "text-ink"}`}>
            {formatQtyDisplay(it.qty)}
          </span>
        )}
        {/* Cerchio carrello: bottone REALE (area di tocco 44px, cerchio 28px
            centrato). stopPropagation così il tocco non apre la modifica e non
            avvia lo swipe. */}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onSelect(it); }}
          aria-pressed={selected}
          aria-label={selected ? "Rimetti in lista" : "Metti nel carrello"}
          className="-mr-1.5 flex h-11 w-11 shrink-0 items-center justify-center"
        >
          <span
            aria-hidden="true"
            className={`flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-ink transition ${
              selected ? "bg-ink text-white" : "text-transparent"
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
    <div className="mt-3 flex items-center justify-between">
      {/* Pillola "Per reparto": piena nera quando attiva */}
      <button
        onClick={() => setByAisle((v) => !v)}
        aria-pressed={byAisle}
        className="pillola min-h-[38px] px-3.5 text-[0.88rem]"
      >
        <Store className="h-4 w-4" /> Per reparto
      </button>
      {/* Azione testuale (niente box): link sottolineato */}
      {/* "Rimetti in lista" (deseleziona, reversibile) e NON "Svuota
          carrello": quella dicitura si confondeva col cestino della barra in
          basso, che invece ELIMINA i prodotti presi. */}
      <button
        onClick={onSelectAll}
        className="link flex h-10 items-center text-[0.9rem] text-ink"
      >
        {allSelected ? "Rimetti in lista" : "Seleziona tutto"}
      </button>
    </div>
  );
}

// --- "Sposta in dispensa" + cestino: in fondo alla lista, dopo "Nel carrello"
// (30/09: non più fissa sopra la barra, così non resta sempre in vista).
// Compare solo quando il carrello NON è vuoto. ---
function BottomBar({ cartCount, allInCart, moving, onMove, onRemove }) {
  if (cartCount === 0) return null;
  return (
    <div className="mt-5">
      <div className="flex items-center gap-2">
        <Button variant="primary" className="flex-1" onClick={onMove} disabled={moving}>
          {moving
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <><Barattoli size={26} className="-my-1 text-crema" /> {allInCart ? "Sposta tutto in dispensa" : `Sposta ${cartCount} in dispensa`}</>}
        </Button>
        <button
          onClick={onRemove}
          aria-label="Rimuovi dal carrello"
          className="tondo h-[50px] w-[50px]"
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
  //
  // Chiave di confronto TOLLERANTE (solo per il matching, mai per il testo
  // mostrato): matchKey riconduce i plurali noti al singolare (pomodori →
  // pomodoro), poi si tolgono anche gli accenti (NFD + rimozione dei segni
  // diacritici via \p{Diacritic}) così "caffe" trova "Caffè". Locale a questo
  // componente: non tocca norm()/matchKey() condivise né la logica di merge
  // altrove.
  const foldKey = (s) => matchKey(s).normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const suggestPool = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const n of [...historyNames, ...pantryNames, ...CATALOG_NAMES]) {
      const k = foldKey(n);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(n);
    }
    return out;
  }, [historyNames, pantryNames]);
  // Ciò che è già in lista non va ri-suggerito (sarebbe rumore).
  const inList = useMemo(() => new Set(shopping.map((s) => foldKey(s.name))), [shopping]);
  const suggestions = useMemo(() => {
    const q = foldKey(name);
    if (!q) return [];
    // NON si esclude il caso "hai già scritto esattamente questo nome": la
    // pillola resta comunque toccabile (conferma rapida, es. "Patate" scritto
    // per intero continua a mostrare la chip "Patate" invece di sparire).
    // Tre livelli di pertinenza: prefisso del nome intero, prefisso di una
    // parola qualsiasi (es. "cotto" → "Prosciutto cotto"), match a metà parola.
    const starts = [], wordStarts = [], contains = [];
    for (const n of suggestPool) {
      const k = foldKey(n);
      if (inList.has(k)) continue;
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
      onNotify("💡 Tocca la lampadina in alto per tenere lo schermo acceso mentre fai la spesa", undefined, undefined, "giallo", 3000);
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

  // Il pannello si chiude toccando un punto qualsiasi fuori da esso; quel
  // tocco non fa nient'altro (vedi lib/outsideTap.js).
  useEffect(() => {
    if (!editId) return;
    return onOutsideTap(() => panelRef.current, closeEdit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, qtyDraft, draftName]);

  function renderEditPanel(it) {
    const curUnit = String(qtyDraft).replace(/-?\d+([.,]\d+)?/, "").trim().toLowerCase();
    return (
      <li key={it.id} ref={panelRef} className="-mx-2 my-1.5 scroll-mb-[calc(var(--nav-bottom)+var(--nav-h)+90px)] rounded-card bg-white p-3 shadow-card">
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

  // Luce e condivisione stanno sulla riga dell'avatar (testata di
  // Dispensa.jsx, contenitore #testata-azioni), a destra.
  const [azioni, setAzioni] = useState(null);
  useEffect(() => { setAzioni(document.getElementById("testata-azioni")); }, []);

  return (
    <div className="pt-2">
      <h1 className="gigante">La spesa</h1>
      {azioni && createPortal(
        <>
          {wakeSupported && shopping.length > 0 && (
            <button
              onClick={() => {
                const next = !awake;
                setAwake(next);
                // Avvisi della lampadina: pillola gialla, brevi (2 s).
                onNotify(next ? "💡 Schermo sempre acceso mentre fai la spesa" : "Lo schermo può spegnersi di nuovo", undefined, undefined, "giallo", 2000);
              }}
              aria-pressed={awake}
              className={`tondo ${awake ? "bg-giallo" : ""}`}
              title="Tieni lo schermo acceso"
              aria-label="Tieni lo schermo acceso"
            >
              <Lightbulb className="h-[18px] w-[18px]" />
            </button>
          )}
          {shopping.length > 0 && (
            <button
              onClick={shareList}
              className="tondo"
              title="Condividi la lista"
              aria-label="Condividi la lista"
            >
              <Share className="h-[18px] w-[18px]" />
            </button>
          )}
        </>,
        azioni,
      )}

      {/* Occhiello + inserimento: bloccati in alto durante lo scroll. */}
      <div className="sticky top-0 z-20 -mx-4 mt-4 bg-sfondo px-4 pb-1.5 pt-2">
        <div className="micro">{shared ? "La nostra lista" : "La tua lista"}</div>
        <div data-tour="shopping-input" className="relative">
          <Pencil className="pointer-events-none absolute left-0 top-1/2 h-5 w-5 -translate-y-1/2 text-ink" />
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Scrivi o dimmi cosa ti manca…"
            className="campo testo-grande pl-8 pr-10 text-[1.06rem] text-ink"
          />
          {/* Mentre scrivi il microfono diventa una X per svuotare il campo; a
              campo vuoto torna microfono (dettatura). Coerenza voce↔manuale. */}
          {name ? (
            <button
              type="button"
              onClick={() => { setName(""); inputRef.current?.focus(); }}
              aria-label="Cancella"
              title="Cancella"
              className="absolute -right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-ink transition active:scale-90"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenVoice}
              aria-label="Aggiungi a voce"
              title="Aggiungi a voce"
              className="absolute -right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-ink transition active:scale-90"
            >
              <Mic className="h-[22px] w-[22px]" />
            </button>
          )}
        </div>

        {/* Autocompletamento: le stesse chip (testo puro) di "Aggiungi a
            mano". Un tap e il prodotto entra in lista (pointerdown: funziona
            con la tastiera iOS aperta, senza che il blur chiuda le chip prima
            del tocco). */}
        {suggestions.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {suggestions.map((n) => (
              <button
                key={n}
                onPointerDown={(e) => { e.preventDefault(); add(n); }}
                className="pillola min-h-[34px] px-3 text-[0.84rem]"
              >
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
        {/* Tutto nel carrello: l'azione finale sale anche qui in alto (quella
            in fondo alla lista resta, col cestino). */}
        {allInCart && (
          <Button variant="primary" className="mt-3 w-full" onClick={onMoveChecked} disabled={movingChecked}>
            {movingChecked
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <><Barattoli size={26} className="-my-1 text-crema" /> Sposta tutto in dispensa</>}
          </Button>
        )}
      </div>

      {shopping.length === 0 && (
        <p className="py-12 text-center text-[1.05rem] font-semibold text-tenue">
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
              <div>
                {groups.map(({ cat, list }) => (
                  <section key={cat}>
                    <div className="flex items-center gap-2 border-b-[1.5px] border-ink pb-[7px] pt-4">
                      <span className="text-[1.15rem] leading-none">{CAT_ICON[cat]}</span>
                      <h4 className="min-w-0 truncate text-[1.3rem] font-extrabold leading-none tracking-[-0.04em] text-ink">{cat}</h4>
                      <span className="num text-[1.3rem] font-extrabold leading-none tracking-[-0.04em] text-tenue">{list.length}</span>
                    </div>
                    <ul className="divide-y divide-riga">{renderItems(list)}</ul>
                  </section>
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-riga">{renderItems(todo)}</ul>
            )}

            {/* Tutto preso: messaggio al centro dov'erano i prodotti. */}
            {todo.length === 0 && cart.length > 0 && (
              <p className="py-6 text-center text-[1.05rem] font-semibold text-tenue">Hai preso tutto! 🎉</p>
            )}

            {/* Reparto "Nel carrello": gli articoli presi, barrati. */}
            {cart.length > 0 && (
              <section className="mt-4">
                <div className="flex items-center gap-2 border-b-[1.5px] border-ink pb-[7px] pt-4">
                  <span className="text-[1.15rem] leading-none">🛒</span>
                  <h4 className="text-[1.3rem] font-extrabold leading-none tracking-[-0.04em] text-ink">Nel carrello</h4>
                  <span className="num text-[1.3rem] font-extrabold leading-none tracking-[-0.04em] text-tenue">{cart.length}</span>
                </div>
                <ul className="divide-y divide-riga">{renderItems(cart)}</ul>
              </section>
            )}
          </>
        )}
      </div>

      <BottomBar
        cartCount={cartCount}
        allInCart={allInCart}
        moving={movingChecked}
        onMove={onMoveChecked}
        onRemove={onClearChecked}
      />

      {/* Durante la modifica un filo di spazio in più, così l'ultima riga può
          salire sopra la barra (il parcheggio lo fa scroll-margin-bottom). */}
      {editId && <div aria-hidden="true" className="h-[104px]" />}
    </div>
  );
}
