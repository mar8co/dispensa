// Scheda Dispensa — vista "indice": sezioni a tutta larghezza per categoria,
// righe compatte con puntini di guida (nome ……… quantità), barra
// salta-reparto e intestazioni fisse durante lo scroll. Toccando un prodotto
// si aprono lì sotto i comandi: quantità, scadenza, modifica, elimina.
import { useState, useRef, useEffect } from "react";
import {
  Trash2, X, Search, ShoppingCart, AlertTriangle, ChefHat,
  Calendar, SlidersHorizontal, ArrowUp, ArrowDown, ChevronDown, Sparkles,
} from "lucide-react";
import { CATEGORIES, PICKER_CATS, CAT_ICON } from "../constants.js";
import { expiryStatus, formatExpiry, adjustQty, formatQtyDisplay } from "../lib/pantry.js";
import { tourSignal } from "../lib/tour.js";

const EXP_STYLE = {
  scaduto: "bg-tomato text-[#fff] ring-2 ring-tomato/30",
  oggi: "bg-tomato text-[#fff]",
  presto: "bg-tomato/10 text-tomato",
  settimana: "bg-amber-100 text-amber-700",
  ok: "bg-stone-100 text-stone-500",
};

function ExpiryBadge({ date, onlyUrgent = false }) {
  const st = expiryStatus(date);
  if (!st) return null;
  if (onlyUrgent && st === "ok") return null; // le date lontane non fanno rumore
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${EXP_STYLE[st]}`}>
      {formatExpiry(date)}
    </span>
  );
}

const editCls =
  "w-full rounded-lg border border-hair bg-paper px-2.5 py-2 text-sm text-ink outline-none focus:border-stone-400 focus:ring-2 focus:ring-tomato/15";

const SORTS = [
  ["recenti", "Recenti"],
  ["nome", "A-Z"],
  ["scadenza", "Scadenza"],
];

// Tono del nome a riposo: spento se finito, rosso se scade a brevissimo,
// ambra se scade in settimana.
function nameTone(it, out) {
  if (out) return "text-stone-400";
  const st = expiryStatus(it.expiry);
  if (st === "scaduto" || st === "oggi" || st === "presto") return "text-tomato";
  if (st === "settimana") return "text-amber-700";
  return "text-ink";
}

// Quantità a riposo: i numeri puri diventano "×3", il resto resta com'è.
const qtyLabel = (q) => (/^\d+$/.test(String(q).trim()) ? `×${String(q).trim()}` : formatQtyDisplay(q));


export default function PantryTab({
  search, setSearch, sort, setSort,
  grouped, cardRefs,
  onMoveCat, onAutoSave, onSetExpiry, removeItem,
  expiringCount, expFilter, setExpFilter, onCookExpiring, isOut, onToShopping, onCookWith,
}) {
  const searchActive = search.trim() !== "";
  const [openId, setOpenId] = useState(null); // pannello prodotto aperto
  const [sortOpen, setSortOpen] = useState(false); // chips ordinamento a comparsa
  const [expDraft, setExpDraft] = useState(""); // valore della scadenza nel pannello
  const [expOpen, setExpOpen] = useState(false); // box scadenza a comparsa (chiuso di default)
  const [catPickerOpen, setCatPickerOpen] = useState(false);
  // Barra sticky: espansione verticale di tutti i reparti (niente swipe).
  const [catsExpanded, setCatsExpanded] = useState(false);

  // --- Pannello prodotto con salvataggio automatico ---
  // Le modifiche si applicano da sole (nome al blur, quantità con una breve
  // attesa, categoria al tap) e il toast "Modifica salvata · Annulla"
  // permette di tornare ai valori di apertura.
  const [draftName, setDraftName] = useState("");
  const [qtyDraft, setQtyDraft] = useState("");
  const panelRef = useRef(null);
  const openItemRef = useRef(null); // prodotto aperto (com'era all'apertura)
  const snapRef = useRef({});       // valori originali per "Annulla"
  const lastRef = useRef({});       // ultimi valori salvati (rileva i cambi)
  const qtyTimer = useRef(null);
  const expTimer = useRef(null);
  const expInputRef = useRef(null); // input date: per aprire il calendario nativo

  function commitQtyNow(v) {
    const it = openItemRef.current;
    const val = String(v).trim();
    if (!it || !val || val === String(lastRef.current.qty)) return;
    lastRef.current.qty = val;
    onAutoSave(it, { qty: val }, { qty: snapRef.current.qty });
    tourSignal("qty-changed");
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
  // Scadenza: ogni modifica (calendario o selettore rapido) si salva da sola
  // con una breve attesa; nessun pulsante "Salva".
  function commitExpiryNow(v) {
    const it = openItemRef.current;
    if (!it) return;
    const val = v || "";
    if (val === lastRef.current.expiry) return;
    lastRef.current.expiry = val;
    onSetExpiry(it, val);
  }
  // La scadenza è un campo visibile nel pannello: ogni scelta dal calendario
  // (onChange = scelta reale, non provvisoria) si salva con una breve attesa.
  function scheduleExpiry(v) {
    setExpDraft(v);
    if (v) tourSignal("expiry-set"); // data scelta: fa avanzare il tutorial
    clearTimeout(expTimer.current);
    expTimer.current = setTimeout(() => commitExpiryNow(v), 400);
  }
  function flushPending() {
    clearTimeout(qtyTimer.current);
    clearTimeout(expTimer.current);
    if (!openItemRef.current) return;
    commitQtyNow(qtyDraft);
    commitNameNow();
    commitExpiryNow(expDraft);
  }
  function openPanel(it) {
    flushPending();
    setOpenId(it.id);
    tourSignal("product-opened");
    openItemRef.current = it;
    snapRef.current = { name: it.name, qty: it.qty, category: it.category, expiry: it.expiry };
    lastRef.current = { name: it.name, qty: it.qty, expiry: it.expiry || "" };
    setDraftName(it.name);
    setQtyDraft(it.qty);
    setExpDraft(it.expiry || "");
    setExpOpen(false); // box scadenza chiuso all'apertura (compare al tocco del calendario)
    setCatPickerOpen(false);
  }
  // Rimuove la scadenza e richiude il box (deve sparire del tutto, senza occupare spazio).
  function clearExpiry() {
    clearTimeout(expTimer.current);
    setExpDraft("");
    commitExpiryNow("");
    setExpOpen(false);
  }
  // Tocco sull'icona calendario: apre il box E fa comparire subito il selettore
  // data nativo (un solo tap). Se il box è già aperto, lo richiude.
  function toggleExpiry() {
    if (expOpen) { setExpOpen(false); return; }
    setExpOpen(true);
    tourSignal("expiry-opened"); // fa avanzare il tutorial al passo "scegli la data"
    // showPicker DEVE essere chiamato in modo SINCRONO nel gestore del tocco:
    // iOS Safari richiede la user-activation immediata (un rAF/timeout la perde
    // e il calendario non si apre). L'input è già nel DOM (clippato dal box),
    // quindi il selettore nativo compare subito insieme alla barra.
    const el = expInputRef.current;
    if (el) { try { el.showPicker(); } catch { el.focus(); } } // fallback se showPicker non c'è
  }
  function closePanel(flush = true) {
    if (flush) flushPending();
    clearTimeout(qtyTimer.current);
    clearTimeout(expTimer.current);
    setOpenId(null);
    openItemRef.current = null;
    setCatPickerOpen(false);
  }
  function chooseCategory(c) {
    const it = openItemRef.current;
    setCatPickerOpen(false);
    if (!it || c === it.category) return;
    openItemRef.current = { ...it, category: c };
    onAutoSave(it, { category: c }, { category: snapRef.current.category });
  }
  // Cambio unità: la quantità si RESETTA sempre al default dell'unità
  // scelta (mai ereditata dal valore precedente — 100 g → pz dà 1 pz,
  // non 100 pz): pz → 1, g → 100, kg → 1, l → 1.
  function applyUnit(u) {
    const DEFAULTS = { "": "1", g: "100 g", kg: "1 kg", l: "1 l" };
    const v = DEFAULTS[u] ?? "1";
    setQtyDraft(v);
    clearTimeout(qtyTimer.current);
    commitQtyNow(v);
    tourSignal("unit-changed");
  }

  // Il pannello si chiude toccando un punto qualsiasi fuori da esso.
  useEffect(() => {
    if (!openId) return;
    const onDoc = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) closePanel();
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
    // expDraft incluso: senza, chiudendo il pannello subito dopo aver scelto
    // SOLO la scadenza, il flush usava un expDraft "vecchio" e la data non
    // veniva salvata (a meno di toccare anche la quantità).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, qtyDraft, draftName, expDraft]);

  // Salta alla categoria: si chiude prima il menù espanso, poi (frame
  // successivo, a layout aggiornato) si scrolla — altrimenti l'altezza del
  // menù aperto falsa la posizione e si finisce sulla categoria sotto.
  function jumpTo(cat) {
    setCatsExpanded(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cardRefs.current[cat]?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  // Primo prodotto in assoluto: bersaglio dello spotlight nel tutorial.
  const firstItemId = grouped[0]?.list?.[0]?.id;

  return (
    <div className="pt-2">
      {/* Header editoriale (il profilo è nella navbar in basso) */}
      <h1 className="font-display text-[40px] font-extrabold leading-[0.98] tracking-tight text-ink">Ciao 👋<br />Hai fame?</h1>

      {/* Occhiello rosso + ricerca: bloccati insieme in alto durante lo scroll
          (con l'ordinamento dietro l'icona). */}
      <div className="sticky top-0 z-30 -mx-5 mt-4 bg-cream/95 px-5 pb-1.5 pt-2 backdrop-blur">
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-tomato">La tua dispensa</div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          className={`w-full border-0 border-b border-ink/20 bg-transparent py-2.5 pl-7 text-sm text-ink outline-none focus:border-ink ${searchActive ? "pr-16" : "pr-9"}`}
          placeholder="Cerca un prodotto"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {searchActive && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-8 top-1/2 -translate-y-1/2 rounded-md p-1 text-stone-400 hover:bg-stone-100"
            aria-label="Cancella ricerca"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {grouped.length > 0 && (
          <button
            onClick={() => setSortOpen((v) => !v)}
            aria-expanded={sortOpen}
            className={`absolute right-0 top-1/2 -translate-y-1/2 rounded-md p-1 transition hover:bg-stone-100 ${
              sort !== "recenti" ? "text-tomato" : "text-stone-400"
            }`}
            aria-label="Ordinamento"
            title="Ordinamento"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Chips ordinamento: compaiono solo al tocco dell'icona */}
      {sortOpen && grouped.length > 0 && (
        <div className="animate-fade-in mt-2 flex gap-1.5">
          {SORTS.map(([v, l]) => (
            <button
              key={v}
              onClick={() => { setSort(v); setSortOpen(false); }}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                sort === v ? "border-ink bg-ink text-white" : "border-hair bg-paper text-stone-500 hover:bg-stone-50"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      )}
      </div>{/* fine barra ricerca sticky */}

      {/* Striscia scadenze */}
      {expiringCount > 0 && (
        <div className="mt-3 overflow-hidden rounded-xl border border-amber-700/30 bg-amber-100/60">
          <button
            onClick={() => setExpFilter(!expFilter)}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
            <span className="flex-1 text-xs font-semibold text-amber-700">
              {expiringCount} {expiringCount === 1 ? "prodotto" : "prodotti"} in scadenza entro 7 giorni
            </span>
            <span className="shrink-0 text-[11px] font-bold text-amber-700 underline">
              {expFilter ? "mostra tutto" : "mostra"}
            </span>
          </button>
          {expFilter && (
            <button
              onClick={onCookExpiring}
              className="flex w-full items-center justify-center gap-1.5 border-t border-amber-700/20 px-3 py-2.5 text-xs font-bold text-tomato transition hover:bg-tomato/5"
            >
              <ChefHat className="h-4 w-4" /> Cucina con questi
            </button>
          )}
        </div>
      )}

      {/* Barra salta-reparto, fissa in alto: una riga di chips (quelle che
          ci stanno) e la freccina che "srotola" le righe successive — la
          riga visibile è la prima riga del menù espanso. Niente scorrimento
          laterale, niente numeri. */}
      {grouped.length > 1 && (
        <div className="sticky top-[4.5rem] z-20 -mx-5 mt-3 bg-cream/95 px-5 py-2 backdrop-blur">
          <div className="flex items-start gap-1.5">
            {/* Chiuso: riga unica scorrevole (swipe) come prima. Aperto: le
                stesse chip vanno a capo su più righe — la prima riga coincide
                con quella già visibile, niente duplicazione. */}
            <div
              className={`min-w-0 flex-1 ${
                catsExpanded
                  ? "flex flex-wrap gap-2"
                  : "no-scrollbar flex flex-nowrap gap-1.5 overflow-x-auto"
              }`}
              // Da chiuso, le chip sfumano sul bordo destro invece di
              // essere troncate di netto (effetto più morbido verso la freccia).
              style={catsExpanded ? undefined : {
                maskImage: "linear-gradient(to right, #000 calc(100% - 20px), transparent)",
                WebkitMaskImage: "linear-gradient(to right, #000 calc(100% - 20px), transparent)",
              }}
            >
              {grouped.map(({ cat }) => (
                <button
                  key={cat}
                  onClick={() => jumpTo(cat)}
                  // Stessa misura sia nella barra scorrevole sia nel menù aperto.
                  className="shrink-0 rounded-full border border-hair bg-paper px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-tomato hover:text-tomato"
                >
                  {CAT_ICON[cat]} {cat}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCatsExpanded((v) => !v)}
              aria-expanded={catsExpanded}
              className={`mt-1 shrink-0 p-1 transition ${
                catsExpanded ? "text-tomato" : "text-stone-400 hover:text-tomato"
              }`}
              aria-label="Mostra tutti i reparti"
              title="Tutti i reparti"
            >
              <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${catsExpanded ? "rotate-180" : ""}`} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      )}

      {grouped.length === 0 && (
        <p className="py-12 text-center text-sm text-stone-400">
          {searchActive ? "Nessun prodotto trovato." : expFilter ? "Niente in scadenza. 🎉" : "Dispensa vuota. Tocca + per aggiungere."}
        </p>
      )}

      {/* Sezioni a tutta larghezza, con intestazione fissa */}
      <div className="space-y-5">
        {grouped.map(({ cat, list }, gi) => (
          <section
            key={cat}
            ref={(el) => { cardRefs.current[cat] = el; }}
            style={{ scrollMarginTop: "124px" }}
          >
            <div className="sticky top-12 z-10 -mx-1 flex items-center gap-2 border-b border-ink/15 bg-cream px-1 pb-2 pt-2">
              <span className="text-base">{CAT_ICON[cat]}</span>
              <h2 className="min-w-0 truncate font-display text-lg font-semibold text-ink">{cat}</h2>
              <span className="font-display text-sm font-bold text-tomato">{String(list.length).padStart(2, "0")}</span>
              {/* Frecce per riordinare, nude e discrete: la prima categoria
                  può solo scendere, l'ultima solo salire */}
              <div className="ml-auto flex shrink-0 items-center">
                {gi > 0 && (
                  <button
                    onClick={() => onMoveCat(cat, -1)}
                    className="p-1.5 text-stone-400 transition hover:text-tomato active:scale-90 active:text-tomato"
                    aria-label="Sposta su"
                  >
                    <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.2} />
                  </button>
                )}
                {gi < grouped.length - 1 && (
                  <button
                    onClick={() => onMoveCat(cat, 1)}
                    className="p-1.5 text-stone-400 transition hover:text-tomato active:scale-90 active:text-tomato"
                    aria-label="Sposta giù"
                  >
                    <ArrowDown className="h-[18px] w-[18px]" strokeWidth={2.2} />
                  </button>
                )}
              </div>
            </div>

            <ul>
              {list.map((it) => {
                const out = isOut(it);

                // Modifica: nome + categoria, in linea
                // Pannello prodotto: tutto modificabile, salvataggio automatico.
                if (openId === it.id) {
                  const curUnit = String(qtyDraft).replace(/-?\d+([.,]\d+)?/, "").trim().toLowerCase();
                  return (
                    <li key={it.id} ref={panelRef} className="-mx-2 my-1 rounded-xl bg-stone-50 p-3">
                      {/* Riga 1: nome editabile · categoria · calendario · elimina.
                          Sempre visibile; il box scadenza compare solo al tocco
                          dell'icona calendario (vedi sotto). */}
                      <div className="flex items-center gap-1.5">
                        <input
                          className={`${editCls} min-w-0 flex-1`}
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          onBlur={commitNameNow}
                          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                          aria-label="Nome prodotto"
                        />
                        <button
                          onClick={() => setCatPickerOpen((v) => !v)}
                          aria-label="Categoria"
                          title="Categoria"
                          className={`flex h-9 max-w-[42%] shrink-0 items-center gap-1 rounded-lg border px-2 transition ${
                            catPickerOpen ? "border-tomato bg-tomato/5" : "border-hair bg-paper"
                          }`}
                        >
                          <span className="text-base">{CAT_ICON[it.category]}</span>
                          <span className="truncate text-sm font-medium text-ink">{it.category}</span>
                          <ChevronDown className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${catPickerOpen ? "rotate-180" : ""}`} />
                        </button>
                        <button
                          data-tour="expiry-field"
                          onClick={toggleExpiry}
                          aria-label="Data di scadenza"
                          aria-expanded={expOpen}
                          title="Scadenza"
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
                            expOpen || expDraft ? "border-tomato bg-tomato/5 text-tomato" : "border-hair bg-paper text-stone-500"
                          }`}
                        >
                          <Calendar className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { closePanel(false); removeItem(it); }}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-hair bg-paper text-stone-500 transition hover:bg-tomato/10 hover:text-tomato"
                          aria-label="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Categorie come chips: un solo tap per scegliere */}
                      {catPickerOpen && (
                        <div className="animate-fade-in mt-2.5 flex flex-wrap gap-1.5">
                          {PICKER_CATS.map((c) => (
                            <button
                              key={c}
                              onClick={() => chooseCategory(c)}
                              className={`rounded-full border px-2.5 py-1.5 text-xs font-semibold transition ${
                                c === it.category
                                  ? "border-tomato bg-tomato text-white"
                                  : "border-hair bg-paper text-stone-600 hover:border-tomato hover:text-tomato"
                              }`}
                            >
                              {CAT_ICON[c]} {c}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Box scadenza a comparsa: nascosto di default, si apre con
                          una transizione fluida (slide verticale + fade) al tocco
                          del calendario. Il padding sta DENTRO l'area clippata, così
                          a box chiuso non occupa spazio. */}
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-out ${
                          expOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="pt-3">
                          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                            <Calendar className="h-3.5 w-3.5" /> Data di scadenza
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              ref={expInputRef}
                              data-tour="expiry-box"
                              type="date"
                              value={expDraft}
                              onChange={(e) => scheduleExpiry(e.target.value)}
                              className="min-w-0 flex-1 rounded-lg border border-hair bg-paper px-2.5 py-2 text-sm text-ink outline-none focus:border-stone-400 focus:ring-2 focus:ring-tomato/15"
                              aria-label="Data di scadenza"
                            />
                            {expDraft && (
                              <button
                                onClick={clearExpiry}
                                aria-label="Rimuovi scadenza"
                                className="flex h-9 shrink-0 items-center rounded-lg border border-tomato/30 px-3 text-xs font-semibold text-tomato transition hover:bg-tomato/5"
                              >
                                Elimina
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {out && (
                        <button
                          onClick={() => onToShopping(it)}
                          className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-tomato/10 px-2 py-0.5 text-[11px] font-bold text-tomato transition hover:bg-tomato/20"
                        >
                          <ShoppingCart className="h-3 w-3" /> finito · metti nella lista della spesa
                        </button>
                      )}

                      {/* Riga 2: stepper nudo a sinistra, unità a destra */}
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                        <div data-tour="qty-stepper" className="flex items-center gap-3 px-1">
                          <button
                            onClick={() => scheduleQty(adjustQty(qtyDraft, -1))}
                            disabled={out}
                            className="text-xl leading-none text-stone-500 transition hover:text-ink active:scale-90 disabled:text-stone-300"
                            aria-label="Diminuisci"
                          >−</button>
                          <input
                            inputMode="decimal"
                            className="w-16 border-0 bg-transparent text-center text-[15px] font-bold text-ink outline-none"
                            value={formatQtyDisplay(qtyDraft)}
                            onChange={(e) => scheduleQty(e.target.value.replace("½", "0,5"))}
                            aria-label="Quantità"
                          />
                          <button
                            onClick={() => scheduleQty(adjustQty(qtyDraft, 1))}
                            className="text-xl leading-none text-stone-500 transition hover:text-tomato active:scale-90"
                            aria-label="Aumenta"
                          >+</button>
                        </div>
                        <div data-tour="unit-chips" className="flex gap-1">
                          {["", "g", "kg", "l"].map((u) => {
                            const active = u === "" ? curUnit === "" : curUnit === u;
                            return (
                              <button
                                key={u || "pz"}
                                onClick={() => applyUnit(u)}
                                aria-pressed={active}
                                className={`rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                                  active ? "border-tomato bg-tomato text-white" : "border-hair bg-paper text-stone-500 hover:bg-stone-50"
                                }`}
                              >
                                {u || "pz"}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* "Cosa ci cucino?": apre le Ricette con proposte basate su
                          questo prodotto (come scriverlo nel box "Cosa ti va?"). */}
                      <button
                        data-tour="cook-with"
                        onClick={() => onCookWith(it.name)}
                        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-tomato/50 px-3 py-2.5 text-sm font-semibold text-tomato transition hover:bg-tomato/5"
                      >
                        <Sparkles className="h-4 w-4" /> Cucina con questo
                      </button>
                    </li>
                  );
                }

                // A riposo: nome ……… quantità (puntini di guida)
                return (
                  <li key={it.id}>
                    <button
                      data-tour={it.id === firstItemId ? "pantry-first-item" : undefined}
                      onClick={() => openPanel(it)}
                      className="flex w-full items-baseline gap-2 py-[7px] text-left"
                    >
                      <span className={`min-w-0 truncate text-[15px] font-semibold ${nameTone(it, out)}`}>{it.name}</span>
                      <ExpiryBadge date={it.expiry} />
                      {out && <span className="shrink-0 text-[11px] font-bold text-tomato">finito</span>}
                      <span aria-hidden="true" className="border-b border-dotted border-stone-300" style={{ flex: "1 0 12px" }} />
                      <span className="shrink-0 text-xs font-medium text-stone-400">{qtyLabel(it.qty)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
