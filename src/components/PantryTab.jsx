// Scheda Dispensa — vista "indice": sezioni a tutta larghezza per categoria,
// righe compatte con puntini di guida (nome ……… quantità), barra
// salta-reparto e intestazioni fisse durante lo scroll. Toccando un prodotto
// si aprono lì sotto i comandi: quantità, scadenza, modifica, elimina.
import { onOutsideTap } from "../lib/outsideTap.js";
import { useState, useRef, useEffect } from "react";
import {
  X, Search, ShoppingCart,
  SlidersHorizontal, ChevronDown, Sparkles,
} from "lucide-react";
import { CAT_ICON } from "../constants.js";
import { expiryStatus, formatExpiry, piecesLabel, qtyState, pieces, LOW_QTY } from "../lib/pantry.js";
import Button from "./Button.jsx";
import ProductFields from "./ProductFields.jsx";
import PushNudge from "./PushNudge.jsx";
import Barattoli from "./Barattoli.jsx";
import { PAGE_COLOR } from "../lib/colors.js";

// Cartellini delle scadenze (veste manifesto): rosso pieno = scaduto, nero =
// oggi/entro 3 giorni, solo bordo = entro la settimana, tenue = lontana.
// L'urgenza la dice il cartellino: il nome resta nero (sull'arancio un nome
// rosso o ambra non si leggerebbe).
const EXP_STYLE = {
  scaduto: "border-rosso-azione bg-rosso-azione text-white",
  oggi: "bg-ink text-white",
  presto: "bg-ink text-white",
  settimana: "",
  ok: "border-ink/35 text-tenue",
};

function ExpiryBadge({ date, onlyUrgent = false }) {
  const st = expiryStatus(date);
  if (!st) return null;
  if (onlyUrgent && st === "ok") return null; // le date lontane non fanno rumore
  return (
    <span className={`cartellino self-center ${EXP_STYLE[st]}`}>
      {formatExpiry(date)}
    </span>
  );
}

// --- Riga prodotto a riposo. Gesti:
// • tocco = apre il pannello di modifica;
// • scorrimento ← oltre la soglia = "finito": via dalla dispensa e in lista
//   della spesa (lo fa `onFinish`, con "Annulla" nell'avviso).
// Stessa soglia e stessa resa delle righe della Spesa (là a sinistra si
// elimina, qui non si elimina nulla: il fondo è nero, non rosso).
function PantryRow({ it, out, low, onOpen, onFinish }) {
  const label = piecesLabel(it.qty); // "×3" da due pezzi in su, altrimenti niente
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef(null);
  const axis = useRef(null);    // "h" | "v" | null
  const swiped = useRef(false); // il click che segue uno scorrimento va ignorato
  const THRESHOLD = 72;         // px oltre cui scatta l'azione
  const MAX = 104;              // limite visivo (oltre, resistenza elastica)

  function down(e) {
    start.current = { x: e.clientX, y: e.clientY };
    axis.current = null;
    swiped.current = false;
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
    if (axis.current !== "h") return;
    swiped.current = true;
    // Solo verso sinistra; oltre MAX la riga "tira" sempre meno.
    setDx(ddx >= 0 ? 0 : ddx < -MAX ? -MAX + (ddx + MAX) * 0.25 : ddx);
  }
  function up(e) {
    const ddx = start.current ? e.clientX - start.current.x : 0;
    const wasH = axis.current === "h";
    start.current = null;
    setDragging(false);
    setDx(0);
    if (wasH && ddx <= -THRESHOLD) onFinish?.(it);
  }
  function cancel() {
    start.current = null;
    axis.current = null;
    setDragging(false);
    setDx(0);
  }

  return (
    <li className="relative overflow-hidden">
      {/* Fondo dell'azione, visibile solo mentre la riga è spostata. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 flex items-center justify-end gap-1.5 pr-3 text-[0.9rem] font-extrabold tracking-[-0.01em] ${dx < -4 ? "bg-ink text-crema" : "opacity-0"}`}
      >
        Finito · in lista <ShoppingCart className="h-4 w-4" />
      </div>
      <button
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
        onClick={() => { if (swiped.current) { swiped.current = false; return; } onOpen(it); }}
        style={{
          touchAction: "pan-y",
          transform: `translateX(${dx}px)`,
          transition: dragging ? "none" : "transform 0.2s ease",
        }}
        className="relative flex w-full select-none items-baseline gap-2 bg-sfondo py-[9px] text-left"
      >
        <span className={`min-w-0 truncate text-[1.06rem] font-[650] tracking-[-0.02em] ${out ? "text-tenue" : "text-ink"}`}>{it.name}</span>
        <ExpiryBadge date={it.expiry} />
        {out && <span className="cartellino self-center">finito</span>}
        {low && <span className="cartellino self-center bg-giallo">sta finendo</span>}
        {/* I puntini di guida servono solo se a destra c'è un numero. */}
        {label && (
          <>
            <span aria-hidden="true" className="-translate-y-1 border-b-2 border-dotted border-ink/35" style={{ flex: "1 0 12px" }} />
            <span className="num shrink-0 text-[0.95rem] font-bold tracking-[-0.01em] text-ink">{label}</span>
          </>
        )}
      </button>
    </li>
  );
}

