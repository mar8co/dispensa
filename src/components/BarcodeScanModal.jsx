// Scansione codice a barre con la fotocamera (ZXing) + lookup su Open Food Facts.
// Al primo codice letto cerca il prodotto e richiama onResult con i dati trovati
// ({ found, barcode, name, qty }); poi il chiamante apre la modale di revisione.
//
// Note iOS: limitiamo i formati ai codici prodotto (EAN/UPC) + TRY_HARDER per
// una lettura molto più affidabile su Safari. C'è anche l'inserimento manuale.
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
import { X, ScanBarcode, Loader2, Keyboard, Search } from "lucide-react";

function buildHints() {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return hints;
}

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
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");

  async function handleCode(code) {
    if (handledRef.current) return;
    handledRef.current = true;
    try { controlsRef.current?.stop(); } catch { /* ignora */ }
    setStatus("Cerco il prodotto…");
    const item = await lookupProduct(code);
    onResultRef.current(item);
  }

  useEffect(() => {
    if (manualMode) return; // in modalità manuale la fotocamera resta spenta
    const reader = new BrowserMultiFormatReader(buildHints());
    let cancelled = false;

    (async () => {
      try {
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } },
          videoRef.current,
          (result) => {
            if (result && !cancelled) handleCode(result.getText());
          }
        );
        controlsRef.current = controls;
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Impossibile accedere alla fotocamera. Inserisci il codice a mano.");
      }
    })();

    return () => {
      cancelled = true;
      try { controlsRef.current?.stop(); } catch { /* ignora */ }
    };
  }, [manualMode]);

  function submitManual(e) {
    e?.preventDefault();
    const code = manualCode.trim();
    if (code) handleCode(code);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <ScanBarcode className="h-5 w-5" /> Codice a barre
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!manualMode && (
          <div className="relative aspect-[4/3] w-full bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-24 w-4/5 rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
            </div>
          </div>
        )}

        <div className="px-4 py-3 text-center">
          {error ? (
            <p className="text-sm font-medium text-tomato">{error}</p>
          ) : (
            <p className="flex items-center justify-center gap-2 text-sm text-stone-600">
              {status === "Cerco il prodotto…" && <Loader2 className="h-4 w-4 animate-spin" />}
              {manualMode ? "Digita il codice sotto la barra del prodotto" : status}
            </p>
          )}

          {manualMode && (
            <form onSubmit={submitManual} className="mt-3 flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Es. 8001234567890"
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
              />
              <button type="submit" className="flex items-center justify-center rounded-lg bg-stone-800 px-4 py-2.5 text-white hover:bg-stone-900">
                <Search className="h-4 w-4" />
              </button>
            </form>
          )}

          <button
            onClick={() => { setManualMode((m) => !m); setError(""); }}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-stone-300 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            {manualMode
              ? (<><ScanBarcode className="h-4 w-4" /> Usa la fotocamera</>)
              : (<><Keyboard className="h-4 w-4" /> Inserisci il codice a mano</>)}
          </button>
        </div>
      </div>
    </div>
  );
}
