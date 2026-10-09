// Profilo: l'UNICO menu dell'app (dall'avatar con l'iniziale, in alto a
// sinistra). Pannello laterale da SINISTRA, blu come l'avatar, con la X in alto
// a destra (si chiude anche toccando fuori o trascinando). Dentro, in ordine
// d'uso: account (nome), Esigenze alimentari, Notifiche, Dispensa condivisa,
// Ordine delle categorie, Esci. Dal 09/10 contiene anche le
// Impostazioni (SettingsSection: notifiche, "Esci", privacy / elimina account
// con dietro "svuota dispensa"). L'ingranaggio in testata non
// c'è più. Veste manifesto: righe sottili, pillole.
import { useState, useEffect } from "react";
import { Leaf, Users, ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import { CAT_ICON } from "../constants.js";
import IconaChiudi from "./IconaChiudi.jsx";
import Sheet from "./Sheet.jsx";
import HouseholdSection from "./HouseholdSection.jsx";
import SettingsSection, { NotificationsSection } from "./SettingsSection.jsx";
import { getMyUsername, setUsername as saveUsername } from "../lib/db.js";
import { parsePrefs } from "../lib/prefs.js";

export default function ProfileSheet({
  email, itemCount, shared = false, foodPrefs, onSaveFoodPrefs, onClose, onClearPantry,
  catOrder = [], onMoveCat,
  households, activeHouseholdId, onSwitchHousehold, onHouseholdsChanged,
  onDeleteAccount, onLogout, onOpenPrivacy,
}) {
  const [username, setUsernameState] = useState("");
  const [membersKey, setMembersKey] = useState(0);  // forza il refresh della lista membri
  const [catsOpen, setCatsOpen] = useState(false);  // "Ordine delle categorie" aperto
  const understood = parsePrefs(foodPrefs).labels;  // esclusioni capite dal testo delle esigenze

  useEffect(() => { getMyUsername().then(setUsernameState).catch(() => {}); }, []);

  async function commitUsername(v) {
    const name = v.trim();
    if (name === username.trim()) return;
    setUsernameState(name);
    try { await saveUsername(name); setMembersKey((k) => k + 1); } catch { /* silenzioso */ }
  }

  return (
    <Sheet side="left" onClose={onClose} panelClass="bg-blu">
      {(close) => (
        // Sul blu i testi secondari grigi non si leggono: qui diventano neri.
        <div className="px-[18px] pb-4 pt-1 [&_.micro]:text-ink [&_.text-tenue]:text-ink">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="titolo">Profilo</h3>
            <button onClick={close} aria-label="Chiudi" className="tondo">
              <IconaChiudi />
            </button>
          </div>

          {/* Account: il Nome (username) prende il posto della mail */}
          <div className="flex items-center gap-3">
            <div aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-ink bg-blu text-[1.25rem] font-[750] tracking-[-0.02em] text-white">
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
                  shared && !username ? "placeholder:text-ink" : "placeholder:text-ink/60"
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

          {/* Ordine delle sezioni = quanto spesso servono (riordinato il 09/10):
              1. Esigenze alimentari (cambiano ogni ricetta proposta)
              2. Notifiche  3. Dispensa condivisa  4. Ordine delle categorie
              (a scomparsa)  5. Esci e, in piccolo, privacy / elimina account.
              Tutte uguali: intestazione `.sezione` + riquadro bianco. */}
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
          {/* Cosa ne ha capito l'app: il piano della settimana e le ricette
              senza AI applicano SOLO questo (l'AI invece legge tutto il testo).
              Così non si scopre dopo, dal piano, che "no peperoni" non era passato. */}
          {foodPrefs.trim() && (
            <p className="mt-2 text-[0.8rem] font-medium leading-snug text-tenue">
              {understood.length
                ? <>Nel calendario e nelle ricette senza AI escludo: <strong>{understood.join(", ")}</strong>.</>
                : <>Qui non ho trovato cibi da escludere: di questo testo terrà conto solo l&rsquo;AI. Capisco frasi come «no peperoni», «senza glutine», «vegetariano».</>}
            </p>
          )}

          <NotificationsSection />

          <HouseholdSection
            households={households}
            activeHouseholdId={activeHouseholdId}
            email={email}
            refreshKey={membersKey}
            onSwitch={onSwitchHousehold}
            onChanged={onHouseholdsChanged}
          />

          {/* Ordine delle categorie della Dispensa: chiuso di serie (si tocca
              di rado), si apre con un tocco; frecce su/giù per ogni riga. */}
          <button
            onClick={() => setCatsOpen((v) => !v)}
            aria-expanded={catsOpen}
            className="sezione mt-6 flex w-full items-center justify-between text-left"
          >
            Ordine delle categorie
            <ChevronDown className={`h-[18px] w-[18px] transition-transform duration-200 ${catsOpen ? "rotate-180" : ""}`} />
          </button>
          {catsOpen && (
            <ul className="animate-fade-in mt-2 divide-y divide-riga rounded-card bg-white px-3.5">
              {catOrder.map((c, i) => (
                <li key={c} className="flex min-h-[44px] items-center gap-2.5">
                  <span className="text-[1.05rem] leading-none">{CAT_ICON[c]}</span>
                  <span className="min-w-0 flex-1 truncate text-[0.98rem] font-bold tracking-[-0.01em] text-ink">{c}</span>
                  <button
                    onClick={() => onMoveCat(c, -1)}
                    disabled={i === 0}
                    aria-label={`Sposta su ${c}`}
                    className="flex h-11 w-10 items-center justify-center text-ink transition active:scale-90 disabled:opacity-25"
                  >
                    <ArrowUp className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    onClick={() => onMoveCat(c, 1)}
                    disabled={i === catOrder.length - 1}
                    aria-label={`Sposta giù ${c}`}
                    className="flex h-11 w-10 items-center justify-center text-ink transition active:scale-90 disabled:opacity-25"
                  >
                    <ArrowDown className="h-[18px] w-[18px]" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <SettingsSection
            close={close}
            onDeleteAccount={onDeleteAccount}
            onLogout={onLogout}
            onOpenPrivacy={onOpenPrivacy}
            onClearPantry={() => { close(); onClearPantry(); }}
          />
        </div>
      )}
    </Sheet>
  );
}
