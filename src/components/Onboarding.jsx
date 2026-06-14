// Tutorial guidato al primo accesso: una sequenza di schede che presenta le
// funzioni principali. La dispensa è già popolata con prodotti demo (così il
// tutorial è realistico); all'ultima scheda si spiega come svuotarla e, alla
// chiusura, i prodotti demo vengono eliminati per partire puliti.
import { useState } from "react";
import {
  Package, Search, Plus, Pencil, ShoppingCart, Camera, Timer, ChefHat,
  Heart, Trash2, ArrowRight, X,
} from "lucide-react";

const STEPS = [
  { icon: Package, title: "Benvenuto! 👋", text: "Questa è La Mia Dispensa: tieni d'occhio cosa hai in casa, cucina con quello che c'è e fai la spesa senza dimenticare nulla. Ti mostro tutto in un minuto." },
  { icon: Package, title: "Naviga tra i reparti", text: "I prodotti sono raggruppati per reparto. Scorri le linguette in alto o tocca la freccia per vederli tutti e saltare al reparto che vuoi." },
  { icon: Plus, title: "Aggiungi un prodotto", text: "Tocca il “+” in basso: a mano, con la voce, scansionando il codice a barre o fotografando la spesa. Il prodotto viene riconosciuto e messo nel reparto giusto." },
  { icon: Pencil, title: "Quantità e unità", text: "Tocca un prodotto per aprirlo: cambia la quantità con − e +, scegli l'unità (pz, g, kg, l) e imposta la scadenza. Si salva da solo." },
  { icon: Search, title: "Cerca al volo", text: "Hai tanti prodotti? Usa la ricerca in alto per trovarne uno in un attimo, anche dopo aver scorrito la lista." },
  { icon: ShoppingCart, title: "La lista della spesa", text: "Nella scheda Spesa scrivi cosa ti manca (o dettalo). Spunta i prodotti mentre sei al supermercato e spostali in dispensa con un tocco quando torni a casa." },
  { icon: Camera, title: "Scansiona lo scontrino", text: "Dopo la spesa, fotografa lo scontrino: l'app riconosce i prodotti e li aggiunge automaticamente. Tu controlli e confermi." },
  { icon: ChefHat, title: "Ricette su misura", text: "Nella scheda Ricette ottieni proposte con quello che hai già in dispensa. Apri una ricetta per ingredienti, dosi e procedimento passo-passo." },
  { icon: Timer, title: "Timer di cottura", text: "Ogni passaggio con un tempo ha un timer integrato: avvialo e continua pure a usare l'app — ti avvisa con suono e vibrazione quando è pronto." },
  { icon: Heart, title: "Salva i preferiti", text: "Tocca il cuore su una ricetta per salvarla nel tuo ricettario e ritrovarla quando vuoi, senza rigenerarla." },
  { icon: Trash2, title: "Pronti a partire!", text: "Per svuotare tutto, vai nel profilo (in alto a destra) e tocca “Svuota dispensa”. Ora cancello i prodotti di esempio così parti da una dispensa tutta tua." },
];

export default function Onboarding({ onFinish }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const Icon = step.icon;
  const last = i === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-cream" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Salta */}
      <div className="flex justify-end px-5 pt-3">
        {!last && (
          <button onClick={onFinish} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-stone-400 hover:text-ink">
            Salta <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Contenuto */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] bg-tomato/10">
          <Icon className="h-11 w-11 text-tomato" strokeWidth={1.8} />
        </div>
        <h2 className="font-display text-[26px] font-extrabold leading-tight tracking-tight text-ink">{step.title}</h2>
        <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-stone-500">{step.text}</p>
      </div>

      {/* Indicatori + avanti */}
      <div className="px-6" style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>
        <div className="mb-4 flex justify-center gap-1.5">
          {STEPS.map((_, k) => (
            <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-tomato" : "w-1.5 bg-stone-300"}`} />
          ))}
        </div>
        <button
          onClick={() => (last ? onFinish() : setI((v) => v + 1))}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-tomato px-4 py-3.5 text-sm font-bold text-[#fff] transition hover:bg-tomato-700 active:scale-[0.99]"
        >
          {last ? "Inizia a usare l'app" : <>Avanti <ArrowRight className="h-4 w-4" /></>}
        </button>
      </div>
    </div>
  );
}
