// Pezzi del Profilo che riguardano "come si comporta l'app":
//  - NotificationsSection: le notifiche di QUESTO dispositivo (un solo
//    interruttore per tutte: scadenze, pasti del calendario, promemoria);
//  - SettingsSection (default): la chiusura del menu — "Esci" (con conferma) e
//    il footer legale (privacy / elimina account, con dietro "Voglio solo
//    svuotare la dispensa").
// Sono due componenti perché nel Profilo stanno in punti diversi: le notifiche
// in alto tra le cose che si usano, l'uscita in fondo.
import { useState, useEffect } from "react";
import { Loader2, Bell } from "lucide-react";
import IconaEsci from "./IconaEsci.jsx";
import { pushSupported, isIosNotInstalled, getPushState, enablePush, disablePush } from "../lib/push.js";

const nome = "block text-[1rem] font-bold tracking-[-0.01em] text-ink";
const stato = "block text-[0.8rem] font-medium leading-snug text-tenue";

export function NotificationsSection() {
  // Notifiche push: stato per QUESTO dispositivo.
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushErr, setPushErr] = useState("");
  const canPush = pushSupported();
  const iosHint = isIosNotInstalled();

  // Legge se le notifiche sono già attive su questo dispositivo (esiste una
  // subscription registrata nel browser).
  useEffect(() => {
    if (!canPush) return;
    getPushState().then((s) => setPushOn(s.enabled)).catch(() => {});
  }, [canPush]);

  // Attiva (chiede permesso + iscrive) o disattiva.
  async function togglePush() {
    if (pushBusy) return;
    setPushErr(""); setPushBusy(true);
    try {
      if (pushOn) { await disablePush(); setPushOn(false); }
      else { await enablePush(); setPushOn(true); }
    } catch (e) {
      if (e?.code === "denied") {
        setPushErr("Permesso negato. Abilita le notifiche per Dispensa dalle impostazioni del telefono.");
      } else {
        console.error(e);
        setPushErr("Operazione non riuscita. Riprova.");
      }
    } finally {
      setPushBusy(false);
    }
  }

  // Dove le push non esistono (browser senza supporto) la sezione non c'è.
  if (!canPush && !iosHint) return null;

  // "Attiva" = pillola piena (invito), "Disattiva" = solo bordo.
  const attiva = "pillola min-h-[34px] bg-ink px-3.5 text-[0.84rem] text-white";
  const disattiva = "pillola min-h-[34px] px-3.5 text-[0.84rem]";

  return (
    <>
      <div className="sezione mt-6">Notifiche</div>
      {/* Niente riquadro bianco (nel Profilo lo ha solo il campo delle
          esigenze alimentari, che è l'unico in cui si scrive): riga sul blu. */}
      <div className="py-3">
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 h-[18px] w-[18px] shrink-0 text-ink" />
          <span className="min-w-0 flex-1">
            <span className={nome}>Promemoria e avvisi</span>
            {/* Cosa arriva davvero (server/push.js): si dice qui, per esteso. */}
            <span className={stato}>
              {iosHint
                ? "Installa Dispensa sulla Home (Condividi → «Aggiungi a Home») per riceverli."
                : "Prodotti in scadenza, cosa c'è a pranzo e a cena nel calendario, e un promemoria dopo i pasti per aggiornare la dispensa."}
            </span>
          </span>
          {canPush && (pushBusy ? (
            <Loader2 className="mt-1.5 h-4 w-4 shrink-0 animate-spin text-ink" />
          ) : pushOn ? (
            <button onClick={togglePush} className={`${disattiva} shrink-0`}>Disattiva</button>
          ) : (
            <button onClick={togglePush} className={`${attiva} shrink-0`}>Attiva</button>
          ))}
        </div>
        {pushErr && <p className="mt-2 text-[0.86rem] font-bold text-ink">{pushErr}</p>}
      </div>
    </>
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
    <>
      {/* Esci (con conferma in linea): in fondo. Niente filo sopra: c'è già
          quello di "Ordine delle categorie" (due fili vicini davano fastidio). */}
      {onLogout && (
        <div className="mt-2">
          {confirmLogout ? (
            <div className="flex gap-2 py-3">
              <button onClick={() => setConfirmLogout(false)} className="bottone-chiaro min-h-[44px] flex-1 py-2 text-[0.92rem]">
                Annulla
              </button>
              <button onClick={onLogout} className="bottone-rosso min-h-[44px] flex-1 py-2 text-[0.92rem]">
                Sì, esci
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmLogout(true)} className="flex min-h-[56px] w-full items-center gap-3 py-2.5 text-left">
              <span className="grid w-[19px] shrink-0 place-items-center text-ink"><IconaEsci /></span>
              <span className={nome}>Esci</span>
            </button>
          )}
        </div>
      )}

      {/* Footer discreto: privacy e cancellazione account */}
      {!confirmDelete ? (
        <div className="mt-1 flex items-center justify-center gap-2.5 text-[0.8rem] font-semibold text-tenue">
          {onOpenPrivacy && (
            <>
              <button onClick={() => { close(); onOpenPrivacy(); }} className="py-2 underline underline-offset-2">
                Privacy Policy
              </button>
              <span aria-hidden="true">·</span>
            </>
          )}
          <button onClick={() => { setDelErr(""); setConfirmDelete(true); }} className="py-2 underline underline-offset-2">
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
    </>
  );
}
