// Impostazioni (dall'ingranaggio in alto a destra di ogni scheda):
// pannello laterale da destra, con la X in alto a destra. Raccoglie il "come si
// comporta l'app": Face ID, notifiche push, tutorial, "Esci" (con conferma)
// e il footer legale (privacy / elimina account). Il Profilo resta
// il "chi sei": nome, dispensa familiare, esigenze alimentari e azioni dati.
import { useState, useEffect } from "react";
import {
  GraduationCap, Loader2, Bell,
  Sparkles, ChevronRight,
} from "lucide-react";
import Sheet from "./Sheet.jsx";
import IconaEsci from "./IconaEsci.jsx";
import IconaChiudi from "./IconaChiudi.jsx";
import FaceIdIcon from "./FaceIdIcon.jsx";
import { supabase } from "../lib/supabase.js";
import { pushSupported, isIosNotInstalled, getPushState, enablePush, disablePush } from "../lib/push.js";

// WebAuthn/passkey disponibile solo dove esiste l'API credenziali (iPhone
// Safari/PWA la supporta). Se manca, la riga Face ID non compare.
const CAN_USE_PASSKEY = typeof window !== "undefined" && !!window.PublicKeyCredential;

export default function SettingsSheet({
  onClose, onReplayTour, onDeleteAccount, onOpenPrivacy, onLogout,
  isPro = true, onOpenPaywall,
}) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [delErr, setDelErr] = useState("");
  const [uid, setUid] = useState(null);              // id utente (chiave localStorage passkey)
  const [passkeyActive, setPasskeyActive] = useState(false); // Face ID attivo su questo device
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyErr, setPasskeyErr] = useState("");
  // Notifiche push (avvisi scadenze): stato per QUESTO dispositivo.
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushErr, setPushErr] = useState("");
  const canPush = pushSupported();
  const iosHint = isIosNotInstalled();

  // Recupera l'uid e legge se il Face ID è già stato attivato su questo
  // dispositivo (flag locale per-utente scritto al momento della registrazione).
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const id = data?.user?.id;
      if (!id) return;
      setUid(id);
      const active = localStorage.getItem(`dispensa-passkey-${id}`) === "1";
      setPasskeyActive(active);
      // Auto-riparazione: chi ha attivato Face ID PRIMA dell'introduzione del
      // flag di dispositivo ha solo quello per-utente — senza questo riallineo
      // il pulsante "Accedi con Face ID" non comparirebbe mai nel login.
      if (active) { try { localStorage.setItem("dispensa-passkey-device", "1"); } catch { /* */ } }
    }).catch(() => {});
  }, []);

  // Legge se le notifiche sono già attive su questo dispositivo (esiste una
  // subscription registrata nel browser).
  useEffect(() => {
    if (!canPush) return;
    getPushState().then((s) => setPushOn(s.enabled)).catch(() => {});
  }, [canPush]);

  // Registra una passkey (Face ID/Touch ID) per l'utente loggato: richiede una
  // sessione attiva. Al successo salviamo il flag locale così il login mostrerà
  // il pulsante "Accedi con Face ID" su questo dispositivo.
  async function activatePasskey() {
    if (passkeyBusy) return;
    setPasskeyErr(""); setPasskeyBusy(true);
    try {
      const { error } = await supabase.auth.registerPasskey();
      if (error) throw error;
      if (uid) localStorage.setItem(`dispensa-passkey-${uid}`, "1");
      // Flag a livello DISPOSITIVO (non per-utente): il login lo usa per
      // mostrare il pulsante Face ID solo dove una passkey esiste davvero.
      localStorage.setItem("dispensa-passkey-device", "1");
      setPasskeyActive(true);
    } catch (e) {
      // Prompt di sistema annullato dall'utente: nessun errore da mostrare.
      if (e?.name === "NotAllowedError" || e?.name === "AbortError") return;
      console.error(e);
      setPasskeyErr("Attivazione non riuscita. Riprova.");
    } finally {
      setPasskeyBusy(false);
    }
  }

  // Disattiva il Face ID su QUESTO dispositivo: rimuove i flag locali, così il
  // pulsante sparisce dal login. La passkey resta nel portachiavi (innocua);
  // riattivando, iOS riusa o aggiorna la credenziale esistente.
  function deactivatePasskey() {
    try {
      if (uid) localStorage.removeItem(`dispensa-passkey-${uid}`);
      localStorage.removeItem("dispensa-passkey-device");
    } catch { /* */ }
    setPasskeyActive(false);
  }

  // Toggle notifiche: attiva (chiede permesso + iscrive) o disattiva.
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


  async function runDelete() {
    setDeleting(true); setDelErr("");
    try { await onDeleteAccount?.(); }
    catch { setDeleting(false); setDelErr("Eliminazione non riuscita. Riprova."); }
  }

  // Riga d'impostazione: icona · nome + stato piccolo · comando a destra.
  const riga = "flex min-h-[60px] w-full items-center gap-3 border-b border-riga py-2.5";
  const nome = "block text-[1rem] font-bold tracking-[-0.01em] text-ink";
  const stato = "block text-[0.8rem] font-medium leading-snug text-tenue";
  // "Attiva" = pillola piena (invito), "Disattiva" = solo bordo.
  const attiva = "pillola min-h-[34px] bg-ink px-3.5 text-[0.84rem] text-white";
  const disattiva = "pillola min-h-[34px] px-3.5 text-[0.84rem]";

  return (
    <Sheet side="right" onClose={onClose} panelClass="bg-sabbia">
      {(close) => (
        <div className="px-[18px] pb-4 pt-1">
          {/* X in alto a destra, sulla riga del titolo: è il punto dove il
              pollice la cerca (stesso posto dell'ingranaggio che apre). */}
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="titolo">Impostazioni</h3>
            <button onClick={close} aria-label="Chiudi" className="tondo">
              <IconaChiudi />
            </button>
          </div>

          {/* Premium: punto d'accesso permanente al paywall (gli altri sono
              contestuali, sulle funzioni bloccate). Per un abbonato diventa
              una conferma discreta invece di sparire del tutto. */}
          {isPro ? (
            <div className="flex items-center gap-3 rounded-card bg-white px-3.5 py-3">
              <Sparkles className="h-[18px] w-[18px] shrink-0 text-ink" />
              <span className="min-w-0 flex-1">
                <span className={nome}>Premium attivo</span>
                <span className={stato}>Grazie per il sostegno 🧡</span>
              </span>
            </div>
          ) : (
            <button
              onClick={() => { close(); onOpenPaywall?.(); }}
              className="flex w-full items-center gap-3 rounded-card bg-rosa px-3.5 py-3 text-left shadow-[inset_0_0_0_1.5px_#0a0a0a] transition active:scale-[0.99]"
            >
              <Sparkles className="h-[18px] w-[18px] shrink-0 text-ink" />
              <span className="min-w-0 flex-1">
                <span className={nome}>Passa a Premium</span>
                <span className="block text-[0.8rem] font-medium leading-snug text-ink/70">Piano Alimentare, AI illimitata, niente pubblicità</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-ink" />
            </button>
          )}

          <div className="mt-4 border-t-[1.5px] border-ink">
            {/* Face ID / passkey: attivazione dell'accesso rapido su questo
                dispositivo (visibile solo dove WebAuthn è supportato) */}
            {CAN_USE_PASSKEY && (
              <div className={riga}>
                <FaceIdIcon className="h-[19px] w-[19px] shrink-0 text-ink" />
                <span className="min-w-0 flex-1">
                  <span className={nome}>Face ID</span>
                  <span className={stato}>
                    {passkeyActive ? "Attivo su questo dispositivo" : "Accesso rapido su questo dispositivo"}
                  </span>
                </span>
                {passkeyBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin text-ink" />
                ) : passkeyActive ? (
                  <button onClick={deactivatePasskey} className={disattiva}>Disattiva</button>
                ) : (
                  <button onClick={activatePasskey} className={attiva}>Attiva</button>
                )}
              </div>
            )}
            {passkeyErr && <p className="border-b border-riga py-2 text-[0.86rem] font-bold text-ink">{passkeyErr}</p>}

            {/* Notifiche push: avvisi scadenze (opt-in per dispositivo). Visibile
                solo dove le push sono supportate; su iPhone non installato mostra
                l'invito ad aggiungere l'app alla Home. */}
            {canPush && (
              <div className={riga}>
                <Bell className="h-[19px] w-[19px] shrink-0 text-ink" />
                <span className="min-w-0 flex-1">
                  <span className={nome}>Avvisami delle scadenze</span>
                  <span className={stato}>
                    {pushOn ? "Ti avviso a 7, 3 e 1 giorno dalla scadenza" : "Un promemoria per le scadenze"}
                  </span>
                </span>
                {pushBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin text-ink" />
                ) : pushOn ? (
                  <button onClick={togglePush} className={disattiva}>Disattiva</button>
                ) : (
                  <button onClick={togglePush} className={attiva}>Attiva</button>
                )}
              </div>
            )}
            {pushErr && <p className="border-b border-riga py-2 text-[0.86rem] font-bold text-ink">{pushErr}</p>}
            {iosHint && (
              <div className={`${riga} items-start`}>
                <Bell className="mt-0.5 h-[18px] w-[18px] shrink-0 text-ink" />
                <span className="min-w-0 flex-1">
                  <span className={nome}>Avvisami delle scadenze</span>
                  <span className={stato}>
                    Installa Dispensa sulla Home (Condividi → «Aggiungi a Home») per ricevere gli avvisi.
                  </span>
                </span>
              </div>
            )}

            {/* Tutorial */}
            <button
              onClick={() => { close(); onReplayTour?.(); }}
              className={`${riga} text-left`}
            >
              <GraduationCap className="h-[19px] w-[19px] shrink-0 text-ink" />
              <span className={nome}>Rivedi il tutorial</span>
            </button>

            {/* Esci: qui dal 01/10 (prima nel Profilo, poi in testata). */}
            {onLogout && (confirmLogout ? (
              <div className="flex gap-2 border-b border-riga py-3">
                <button onClick={() => setConfirmLogout(false)} className="bottone-chiaro min-h-[44px] flex-1 py-2 text-[0.92rem]">
                  Annulla
                </button>
                <button onClick={onLogout} className="bottone-rosso min-h-[44px] flex-1 py-2 text-[0.92rem]">
                  Sì, esci
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmLogout(true)} className={`${riga} text-left`}>
                <span className="grid w-[19px] shrink-0 place-items-center text-ink"><IconaEsci /></span>
                <span className={nome}>Esci</span>
              </button>
            ))}
          </div>

          {/* Footer discreto: privacy e cancellazione account */}
          {!confirmDelete ? (
            <div className="mt-3 flex items-center justify-center gap-2.5 text-[0.8rem] font-semibold text-tenue">
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
              <p className="text-[0.95rem] font-semibold leading-snug text-ink">Eliminare account e tutti i dati? L'azione è definitiva e non recuperabile.</p>
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
      )}
    </Sheet>
  );
}
