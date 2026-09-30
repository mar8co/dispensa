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
    <Sheet onClose={onClose} panelClass="bg-rosa">
      {(close) => (
        <div className="px-[18px] pb-4 pt-1">
          <h3 className="titolo">Dispensa Premium</h3>
          {/* `reason` dice PERCHÉ è comparso (la funzione che hai toccato):
              un paywall che risponde a un'azione converte meglio di uno generico. */}
          <p className="mt-2 text-[0.95rem] font-semibold leading-snug text-ink/70">
            {reason || "Tutto quello che serve per non sprecare più niente."}
          </p>

          <ul className="mt-4 divide-y divide-riga border-y-[1.5px] border-ink">
            {BENEFITS.map(({ Icon, text }) => (
              <li key={text} className="flex items-start gap-3 py-2.5">
                <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-ink" />
                <span className="text-[1rem] font-semibold leading-snug text-ink">{text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex gap-2.5">
            {["monthly", "yearly"].map((key) => {
              const p = PLANS[key];
              const on = plan === key;
              return (
                <button
                  key={key}
                  onClick={() => setPlan(key)}
                  aria-pressed={on}
                  className={`relative flex-1 rounded-card px-2 pb-2.5 pt-3.5 text-center transition ${
                    on ? "bg-white shadow-[inset_0_0_0_2.5px_#0a0a0a]" : "bg-white/55"
                  }`}
                >
                  {p.savePct && (
                    <span className="cartellino absolute -top-2.5 left-1/2 -translate-x-1/2 bg-ink text-white">
                      Risparmi {p.savePct}%
                    </span>
                  )}
                  <span className="micro block">{p.label}</span>
                  <span className="num block text-[1.6rem] font-extrabold leading-tight tracking-[-0.05em] text-ink">{p.price}</span>
                  {p.was ? (
                    <span className="block text-[0.72rem] font-medium text-tenue">
                      <s>{p.was}</s> {p.wasNote}
                    </span>
                  ) : (
                    <span className="block text-[0.72rem] font-medium text-tenue">{p.note}</span>
                  )}
                </button>
              );
            })}
          </div>
          {plan === "yearly" && (
            <p className="micro mt-2 text-center">
              {PLANS.yearly.note} · il barrato è il costo di 12 mesi al piano mensile
            </p>
          )}

          {err && <p className="mt-3 text-center text-[0.9rem] font-bold text-ink">{err}</p>}

          <Button variant="primary" size="lg" full className="mt-4" onClick={() => buy(close)} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Provalo ${TRIAL_DAYS} giorni gratis`}
          </Button>
          <p className="micro mt-2 text-center">
            Poi {PLANS[plan].price}{plan === "yearly" ? " all'anno" : " al mese"}. Disdici quando vuoi.
          </p>

          <button onClick={close} className="link mt-2 block min-h-[40px] w-full text-center text-[0.9rem] text-ink">
            Non ora
          </button>
        </div>
      )}
    </Sheet>
  );
}
