// Foglio profilo (dall'icona in alto a destra della Dispensa). Struttura ibrida:
// account, poi la "Dispensa familiare" sempre aperta (HouseholdSection), quindi
// le Impostazioni in lista (righe espandibili: Preferenze alimentari, Aspetto) e
// infine le azioni. "La nostra/tua" secondo `shared` (nucleo con più membri).
import { useState } from "react";
import {
  X, SunMoon, Sun, Moon, Trash2, LogOut, User, GraduationCap, Loader2,
  Leaf, Palette, ChevronDown, Users,
} from "lucide-react";
import Sheet from "./Sheet.jsx";
import HouseholdSection from "./HouseholdSection.jsx";
import { getTheme, setTheme } from "../lib/theme.js";

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
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-xl font-extrabold tracking-tight text-ink">Profilo</h3>
            <button onClick={close} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Account */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-tomato/10 text-tomato">
              <User className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{email}</p>
              <p className="flex items-center gap-1.5 text-xs text-stone-500">
                {shared && <Users className="h-3.5 w-3.5 shrink-0" />}
                {shared ? "La nostra dispensa · " : ""}{itemCount} {itemCount === 1 ? "prodotto" : "prodotti"}
              </p>
            </div>
          </div>

          {/* Dispensa familiare: sempre aperta */}
          <HouseholdSection
            households={households}
            activeHouseholdId={activeHouseholdId}
            email={email}
            onSwitch={onSwitchHousehold}
            onChanged={onHouseholdsChanged}
          />

          {/* Impostazioni: righe espandibili in-linea */}
          <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-stone-400">Impostazioni</p>
          <div className="overflow-hidden rounded-xl border border-hair bg-paper">
            {/* Preferenze alimentari (prima di Aspetto) */}
            <button
              onClick={() => toggle("prefs")}
              className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
              aria-expanded={open === "prefs"}
            >
              <Leaf className="h-[18px] w-[18px] text-stone-400" />
              <span className="flex-1 text-sm text-ink">Preferenze alimentari</span>
              <ChevronDown className={`h-4 w-4 text-stone-400 transition-transform ${open === "prefs" ? "rotate-180" : ""}`} />
            </button>
            {open === "prefs" && (
              <div className="border-t border-hair px-3.5 pb-3.5 pt-2">
                <textarea
                  defaultValue={foodPrefs}
                  onBlur={(e) => onSaveFoodPrefs(e.target.value.trim())}
                  rows={2}
                  placeholder="Es. vegetariano · niente fritti · pochi latticini"
                  className="w-full resize-none rounded-lg border border-hair bg-cream px-3 py-2.5 text-sm text-ink outline-none focus:border-stone-400 focus:ring-2 focus:ring-tomato/15"
                />
                <p className="mt-1.5 text-xs text-stone-400">Le ricette proposte ne terranno sempre conto.</p>
              </div>
            )}

            {/* Aspetto (tema) */}
            <button
              onClick={() => toggle("theme")}
              className="flex w-full items-center gap-3 border-t border-hair px-3.5 py-3 text-left"
              aria-expanded={open === "theme"}
            >
              <Palette className="h-[18px] w-[18px] text-stone-400" />
              <span className="flex-1 text-sm text-ink">Aspetto</span>
              <span className="text-xs text-stone-400">{THEME_LABEL[theme]}</span>
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
                {theme === "auto" && <p className="mt-2 text-xs text-stone-400">Segue le impostazioni del telefono.</p>}
              </div>
            )}
          </div>

          {/* Azioni */}
          <div className="mt-3 overflow-hidden rounded-xl border border-hair bg-paper">
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
            <div className="mt-3 flex items-center justify-center gap-2.5 text-[11px] text-stone-400">
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
            <div className="mt-3 rounded-xl border border-tomato/30 bg-tomato/5 p-3 text-center">
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
