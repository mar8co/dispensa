// Aggiunta prodotti a voce: usa il riconoscimento vocale del browser
// (Web Speech API) per trascrivere ciò che dici, poi passa il testo al
// chiamante (che lo manda all'AI per estrarre gli alimenti).
//
// Ascolto "continuo": su iOS il riconoscimento si ferma dopo una pausa,
// quindi lo riavviamo automaticamente (accumulando il testo) finché non
// tocchi Aggiungi o metti in pausa.
//
// UI in stile assistente vocale: microfono grande con anelli che pulsano,
// equalizer animato e trascrizione in caratteri grandi.
import { useEffect, useRef, useState } from "react";
import { Mic, Loader2, Check, RotateCcw } from "lucide-react";
import Sheet from "./Sheet.jsx";

const EQ_BARS = [
  { delay: "0s", duration: "0.9s" },
  { delay: "0.12s", duration: "0.7s" },
  { delay: "0.2s", duration: "0.8s" },
  { delay: "0.05s", duration: "0.6s" },
  { delay: "0.16s", duration: "0.85s" },
];

export default function VoiceAddModal({ processing, onCancel, onResult, confirmLabel = "Aggiungi" }) {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recRef = useRef(null);
  const finalRef = useRef("");
  const keepRef = useRef(false);

  function begin() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError("Il riconoscimento vocale non è supportato su questo browser.");
      keepRef.current = false;
      return;
    }
    const rec = new SR();
    rec.lang = "it-IT";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += t + " ";
        else interim += t;
      }
      setTranscript((finalRef.current + interim).trim());
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        keepRef.current = false;
        setError("Permesso microfono negato.");
        setListening(false);
      }
      // no-speech / aborted: lasciamo che onend gestisca il riavvio
    };
    rec.onend = () => {
      // Riavvia per continuare l'ascolto oltre le pause (finché keepRef è true).
      if (keepRef.current) {
        setTimeout(() => { if (keepRef.current) begin(); }, 250);
      } else {
        setListening(false);
      }
    };
    recRef.current = rec;
    try { rec.start(); setListening(true); } catch { /* già avviato */ }
  }

  // Da capo: azzera la trascrizione e riparte.
  function start() {
    finalRef.current = "";
    setTranscript("");
    setError("");
    keepRef.current = true;
    begin();
  }

  function pause() {
    keepRef.current = false;
    try { recRef.current?.stop(); } catch { /* ignora */ }
    setListening(false);
  }

  // Riprende l'ascolto SENZA azzerare quanto già detto.
  function resume() {
    setError("");
    keepRef.current = true;
    begin();
  }

  useEffect(() => {
    start();
    return () => {
      keepRef.current = false;
      try { recRef.current?.abort(); } catch { /* ignora */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function confirm() {
    keepRef.current = false;
    try { recRef.current?.stop(); } catch { /* ignora */ }
    const t = transcript.trim();
    if (t) onResult(t);
  }

  return (
    <Sheet onClose={onCancel} locked={processing}>
      {() => (
      <div className="px-6 pb-7 pt-1 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tomato">
          {error ? "Microfono" : listening ? "Ti ascolto" : "In pausa"}
        </p>

        {/* Microfono grande: tap = pausa/riprendi. Anelli mentre ascolta. */}
        <div className="relative mx-auto my-5 h-28 w-28">
          {listening && !processing && (
            <>
              <span className="animate-voice-ring absolute inset-0 rounded-full border-2 border-tomato" />
              <span className="animate-voice-ring absolute inset-0 rounded-full border-2 border-tomato" style={{ animationDelay: "0.6s" }} />
            </>
          )}
          <button
            onClick={() => (listening ? pause() : resume())}
            disabled={processing || !!error}
            className={`absolute inset-3 flex items-center justify-center rounded-full transition active:scale-95 ${
              listening ? "bg-tomato text-white shadow-lg shadow-tomato/30" : "bg-stone-200 text-stone-500"
            }`}
            aria-label={listening ? "Metti in pausa" : "Riprendi ad ascoltare"}
          >
            <Mic className="h-9 w-9" />
          </button>
        </div>

        {/* Equalizer: danza solo mentre ascolta */}
        <div className="flex h-5 items-center justify-center gap-[3px]">
          {listening && !processing && EQ_BARS.map((b, i) => (
            <span
              key={i}
              className="voice-bar bg-tomato"
              style={{ animationDelay: b.delay, animationDuration: b.duration }}
            />
          ))}
        </div>

        {/* Trascrizione in grande, da protagonista */}
        {error ? (
          <p className="min-h-[3.5rem] py-2 text-sm font-semibold text-tomato">{error}</p>
        ) : (
          <p className="min-h-[3.5rem] py-1 font-display text-xl font-semibold leading-snug tracking-tight text-ink">
            {transcript
              ? <>«{transcript}»</>
              : <span className="font-sans text-sm font-normal italic text-stone-400">Es: «un pane, un pacco di pasta, il latte e sei uova»</span>}
          </p>
        )}
        <p className="mt-0.5 h-4 text-xs text-stone-400">
          {!error && listening ? `parla pure, poi tocca ${confirmLabel}` : ""}
        </p>

        {/* Azioni */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={start}
            disabled={processing}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-hair py-3 text-sm font-semibold text-stone-500 transition hover:bg-stone-50 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" /> Riprova
          </button>
          <button
            onClick={confirm}
            disabled={processing || !transcript.trim()}
            className="flex flex-[2] items-center justify-center gap-1.5 rounded-xl bg-tomato py-3 text-sm font-bold text-white transition hover:bg-tomato-700 disabled:opacity-40"
          >
            {processing
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Elaboro…</>
              : <><Check className="h-4 w-4" /> {confirmLabel}</>}
          </button>
        </div>
      </div>
      )}
    </Sheet>
  );
}
