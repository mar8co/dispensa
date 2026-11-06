// Pezzi del Profilo che riguardano "come si comporta l'app":
//  - NotificationBell: la campanella rosa in alto a destra, un solo
//    interruttore per tutte le notifiche di QUESTO dispositivo;
//  - SettingsSection (default): la chiusura del menu — "Esci" (con conferma) e
//    il footer legale (privacy / elimina account, con dietro "Voglio solo
//    svuotare la dispensa").
// Sono due componenti perché nel Profilo stanno in punti diversi: la
// campanella in testata, l'uscita in fondo.
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { pushSupported, isIosNotInstalled, getPushState, enablePush, disablePush } from "../lib/push.js";


// Campanella (come in Expense Track e Wishlist): disegnata piena quando le
// notifiche sono accese, barrata quando sono spente.
function BellIcon({ on }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 21h4" fill="none" />
      {!on && <path d="M3.5 3.5l17 17" fill="none" />}
    </svg>
  );
}

// Tondo rosa in alto a destra nel Profilo (al posto della X e della riga
// "Notifiche", dal 12/10): un tocco accende o spegne TUTTE le notifiche di
// questo dispositivo (scadenze, pasti del calendario, cosa manca per domani,
// lista della spesa, promemoria dopo i pasti). `onNotify(testo)` = avviso.
export function NotificationBell({ onNotify }) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const canPush = pushSupported();

  // Sono già attive su questo dispositivo?
  useEffect(() => {
    if (!canPush) return;
    getPushState().then((s) => setOn(s.enabled)).catch(() => {});
  }, [canPush]);

  async function toggle() {
    if (busy) return;
    if (isIosNotInstalled()) { onNotify?.("Per le notifiche installa Dispensa sulla Home (Condividi → Aggiungi a Home)"); return; }
    if (!canPush) { onNotify?.("Questo browser non riceve notifiche"); return; }
    setBusy(true);
    try {
      if (on) { await disablePush(); setOn(false); onNotify?.("Notifiche spente"); }
      else { await enablePush(); setOn(true); onNotify?.("Notifiche attive: scadenze, pasti e lista della spesa"); }
    } catch (e) {
      if (e?.code === "denied") onNotify?.("Permesso negato: abilita le notifiche per Dispensa dalle impostazioni del telefono");
      else { console.error(e); onNotify?.("Operazione non riuscita. Riprova."); }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-busy={busy}
      aria-label={on ? "Notifiche attive: tocca per spegnerle" : "Attiva le notifiche"}
      className={`tondo bg-rosa transition active:scale-90 ${busy ? "opacity-60" : ""}`}
    >
      <BellIcon on={on} />
    </button>
  );
}

// In FONDO al pannello (mt-auto: il Profilo è una colonna alta quanto lo
// schermo): una riga sola di azioni rare — Elimina account · Privacy · Esci.
// Dal 06/11 le conferme non sono più in linea: ogni azione chiude il Profilo e
// apre una Domanda (Domanda.jsx), come in Second Brain. Lo fa Dispensa.jsx
// (`onLogout` / `onDeleteAccount` qui sono le funzioni che chiedono).
export default function SettingsSection({ close, onDeleteAccount, onOpenPrivacy, onLogout }) {
  return (
    <div className="mt-auto pt-8">
      <div className="flex flex-wrap items-center justify-center gap-x-2.5 text-[0.8rem] font-semibold text-tenue">
        {/* Ordine (12/10): l'azione più rischiosa a sinistra, "Esci" a destra. */}
        {onDeleteAccount && (
          <button onClick={() => { close(); onDeleteAccount(); }} className="py-2 underline underline-offset-2">
            Elimina account
          </button>
        )}
        {onOpenPrivacy && (
          <>
            <span aria-hidden="true">·</span>
            <button onClick={() => { close(); onOpenPrivacy(); }} className="py-2 underline underline-offset-2">
              Privacy Policy
            </button>
          </>
        )}
        {onLogout && (
          <>
            <span aria-hidden="true">·</span>
            <button onClick={() => { close(); onLogout(); }} className="py-2 underline underline-offset-2">
              Esci
            </button>
          </>
        )}
      </div>
    </div>
  );
}
