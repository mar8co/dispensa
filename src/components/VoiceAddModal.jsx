// Aggiunta prodotti a voce: usa il riconoscimento vocale del browser
// (Web Speech API) per trascrivere ciò che dici, poi passa il testo al
// chiamante (che lo manda all'AI per estrarre e categorizzare gli alimenti).
import { useEffect, useRef, useState } from "react";
import { Mic, X, Loader2, Check, RotateCcw } from "lucide-react";

export default function VoiceAddModal({ processing, onCancel, onResult }) {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recRef = useRef(null);
  const finalRef = useRef("");

  function start() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError("Il riconoscimento vocale non è supportato su questo browser.");
      return;
    }
    const rec = new SR();
    rec.lang = "it-IT";
    rec.interimResults = true;
    rec.continuous = false;
    finalRef.current = "";
    setTranscript("");
    setError("");
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
      if (e.error !== "no-speech" && e.error !== "aborted") {
        setError("Microfono non disponibile o permesso negato.");
      }
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try { rec.start(); setListening(true); } catch { /* già avviato */ }
  }

  useEffect(() => {
    start();
    return () => { try { recRef.current?.abort(); } catch { /* ignora */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function confirm() {
    const t = transcript.trim();
    try { recRef.current?.stop(); } catch { /* ignora */ }
    if (t) onResult(t);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Mic className="h-5 w-5" /> Aggiungi a voce
          </h3>
          <button onClick={onCancel} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Indicatore microfono */}
        <div className="flex flex-col items-center py-3">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full transition ${listening ? "bg-red-100 text-red-600" : "bg-stone-100 text-stone-400"}`}>
            {listening
              ? <Mic className="h-8 w-8 animate-pulse" />
              : <Mic className="h-8 w-8" />}
          </div>
          <p className="mt-2 text-xs text-stone-500">
            {error ? "" : listening ? "Sto ascoltando…" : "Tocca per riascoltare"}
          </p>
        </div>

        {/* Trascrizione */}
        {!error && (
          <div className="min-h-[3rem] rounded-xl bg-stone-50 px-3 py-2 text-center text-sm text-stone-700">
            {transcript || <span className="text-stone-400">Es: "ho comprato un pane, un pacco di pasta, il latte e 6 uova"</span>}
          </div>
        )}
        {error && <p className="text-center text-sm font-medium text-red-600">{error}</p>}

        {/* Azioni */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={start}
            disabled={processing || listening}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" /> Riascolta
          </button>
          <button
            onClick={confirm}
            disabled={processing || !transcript.trim()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Elaboro…</> : <><Check className="h-4 w-4" /> Aggiungi</>}
          </button>
        </div>
      </div>
    </div>
  );
}