const SORTS = [
  ["recenti", "Recenti"],
  ["nome", "A-Z"],
  ["scadenza", "Scadenza"],
];


export default function PantryTab({
  shared = false,
  search, setSearch, sort, setSort,
  grouped, cardRefs,
  onAutoSave, onSetExpiry, removeItem,
  expiredCount, expiringSoonCount, expFilter, setExpFilter, onCookExpiring, isOut, onToShopping, onCookWith,
  onFinish,
  todayMeal = null, shoppingCount = 0, onOpenPlan, onOpenShopping,
}) {
  const searchActive = search.trim() !== "";
  const [openId, setOpenId] = useState(null); // pannello prodotto aperto
  const [sortOpen, setSortOpen] = useState(false); // chips ordinamento a comparsa
  const [expDraft, setExpDraft] = useState(""); // valore della scadenza nel pannello
  // Barra sticky: espansione verticale di tutti i reparti (niente swipe).
  const [catsExpanded, setCatsExpanded] = useState(false);
  // Altezza reale della ricerca fissa: la barra dei reparti si aggancia
  // subito sotto (1px di sovrapposizione), così scorrendo non resta una
  // fessura da cui si intravede la lista (su iPhone l'altezza varia di poco).
  const searchRef = useRef(null);
  const [searchH, setSearchH] = useState(76);
  useEffect(() => {
    const el = searchRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setSearchH(Math.round(el.getBoundingClientRect().height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // --- Pannello prodotto con salvataggio automatico ---
  // Le modifiche si applicano da sole e in silenzio: nome al blur, pezzi,
  // stato e categoria al tocco.
  const [draftName, setDraftName] = useState("");
  const [qtyDraft, setQtyDraft] = useState("");
  const panelRef = useRef(null);
  const openItemRef = useRef(null); // prodotto aperto (com'era all'apertura)
  const lastRef = useRef({});       // ultimi valori salvati (rileva i cambi)
  const expTimer = useRef(null);

  function commitQtyNow(v) {
    const it = openItemRef.current;
    const val = String(v).trim();
    if (!it || !val || val === String(lastRef.current.qty)) return;
    lastRef.current.qty = val;
    onAutoSave(it, { qty: val });
  }
  // Pezzi e stato si salvano subito: è un tocco, non c'è nulla da aspettare.
  function setQty(v) {
    setQtyDraft(v);
    commitQtyNow(v);
  }
  function commitNameNow() {
    const it = openItemRef.current;
    if (!it) return;
    const val = draftName.trim();
    if (!val || val === lastRef.current.name) return;
    const cap = val.charAt(0).toUpperCase() + val.slice(1);
    lastRef.current.name = cap;
    setDraftName(cap);
    onAutoSave(it, { name: cap });
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
    clearTimeout(expTimer.current);
    expTimer.current = setTimeout(() => commitExpiryNow(v), 400);
  }
  function flushPending() {
    clearTimeout(expTimer.current);
    if (!openItemRef.current) return;
    commitNameNow();
    commitExpiryNow(expDraft);
  }
  function openPanel(it) {
    flushPending();
    setOpenId(it.id);
    openItemRef.current = it;
    lastRef.current = { name: it.name, qty: it.qty, expiry: it.expiry || "" };
    setDraftName(it.name);
    setQtyDraft(it.qty);
    setExpDraft(it.expiry || "");
    // Porta il pannello in vista appena sopra il FAB (block:"nearest" = scrolla
    // il minimo indispensabile; lo scroll-margin-bottom sul pannello riserva lo
    // spazio per navbar/FAB). Niente più centratura: evita il vuoto sotto.
    // Doppio rAF: aspetta che il pannello (e lo spazio extra sotto) sia montato.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }));
  }
  // Rimuove la scadenza: commit immediato (la ✕ del box in ProductFields).
  function clearExpiry() {
    clearTimeout(expTimer.current);
    setExpDraft("");
    commitExpiryNow("");
  }
  function closePanel(flush = true) {
    if (flush) flushPending();
    clearTimeout(expTimer.current);
    setOpenId(null);
    openItemRef.current = null;
  }
  function chooseCategory(c) {
    const it = openItemRef.current;
    if (!it || c === it.category) return;
    openItemRef.current = { ...it, category: c };
    onAutoSave(it, { category: c });
  }
  // Stato del prodotto: "C'è" / "Sta finendo" si salvano nella quantità (vedi
  // qtyState in pantry.js); "Finito" chiude il pannello e passa a onFinish
  // (via dalla dispensa, in lista della spesa, con Annulla).
  function applyState(s) {
    const it = openItemRef.current;
    if (!it) return;
    if (s === "out") { closePanel(false); onFinish?.(it); return; }
    if (s === qtyState(qtyDraft)) return;
    setQty(s === "low" ? LOW_QTY : String(pieces(qtyDraft)));
  }

  // Il pannello si chiude toccando un punto qualsiasi fuori da esso; quel
  // tocco non fa nient'altro (vedi lib/outsideTap.js).
  useEffect(() => {
    if (!openId) return;
    return onOutsideTap(() => panelRef.current, closePanel);
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

  // Le intestazioni di categoria si fermano SOTTO la ricerca e la barra dei
  // reparti (alta 50px, presente solo con più di una categoria). Prima si
  // fermavano a 48px fissi: finivano nascoste dietro le due barre.
  const headTop = searchH - 1 + (grouped.length > 1 ? 49 : 0);

  return (
    <div className="pt-2">
      {/* Titolo enorme (il profilo è nella navbar in basso) */}
      <h1 className="gigante">Hai fame?</h1>

      {/* Occhiello rosso + ricerca: bloccati insieme in alto durante lo scroll
          (con l'ordinamento dietro l'icona). */}
      <div ref={searchRef} className="sticky top-0 z-30 -mx-4 mt-5 bg-sfondo px-4 pb-1.5 pt-2">
      <div className="micro">{shared ? "La nostra dispensa" : "La tua dispensa"}</div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-0 top-1/2 h-5 w-5 -translate-y-1/2 text-ink" />
        <input
          className={`campo testo-grande pl-8 text-[1.06rem] text-ink ${searchActive ? "pr-[4.5rem]" : "pr-10"}`}
          placeholder="Cerca un prodotto"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {searchActive && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-9 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-ink"
            aria-label="Cancella ricerca"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {grouped.length > 0 && (
          <button
            onClick={() => setSortOpen((v) => !v)}
            aria-expanded={sortOpen}
            className={`absolute -right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition ${sortOpen ? "bg-ink text-white" : "text-ink"}`}
            aria-label="Ordinamento"
            title="Ordinamento"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Chips ordinamento: compaiono solo al tocco dell'icona */}
      {sortOpen && grouped.length > 0 && (
        <div className="animate-fade-in mt-2.5 flex gap-1.5">
          {SORTS.map(([v, l]) => (
            <button
              key={v}
              onClick={() => { setSort(v); setSortOpen(false); }}
              aria-pressed={sort === v}
              className="pillola min-h-[34px] px-3.5 text-[0.84rem]"
            >
              {l}
            </button>
          ))}
        </div>
      )}
      </div>{/* fine barra ricerca sticky */}

      {/* Riquadro scuro "Oggi" (dal 10/10): tre risposte senza toccare nulla —
          cosa scade, cosa si mangia oggi, quante cose ci sono in lista. Le
          scadenze distinguono i già scaduti (pallino rosso) da quelli entro 7
          giorni (giallo); il filtro "Mostra" li include entrambi. Le due
          righe sotto portano al Calendario Alimentare e alla Spesa. */}
      <div className="evidenza mt-3.5 overflow-hidden">
        <span className="micro block px-3.5 pt-3">Oggi</span>
        {expiredCount + expiringSoonCount > 0 ? (
          <>
            <button
              onClick={() => setExpFilter(!expFilter)}
              aria-pressed={expFilter}
              className="block w-full px-3.5 pb-2.5 text-left"
            >
              {expiredCount > 0 && (
                <span className="mt-1 flex items-center gap-2.5 text-[1.1rem] font-[750] leading-tight tracking-[-0.03em]">
                  <i aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-rosso" />
                  {expiredCount} {expiredCount === 1 ? "prodotto scaduto" : "prodotti scaduti"}
                </span>
              )}
              {expiringSoonCount > 0 && (
                <span className="mt-1 flex items-center gap-2.5 text-[1.1rem] font-[750] leading-tight tracking-[-0.03em]">
                  <i aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-giallo" />
                  {expiringSoonCount} {expiringSoonCount === 1 ? "prodotto" : "prodotti"} in scadenza{expiredCount > 0 ? "" : " entro 7 giorni"}
                </span>
              )}
              <span className="mt-2.5 flex justify-between border-t border-crema/20 pt-2 text-[0.88rem] font-bold">
                <span>{expFilter ? "Mostra tutto" : "Mostra"}</span>
                <span aria-hidden="true">→</span>
              </span>
            </button>
            <div className="px-3.5 pb-3">
              <Button variant="primary" size="sm" full className="bg-crema text-ink" onClick={onCookExpiring}>
                <Sparkles className="h-4 w-4" /> Cucina con {expiredCount + expiringSoonCount === 1 ? "questo prodotto" : "questi prodotti"}
              </Button>
            </div>
          </>
        ) : (
          <p className="mt-1 px-3.5 pb-2.5 text-[1.1rem] font-[750] leading-tight tracking-[-0.03em]">Niente in scadenza</p>
        )}
        {onOpenPlan && (
          <button onClick={onOpenPlan} className="flex min-h-[44px] w-full items-center gap-2.5 border-t border-crema/20 px-3.5 py-2 text-left text-[0.95rem] font-bold">
            <span aria-hidden="true">🍳</span>
            <span className="min-w-0 flex-1 truncate">
              {todayMeal ? <>{todayMeal.label}: {todayMeal.title}</> : "Oggi niente in calendario"}
            </span>
            <span aria-hidden="true">→</span>
          </button>
        )}
        {onOpenShopping && (
          <button onClick={onOpenShopping} className="flex min-h-[44px] w-full items-center gap-2.5 border-t border-crema/20 px-3.5 py-2 text-left text-[0.95rem] font-bold">
            <span aria-hidden="true">🛒</span>
            <span className="min-w-0 flex-1 truncate">
              {shoppingCount > 0 ? `${shoppingCount} ${shoppingCount === 1 ? "prodotto" : "prodotti"} in lista` : "Lista della spesa vuota"}
            </span>
            <span aria-hidden="true">→</span>
          </button>
        )}
      </div>

      {/* Soft-ask notifiche: proprio quando c'è il banner scadenze (e fuori dal
          tutorial) invitiamo ad attivare gli avvisi. Il componente decide da sé
          se comparire (installata, non già attive, non già rifiutato qui). */}
      {expiredCount + expiringSoonCount > 0 && <PushNudge />}

      {/* Barra salta-reparto, fissa in alto: una riga di chips (quelle che
          ci stanno) e la freccina che "srotola" le righe successive — la
          riga visibile è la prima riga del menù espanso. Niente scorrimento
          laterale, niente numeri. */}
      {grouped.length > 1 && (
        <div className="sticky z-20 -mx-4 mt-3 bg-sfondo py-2 pl-4 pr-2.5" style={{ top: searchH - 1 }}>
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
            >
              {grouped.map(({ cat }) => (
                <button
                  key={cat}
                  onClick={() => jumpTo(cat)}
                  // Stessa misura sia nella barra scorrevole sia nel menù aperto.
                  className="pillola min-h-[34px] bg-white px-3 text-[0.84rem]"
                >
                  {CAT_ICON[cat]} {cat}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCatsExpanded((v) => !v)}
              aria-expanded={catsExpanded}
              className={`tondo h-[34px] w-[34px] ${catsExpanded ? "bg-ink text-white" : ""}`}
              aria-label="Mostra tutti i reparti"
              title="Tutti i reparti"
            >
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${catsExpanded ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
      )}

      {grouped.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          {!searchActive && !expFilter && <Barattoli size={96} className="mb-3 text-ink" />}
          <p className="text-[1.05rem] font-semibold text-tenue">
            {searchActive ? "Nessun prodotto trovato." : expFilter ? "Niente in scadenza. 🎉" : "Dispensa vuota. Tocca + per aggiungere: a mano, a voce, col codice a barre o con una foto dello scontrino."}
          </p>
        </div>
      )}

      {/* Sezioni a tutta larghezza, con intestazione fissa */}
      <div className="space-y-5">
        {grouped.map(({ cat, list }) => (
          <section
            key={cat}
            ref={(el) => { cardRefs.current[cat] = el; }}
            style={{ scrollMarginTop: headTop }}
          >
            <div style={{ top: headTop }} className="sticky z-10 -mx-1 flex items-center gap-2 border-b-[1.5px] border-ink bg-sfondo px-1 pb-[7px] pt-4">
              <span className="text-[1.15rem] leading-none">{CAT_ICON[cat]}</span>
              <h2 className="min-w-0 truncate text-[1.3rem] font-extrabold leading-none tracking-[-0.04em] text-ink">{cat}</h2>
              <span className="num text-[1.3rem] font-extrabold leading-none tracking-[-0.04em] text-tenue">{String(list.length).padStart(2, "0")}</span>
            </div>

            <ul>
              {list.map((it) => {
                const out = isOut(it);
                const low = qtyState(it.qty) === "low"; // sta finendo

                // Modifica: nome + categoria, in linea
                // Pannello prodotto: tutto modificabile, salvataggio automatico.
                if (openId === it.id) {
                  const n = pieces(qtyDraft);
                  return (
                    <li key={it.id} ref={panelRef} className="-mx-2 my-1.5 scroll-mb-[calc(var(--sopra-nav)+8px)] rounded-card bg-white p-3 shadow-card">
                      {/* Vista prodotto standard (ProductFields): stessa
                          struttura di Spesa/Aggiungi a mano/Revisione, più la
                          riga dello stato (solo qui). */}
                      <ProductFields
                        name={draftName}
                        onName={setDraftName}
                        onNameBlur={commitNameNow}
                        category={it.category}
                        onCategory={chooseCategory}
                        onDelete={() => { closePanel(false); removeItem(it); }}
                        qtyValue={String(n)}
                        onQtyInput={(v) => { const d = parseInt(v.replace(/\D/g, ""), 10); if (d > 0) setQty(String(d)); }}
                        onMinus={() => setQty(String(n - 1))}
                        onPlus={() => setQty(String(n + 1))}
                        minusDisabled={n <= 1}
                        stateActive={qtyState(qtyDraft)}
                        onState={applyState}
                        showExpiry
                        expiry={expDraft}
                        onExpiry={(v) => (v ? scheduleExpiry(v) : clearExpiry())}
                      >
                        {low && (
                          <button
                            onClick={() => onToShopping(it)}
                            className="pillola mt-3 min-h-[32px] px-3 text-[0.8rem]"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" /> Sta finendo · Metti in lista
                          </button>
                        )}
                      </ProductFields>

                      {/* "Cosa ci cucino?": apre le Ricette con proposte basate su
                          questo prodotto — compatto, coerente col resto del box. */}
                      <Button variant="cook" size="sm" full className="mt-3" onClick={() => onCookWith(it.name)}>
                        <Sparkles className="h-4 w-4" /> Cucina con questo prodotto
                      </Button>
                    </li>
                  );
                }

                // A riposo: nome ……… quantità (puntini di guida); scorrendola
                // verso sinistra il prodotto è "finito" (vedi PantryRow).
                return <PantryRow key={it.id} it={it} out={out} low={low} onOpen={openPanel} onFinish={onFinish} />;
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* Piccolo spazio extra mentre un pannello è aperto: solo quel tanto che
          basta perché anche l'ultimo prodotto possa salire appena sopra il FAB
          (il parcheggio lo fa lo scroll-margin-bottom del pannello). */}
      {openId && <div aria-hidden="true" className="h-14" />}
    </div>
  );
}
