// Aggiunta prodotti a voce: usa il riconoscimento vocale del browser
// (Web Speech API) per trascrivere ciò che dici, poi passa il testo al
// chiamante (che lo manda all'AI per estrarre e categorizzare gli alimenti).
//
// Ascolto "continuo": su iOS il riconoscimento si ferma dopo una pausa, quindi
// lo riavviamo automaticamente (accumulando il testo) finché non tocchi
// "Aggiungi" o "Stop".
import { useEffect, useRef, useState } from "react";
import { Mic, X, Loader2, Check, RotateCcw, Square } from "lucide-react";
import Sheet from "./Sheet.jsx";

export default function VoiceAddModal({ processing, onCancel, onResult }) {
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

  function start() {
    finalRef.current = "";
    setTranscript("");
    setError("");
    keepRef.current = true;
    begin();
  }

  function stop() {
    keepRef.current = false;
    try { recRef.current?.stop(); } catch { /* ignora */ }
    setListening(false);
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
      {(close) => (
      <div className="px-5 pb-7 pt-1">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Mic className="h-5 w-5" /> Aggiungi a voce
          </h3>
          <button onClick={close} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Indicatore microfono */}
        <div className="flex flex-col items-center py-3">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full transition ${listening ? "bg-tomato/15 text-tomato" : "bg-stone-100 text-stone-400"}`}>
            <Mic className={`h-8 w-8 ${listening ? "animate-pulse" : ""}`} />
          </div>
          <p className="mt-2 text-xs text-stone-500">
            {error ? "" : listening ? "Sto ascoltando… parla pure, tocca Aggiungi quando hai finito" : "In pausa"}
          </p>
        </div>

        {/* Trascrizione */}
        {!error && (
          <div className="min-h-[3rem] rounded-xl bg-stone-50 px-3 py-2 text-center text-sm text-stone-700">
            {transcript || <span className="text-stone-400">Es: "ho comprato un pane, un pacco di pasta, il latte e 6 uova"</span>}
          </div>
        )}
        {error && <p className="text-center text-sm font-medium text-tomato">{error}</p>}

        {/* Azioni */}
        <div className="mt-4 flex gap-2">
          {listening ? (
            <button
              onClick={stop}
              disabled={processing}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-50"
            >
              <Square className="h-4 w-4" /> Stop
            </button>
          ) : (
            <button
              onClick={start}
              disabled={processing}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" /> Riascolta
            </button>
          )}
          <button
            onClick={confirm}
            disabled={processing || !transcript.trim()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Elaboro…</> : <><Check className="h-4 w-4" /> Aggiungi</>}
          </button>
        </div>
      </div>
      )}
    </Sheet>
  );
}
