// Foglio profilo (dall'icona in alto a destra della Dispensa). Struttura ibrida:
// account, poi la "Dispensa familiare" sempre aperta (HouseholdSection), quindi
// le Impostazioni in lista (righe espandibili: Preferenze alimentari, Aspetto) e
// infine le azioni. "La nostra/tua" secondo `shared` (nucleo con più membri).
import { useState, useEffect } from "react";
import {
  X, SunMoon, Sun, Moon, Trash2, LogOut, User, GraduationCap, Loader2,
  Leaf, Palette, ChevronDown, Users,
} from "lucide-react";
import Sheet from "./Sheet.jsx";
import HouseholdSection from "./HouseholdSection.jsx";
import FaceIdIcon from "./FaceIdIcon.jsx";
import { supabase } from "../lib/supabase.js";
import { getTheme, setTheme } from "../lib/theme.js";
import { getMyUsername, setUsername as saveUsername } from "../lib/db.js";

// WebAuthn/passkey disponibile solo dove esiste l'API credenziali (iPhone
// Safari/PWA la supporta). Se manca, la riga Face ID non compare.
const CAN_USE_PASSKEY = typeof window !== "undefined" && !!window.PublicKeyCredential;

const THEMES = [
  { id: "auto", label: "Auto", icon: SunMoon },
  { id: "light", label: "Chiaro", icon: Sun },
  { id: "dark", label: "Scuro", icon: Moon },
];
const THEME_LABEL = { auto: "Auto", light: "Chiaro", dark: "Scuro" };

