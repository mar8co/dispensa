// Acquisizione scontrino con anteprima live DENTRO l'app (bottom-sheet scuro),
// senza aprire la fotocamera nativa del telefono.
//
// Qualità immagine: si chiede la massima risoluzione disponibile al track
// (constraints alti + applyConstraints sulle capabilities) e si cattura il
// frame reale (videoWidth×videoHeight), ridimensionato a 2000px per l'OCR.
// L'anteprima è grande (quasi a tutta altezza) e l'overlay NON è restrittivo:
// si riempie il riquadro con lo scontrino, senza doverlo allontanare. Per gli
// scontrini molto lunghi resta la scelta dalla galleria (foto a piena
// risoluzione scattata prima con l'app Fotocamera).
//
// Emette sempre l'immagine come base64 JPEG via onCapture(base64, mediaType).
import { useEffect, useRef, useState } from "react";
import { Image, Camera, Loader2 } from "lucide-react";
import CameraScanShell from "./CameraScanShell.jsx";
import { videoFrameToBase64, fileToResizedBase64 } from "../lib/image.js";

// Messaggio d'errore in base alla causa reale (err.name).
function cameraErrorMessage(err) {
  switch (err?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Permesso fotocamera negato. Autorizzala nelle impostazioni o scegli una foto dalla galleria.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "Nessuna fotocamera disponibile. Scegli una foto dalla galleria.";
    case "NotReadableError":
      return "La fotocamera è usata da un'altra app. Chiudila e riprova, o scegli dalla galleria.";
    default:
      return "Fotocamera non disponibile. Scegli una foto dalla galleria.";
  }
}

export default function ReceiptScanModal({ onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);
  const [error, setError] = useState("");
  const [sharp, setSharp] = useState(false);
  const [busy, setBusy] = useState(false);

  // Avvia la fotocamera posteriore alla massima risoluzione ottenibile.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 2560 }, height: { ideal: 1440 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        // Spinge il track alla risoluzione massima dichiarata (best-effort:
        // su iOS può non essere supportato), con un tetto per non far laggare
        // l'anteprima. Più pixel = testo più leggibile dall'OCR.
        try {
          const track = stream.getVideoTracks()[0];
          const caps = track.getCapabilities?.();
          if (caps?.width?.max && caps?.height?.max) {
            await track.applyConstraints({
              width: { ideal: Math.min(caps.width.max, 2560) },
              height: { ideal: Math.min(caps.height.max, 1440) },
            });
          }
        } catch { /* capabilities non disponibili: teniamo lo stream così com'è */ }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        console.error(e);
        setError(cameraErrorMessage(e));
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Indicatore di nitidezza: ogni 500ms misura l'energia dei bordi nella zona
  // centrale; sopra una soglia l'immagine è "a fuoco".
  useEffect(() => {
    if (error) return;
    const small = document.createElement("canvas");
    small.width = 160; small.height = 120;
    const ctx = small.getContext("2d", { willReadFrequently: true });
    const int = setInterval(() => {
      const v = videoRef.current;
      if (!v || !v.videoWidth) return;
      try {
        const cw = v.videoWidth * 0.8, ch = v.videoHeight * 0.8;
        const cx = (v.videoWidth - cw) / 2, cy = (v.videoHeight - ch) / 2;
        ctx.drawImage(v, cx, cy, cw, ch, 0, 0, 160, 120);
        const d = ctx.getImageData(0, 0, 160, 120).data;
        let sum = 0, n = 0;
        for (let i = 4; i < d.length; i += 16) {
          const g0 = 0.3 * d[i - 4] + 0.59 * d[i - 3] + 0.11 * d[i - 2];
          const g1 = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
          sum += Math.abs(g1 - g0); n++;
        }
        setSharp(n > 0 && sum / n > 9);
      } catch { /* frame non leggibile */ }
    }, 500);
    return () => clearInterval(int);
  }, [error]);

  function emitFromVideo() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const data64 = videoFrameToBase64(v); // frame reale, ridimensionato a 2000px
    if (data64) onCapture(data64, "image/jpeg");
  }

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const { base64, mediaType } = await fileToResizedBase64(file);
      onCapture(base64, mediaType);
    } catch (err) {
      console.error(err);
      setBusy(false);
    }
  }

  return (
    <CameraScanShell
      icon={Camera}
      title="Aggiungi alla dispensa"
      subtitle="Inquadra lo scontrino, i prodotti o uno screenshot della spesa 🛒"
      onClose={onClose}
      previewClass="h-[54vh]"
      footer={
        <>
          {!error && (
            <button
              onClick={emitFromVideo}
              disabled={busy}
              aria-label="Scatta"
              className={`flex h-[72px] w-[72px] items-center justify-center rounded-full ring-4 transition active:scale-95 disabled:opacity-60 ${
                sharp ? "bg-tomato ring-tomato/40" : "bg-[#fff] ring-[#fff]/40"
              }`}
            >
              <span className={`h-14 w-14 rounded-full border-[3px] ${sharp ? "border-[#fff]/40 bg-tomato" : "border-black/10 bg-[#fff]"}`} />
            </button>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            aria-label="Scegli dalla galleria"
            title="Dalla galleria"
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-[#fff]/50 bg-[#fff]/10 text-[#fff] transition hover:bg-[#fff]/20 disabled:opacity-60 ${
              error ? "" : "absolute right-0"
            }`}
          >
            {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Image className="h-6 w-6" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
        </>
      }
    >
      {!error && (
        <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
      )}
      {error ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
          <Image className="h-10 w-10 text-[#fff]/60" />
          <p className="text-sm font-medium text-[#fff]/80">{error}</p>
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0">
          {/* Cornice guida poco restrittiva (un filo più stretta ai lati): si
              riempie con lo scontrino senza doverlo allontanare. */}
          <div
            className={`absolute inset-y-6 inset-x-7 rounded-2xl border-2 transition-colors ${
              sharp ? "border-tomato" : "border-[#fff]/70"
            }`}
          />
          {/* Scritta centrata SULLA linea superiore del riquadro. */}
          <span
            className={`absolute left-1/2 top-6 max-w-[80%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-center text-xs font-bold shadow-lg backdrop-blur transition ${
              sharp ? "bg-tomato text-[#fff]" : "bg-black/70 text-[#fff]"
            }`}
          >
            {sharp ? "A fuoco — scatta" : "Metti a fuoco e scatta"}
          </span>
        </div>
      )}
    </CameraScanShell>
  );
}
