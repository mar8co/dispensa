// Foglio profilo (dalla navbar). Dopo lo split con Impostazioni (⚙️ in alto a
// destra → SettingsSheet) qui resta il "chi sei": account (nome/username),
// Dispensa familiare, Esigenze alimentari e le azioni sui dati (Svuota
// dispensa, Esci). Face ID, notifiche, tema, tutorial e footer legale vivono
// in SettingsSheet.
import { useState, useEffect } from "react";
import { X, Settings, Trash2, LogOut, User, Leaf, Users } from "lucide-react";
import Sheet from "./Sheet.jsx";
import HouseholdSection from "./HouseholdSection.jsx";
import { getMyUsername, setUsername as saveUsername } from "../lib/db.js";

export default function ProfileSheet({
  email, itemCount, shared = false, foodPrefs, onSaveFoodPrefs, onClose, onClearPantry, onLogout,
  onOpenSettings,
  households, activeHouseholdId, onSwitchHousehold, onHouseholdsChanged,
}) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [username, setUsernameState] = useState("");
  const [membersKey, setMembersKey] = useState(0);  // forza il refresh della lista membri

  useEffect(() => { getMyUsername().then(setUsernameState).catch(() => {}); }, []);

  async function commitUsername(v) {
    const name = v.trim();
    if (name === username.trim()) return;
    setUsernameState(name);
    try { await saveUsername(name); setMembersKey((k) => k + 1); } catch { /* silenzioso */ }
  }

  return (
    <Sheet onClose={onClose}>
      {(close) => (
        <div className="px-5 pb-3 pt-1">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-xl font-extrabold tracking-tight text-ink">Profilo</h3>
            <div className="flex items-center gap-1">
              {/* Ingranaggio → Impostazioni (Face ID, notifiche, tema, tutorial,
                  privacy/elimina): il Profilo resta identità e famiglia. */}
              <button
                onClick={() => { close(); onOpenSettings?.(); }}
                aria-label="Impostazioni"
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100"
              >
                <Settings className="h-5 w-5" />
              </button>
              <button onClick={close} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
                <X className="h-5 w-5" />
              </button>
            </div>
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

          {/* Esigenze alimentari: box da 2 righe sempre visibile (le ricette ne
              tengono conto — è "chi sei a tavola", per questo resta nel Profilo) */}
          <div className="mt-3 overflow-hidden rounded-xl border border-hair bg-paper">
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
        </div>
      )}
    </Sheet>
  );
}
