// Sezione "Dispensa familiare" nel Profilo: nucleo attivo, membri, invito con
// codice, entra-con-codice, cambio del nucleo attivo, esci. Le funzioni che
// cambiano il nucleo attivo (e quindi ricaricano i dati) passano da Dispensa
// via props (onSwitch / onChanged); le altre chiamano db.js direttamente.
import { useState, useEffect } from "react";
import { Users, Copy, Check, Share2, LogOut, Loader2, UserPlus, DoorOpen, Crown, UserMinus } from "lucide-react";
import Button from "./Button.jsx";
import { createInvite, acceptInvite, fetchMembers, leaveHousehold, removeMember } from "../lib/db.js";

export default function HouseholdSection({ households = [], activeHouseholdId, email, refreshKey, onSwitch, onChanged }) {
  const active = households.find((h) => h.id === activeHouseholdId) || households[0] || null;
  const [members, setMembers] = useState([]);
  const [code, setCode] = useState("");      // codice invito appena generato
  const [copied, setCopied] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState("");      // "invite" | "join" | "leave" | "remove"
  const [confirmRemove, setConfirmRemove] = useState(null); // membro da far uscire
  const [msg, setMsg] = useState("");

  const memberName = (m) => m.username || m.email || "—";
  const me = members.find((m) => m.email && m.email === email) || null;
  const amOwner = me?.role === "owner";

  function reloadMembers() {
    if (!active) { setMembers([]); return; }
    fetchMembers(active.id).then(setMembers).catch(() => {});
  }

  useEffect(() => {
    let off = false;
    setCode(""); setCopied(false); setMsg("");
    if (active) {
      fetchMembers(active.id).then((m) => { if (!off) setMembers(m); }).catch(() => {});
    } else setMembers([]);
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHouseholdId, refreshKey]);

  async function invite() {
    if (!active) return;
    setBusy("invite"); setMsg("");
    try { setCode(await createInvite(active.id)); }
    catch { setMsg("Non sono riuscito a creare l'invito. Riprova."); }
    setBusy("");
  }
  function copyCode() {
    if (!code) return;
    navigator.clipboard?.writeText(code).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 2000); },
      () => {}
    );
  }
  function shareCode() {
    const text = `Entra nella mia dispensa con il codice: ${code}`;
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else copyCode();
  }
  async function join() {
    const c = joinCode.trim();
    if (!c) return;
    setBusy("join"); setMsg("");
    try {
      const hid = await acceptInvite(c);
      if (!hid) { setMsg("Codice non valido o scaduto."); setBusy(""); return; }
      setJoinOpen(false); setJoinCode("");
      await onChanged?.();   // ricarica l'elenco nuclei
      await onSwitch?.(hid); // passa al nucleo condiviso (ricarica i dati)
    } catch { setMsg("Errore nell'entrare nel nucleo. Riprova."); }
    setBusy("");
  }
  async function leave() {
    if (!active || households.length < 2) return;
    setBusy("leave"); setMsg("");
    try {
      await leaveHousehold(active.id);
      const remaining = households.filter((h) => h.id !== active.id);
      await onChanged?.();
      if (remaining[0]) await onSwitch?.(remaining[0].id);
    } catch { setMsg("Non sono riuscito a uscire dal nucleo."); }
    setBusy("");
  }
  async function kick() {
    const target = confirmRemove;
    if (!active || !target) return;
    setBusy("remove"); setMsg("");
    try {
      await removeMember(active.id, target.user_id);
      setConfirmRemove(null);
      reloadMembers();
    } catch { setMsg("Non sono riuscito a far uscire il membro."); }
    setBusy("");
  }

  if (!active) return null;

  return (
    <>
      <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-stone-400">Dispensa condivisa</p>

      {/* Nucleo attivo + membri */}
      <div className="rounded-xl border border-hair bg-paper p-3.5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-tomato" />
          <span className="min-w-0 truncate text-sm font-semibold text-ink">{members.length > 1 ? "La nostra dispensa" : "La tua dispensa"}</span>
          <span className="ml-auto shrink-0 text-xs text-stone-400">{members.length} {members.length === 1 ? "membro" : "membri"}</span>
        </div>
        {members.length > 0 && (
          <ul className="mt-2 space-y-1">
            {members.map((m) => {
              const isMe = m.email && m.email === email;
              const isOwner = m.role === "owner";
              return (
                <li key={m.user_id} className="flex items-center gap-2 text-xs text-stone-600">
                  <span className="min-w-0 truncate">{memberName(m)}{isMe ? " (tu)" : ""}</span>
                  {isOwner ? (
                    <span className="ml-auto flex w-16 shrink-0 justify-center">
                      <Crown className="h-3.5 w-3.5 text-tomato" aria-label="Creatore" />
                    </span>
                  ) : amOwner ? (
                    <button
                      onClick={() => setConfirmRemove(m)}
                      className="ml-auto w-16 shrink-0 rounded-md bg-stone-100 py-1 text-center text-[10px] font-semibold text-stone-500 transition hover:bg-tomato/10 hover:text-tomato"
                    >
                      Rimuovi
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Conferma: far uscire un membro */}
      {confirmRemove && (
        <div className="mt-2 rounded-xl border border-tomato/30 bg-tomato/5 p-3 text-center">
          <p className="text-xs text-stone-600">
            Vuoi far uscire <span className="font-bold text-ink">{memberName(confirmRemove)}</span> dalla Dispensa condivisa?
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              onClick={() => setConfirmRemove(null)}
              disabled={busy === "remove"}
              className="flex-1 rounded-lg border-2 border-stone-300 px-3 py-2 text-xs font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
            >
              Annulla
            </button>
            <button
              onClick={kick}
              disabled={busy === "remove"}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-tomato px-3 py-2 text-xs font-semibold text-[#fff] transition hover:bg-tomato-700 disabled:opacity-60"
            >
              {busy === "remove" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><UserMinus className="h-3.5 w-3.5" /> Rimuovi</>}
            </button>
          </div>
        </div>
      )}

      {/* Cambia nucleo attivo (solo con più di un nucleo) */}
      {households.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {households.map((h) => (
            <button
              key={h.id}
              onClick={() => onSwitch?.(h.id)}
              aria-pressed={h.id === active.id}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                h.id === active.id ? "border-tomato bg-tomato text-[#fff]" : "border-hair bg-paper text-stone-600 hover:border-tomato hover:text-tomato"
              }`}
            >
              {h.name}
            </button>
          ))}
        </div>
      )}

      {/* Invita + Entra: sulla stessa riga, mezza larghezza ciascuno */}
      <div className="mt-2 flex gap-2">
        <Button variant="cook" size="sm" className="flex-1" onClick={invite} disabled={busy === "invite"}>
          {busy === "invite" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4" /> Invita</>}
        </Button>
        <Button variant="secondary" size="sm" className="flex-1" onClick={() => { setJoinOpen((o) => !o); setCode(""); setMsg(""); }}>
          <DoorOpen className="h-4 w-4" /> Entra con codice
        </Button>
      </div>

      {/* Codice invito appena generato */}
      {code && (
        <div className="mt-2 rounded-xl border border-tomato/30 bg-tomato/5 p-2.5 text-center">
          <p className="text-[11px] font-semibold text-stone-500">Codice invito (valido 7 giorni)</p>
          <p className="my-1 font-display text-xl font-extrabold tracking-[0.2em] text-tomato">{code}</p>
          <div className="flex justify-center gap-2">
            <Button variant="secondary" size="sm" onClick={copyCode}>
              {copied ? <><Check className="h-4 w-4" /> Copiato</> : <><Copy className="h-4 w-4" /> Copia</>}
            </Button>
            <Button variant="cook" size="sm" onClick={shareCode}><Share2 className="h-4 w-4" /> Condividi</Button>
          </div>
        </div>
      )}

      {/* Entra: campo codice */}
      {joinOpen && (
        <div className="mt-2 flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="CODICE"
            className="min-w-0 flex-1 rounded-xl border border-hair bg-paper px-3 py-2.5 text-sm tracking-[0.15em] text-ink outline-none focus:border-stone-400"
          />
          <Button variant="primary" size="sm" onClick={join} disabled={busy === "join" || !joinCode.trim()}>
            {busy === "join" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entra"}
          </Button>
        </div>
      )}

      {msg && <p className="mt-1.5 text-center text-xs font-semibold text-tomato">{msg}</p>}

      {/* Esci dal nucleo (solo se ne hai un altro a cui tornare) */}
      {households.length > 1 && (
        <button
          onClick={leave}
          disabled={busy === "leave"}
          className="mt-2 flex w-full items-center justify-center gap-2 text-xs font-semibold text-stone-400 transition hover:text-tomato disabled:opacity-60"
        >
          <LogOut className="h-3.5 w-3.5" /> Esci
        </button>
      )}
    </>
  );
}
