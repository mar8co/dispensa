// Foglio Impostazioni (dall'ingranaggio in alto a destra del Profilo).
// Raccoglie il "come si comporta l'app": Face ID, notifiche push, tema,
// tutorial e il footer legale (privacy / elimina account). Il Profilo resta
// il "chi sei": nome, dispensa familiare, esigenze alimentari e azioni dati.
import { useState, useEffect } from "react";
import {
  X, SunMoon, Sun, Moon, GraduationCap, Loader2, Palette, ChevronDown, Bell,
  Sparkles, ChevronRight,
} from "lucide-react";
import Sheet from "./Sheet.jsx";
import FaceIdIcon from "./FaceIdIcon.jsx";
import { supabase } from "../lib/supabase.js";
import { getTheme, setTheme } from "../lib/theme.js";
import { pushSupported, isIosNotInstalled, getPushState, enablePush, disablePush } from "../lib/push.js";

// WebAuthn/passkey disponibile solo dove esiste l'API credenziali (iPhone
// Safari/PWA la supporta). Se manca, la riga Face ID non compare.
const CAN_USE_PASSKEY = typeof window !== "undefined" && !!window.PublicKeyCredential;

const THEMES = [
  { id: "auto", label: "Auto", icon: SunMoon },
  { id: "light", label: "Chiaro", icon: Sun },
  { id: "dark", label: "Scuro", icon: Moon },
];
const THEME_LABEL = { auto: "Auto", light: "Chiaro", dark: "Scuro" };

