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
import { Mic, Loader2, Check } from "lucide-react";
import Sheet from "./Sheet.jsx";

export default function VoiceAddModal({ processing, onCancel, onResult, confirmLabel = "Aggiungi" }) {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recRef = useRef(null);
  const finalRef = useRef("");
  const keepRef = useRef(false);
  const sentRef = useRef(false); // anti doppio-invio: un solo onResult per apertura

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
    if (sentRef.current) return; // il tap doppio non deve avviare due elaborazioni
    keepRef.current = false;
    try { recRef.current?.stop(); } catch { /* ignora */ }
    const t = transcript.trim();
    if (t) { sentRef.current = true; onResult(t); }
  }

  return (
    <Sheet onClose={onCancel} locked={processing}>
      {() => (
      <div className="px-6 pb-7 pt-1 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tomato">
          {error ? "Microfono" : listening ? "Ti ascolto" : "In pausa"}
        </p>

        {/* Microfono: tap = pausa/riprendi. Un solo anello, discreto. */}
        <div className="relative mx-auto my-4 h-20 w-20">
          {listening && !processing && (
            <span className="animate-voice-ring absolute inset-0 rounded-full border border-tomato/40" style={{ animationDuration: "2.4s" }} />
          )}
          <button
            onClick={() => (listening ? pause() : resume())}
            disabled={processing || !!error}
            className={`absolute inset-2 flex items-center justify-center rounded-full transition active:scale-95 ${
              listening ? "bg-tomato text-white" : "bg-stone-200 text-stone-500"
            }`}
            aria-label={listening ? "Metti in pausa" : "Riprendi ad ascoltare"}
          >
            <Mic className="h-7 w-7" />
          </button>
        </div>

        {/* Trascrizione: la vera protagonista */}
        {error ? (
          <p className="min-h-[5rem] py-2 text-sm font-semibold text-tomato">{error}</p>
        ) : (
          <p className="min-h-[5rem] px-1 py-1 font-display text-[22px] font-bold leading-snug tracking-tight text-ink">
            {transcript
              ? <>«{transcript}»</>
              : <span className="font-sans text-sm font-normal italic text-stone-400">Es: «pane, un pacco di pasta, il latte e sei uova»</span>}
          </p>
        )}
        <p className="mt-0.5 h-4 text-xs text-stone-500">
          {!error && listening ? `Quando hai finito, tocca “${confirmLabel}”` : ""}
        </p>

        {/* Unica azione: conferma (pausa/riprendi = tap sul microfono) */}
        <button
          onClick={confirm}
          disabled={processing || !transcript.trim()}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-tomato py-3.5 text-sm font-bold text-white transition hover:bg-tomato-700 disabled:opacity-40"
        >
          {processing
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Elaboro…</>
            : <><Check className="h-4 w-4" /> {confirmLabel}</>}
        </button>
      </div>
      )}
    </Sheet>
  );
}
