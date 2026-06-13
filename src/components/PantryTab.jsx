// Scheda Dispensa — vista "indice": sezioni a tutta larghezza per categoria,
// righe compatte con puntini di guida (nome ……… quantità), barra
// salta-reparto e intestazioni fisse durante lo scroll. Toccando un prodotto
// si aprono lì sotto i comandi: quantità, scadenza, modifica, elimina.
import { useState, useRef, useEffect } from "react";
import {
  Trash2, X, Search, ShoppingCart, AlertTriangle, ChefHat,
  CalendarPlus, SlidersHorizontal, ArrowUp, ArrowDown, ChevronDown,
} from "lucide-react";
import { CATEGORIES, PICKER_CATS, CAT_ICON } from "../constants.js";
import { expiryStatus, formatExpiry, adjustQty, atMinQty } from "../lib/pantry.js";

const EXP_STYLE = {
  scaduto: "bg-tomato text-white",
  oggi: "bg-tomato text-white",
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
const qtyLabel = (q) => (/^\d+$/.test(String(q).trim()) ? `×${String(q).trim()}` : q);

const pad2 = (n) => String(n).padStart(2, "0");
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}


export default function PantryTab({
  search, setSearch, sort, setSort, onOpenProfile, userInitial,
  grouped, cardRefs,
  onMoveCat, onAutoSave, onSetExpiry, removeItem,
  expiringCount, expFilter, setExpFilter, onCookExpiring, isOut, onToShopping,
}) {
  const searchActive = search.trim() !== "";
  const [openId, setOpenId] = useState(null); // pannello prodotto aperto
  const [sortOpen, setSortOpen] = useState(false); // chips ordinamento a comparsa
  // Scadenza: si modifica in una riga dedicata e si salva SOLO con "Salva"
  // (su iOS il date picker, anche chiuso senza scegliere, imposta "oggi").
  const [expiryEditId, setExpiryEditId] = useState(null);
  const [expDraft, setExpDraft] = useState("");
  const [catPickerOpen, setCatPickerOpen] = useState(false);
  // Barra sticky: espansione verticale di tutti i reparti (niente swipe).
  const [catsExpanded, setCatsExpanded] = useState(false);
  const expOpenTsRef = useRef(0);       // momento di apertura del picker data
  const expProvisionalRef = useRef(false); // "oggi" auto-impostato da iOS, non scelto

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
  function scheduleExpiry(v) {
    setExpDraft(v);
    clearTimeout(expTimer.current);
    // Aprendo il picker, iOS imposta subito "oggi" da solo: non è una
    // scelta dell'utente — si mostra ma NON si salva (niente toast).
    // Qualsiasi modifica successiva è una scelta vera e si salva.
    const auto =
      !snapRef.current.expiry &&
      v === todayIso() &&
      Date.now() - expOpenTsRef.current < 600;
    if (auto) {
      expProvisionalRef.current = true;
      return;
    }
    expProvisionalRef.current = false;
    expTimer.current = setTimeout(() => commitExpiryNow(v), 700);
  }
  function flushPending() {
    clearTimeout(qtyTimer.current);
    clearTimeout(expTimer.current);
    const it = openItemRef.current;
    if (!it) return;
    commitQtyNow(qtyDraft);
    commitNameNow();
    if (expiryEditId === it.id && !expProvisionalRef.current) commitExpiryNow(expDraft);
  }
  function openPanel(it) {
    flushPending();
    setOpenId(it.id);
    openItemRef.current = it;
    snapRef.current = { name: it.name, qty: it.qty, category: it.category, expiry: it.expiry };
    lastRef.current = { name: it.name, qty: it.qty, expiry: it.expiry || "" };
    setDraftName(it.name);
    setQtyDraft(it.qty);
    setCatPickerOpen(false);
    setExpiryEditId(null);
  }
  function closePanel(flush = true) {
    if (flush) flushPending();
    clearTimeout(qtyTimer.current);
    clearTimeout(expTimer.current);
    setOpenId(null);
    openItemRef.current = null;
    setCatPickerOpen(false);
    setExpiryEditId(null);
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
  }

  // Il pannello si chiude toccando un punto qualsiasi fuori da esso.
  useEffect(() => {
    if (!openId) return;
    const onDoc = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) closePanel();
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, qtyDraft, draftName]);

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

  return (
    <div className="pt-2">
      {/* Header editoriale */}
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-tomato">La tua dispensa</div>
        <button
          onClick={onOpenProfile}
          className="-mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-extrabold text-white shadow-sm transition hover:opacity-90 active:scale-95"
          aria-label="Profilo"
          title="Profilo"
        >
          {userInitial}
        </button>
      </div>
      <h1 className="mt-1 font-display text-[40px] font-extrabold leading-[0.98] tracking-tight text-ink">Ciao 👋<br />Hai fame?</h1>

      {/* Ricerca minimale, sticky in alto (con l'ordinamento dietro l'icona) */}
      <div className="sticky top-0 z-30 -mx-5 mt-4 bg-cream/95 px-5 py-1.5 backdrop-blur">
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
        <div className="sticky top-[3.25rem] z-20 -mx-5 mt-3 bg-cream/95 px-5 py-2 backdrop-blur">
          <div className="flex items-start gap-1.5">
            {/* Chiuso: riga unica scorrevole (swipe) come prima. Aperto: le
                stesse chip vanno a capo su più righe — la prima riga coincide
                con quella già visibile, niente duplicazione. */}
            <div
              className={`min-w-0 flex-1 gap-1.5 ${
                catsExpanded
                  ? "flex flex-wrap"
                  : "no-scrollbar flex flex-nowrap overflow-x-auto"
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
            style={{ scrollMarginTop: "104px" }}
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
                    <li key={it.id} ref={panelRef} className="-mx-2 my-1 space-y-2.5 rounded-xl bg-stone-50 p-3">
                      {/* Riga 1: nome editabile + categoria · calendario · elimina */}
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
                          onClick={() => { setCatPickerOpen((v) => !v); setExpiryEditId(null); }}
                          aria-label="Categoria"
                          title="Categoria"
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-base transition ${
                            catPickerOpen ? "border-tomato bg-tomato/5" : "border-hair bg-paper"
                          }`}
                        >
                          {CAT_ICON[it.category]}
                        </button>
                        {/* Il tap sull'icona apre SUBITO il calendario nativo
                            (input invisibile sopra l'icona, clippato per non
                            rubare i tap ai bottoni accanto su iOS). */}
                        <label
                          onClick={() => {
                            setExpDraft(it.expiry || "");
                            setCatPickerOpen(false);
                            setExpiryEditId(it.id);
                            expOpenTsRef.current = Date.now();
                            expProvisionalRef.current = false;
                          }}
                          title="Scadenza"
                          className={`relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border transition ${
                            it.expiry ? "border-tomato/40 bg-tomato/5 text-tomato" : "border-hair bg-paper text-stone-500 hover:text-tomato"
                          }`}
                        >
                          <CalendarPlus className="h-4 w-4" />
                          <input
                            type="date"
                            value={it.expiry || ""}
                            onChange={(e) => { setExpiryEditId(it.id); scheduleExpiry(e.target.value); }}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            aria-label="Scadenza"
                          />
                        </label>
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
                        <div className="animate-fade-in flex flex-wrap gap-1.5">
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

                      {/* Scadenza: solo la vista calendario — la data scelta
                          si salva da sola (toast con Annulla), niente "Salva".
                          Il pulsante è "Togli" e diventa "Elimina" dopo una
                          nuova selezione in questa sessione. */}
                      {expiryEditId === it.id && (
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={expDraft}
                            onChange={(e) => scheduleExpiry(e.target.value)}
                            className="min-w-0 flex-1 rounded-lg border border-hair bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-stone-400 focus:ring-2 focus:ring-tomato/15"
                            aria-label="Data di scadenza"
                          />
                          {(it.expiry || expDraft) && (
                            <button
                              onClick={() => { clearTimeout(expTimer.current); setExpDraft(""); commitExpiryNow(""); setExpiryEditId(null); }}
                              className="shrink-0 rounded-lg border border-tomato/30 px-2.5 py-1.5 text-xs font-semibold text-tomato transition hover:bg-tomato/5"
                            >
                              Annulla
                            </button>
                          )}
                        </div>
                      )}

                      {out && (
                        <button
                          onClick={() => onToShopping(it)}
                          className="inline-flex items-center gap-1 rounded-full bg-tomato/10 px-2 py-0.5 text-[11px] font-bold text-tomato transition hover:bg-tomato/20"
                        >
                          <ShoppingCart className="h-3 w-3" /> finito · metti in lista
                        </button>
                      )}

                      {/* Riga 2: stepper nudo a sinistra, unità a destra */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3 px-1">
                          <button
                            onClick={() => scheduleQty(adjustQty(qtyDraft, -1))}
                            disabled={out}
                            className="text-xl leading-none text-stone-500 transition hover:text-ink active:scale-90 disabled:text-stone-300"
                            aria-label="Diminuisci"
                          >−</button>
                          <input
                            inputMode="decimal"
                            className="w-16 border-0 bg-transparent text-center text-[15px] font-bold text-ink outline-none"
                            value={qtyDraft}
                            onChange={(e) => scheduleQty(e.target.value)}
                            aria-label="Quantità"
                          />
                          <button
                            onClick={() => scheduleQty(adjustQty(qtyDraft, 1))}
                            className="text-xl leading-none text-stone-500 transition hover:text-tomato active:scale-90"
                            aria-label="Aumenta"
                          >+</button>
                        </div>
                        <div className="flex gap-1">
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
                    </li>
                  );
                }

                // A riposo: nome ……… quantità (puntini di guida)
                return (
                  <li key={it.id}>
                    <button
                      onClick={() => openPanel(it)}
                      className="flex w-full items-baseline gap-2 py-[7px] text-left"
                    >
                      <span className={`min-w-0 truncate text-[15px] font-semibold ${nameTone(it, out)}`}>{it.name}</span>
                      <ExpiryBadge date={it.expiry} onlyUrgent />
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
