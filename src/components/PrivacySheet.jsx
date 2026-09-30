// Informativa privacy, mostrata in un bottom-sheet dal Profilo (link discreto).
// Testo di base da rivedere/personalizzare: non è una consulenza legale.
import { X } from "lucide-react";
import Sheet from "./Sheet.jsx";

// Contatto mostrato nell'informativa. Cambialo col tuo indirizzo se preferisci.
const CONTACT_EMAIL = "mar8co@gmail.com";

function Section({ title, children }) {
  return (
    <div className="mt-5">
      <h4 className="border-b-[1.5px] border-ink pb-1.5 text-[1.1rem] font-extrabold tracking-[-0.03em] text-ink">{title}</h4>
      <div className="mt-2 space-y-1.5 text-[0.95rem] font-medium leading-relaxed text-ink/80">{children}</div>
    </div>
  );
}

export default function PrivacySheet({ onClose }) {
  return (
    <Sheet onClose={onClose} panelClass="bg-sabbia">
      {(close) => (
        <div className="px-[18px] pb-8 pt-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="titolo">Privacy</h3>
            <button onClick={close} className="tondo" aria-label="Chiudi">
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
          <p className="micro mt-1">Come tratto i tuoi dati in Dispensa.</p>

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
