// Foglio profilo (dall'icona in alto a destra della Dispensa): account,
// scelta del tema (auto/chiaro/scuro, salvata sul dispositivo), svuota
// dispensa e uscita con conferma.
import { useState } from "react";
import { X, SunMoon, Sun, Moon, Trash2, LogOut, User, GraduationCap } from "lucide-react";
import Sheet from "./Sheet.jsx";
import { getTheme, setTheme } from "../lib/theme.js";

const THEMES = [
  { id: "auto", label: "Auto", icon: SunMoon },
  { id: "light", label: "Chiaro", icon: Sun },
  { id: "dark", label: "Scuro", icon: Moon },
];

export default function ProfileSheet({
  email, itemCount, foodPrefs, onSaveFoodPrefs, onClose, onClearPantry, onLogout, onReplayTour,
}) {
  const [theme, setThemeState] = useState(getTheme());
  const [confirmLogout, setConfirmLogout] = useState(false);

  function chooseTheme(id) {
    setTheme(id);
    setThemeState(id);
  }

  return (
    <Sheet onClose={onClose}>
      {(close) => (
        <div className="px-5 pb-7 pt-1">
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
              onClick={() => { close(); onReplayTour?.(); }}
              className="flex w-full items-center gap-2.5 rounded-xl border border-hair px-4 py-3 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
            >
              <GraduationCap className="h-4 w-4 text-stone-400" /> Rivedi il tutorial
            </button>
            <button
              data-tour="clear-pantry"
              onClick={() => { close(); onClearPantry(); }}
              className="flex w-full items-center gap-2.5 rounded-xl border border-hair px-4 py-3 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
            >
              <Trash2 className="h-4 w-4 text-stone-400" /> Svuota dispensa
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
        </div>
      )}
    </Sheet>
  );
}