export default function ProfileSheet({
  email, itemCount, shared = false, foodPrefs, onSaveFoodPrefs, onClose, onClearPantry, onLogout, onReplayTour,
  onDeleteAccount, onOpenPrivacy,
  households, activeHouseholdId, onSwitchHousehold, onHouseholdsChanged,
}) {
  const [theme, setThemeState] = useState(getTheme());
  const [open, setOpen] = useState("");           // riga impostazioni aperta: "prefs" | "theme"
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [delErr, setDelErr] = useState("");
  const [username, setUsernameState] = useState("");
  const [membersKey, setMembersKey] = useState(0);  // forza il refresh della lista membri
  const [uid, setUid] = useState(null);              // id utente (chiave localStorage passkey)
  const [passkeyActive, setPasskeyActive] = useState(false); // Face ID attivo su questo device
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyErr, setPasskeyErr] = useState("");

  useEffect(() => { getMyUsername().then(setUsernameState).catch(() => {}); }, []);

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

  // Registra una passkey (Face ID/Touch ID) per l'utente loggato: richiede una
  // sessione attiva, ed è per questo che l'attivazione vive nel Profilo e non
  // nel login. Al successo salviamo il flag locale così il login mostrerà il
  // pulsante "Accedi con Face ID" su questo dispositivo.
  async function activatePasskey() {
    if (passkeyBusy) return;
    setPasskeyErr(""); setPasskeyBusy(true);
    try {
      const { error } = await supabase.auth.registerPasskey();
      if (error) throw error;
      if (uid) localStorage.setItem(`dispensa-passkey-${uid}`, "1");
      // Flag a livello DISPOSITIVO (non per-utente): il login lo usa per
      // mostrare il pulsante Face ID solo dove una passkey esiste davvero,
      // invece di un pulsante che fallisce al primo tocco.
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
  // riattivando, iOS riusa o aggiorna la credenziale esistente. Azione
  // reversibile con un tap: niente conferma.
  function deactivatePasskey() {
    try {
      if (uid) localStorage.removeItem(`dispensa-passkey-${uid}`);
      localStorage.removeItem("dispensa-passkey-device");
    } catch { /* */ }
    setPasskeyActive(false);
  }

  function chooseTheme(id) { setTheme(id); setThemeState(id); }
  const toggle = (id) => setOpen((o) => (o === id ? "" : id));
  async function commitUsername(v) {
    const name = v.trim();
    if (name === username.trim()) return;
    setUsernameState(name);
    try { await saveUsername(name); setMembersKey((k) => k + 1); } catch { /* silenzioso */ }
  }

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
            <h3 className="font-display text-xl font-extrabold tracking-tight text-ink">Profilo</h3>
            <button onClick={close} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Account: il Nome (username) prende il posto della mail */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-tomato/10 text-tomato">
              <User className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <input
                defaultValue={username}
                onBlur={(e) => commitUsername(e.target.value)}
                maxLength={24}
                placeholder="Il tuo nome"
                aria-label="Il tuo nome"
                className={`w-full truncate bg-transparent text-sm font-semibold text-ink outline-none placeholder:font-medium ${
                  shared && !username ? "placeholder:text-tomato" : "placeholder:text-stone-400"
                }`}
              />
              <p className="flex items-center gap-1.5 text-xs text-stone-500">
                {shared && <Users className="h-3.5 w-3.5 shrink-0" />}
                {shared ? "La nostra dispensa · " : ""}{itemCount} {itemCount === 1 ? "prodotto" : "prodotti"}
              </p>
            </div>
          </div>
          {shared && !username && (
            <p className="mt-1.5 text-xs font-medium text-tomato">Aggiungi il tuo nome così gli altri ti riconoscono nella dispensa.</p>
          )}

          {/* Dispensa familiare: sempre aperta */}
          <HouseholdSection
            households={households}
            activeHouseholdId={activeHouseholdId}
            email={email}
            refreshKey={membersKey}
            onSwitch={onSwitchHousehold}
            onChanged={onHouseholdsChanged}
          />

          {/* Impostazioni: righe espandibili in-linea */}
          <p className="mb-2 mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">Impostazioni</p>
          <div className="overflow-hidden rounded-xl border border-hair bg-paper">
            {/* Esigenze alimentari: sempre visibile, box da 2 righe */}
            <div className="flex items-start gap-3 px-3.5 py-2.5">
              <Leaf className="mt-0.5 h-[18px] w-[18px] shrink-0 text-stone-400" />
              <textarea
                defaultValue={foodPrefs}
                onBlur={(e) => onSaveFoodPrefs(e.target.value.trim())}
                rows={2}
                placeholder="Esigenze alimentari: allergie, vegano, pochi fritti… Le ricette ne terranno conto."
                aria-label="Esigenze alimentari"
                title="Le ricette proposte ne terranno sempre conto"
                className="min-w-0 flex-1 resize-none bg-transparent text-sm leading-snug text-ink outline-none placeholder:text-stone-400"
              />
            </div>

            {/* Face ID / passkey: attivazione dell'accesso rapido su questo
                dispositivo (visibile solo dove WebAuthn è supportato) */}
            {CAN_USE_PASSKEY && (
              <div className="flex w-full items-center gap-3 border-t border-hair px-3.5 py-3">
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

            {/* Aspetto (tema) */}
            <button
              onClick={() => toggle("theme")}
              className="flex w-full items-center gap-3 border-t border-hair px-3.5 py-3 text-left"
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
          </div>

          {/* Azioni */}
          <div className="mt-2 overflow-hidden rounded-xl border border-hair bg-paper">
            <button
              data-tour="clear-pantry"
              onClick={() => { close(); onClearPantry(); }}
              className="flex w-full items-center gap-3 px-3.5 py-3 text-left text-sm text-ink transition hover:bg-stone-50"
            >
              <Trash2 className="h-[18px] w-[18px] text-stone-400" /> Svuota dispensa
            </button>
            <button
              onClick={() => { close(); onReplayTour?.(); }}
              className="flex w-full items-center gap-3 border-t border-hair px-3.5 py-3 text-left text-sm text-ink transition hover:bg-stone-50"
            >
              <GraduationCap className="h-[18px] w-[18px] text-stone-400" /> Rivedi il tutorial
            </button>
            {confirmLogout ? (
              <div className="flex gap-2 border-t border-hair p-2.5">
                <button
                  onClick={() => setConfirmLogout(false)}
                  className="flex-1 rounded-lg border border-hair py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
                >
                  Annulla
                </button>
                <button
                  onClick={onLogout}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-tomato py-2.5 text-sm font-semibold text-[#fff] transition hover:bg-tomato-700"
                >
                  <LogOut className="h-4 w-4" /> Sì, esci
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmLogout(true)}
                className="flex w-full items-center gap-3 border-t border-hair px-3.5 py-3 text-left text-sm font-semibold text-tomato transition hover:bg-tomato/5"
              >
                <LogOut className="h-[18px] w-[18px]" /> Esci
              </button>
            )}
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
