// Scansione codice a barre con la fotocamera (ZXing) + lookup su Open Food Facts.
// Al primo codice letto cerca il prodotto e richiama onResult con i dati trovati
// ({ found, barcode, name, qty }); poi il chiamante apre la modale di revisione.
//
// Note iOS: limitiamo i formati ai codici prodotto (EAN/UPC) + TRY_HARDER per
// una lettura molto più affidabile su Safari. C'è anche l'inserimento manuale.
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
import { ScanBarcode, Loader2, Keyboard, Search } from "lucide-react";
import CameraScanShell from "./CameraScanShell.jsx";

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

// Deduce la categoria dell'app dai categories_tags di Open Food Facts (tassonomia
// inglese gerarchica, es. "en:frozen-...", "en:plant-based-milks"). Segnale
// gratuito usato come fallback nella categorizzazione del barcode. L'ordine conta:
// surgelati e bevande (anche vegetali) PRIMA di latticini, per non scambiare il
// "latte di mandorla" (plant-based-milk → Bevande) con un latticino.
function offCategory(tags) {
  const t = (Array.isArray(tags) ? tags : []).join(" ").toLowerCase();
  if (!t) return null;
  const has = (...ks) => ks.some((k) => t.includes(k));
  if (has("frozen")) return "Surgelati";
  if (has("plant-based-milk", "plant-based-beverage", "beverages", "waters", "juices", "sodas", "teas", "coffees")) return "Bevande";
  if (has("dairies", "milks", "yogurts", "cheeses", "butters", "creams")) return "Latticini";
  if (has("charcuterie", "hams", "salami", "cured-meats", "sausages", "deli-meats")) return "Salumi";
  if (has("seafood", "fishes", "fish-")) return "Pesce";
  if (has("poultry", "beef", "pork", "meats", "chicken")) return "Carne";
  if (has("pastas", "rices", "cereals", "breakfast-cereals", "flours", "couscous", "oats")) return "Pasta, Riso e Cereali";
  if (has("breads", "bakery")) return "Pane e Forno";
  if (has("legumes", "beans", "chickpeas", "lentils", "peas")) return "Legumi";
  if (has("canned", "preserves", "tinned")) return "Conserve";
  if (has("nuts", "dried-fruits", "seeds")) return "Frutta Secca";
  if (has("chocolates", "biscuits", "cookies", "sweet-snacks", "confectioneries", "spreads", "jams", "honeys", "desserts")) return "Dolci";
  if (has("condiments", "sauces", "olive-oils", "vegetable-oils", "vinegars")) return "Condimenti e Salse";
  if (has("spices", "herbs", "salts", "seasonings")) return "Spezie ed Erbe";
  if (has("fresh-vegetables", "vegetables")) return "Verdura";
  if (has("fresh-fruits", "fruits")) return "Frutta";
  return null;
}

async function lookupProduct(code) {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
    const data = await res.json();
    if (data && data.status === 1 && data.product) {
      const p = data.product;
      const name = String(p.product_name_it || p.product_name || "").trim();
      const qty = String(p.quantity || "1").trim() || "1";
      return { found: !!name, barcode: code, name, qty, category: offCategory(p.categories_tags) };
    }
  } catch {
    // rete assente o errore: trattiamo come "non trovato"
  }
  return { found: false, barcode: code, name: "", qty: "1", category: null };
}

export default function BarcodeScanModal({ onClose, onResult }) {
  // Callback-ref: teniamo l'ELEMENTO video in stato, così la scansione parte
  // quando il <video> è davvero montato (con i bottom-sheet Vaul può comparire
  // un frame dopo il mount del componente: passarne il ref "subito" lasciava la
  // camera nera).
  const [videoEl, setVideoEl] = useState(null);
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
    // In modalità manuale la camera resta spenta; aspettiamo che il <video>
    // sia montato (videoEl) prima di avviare la scansione.
    if (manualMode || !videoEl) return;
    const reader = new BrowserMultiFormatReader(buildHints());
    let cancelled = false;

    (async () => {
      try {
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } },
          videoEl,
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
  }, [manualMode, videoEl]);

  function submitManual(e) {
    e?.preventDefault();
    const code = manualCode.trim();
    if (code) handleCode(code);
  }

  return (
    <CameraScanShell
      icon={ScanBarcode}
      title="Codice a barre"
      subtitle="Inquadra il codice a barre del prodotto da aggiungere"
      onClose={onClose}
      previewClass="h-[38vh]"
      footer={
        <div className="w-full">
          {manualMode && (
            <form onSubmit={submitManual} className="mb-3 flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Es. 8001234567890"
                className="flex-1 rounded-xl border border-[#fff]/30 bg-black/40 px-3 py-2.5 text-sm text-[#fff] placeholder-[#fff]/50 outline-none backdrop-blur focus:border-[#fff]/70"
              />
              <button type="submit" aria-label="Cerca" className="flex items-center justify-center rounded-xl bg-[#fff] px-4 py-2.5 text-black transition active:scale-95">
                <Search className="h-4 w-4" />
              </button>
            </form>
          )}
          <button
            onClick={() => { setManualMode((m) => !m); setError(""); }}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#fff]/50 bg-black/45 py-3 text-sm font-semibold text-[#fff] backdrop-blur transition hover:bg-black/60"
          >
            {manualMode
              ? (<><ScanBarcode className="h-4 w-4" /> Usa la fotocamera</>)
              : (<><Keyboard className="h-4 w-4" /> Inserisci il codice a mano</>)}
          </button>
        </div>
      }
    >
      {manualMode ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
          <Keyboard className="h-10 w-10 text-[#fff]/60" />
          <p className="text-sm font-medium text-[#fff]/80">Digita il codice sotto la barra del prodotto</p>
        </div>
      ) : error ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
          <ScanBarcode className="h-10 w-10 text-[#fff]/60" />
          <p className="text-sm font-medium text-[#fff]/80">{error}</p>
        </div>
      ) : (
        <>
          <video ref={setVideoEl} className="h-full w-full object-cover" autoPlay muted playsInline />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {/* Rettangolo guida basso e largo, a forma di codice a barre.
                Stesso bordo/opacità/scrim della schermata scontrino. */}
            <div className="h-28 w-[78%] rounded-2xl border-2 border-[#fff]/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
            <span className="absolute left-1/2 top-[10%] flex max-w-[88%] -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-3.5 py-1.5 text-center text-xs font-bold text-[#fff] shadow-lg backdrop-blur">
              {status === "Cerco il prodotto…" && <Loader2 className="h-4 w-4 animate-spin" />}
              {status}
            </span>
          </div>
        </>
      )}
    </CameraScanShell>
  );
}
