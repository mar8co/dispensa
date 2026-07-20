// Paywall Premium (mockup 1 approvato: due piani affiancati).
//
// Mostra cosa si sblocca e i due piani, con l'annuale evidenziato. Il prezzo
// barrato NON è inventato: è il costo reale di 12 mensilità (1,99 × 12 =
// 23,88 €), cioè quanto si risparmia davvero scegliendo l'annuale. Un
// riferimento fittizio violerebbe la direttiva Omnibus e la review Apple.
// Quando ci sarà App Store Connect si potrà configurare un'offerta
// introduttiva vera e cambiare solo le costanti qui sotto.
import { useState } from "react";
import { CalendarDays, Users, Sparkles, Ban, Loader2 } from "lucide-react";
import Sheet from "./Sheet.jsx";
import Button from "./Button.jsx";
import { PLANS, TRIAL_DAYS } from "../lib/premium.js";

const BENEFITS = [
  { Icon: CalendarDays, text: "Piano Alimentare settimanale" },
  { Icon: Users, text: "Invita la famiglia nella dispensa" },
  { Icon: Sparkles, text: "Ricette AI senza limiti" },
  { Icon: Ban, text: "Nessuna pubblicità" },
];

export default function PaywallSheet({ reason, onClose, onPurchase }) {
  const [plan, setPlan] = useState("yearly"); // l'annuale è l'offerta spinta
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function buy(close) {
    if (busy) return;
    setErr(""); setBusy(true);
    try {
      await onPurchase?.(PLANS[plan].id);
      close();
    } catch (e) {
      setErr(e?.message || "Acquisto non riuscito. Riprova.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet onClose={onClose}>
      {(close) => (
        <div className="px-5 pb-4 pt-1">
          <h3 className="font-display text-xl font-extrabold tracking-tight text-ink">Dispensa Premium</h3>
          {/* `reason` dice PERCHÉ è comparso (la funzione che hai toccato):
              un paywall che risponde a un'azione converte meglio di uno generico. */}
          <p className="mt-1 text-xs leading-snug text-stone-500">
            {reason || "Tutto quello che serve per non sprecare più niente."}
          </p>

          <ul className="mt-3 space-y-2">
            {BENEFITS.map(({ Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5">
                <Icon className="mt-0.5 h-[17px] w-[17px] shrink-0 text-tomato" />
                <span className="text-sm leading-snug text-ink">{text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex gap-2.5">
            {["monthly", "yearly"].map((key) => {
              const p = PLANS[key];
              const on = plan === key;
              return (
                <button
                  key={key}
                  onClick={() => setPlan(key)}
                  aria-pressed={on}
                  className={`relative flex-1 rounded-xl border-[1.5px] px-2 py-2.5 text-center transition ${
                    on ? "border-tomato bg-tomato/5" : "border-hair bg-paper hover:border-stone-300"
                  }`}
                >
                  {p.savePct && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-tomato px-2 py-0.5 text-[9px] font-bold text-[#fff]">
                      RISPARMI {p.savePct}%
                    </span>
                  )}
                  <span className="block text-[11px] text-stone-500">{p.label}</span>
                  <span className="block text-[15px] font-extrabold text-ink">{p.price}</span>
                  {p.was ? (
                    <span className="block text-[10px] text-stone-500">
                      <s>{p.was}</s> {p.wasNote}
                    </span>
                  ) : (
                    <span className="block text-[10px] text-stone-500">{p.note}</span>
                  )}
                </button>
              );
            })}
          </div>
          {plan === "yearly" && (
            <p className="mt-1.5 text-center text-[10px] text-stone-500">
              {PLANS.yearly.note} · il barrato è il costo di 12 mesi al piano mensile
            </p>
          )}

          {err && <p className="mt-3 text-center text-xs font-semibold text-tomato">{err}</p>}

          <Button variant="primary" size="lg" full className="mt-4" onClick={() => buy(close)} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Provalo ${TRIAL_DAYS} giorni gratis`}
          </Button>
          <p className="mt-2 text-center text-[10px] leading-snug text-stone-500">
            Poi {PLANS[plan].price}{plan === "yearly" ? " all'anno" : " al mese"}. Disdici quando vuoi.
          </p>

          <button onClick={close} className="mt-3 w-full text-center text-xs text-stone-500 transition hover:text-ink">
            Non ora
          </button>
        </div>
      )}
    </Sheet>
  );
}
