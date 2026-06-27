// Acquisizione scontrino: delega lo scatto alla FOTOCAMERA NATIVA del telefono
// (<input capture>), non al frame del <video> in anteprima.
//
// Perché: il frame del <video> su iPhone Safari esce a risoluzione preview
// (tipicamente 1280×720, spesso meno) e ImageCapture.takePhoto() non è
// supportato da WebKit. Con uno scontrino lungo, inquadrarlo "dentro al riquadro"
// lo allontana e il testo diventa illeggibile. La fotocamera di sistema scatta a
// ~12 MP con autofocus/HDR: anche gli scontrini lunghi restano nitidi. L'immagine
// viene poi ridimensionata (image.js) prima di andare all'AI.
//
// Emette sempre l'immagine come base64 JPEG via onCapture(base64, mediaType).
import { useRef, useState } from "react";
import { Image, Camera, Loader2 } from "lucide-react";
import CameraScanShell from "./CameraScanShell.jsx";
import { fileToResizedBase64 } from "../lib/image.js";

export default function ReceiptScanModal({ onClose, onCapture }) {
  const camRef = useRef(null);   // input con capture: apre la fotocamera nativa
  const fileRef = useRef(null);  // input senza capture: apre la galleria
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // consente di riscegliere lo stesso file
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { base64, mediaType } = await fileToResizedBase64(file);
      onCapture(base64, mediaType); // il chiamante chiude il foglio e analizza
    } catch (err) {
      console.error(err);
      setError("Non riesco a leggere l'immagine. Riprova.");
      setBusy(false);
    }
  }

  return (
    <CameraScanShell
      icon={Camera}
      title="Aggiungi alla dispensa"
      subtitle="Fotografa lo scontrino (anche lungo), i prodotti o uno screenshot della spesa 🛒"
      onClose={onClose}
      previewClass="h-[36vh]"
      footer={
        <div className="flex w-full items-center gap-3">
          <button
            onClick={() => camRef.current?.click()}
            disabled={busy}
            className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-[#fff] py-3.5 text-sm font-bold text-black transition active:scale-95 disabled:opacity-60"
          >
            {busy
              ? <><Loader2 className="h-5 w-5 animate-spin" /> Elaboro…</>
              : <><Camera className="h-5 w-5" /> Fotografa</>}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            aria-label="Scegli dalla galleria"
            title="Dalla galleria"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#fff]/50 bg-[#fff]/10 text-[#fff] transition hover:bg-[#fff]/20 disabled:opacity-60"
          >
            <Image className="h-6 w-6" />
          </button>
          {/* capture="environment": fotocamera posteriore, scatto ad alta risoluzione */}
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
      }
    >
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        {error ? (
          <p className="text-sm font-medium text-[#fff]/80">{error}</p>
        ) : (
          <>
            <div className="rounded-2xl border-2 border-dashed border-[#fff]/30 p-5">
              <Camera className="h-11 w-11 text-[#fff]/70" />
            </div>
            <p className="text-sm font-semibold text-[#fff]/90">Inquadra lo scontrino per intero</p>
            <p className="max-w-[17rem] text-xs leading-relaxed text-[#fff]/55">
              Si apre la fotocamera del telefono: alla sua risoluzione anche gli scontrini lunghi restano leggibili.
            </p>
          </>
        )}
      </div>
    </CameraScanShell>
  );
}
