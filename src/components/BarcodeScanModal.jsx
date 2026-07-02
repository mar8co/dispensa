// Scansione codice a barre in RAFFICA (ZXing) + lookup su Open Food Facts.
// Lo scanner resta acceso: ogni codice letto si accumula in un "vassoio"
// visibile (chips con nome e conteggio; ri-scansione dello stesso prodotto =
// quantità +1; tocco sulla chip = rimuovi). "Fatto (N)" consegna tutto al
// chiamante (onResult riceve un ARRAY), che apre la revisione unica.
//
// Note iOS: limitiamo i formati ai codici prodotto (EAN/UPC) + TRY_HARDER per
// una lettura molto più affidabile su Safari. C'è anche l'inserimento manuale.
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
import { ScanBarcode, Loader2, Keyboard, Search, Flashlight, FlashlightOff, Check, X } from "lucide-react";
import { scaleQty, normalizeWeight } from "../lib/pantry.js";
import CameraScanShell from "./CameraScanShell.jsx";

// Messaggio d'errore fotocamera in base alla causa reale (err.name), così
// l'utente sa se è un permesso negato, una camera occupata o assente.
function cameraErrorMessage(err) {
  switch (err?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Permesso fotocamera negato. Autorizzala nelle impostazioni o inserisci il codice a mano.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "Nessuna fotocamera disponibile. Inserisci il codice a mano.";
    case "NotReadableError":
      return "La fotocamera è usata da un'altra app. Chiudila e riprova, o inserisci il codice a mano.";
    default:
      return "Impossibile accedere alla fotocamera. Inserisci il codice a mano.";
  }
}

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
  // Timeout esplicito: senza, una rete lenta lascia "Cerco il prodotto…"
  // appeso per sempre (il fallimento è gestito: si prosegue come non trovato).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`, { signal: controller.signal });
    const data = await res.json();
    if (data && data.status === 1 && data.product) {
      const p = data.product;
      const name = String(p.product_name_it || p.product_name || "").trim();
      const qty = String(p.quantity || "1").trim() || "1";
      return { found: !!name, barcode: code, name, qty, category: offCategory(p.categories_tags) };
    }
  } catch {
    // rete assente, timeout o errore: trattiamo come "non trovato"
  } finally {
    clearTimeout(timer);
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
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const [status, setStatus] = useState("Inquadra il codice a barre");
  const [error, setError] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // --- Vassoio della raffica ---
  // Ogni voce: { code, count, baseQty, name, category, found, status }.
  // La quantità finale è baseQty × count (ri-scansioni dello stesso codice).
  const [tray, setTray] = useState([]);
  const trayRef = useRef(tray);
  trayRef.current = tray;
  const lastSeenRef = useRef(new Map()); // code → ts ultima lettura (cooldown)
  const doneRef = useRef(false);         // "Fatto" già consegnato

  // Un codice letto (dalla camera o a mano). ZXing in continuo riconsegna lo
  // stesso codice a ogni frame: un cooldown per-codice distingue la raffica di
  // frame (ignorata) dalla ri-scansione VOLUTA dello stesso prodotto (count+1).
  function handleCode(code) {
    const now = Date.now();
    const last = lastSeenRef.current.get(code) || 0;
    if (now - last < 2500) return;
    lastSeenRef.current.set(code, now);
    const existing = trayRef.current.find((t) => t.code === code);
    if (existing) {
      setTray((prev) => prev.map((t) => (t.code === code ? { ...t, count: t.count + 1 } : t)));
      setStatus(`Ancora ${existing.name || "lo stesso codice"} · ×${existing.count + 1}`);
      return;
    }
    setTray((prev) => [...prev, { code, count: 1, baseQty: "1", name: "", category: null, found: false, status: "loading" }]);
    setStatus("Cerco il prodotto…");
    lookupProduct(code).then((item) => {
      setTray((prev) => prev.map((t) =>
        t.code === code ? { ...t, name: item.name, baseQty: item.qty || "1", category: item.category, found: item.found, status: "ready" } : t
      ));
      setStatus(item.found ? `✓ ${item.name}` : "Codice non trovato: sistemi il nome dopo");
    });
  }

  // Tocco su una chip: toglie il prodotto dal vassoio (scansione sbagliata).
  function removeFromTray(code) {
    setTray((prev) => prev.filter((t) => t.code !== code));
    lastSeenRef.current.delete(code);
  }

  // "Fatto (N)": ferma lo scanner e consegna il vassoio al chiamante.
  const anyLoading = tray.some((t) => t.status === "loading");
  function finish() {
    if (doneRef.current || anyLoading || !trayRef.current.length) return;
    doneRef.current = true;
    try { controlsRef.current?.stop(); } catch { /* ignora */ }
    onResultRef.current(trayRef.current.map((t) => ({
      barcode: t.code,
      name: t.name,
      qty: t.count > 1 ? normalizeWeight(scaleQty(t.baseQty || "1", t.count)) : (t.baseQty || "1"),
      category: t.category,
      found: t.found,
    })));
  }

  // Torcia: i controlli ZXing espongono switchTorch solo se il dispositivo la
  // supporta (di norma Android/Chrome; iOS Safari non la espone). Utile per i
  // codici al buio/in ombra.
  async function toggleTorch() {
    const c = controlsRef.current;
    if (typeof c?.switchTorch !== "function") return;
    try {
      await c.switchTorch(!torchOn);
      setTorchOn((v) => !v);
    } catch { /* non supportata davvero: ignora */ }
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
        if (!cancelled) setTorchAvailable(typeof controls.switchTorch === "function");
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(cameraErrorMessage(e));
      }
    })();

    return () => {
      cancelled = true;
      try { controlsRef.current?.stop(); } catch { /* ignora */ }
      setTorchAvailable(false);
      setTorchOn(false);
    };
  }, [manualMode, videoEl]);

  function submitManual(e) {
    e?.preventDefault();
    const code = manualCode.trim();
    if (code) { handleCode(code); setManualCode(""); }
  }

  return (
    <CameraScanShell
      icon={ScanBarcode}
      title="Codice a barre"
      subtitle="Inquadra i codici uno dopo l'altro: li raccolgo qui sotto"
      onClose={onClose}
      previewClass="h-[38vh]"
      footer={
        <div className="w-full">
          {/* Vassoio della raffica: una chip per prodotto (tocca per togliere) */}
          {tray.length > 0 && (
            <div className="no-scrollbar mb-2.5 flex gap-1.5 overflow-x-auto">
              {tray.map((t) => (
                <button
                  key={t.code}
                  onClick={() => removeFromTray(t.code)}
                  aria-label={`Togli ${t.name || t.code}`}
                  title="Togli dal vassoio"
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#fff]/15 px-2.5 py-1.5 text-xs font-semibold text-[#fff] transition active:scale-95"
                >
                  {t.status === "loading"
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <X className="h-3 w-3 text-[#fff]/60" />}
                  <span className="max-w-[9rem] truncate">
                    {t.name || (t.status === "loading" ? "…" : "Sconosciuto")}
                  </span>
                  {t.count > 1 && <span className="text-[#fff]/70">×{t.count}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Consegna: apre la revisione unica di tutti i prodotti raccolti */}
          {tray.length > 0 && (
            <button
              onClick={finish}
              disabled={anyLoading}
              className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-tomato py-3 text-sm font-bold text-[#fff] transition active:scale-[0.99] disabled:opacity-60"
            >
              {anyLoading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Cerco gli ultimi…</>
                : <><Check className="h-4 w-4" /> Fatto ({tray.length})</>}
            </button>
          )}

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
              <button type="submit" aria-label="Aggiungi al vassoio" className="flex items-center justify-center rounded-xl bg-[#fff] px-4 py-2.5 text-black transition active:scale-95">
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
          {/* Torcia: solo se il dispositivo la supporta (di norma non su iOS). */}
          {torchAvailable && (
            <button
              onClick={toggleTorch}
              aria-label={torchOn ? "Spegni torcia" : "Accendi torcia"}
              aria-pressed={torchOn}
              className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur transition active:scale-95 ${
                torchOn ? "bg-[#fff] text-black" : "bg-black/50 text-[#fff] hover:bg-black/65"
              }`}
            >
              {torchOn ? <Flashlight className="h-5 w-5" /> : <FlashlightOff className="h-5 w-5" />}
            </button>
          )}
        </>
      )}
    </CameraScanShell>
  );
}
