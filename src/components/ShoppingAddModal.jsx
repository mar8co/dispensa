// Finestra per aggiungere prodotti alla lista della spesa. Ancorata in alto
// per stare sopra la tastiera; resta aperta dopo l'aggiunta così se ne possono
// inserire diversi di fila.
import { useState, useRef } from "react";
import { Plus, Minus, X } from "lucide-react";

export default function ShoppingAddModal({ onAdd, onClose }) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [count, setCount] = useState(0);
  const inputRef = useRef(null);

  const inputBase = "w-full rounded-xl border border-hair bg-paper px-3.5 py-3 text-sm text-ink outline-none focus:border-stone-400 focus:ring-2 focus:ring-tomato/15";

  function submit() {
    const n = name.trim();
    if (!n) return;
    onAdd(n, String(qty).trim() || "1");
    setName(""); setQty("1");
    setCount((c) => c + 1);
    inputRef.current?.focus();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-16" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-xl font-extrabold tracking-tight text-ink">Aggiungi alla spesa</h3>
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

        <div className="mt-2.5 flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-hair bg-paper">
            <button
              onClick={() => setQty((q) => String(Math.max(1, (parseFloat(String(q).replace(",", ".")) || 1) - 1)))}
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
              onClick={() => setQty((q) => String((parseFloat(String(q).replace(",", ".")) || 0) + 1))}
              className="flex h-11 w-10 items-center justify-center rounded-r-xl text-stone-600 transition hover:bg-stone-100"
              aria-label="Più"
            ><Plus className="h-5 w-5" /></button>
          </div>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> Aggiungi
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-stone-400">
          {count > 0 ? `${count} aggiunti · continua o chiudi` : "Aggiungine quanti vuoi, poi chiudi"}
        </p>
      </div>
    </div>
  );
}