export default function SettingsSheet({
  onClose, onReplayTour, onDeleteAccount, onOpenPrivacy,
  isPro = true, onOpenPaywall,
}) {
  const [theme, setThemeState] = useState(getTheme());
  const [open, setOpen] = useState("");           // riga espandibile aperta: "theme"
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

  function chooseTheme(id) { setTheme(id); setThemeState(id); }
  const toggle = (id) => setOpen((o) => (o === id ? "" : id));

  async function runDelete() {
    setDeleting(true); setDelErr("");
    try { await onDeleteAccount?.(); }
    catch { setDeleting(false); setDelErr("Eliminazione non riuscita. Riprova."); }
  }

  return (
    <Sheet onClose={onClose}>
      {(close) => (
        <div className="px-5 pb-3 pt-1">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-xl font-extrabold tracking-tight text-ink">Impostazioni</h3>
            <button onClick={close} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Premium: punto d'accesso permanente al paywall (gli altri sono
              contestuali, sulle funzioni bloccate). Per un abbonato diventa
              una conferma discreta invece di sparire del tutto. */}
          {isPro ? (
            <div className="mb-2 flex items-center gap-3 rounded-xl border border-hair bg-paper px-3.5 py-3">
              <Sparkles className="h-[18px] w-[18px] shrink-0 text-tomato" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-ink">Premium attivo</span>
                <span className="block text-xs text-stone-500">Grazie per il sostegno 🧡</span>
              </span>
            </div>
          ) : (
            <button
              onClick={() => { close(); onOpenPaywall?.(); }}
              className="mb-2 flex w-full items-center gap-3 rounded-xl border border-tomato/40 bg-tomato/5 px-3.5 py-3 text-left transition hover:bg-tomato/10"
            >
              <Sparkles className="h-[18px] w-[18px] shrink-0 text-tomato" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">Passa a Premium</span>
                <span className="block text-xs text-stone-500">Piano Alimentare, AI illimitata, niente pubblicità</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-tomato" />
            </button>
          )}

          <div className="overflow-hidden rounded-xl border border-hair bg-paper">
            {/* Face ID / passkey: attivazione dell'accesso rapido su questo
                dispositivo (visibile solo dove WebAuthn è supportato) */}
            {CAN_USE_PASSKEY && (
              <div className="flex w-full items-center gap-3 px-3.5 py-3">
                <FaceIdIcon className={`h-[19px] w-[19px] shrink-0 ${passkeyActive ? "text-stone-400" : "text-tomato"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-ink">Face ID</span>
                  <span className="block text-xs text-stone-500">
                    {passkeyActive ? "Attivo su questo dispositivo" : "Accesso rapido su questo dispositivo"}
                  </span>
                </span>
                {passkeyBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                ) : passkeyActive ? (
                  <button
                    onClick={deactivatePasskey}
                    className="rounded-lg border border-hair px-2.5 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-50"
                  >
                    Disattiva
                  </button>
                ) : (
                  <button
                    onClick={activatePasskey}
                    className="rounded-lg border border-tomato/40 px-2.5 py-1.5 text-xs font-semibold text-tomato transition hover:bg-tomato/5"
                  >
                    Attiva
                  </button>
                )}
              </div>
            )}
            {passkeyErr && <p className="border-t border-hair px-3.5 py-2 text-xs font-semibold text-tomato">{passkeyErr}</p>}

            {/* Notifiche push: avvisi scadenze (opt-in per dispositivo). Visibile
                solo dove le push sono supportate; su iPhone non installato mostra
                l'invito ad aggiungere l'app alla Home. */}
            {canPush && (
              <div className={`flex w-full items-center gap-3 px-3.5 py-3 ${CAN_USE_PASSKEY ? "border-t border-hair" : ""}`}>
                <Bell className={`h-[19px] w-[19px] shrink-0 ${pushOn ? "text-stone-400" : "text-tomato"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-ink">Avvisami delle scadenze</span>
                  <span className="block text-xs text-stone-500">
                    {pushOn ? "Ti avviso a 7, 3 e 1 giorno dalla scadenza" : "Un promemoria per le scadenze"}
                  </span>
                </span>
                {pushBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                ) : pushOn ? (
                  <button
                    onClick={togglePush}
                    className="rounded-lg border border-hair px-2.5 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-50"
                  >
                    Disattiva
                  </button>
                ) : (
                  <button
                    onClick={togglePush}
                    className="rounded-lg border border-tomato/40 px-2.5 py-1.5 text-xs font-semibold text-tomato transition hover:bg-tomato/5"
                  >
                    Attiva
                  </button>
                )}
              </div>
            )}
            {pushErr && <p className="border-t border-hair px-3.5 py-2 text-xs font-semibold text-tomato">{pushErr}</p>}
            {iosHint && (
              <div className={`flex items-start gap-3 px-3.5 py-3 ${CAN_USE_PASSKEY ? "border-t border-hair" : ""}`}>
                <Bell className="mt-0.5 h-[18px] w-[18px] shrink-0 text-stone-400" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-ink">Avvisami delle scadenze</span>
                  <span className="block text-xs text-stone-500">
                    Installa Dispensa sulla Home (Condividi → «Aggiungi a Home») per ricevere gli avvisi.
                  </span>
                </span>
              </div>
            )}

            {/* Aspetto (tema) */}
            <button
              onClick={() => toggle("theme")}
              className={`flex w-full items-center gap-3 px-3.5 py-3 text-left ${(CAN_USE_PASSKEY || canPush || iosHint) ? "border-t border-hair" : ""}`}
              aria-expanded={open === "theme"}
            >
              <Palette className="h-[18px] w-[18px] text-stone-400" />
              <span className="flex-1 text-sm text-ink">Aspetto</span>
              <span className="text-xs text-stone-500">{THEME_LABEL[theme]}</span>
              <ChevronDown className={`h-4 w-4 text-stone-400 transition-transform ${open === "theme" ? "rotate-180" : ""}`} />
            </button>
            {open === "theme" && (
              <div className="border-t border-hair px-3.5 pb-3.5 pt-3">
                <div className="grid grid-cols-3 gap-2">
                  {THEMES.map(({ id, label, icon: Icon }) => {
                    const active = theme === id;
                    return (
                      <button
                        key={id}
                        onClick={() => chooseTheme(id)}
                        aria-pressed={active}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition ${
                          active ? "border-ink bg-ink text-white" : "border-hair bg-cream text-stone-500 hover:border-stone-300"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {label}
                      </button>
                    );
                  })}
                </div>
                {theme === "auto" && <p className="mt-2 text-xs text-stone-500">Segue le impostazioni del telefono.</p>}
              </div>
            )}

            {/* Tutorial */}
            <button
              onClick={() => { close(); onReplayTour?.(); }}
              className="flex w-full items-center gap-3 border-t border-hair px-3.5 py-3 text-left text-sm text-ink transition hover:bg-stone-50"
            >
              <GraduationCap className="h-[18px] w-[18px] text-stone-400" /> Rivedi il tutorial
            </button>
          </div>

          {/* Footer discreto: privacy e cancellazione account */}
          {!confirmDelete ? (
            <div className="mt-2 flex items-center justify-center gap-2.5 text-[11px] text-stone-500">
              {onOpenPrivacy && (
                <>
                  <button onClick={() => { close(); onOpenPrivacy(); }} className="transition hover:text-stone-600 hover:underline">
                    Privacy Policy
                  </button>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <button onClick={() => { setDelErr(""); setConfirmDelete(true); }} className="transition hover:text-tomato hover:underline">
                Elimina account
              </button>
            </div>
          ) : (
            <div className="mt-2 rounded-xl border border-tomato/30 bg-tomato/5 p-3 text-center">
              <p className="text-xs text-stone-600">Eliminare account e tutti i dati? L'azione è definitiva e non recuperabile.</p>
              {delErr && <p className="mt-1.5 text-xs font-semibold text-tomato">{delErr}</p>}
              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="flex-1 rounded-lg border border-hair px-3 py-2 text-xs font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
                >
                  Annulla
                </button>
                <button
                  onClick={runDelete}
                  disabled={deleting}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-tomato px-3 py-2 text-xs font-semibold text-[#fff] transition hover:bg-tomato-700 disabled:opacity-60"
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
