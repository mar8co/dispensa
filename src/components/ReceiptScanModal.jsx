// Acquisizione scontrino con fotocamera integrata (stile scanner documenti):
// anteprima live, rettangolo guida, indicatore di nitidezza, scatto al centro
// e — discreto, in basso a destra — scelta di una foto dalla galleria.
// Emette sempre l'immagine come base64 JPEG via onCapture(base64).
import { useEffect, useRef, useState } from "react";
import { X, Image, Camera } from "lucide-react";

export default function ReceiptScanModal({ onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);
  const [error, setError] = useState("");
  const [sharp, setSharp] = useState(false);

  // Avvia la fotocamera posteriore.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        console.error(e);
        setError("Fotocamera non disponibile. Scegli una foto dalla galleria.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Indicatore di nitidezza: ogni 500ms misura l'energia dei bordi al centro
  // dell'inquadratura; sopra una soglia consideriamo l'immagine "a fuoco".
  useEffect(() => {
    if (error) return;
    const small = document.createElement("canvas");
    small.width = 160; small.height = 120;
    const ctx = small.getContext("2d", { willReadFrequently: true });
    const int = setInterval(() => {
      const v = videoRef.current;
      if (!v || !v.videoWidth) return;
      try {
        // ritaglia la zona centrale (dove sta lo scontrino)
        const cw = v.videoWidth * 0.6, ch = v.videoHeight * 0.6;
        const cx = (v.videoWidth - cw) / 2, cy = (v.videoHeight - ch) / 2;
        ctx.drawImage(v, cx, cy, cw, ch, 0, 0, 160, 120);
        const d = ctx.getImageData(0, 0, 160, 120).data;
        let sum = 0, n = 0;
        for (let i = 4; i < d.length; i += 16) { // campiona ~1 pixel su 4
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
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    const data64 = c.toDataURL("image/jpeg", 0.85).split(",")[1];
    onCapture(data64, "image/jpeg");
  }

  function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => onCapture(String(r.result).split(",")[1], file.type || "image/jpeg");
    r.readAsDataURL(file);
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      {/* Testata */}
      <div
        className="flex items-center justify-between px-4 pb-3 text-white"
        style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Camera className="h-5 w-5" /> Scatta lo scontrino
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-white/80 hover:bg-white/10" aria-label="Chiudi">
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Anteprima + rettangolo guida */}
      <div className="relative flex-1 overflow-hidden">
        {!error && (
          <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
        )}
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <Image className="h-10 w-10 text-white/60" />
            <p className="text-sm font-medium text-white/80">{error}</p>
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className={`h-[64%] w-[80%] rounded-2xl border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] transition-colors ${
                sharp ? "border-emerald-400" : "border-white/80"
              }`}
            />
            <span
              className={`absolute top-[16%] rounded-full px-3 py-1 text-xs font-semibold backdrop-blur transition ${
                sharp ? "bg-emerald-400/90 text-emerald-950" : "bg-black/45 text-white"
              }`}
            >
              {sharp ? "A fuoco — scatta" : "Inquadra lo scontrino nel riquadro"}
            </span>
          </div>
        )}
      </div>

      {/* Comandi: scatto al centro, galleria discreta in basso a destra */}
      <div
        className="relative flex items-center justify-center px-6 pt-4"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        {!error && (
          <button
            onClick={emitFromVideo}
            aria-label="Scatta"
            className={`flex h-16 w-16 items-center justify-center rounded-full ring-4 ring-white/30 transition active:scale-95 ${
              sharp ? "bg-emerald-400" : "bg-white"
            }`}
          >
            <span className="h-12 w-12 rounded-full border-4 border-black/10 bg-white" />
          </button>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          aria-label="Scegli dalla galleria"
          title="Dalla galleria"
          className={`absolute right-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/25 bg-white/10 text-white transition hover:bg-white/20 ${
            error ? "static" : ""
          }`}
        >
          <Image className="h-6 w-6" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
      </div>
    </div>
  );
}
