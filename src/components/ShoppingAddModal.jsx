// Finestra per aggiungere prodotti alla lista della spesa. Ancorata in alto
// per stare sopra la tastiera; resta aperta dopo l'aggiunta così se ne possono
// inserire diversi di fila. Suggerisce completamenti mentre scrivi e i tuoi
// acquisti frequenti a campo vuoto; i duplicati vengono fusi dal chiamante.
import { useMemo, useRef, useState } from "react";
import { Plus, Minus, X, Check } from "lucide-react";
import { norm } from "../lib/pantry.js";

export default function ShoppingAddModal({
  onAdd, onClose, historyNames = [], pantryNames = [], listNames = [], uncheckedCount = 0,
}) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [lastAdded, setLastAdded] = useState(null); // { name, merged }
  const inputRef = useRef(null);

  const inputBase = "w-full rounded-xl border border-hair bg-paper px-3.5 py-3 text-sm text-ink outline-none focus:border-stone-400 focus:ring-2 focus:ring-tomato/15";

  // Candidati per i suggerimenti: storico (per frequenza) + nomi in dispensa.
  const pool = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const n of [...historyNames, ...pantryNames]) {
      const k = norm(n);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(n);
    }
    return out;
  }, [historyNames, pantryNames]);

  const q = norm(name);
  const listSet = useMemo(() => new Set(listNames.map((n) => norm(n))), [listNames]);
  // Scrivendo: completamenti; campo vuoto: i frequenti non ancora in lista.
  const suggestions = q
    ? pool.filter((n) => norm(n).includes(q) && norm(n) !== q).slice(0, 5)
    : historyNames.filter((n) => !listSet.has(norm(n))).slice(0, 6);

  async function add(n, qv) {
    const clean = String(n || "").trim();
    if (!clean) return;
    const res = await onAdd(clean, String(qv || "1").trim() || "1");
    setLastAdded({ name: clean, merged: !!res?.merged });
    setName(""); setQty("1");
    inputRef.current?.focus();
  }
  const submit = () => add(name, qty);

  return (
    // Sfondo leggermente scurito e sfocato (come il menù "+" della dispensa):
    // la lista sotto resta intuibile mentre aggiungi.
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center bg-black/25 px-4 pt-16 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div className="animate-drop-in w-full max-w-md rounded-2xl border border-hair bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-xl font-extrabold tracking-tight text-ink">Aggiungi alla lista</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <input
          ref={inputRef}
          autoFocus
          className={inputBase}
          placeholder="Cosa ti manca?"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />

        {/* Completamenti / acquisti frequenti: un tap e sono in lista */}
        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestions.map((n) => (
              <button
                key={n}
                onClick={() => add(n, "1")}
                className="rounded-full border border-hair bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-tomato hover:text-tomato"
              >
                {q ? n : `+ ${n}`}
              </button>
            ))}
          </div>
        )}

        <div className="mt-2.5 flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-hair bg-paper">
            <button
              onClick={() => setQty((v) => String(Math.max(1, (parseFloat(String(v).replace(",", ".")) || 1) - 1)))}
              className="flex h-11 w-10 items-center justify-center rounded-l-xl text-stone-600 transition hover:bg-stone-100"
              aria-label="Meno"
            ><Minus className="h-5 w-5" /></button>
            <input
              type="text" inputMode="numeric" value={qty}
              onChange={(e) => setQty(e.target.value.replace(/[^0-9.,]/g, ""))}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="w-12 border-0 bg-transparent text-center text-lg font-bold text-ink outline-none"
            />
            <button
              onClick={() => setQty((v) => String((parseFloat(String(v).replace(",", ".")) || 0) + 1))}
              className="flex h-11 w-10 items-center justify-center rounded-r-xl text-stone-600 transition hover:bg-stone-100"
              aria-label="Più"
            ><Plus className="h-5 w-5" /></button>
          </div>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> Aggiungi
          </button>
        </div>

        {/* Conferma dell'ultimo inserimento (la lista sotto è sfocata) */}
        {lastAdded && (
          <p className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-stone-500">
            <Check className="h-3.5 w-3.5 shrink-0 text-tomato" />
            <span className="min-w-0 truncate">
              <strong className="text-ink">{lastAdded.name}</strong>{" "}
              {lastAdded.merged ? "era già in lista: quantità aumentata" : "aggiunto"} · {uncheckedCount} da comprare
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
