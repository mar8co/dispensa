// Aggiunta prodotti a voce: usa il riconoscimento vocale del browser
// (Web Speech API) per trascrivere ciò che dici, poi passa il testo al
// chiamante (che lo legge in locale e, se serve, con l'AI).
//
// Il riconoscimento del browser su iPhone è capriccioso; tre difese (10/10):
//  1. Ascolto "continuo" fatto a mano: dopo ogni pausa il riconoscimento si
//     ferma e lo riavviamo, accumulando il testo. Le parole ancora
//     "provvisorie" al momento dello stop NON si buttano più (prima sparivano:
//     "parlo ma non trascrive").
//  2. Guardia: se ascolta ma per qualche secondo non arriva nulla, lo si
//     riavvia e lo si dice ("Non ti sento…").
//  3. Il testo è un CAMPO: si può correggere, scrivere a mano o dettare col
//     microfono della tastiera dell'iPhone, che funziona sempre. Così il
//     foglio serve anche dove il riconoscimento del browser non c'è.
import { useEffect, useRef, useState } from "react";
import { Mic, Loader2, Check } from "lucide-react";
import Sheet from "./Sheet.jsx";

const IOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
const SILENZIO_MS = 7000; // senza risultati per così tanto: riavvia e avvisa

export default function VoiceAddModal({ processing, onCancel, onResult, confirmLabel = "Aggiungi" }) {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [deaf, setDeaf] = useState(false); // ascolta ma non arriva nulla
  const recRef = useRef(null);
  const finalRef = useRef("");   // testo già confermato
  const interimRef = useRef(""); // ultime parole ancora provvisorie
  const keepRef = useRef(false);
  const sentRef = useRef(false); // anti doppio-invio: un solo onResult per apertura
  const watchRef = useRef(null);

  function armWatch() {
    clearTimeout(watchRef.current);
    watchRef.current = setTimeout(() => {
      if (!keepRef.current) return;
      setDeaf(true);
      // Riavvio: onend rifà partire l'ascolto (keepRef è ancora true).
      try { recRef.current?.abort(); } catch { /* ignora */ }
    }, SILENZIO_MS);
  }

  function begin() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError("Qui la dettatura non è disponibile: scrivi la lista qui sotto, o usa il microfono della tastiera.");
      keepRef.current = false;
      return;
    }
    const rec = new SR();
    rec.lang = "it-IT";
    rec.interimResults = true;
    // Su iPhone l'ascolto continuo del browser a volte non restituisce nulla:
    // una frase alla volta (e riavvio a ogni pausa) è più affidabile.
    rec.continuous = !IOS;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += t + " ";
        else interim += t;
      }
      interimRef.current = interim;
      setDeaf(false);
      setTranscript((finalRef.current + interim).trim());
      armWatch();
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        keepRef.current = false;
        setError("Permesso microfono negato. Abilitalo dalle impostazioni, oppure scrivi la lista qui sotto.");
        setListening(false);
      } else if (e.error === "audio-capture" || e.error === "network") {
        keepRef.current = false;
        setError("Il microfono non risponde. Scrivi la lista qui sotto, o usa il microfono della tastiera.");
        setListening(false);
      }
      // no-speech / aborted: lasciamo che onend gestisca il riavvio
    };
    rec.onend = () => {
      // Le parole rimaste provvisorie diventano definitive: senza questo un
      // riavvio le cancellava.
      if (interimRef.current) {
        finalRef.current += interimRef.current.trim() + " ";
        interimRef.current = "";
        setTranscript(finalRef.current.trim());
      }
      // Riavvia per continuare l'ascolto oltre le pause (finché keepRef è true).
      if (keepRef.current) {
        setTimeout(() => { if (keepRef.current) begin(); }, 250);
      } else {
        setListening(false);
      }
    };
    recRef.current = rec;
    try { rec.start(); setListening(true); armWatch(); } catch { /* già avviato */ }
  }

  // Da capo: azzera la trascrizione e riparte.
  function start() {
    finalRef.current = "";
    interimRef.current = "";
    setTranscript("");
    setError("");
    setDeaf(false);
    keepRef.current = true;
    begin();
  }

  function pause() {
    keepRef.current = false;
    clearTimeout(watchRef.current);
    try { recRef.current?.stop(); } catch { /* ignora */ }
    setListening(false);
    setDeaf(false);
  }

  // Riprende l'ascolto SENZA azzerare quanto già detto.
  function resume() {
    setError("");
    setDeaf(false);
    keepRef.current = true;
    begin();
  }

  // Scrittura a mano (o dettatura della tastiera): l'ascolto si ferma, e ciò
  // che si scrive diventa il testo di partenza se poi si riprende a parlare.
  function typed(v) {
    if (keepRef.current) pause();
    interimRef.current = "";
    finalRef.current = v ? `${v} ` : "";
    setTranscript(v);
  }

  useEffect(() => {
    start();
    return () => {
      keepRef.current = false;
      clearTimeout(watchRef.current);
      try { recRef.current?.abort(); } catch { /* ignora */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function confirm() {
    if (sentRef.current) return; // il tap doppio non deve avviare due elaborazioni
    keepRef.current = false;
    clearTimeout(watchRef.current);
    try { recRef.current?.stop(); } catch { /* ignora */ }
    const t = (transcript || (finalRef.current + interimRef.current)).trim();
    if (t) { sentRef.current = true; onResult(t); }
  }

  return (
    <Sheet onClose={onCancel} locked={processing}>
      {() => (
      <div className="px-[18px] pb-6 pt-1 text-center">
        <p className="micro">
          {error ? "Microfono" : listening ? (deaf ? "Non ti sento" : "Ti ascolto") : "In pausa"}
        </p>

        {/* Microfono: tap = pausa/riprendi. Un solo anello, discreto. */}
        <div className="relative mx-auto my-4 h-20 w-20">
          {listening && !processing && (
            <span className="animate-voice-ring absolute inset-0 rounded-full border-2 border-ink/40" style={{ animationDuration: "2.4s" }} />
          )}
          <button
            onClick={() => (listening ? pause() : resume())}
            disabled={processing}
            className={`absolute inset-2 flex items-center justify-center rounded-full transition active:scale-95 ${
              listening ? "bg-ink text-white" : "border-[1.5px] border-ink bg-transparent text-ink"
            }`}
            aria-label={listening ? "Metti in pausa" : "Riprendi ad ascoltare"}
          >
            <Mic className="h-7 w-7" />
          </button>
        </div>

        {(error || deaf) && (
          <p className="mb-2 text-[0.9rem] font-bold leading-snug text-ink">
            {error || "Non mi arriva la voce: avvicina il telefono e riprova, oppure scrivi qui sotto."}
          </p>
        )}

        {/* Trascrizione: la vera protagonista. È un campo: si corregge, si
            scrive, o si detta col microfono della tastiera. */}
        <textarea
          value={transcript}
          onChange={(e) => typed(e.target.value)}
          rows={3}
          disabled={processing}
          placeholder="Es: pane, un pacco di pasta, il latte e sei uova"
          aria-label="Lista dettata"
          className="testo-grande min-h-[5rem] w-full resize-none bg-transparent px-1 py-1 text-center text-[1.45rem] font-extrabold leading-[1.15] tracking-[-0.04em] text-ink outline-none placeholder:text-[0.95rem] placeholder:font-medium placeholder:tracking-normal placeholder:text-tenue"
        />
        <p className="micro mt-1 h-4">
          {!error && listening ? `Quando hai finito, tocca “${confirmLabel}”` : "Puoi correggere o scrivere a mano"}
        </p>

        {/* Unica azione: conferma (pausa/riprendi = tap sul microfono) */}
        <button
          onClick={confirm}
          disabled={processing || !transcript.trim()}
          className="bottone mt-4 w-full"
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
