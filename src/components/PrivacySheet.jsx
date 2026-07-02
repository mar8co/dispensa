// Informativa privacy, mostrata in un bottom-sheet dal Profilo (link discreto).
// Testo di base da rivedere/personalizzare: non è una consulenza legale.
import { X } from "lucide-react";
import Sheet from "./Sheet.jsx";

// Contatto mostrato nell'informativa. Cambialo col tuo indirizzo se preferisci.
const CONTACT_EMAIL = "mar8co@gmail.com";

function Section({ title, children }) {
  return (
    <div className="mt-5">
      <h4 className="font-display text-sm font-bold uppercase tracking-wide text-ink">{title}</h4>
      <div className="mt-1.5 space-y-1.5 text-sm leading-relaxed text-stone-600">{children}</div>
    </div>
  );
}

export default function PrivacySheet({ onClose }) {
  return (
    <Sheet onClose={onClose}>
      {(close) => (
        <div className="px-5 pb-8 pt-1">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-display text-xl font-extrabold tracking-tight text-ink">Privacy</h3>
            <button onClick={close} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100" aria-label="Chiudi">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-xs text-stone-500">Come tratto i tuoi dati in Dispensa.</p>

          <Section title="Quali dati tratto">
            <p>• <strong className="text-ink">Account</strong>: il tuo indirizzo email (per l'accesso).</p>
            <p>• <strong className="text-ink">Contenuti tuoi</strong>: prodotti in dispensa, lista della spesa, ricette salvate e preferenze alimentari.</p>
            <p>• <strong className="text-ink">Foto</strong>: le immagini di scontrini/prodotti che scegli di scattare o caricare, usate solo per riconoscere i prodotti in quel momento.</p>
          </Section>

          <Section title="Con chi e dove">
            <p>Per far funzionare l'app uso questi servizi, a cui possono transitare i dati necessari:</p>
            <p>• <strong className="text-ink">Supabase</strong> — database, account e sincronizzazione.</p>
            <p>• <strong className="text-ink">Vercel</strong> — hosting dell'app.</p>
            <p>• <strong className="text-ink">Google Gemini</strong> — analisi delle foto e generazione delle ricette.</p>
            <p>• <strong className="text-ink">Pexels</strong> — foto dei piatti.</p>
            <p>• <strong className="text-ink">Open Food Facts</strong> — informazioni sul prodotto dal codice a barre.</p>
          </Section>

          <Section title="Perché">
            <p>I dati servono solo a far funzionare le funzioni dell'app (gestione dispensa, lista spesa, ricette, scansioni). Non vendo i tuoi dati e non li uso per pubblicità.</p>
          </Section>

          <Section title="Conservazione e cancellazione">
            <p>I dati restano finché mantieni l'account. Puoi cancellare tutto in qualsiasi momento da <strong className="text-ink">Profilo › Elimina account</strong>: l'eliminazione è definitiva e rimuove i tuoi dati.</p>
          </Section>

          <Section title="I tuoi diritti">
            <p>Puoi accedere, correggere o cancellare i tuoi dati e opporti al trattamento. Per richieste scrivimi a <strong className="text-ink">{CONTACT_EMAIL}</strong>.</p>
          </Section>
        </div>
      )}
    </Sheet>
  );
}
