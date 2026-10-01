// Foglio profilo (dalla navbar). Dopo lo split con Impostazioni (⚙️ in alto a
// destra → SettingsSheet) qui resta il "chi sei": account (nome/username),
// Dispensa familiare, Esigenze alimentari e "Svuota dispensa". Pannello
// laterale da destra, niente X (si chiude toccando fuori o trascinando);
// "Esci" sta nelle Impostazioni. L'avatar è lo stesso della testata (tondo blu
// con l'iniziale). Face ID, notifiche, tutorial e footer legale vivono in
// SettingsSheet. Veste manifesto: foglio sabbia, righe sottili, pillole.
import { useState, useEffect } from "react";
import { Settings, Trash2, Leaf, Users } from "lucide-react";
import Sheet from "./Sheet.jsx";
import HouseholdSection from "./HouseholdSection.jsx";
import { getMyUsername, setUsername as saveUsername } from "../lib/db.js";

export default function ProfileSheet({
  email, itemCount, shared = false, foodPrefs, onSaveFoodPrefs, onClose, onClearPantry,
  onOpenSettings,
  households, activeHouseholdId, onSwitchHousehold, onHouseholdsChanged,
}) {
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
    <Sheet side onClose={onClose} panelClass="bg-sabbia">
      {(close) => (
        <div className="px-[18px] pb-4 pt-1">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="titolo">Profilo</h3>
            {/* Ingranaggio → Impostazioni (Face ID, notifiche, tutorial,
                privacy/elimina): il Profilo resta identità e famiglia. */}
            <button
              onClick={() => { close(); onOpenSettings?.(); }}
              aria-label="Impostazioni"
              className="tondo"
            >
              <Settings className="h-[18px] w-[18px]" />
            </button>
          </div>

          {/* Account: il Nome (username) prende il posto della mail */}
          <div className="flex items-center gap-3">
            <div aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blu text-[1.25rem] font-[750] tracking-[-0.02em] text-white">
              {(username || email || "?").trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <input
                defaultValue={username}
                onBlur={(e) => commitUsername(e.target.value)}
                maxLength={24}
                placeholder="Il tuo nome"
                aria-label="Il tuo nome"
                className={`testo-grande w-full truncate border-0 border-b-[1.5px] border-ink bg-transparent pb-0.5 text-[1.25rem] font-extrabold tracking-[-0.03em] text-ink outline-none placeholder:font-bold ${
                  shared && !username ? "placeholder:text-ink" : "placeholder:text-ink/40"
                }`}
              />
              <p className="mt-1 flex items-center gap-1.5 text-[0.8rem] font-medium text-tenue">
                {shared && <Users className="h-3.5 w-3.5 shrink-0" />}
                {shared ? "La nostra dispensa · " : ""}{itemCount} {itemCount === 1 ? "prodotto" : "prodotti"}
              </p>
            </div>
          </div>
          {shared && !username && (
            <p className="mt-2 text-[0.86rem] font-bold text-ink">Aggiungi il tuo nome così gli altri ti riconoscono nella dispensa.</p>
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
          <div className="sezione mt-6">Esigenze alimentari</div>
          <div className="mt-2 flex items-start gap-3 rounded-card bg-white px-3.5 py-2.5">
            <Leaf className="mt-0.5 h-[18px] w-[18px] shrink-0 text-ink" />
            <textarea
              defaultValue={foodPrefs}
              onBlur={(e) => onSaveFoodPrefs(e.target.value.trim())}
              rows={2}
              placeholder="Esigenze alimentari: allergie, vegano, pochi fritti… Le ricette ne terranno conto."
              aria-label="Esigenze alimentari"
              title="Le ricette proposte ne terranno sempre conto"
              className="min-w-0 flex-1 resize-none bg-transparent text-[1rem] font-medium leading-snug text-ink outline-none placeholder:text-ink/40"
            />
          </div>

          {/* Azioni: righe sottili, niente scatole */}
          <div className="mt-5 border-t-[1.5px] border-ink">
            <button
              data-tour="clear-pantry"
              onClick={() => { close(); onClearPantry(); }}
              className="flex min-h-[52px] w-full items-center gap-3 text-left text-[1rem] font-bold text-ink"
            >
              <Trash2 className="h-[18px] w-[18px]" /> Svuota dispensa
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
