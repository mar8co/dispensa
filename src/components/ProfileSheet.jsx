// Foglio profilo (dall'icona in alto a destra della Dispensa): account,
// scelta del tema (auto/chiaro/scuro, salvata sul dispositivo), svuota
// dispensa e uscita con conferma.
import { useState } from "react";
import { X, SunMoon, Sun, Moon, Trash2, LogOut, User, GraduationCap, Loader2 } from "lucide-react";
import Sheet from "./Sheet.jsx";
import { getTheme, setTheme } from "../lib/theme.js";

const THEMES = [
  { id: "auto", label: "Auto", icon: SunMoon },
  { id: "light", label: "Chiaro", icon: Sun },
  { id: "dark", label: "Scuro", icon: Moon },
];

export default function ProfileSheet({
  email, itemCount, foodPrefs, onSaveFoodPrefs, onClose, onClearPantry, onLogout, onReplayTour,
  onDeleteAccount, onOpenPrivacy,
}) {
  const [theme, setThemeState] = useState(getTheme());
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [delErr, setDelErr] = useState("");

  function chooseTheme(id) {
    setTheme(id);
    setThemeState(id);
  }

  async function runDelete() {
    setDeleting(true);
    setDelErr("");
    try {
      await onDeleteAccount?.();
      // In caso di successo l'app fa il logout e smonta questo foglio.
    } catch {
      setDeleting(false);
      setDelErr("Eliminazione non riuscita. Riprova.");
    }
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
              <p className="text-xs text-stone-500">
                {itemCount} {itemCount === 1 ? "prodotto" : "prodotti"} in dispensa
              </p>
            </div>
          </div>

          {/* Tema */}
          <p className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-stone-400">Aspetto</p>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map(({ id, label, icon: Icon }) => {
              const active = theme === id;
              return (
                <button
                  key={id}
                  onClick={() => chooseTheme(id)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-semibold transition ${
                    active
                      ? "border-ink bg-ink text-white"
                      : "border-hair bg-paper text-stone-500 hover:border-stone-300"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              );
            })}
          </div>
          {theme === "auto" && (
            <p className="mt-2 text-xs text-stone-400">Segue le impostazioni del telefono.</p>
          )}

          {/* Preferenze alimentari: iniettate in tutte le richieste di ricette */}
          <p className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-stone-400">Preferenze alimentari</p>
          <textarea
            defaultValue={foodPrefs}
            onBlur={(e) => onSaveFoodPrefs(e.target.value.trim())}
            rows={2}
            placeholder="Es. vegetariano · niente fritti · pochi latticini"
            className="w-full resize-none rounded-xl border border-hair bg-paper px-3.5 py-3 text-sm text-ink outline-none focus:border-stone-400 focus:ring-2 focus:ring-tomato/15"
          />
          <p className="mt-1.5 text-xs text-stone-400">Le ricette proposte ne terranno sempre conto.</p>

          {/* Azioni */}
          <div className="mt-6 space-y-2">
            <button
              data-tour="clear-pantry"
              onClick={() => { close(); onClearPantry(); }}
              className="flex w-full items-center gap-2.5 rounded-xl border border-hair px-4 py-3 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
            >
              <Trash2 className="h-4 w-4 text-stone-400" /> Svuota dispensa
            </button>
            <button
              onClick={() => { close(); onReplayTour?.(); }}
              className="flex w-full items-center gap-2.5 rounded-xl border border-hair px-4 py-3 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
            >
              <GraduationCap className="h-4 w-4 text-stone-400" /> Rivedi il tutorial
            </button>

            {confirmLogout ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmLogout(false)}
                  className="flex-1 rounded-xl border border-hair px-4 py-3 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
                >
                  Annulla
                </button>
                <button
                  onClick={onLogout}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-tomato px-4 py-3 text-sm font-semibold text-white transition hover:bg-tomato-700"
                >
                  <LogOut className="h-4 w-4" /> Sì, esci
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmLogout(true)}
                className="flex w-full items-center gap-2.5 rounded-xl border border-tomato/30 px-4 py-3 text-sm font-semibold text-tomato transition hover:bg-tomato/5"
              >
                <LogOut className="h-4 w-4" /> Esci
              </button>
            )}
          </div>

          {/* Footer discreto: privacy e cancellazione account (poco invasivi) */}
          {!confirmDelete ? (
            <div className="mt-6 flex items-center justify-center gap-2.5 text-[11px] text-stone-400">
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
            <div className="mt-5 rounded-xl border border-tomato/30 bg-tomato/5 p-3 text-center">
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
