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

export default function SettingsSection({ close, onDeleteAccount, onOpenPrivacy, onLogout, onClearPantry }) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [delErr, setDelErr] = useState("");

  async function runDelete() {
    setDeleting(true); setDelErr("");
    try { await onDeleteAccount?.(); }
    catch { setDeleting(false); setDelErr("Eliminazione non riuscita. Riprova."); }
  }

  return (
    // In FONDO al pannello (mt-auto: il Profilo è una colonna alta quanto lo
    // schermo): una riga sola di azioni rare — Esci · Privacy · Elimina account.
    <div className="mt-auto pt-8">
      {/* Esci: conferma in linea, sopra la riga. */}
      {confirmLogout && (
        <div className="mb-2 flex gap-2">
          <button onClick={() => setConfirmLogout(false)} className="bottone-chiaro min-h-[44px] flex-1 py-2 text-[0.92rem]">
            Annulla
          </button>
          <button onClick={onLogout} className="bottone-rosso min-h-[44px] flex-1 py-2 text-[0.92rem]">
            Sì, esci
          </button>
        </div>
      )}
      {!confirmDelete ? (
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 text-[0.8rem] font-semibold text-tenue">
          {onLogout && (
            <>
              <button onClick={() => setConfirmLogout(true)} className="py-2 underline underline-offset-2">
                Esci
              </button>
              <span aria-hidden="true">·</span>
            </>
          )}
          {onOpenPrivacy && (
            <>
              <button onClick={() => { close(); onOpenPrivacy(); }} className="py-2 underline underline-offset-2">
                Privacy Policy
              </button>
              <span aria-hidden="true">·</span>
            </>
          )}
          <button onClick={() => { setDelErr(""); setConfirmLogout(false); setConfirmDelete(true); }} className="py-2 underline underline-offset-2">
            Elimina account
          </button>
        </div>
      ) : (
        <div className="mt-3 rounded-card bg-giallo p-3.5 text-center">
          <p className="text-[0.95rem] font-semibold leading-snug text-ink">Eliminare account e tutti i dati? L&rsquo;azione è definitiva e non recuperabile.</p>
          {/* "Svuota dispensa" sta qui dietro (dal 09/10): si usa di rado
              e non deve stare tra le righe di tutti i giorni. */}
          {onClearPantry && (
            <button onClick={onClearPantry} disabled={deleting} className="mt-1.5 py-1.5 text-[0.86rem] font-bold text-ink underline underline-offset-2">
              Voglio solo svuotare la dispensa
            </button>
          )}
          {delErr && <p className="mt-1.5 text-[0.86rem] font-bold text-ink">{delErr}</p>}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="bottone-chiaro min-h-[44px] flex-1 py-2 text-[0.92rem]"
            >
              Annulla
            </button>
            <button
              onClick={runDelete}
              disabled={deleting}
              className="bottone-rosso min-h-[44px] flex-1 py-2 text-[0.92rem]"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Elimina tutto"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
