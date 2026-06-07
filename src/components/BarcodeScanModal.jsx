// Scansione codice a barre con la fotocamera (ZXing) + lookup su Open Food Facts.
// Al primo codice letto cerca il prodotto e richiama onResult con i dati trovati
// ({ found, barcode, name, qty }); poi il chiamante apre la modale di revisione.
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { X, ScanBarcode, Loader2 } from "lucide-react";

async function lookupProduct(code) {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
    const data = await res.json();
    if (data && data.status === 1 && data.product) {
      const p = data.product;
      const name = String(p.product_name_it || p.product_name || "").trim();
      const qty = String(p.quantity || "1").trim() || "1";
      return { found: !!name, barcode: code, name, qty };
    }
  } catch {
    // rete assente o errore: trattiamo come "non trovato"
  }
  return { found: false, barcode: code, name: "", qty: "1" };
}

export default function BarcodeScanModal({ onClose, onResult }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const handledRef = useRef(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const [status, setStatus] = useState("Inquadra il codice a barre");
  const [error, setError] = useState("");

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let cancelled = false;

    (async () => {
      try {
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          videoRef.current,
          async (result) => {
            if (!result || handledRef.current || cancelled) return;
            handledRef.current = true;
            try { controlsRef.current?.stop(); } catch { /* ignora */ }
            setStatus("Cerco il prodotto…");
            const item = await lookupProduct(result.getText());
            if (!cancelled) onResultRef.current(item);
          }
        );
        controlsRef.current = controls;
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Impossibile accedere alla fotocamera. Controlla i permessi.");
      }
    })();

    return () => {
      cancelled = true;
      try { controlsRef.current?.stop(); } catch { /* ignora */ }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <ScanBarcode className="h-5 w-5" /> Scansiona codice a barre
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative aspect-[4/3] w-full bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          {/* mirino */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-24 w-4/5 rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
          </div>
        </div>

        <div className="px-4 py-3 text-center">
          {error ? (
            <p className="text-sm font-medium text-red-600">{error}</p>
          ) : (
            <p className="flex items-center justify-center gap-2 text-sm text-stone-600">
              {status === "Cerco il prodotto…" && <Loader2 className="h-4 w-4 animate-spin" />}
              {status}
            </p>
          )}
          <button
            onClick={onClose}
            className="mt-3 w-full rounded-xl border border-stone-300 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            {error ? "Chiudi" : "Annulla"}
          </button>
        </div>
      </div>
    </div>
  );
}
