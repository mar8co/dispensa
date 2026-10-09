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
    } catch { setMsg("Non sono riuscito a entrare nella dispensa condivisa. Riprova."); }
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
    } catch { setMsg("Non sono riuscito a uscire dalla dispensa condivisa."); }
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
      <div className="sezione mt-6">
        <span>Dispensa condivisa</span>
        <span className="micro">{members.length} {members.length === 1 ? "membro" : "membri"}</span>
      </div>

      {/* Nucleo attivo + membri: righe sottili sul blu, niente riquadro */}
      <div className="pt-2.5">
        <div className="flex items-center gap-2">
          <Users className="h-[18px] w-[18px] text-ink" />
          <span className="min-w-0 truncate text-[1rem] font-bold tracking-[-0.01em] text-ink">{members.length > 1 ? "La nostra dispensa" : "La tua dispensa"}</span>
        </div>
        {members.length > 0 && (
          <ul className="mt-1.5 divide-y divide-riga border-t border-riga">
            {members.map((m) => {
              const isMe = m.email && m.email === email;
              const isOwner = m.role === "owner";
              return (
                <li key={m.user_id} className="flex min-h-[40px] items-center gap-2 text-[0.92rem] font-semibold text-ink">
                  <span className="min-w-0 truncate">{memberName(m)}{isMe ? " (tu)" : ""}</span>
                  {isOwner ? (
                    <span className="ml-auto flex w-[76px] shrink-0 justify-center">
                      <Crown className="h-4 w-4 text-ink" aria-label="Creatore" />
                    </span>
                  ) : amOwner ? (
                    <button
                      onClick={() => setConfirmRemove(m)}
                      className="pillola ml-auto min-h-[30px] w-[76px] shrink-0 px-2 text-[0.76rem]"
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
        <div className="mt-2 rounded-card bg-giallo p-3.5 text-center">
          <p className="text-[0.95rem] font-semibold leading-snug text-ink">
            Vuoi far uscire <span className="font-extrabold">{memberName(confirmRemove)}</span> dalla Dispensa condivisa?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setConfirmRemove(null)}
              disabled={busy === "remove"}
              className="bottone-chiaro min-h-[44px] flex-1 py-2 text-[0.92rem]"
            >
              Annulla
            </button>
            <button
              onClick={kick}
              disabled={busy === "remove"}
              className="bottone-rosso min-h-[44px] flex-1 py-2 text-[0.92rem]"
            >
              {busy === "remove" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><UserMinus className="h-3.5 w-3.5" /> Rimuovi</>}
            </button>
          </div>
        </div>
      )}

      {/* Entra + Invita: due pillole piccole (si usano una volta ogni tanto,
          non devono pesare quanto un'azione principale). */}
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => { setJoinOpen((o) => !o); setCode(""); setMsg(""); }}
          aria-expanded={joinOpen}
          className="pillola min-h-[36px] flex-1 px-2 text-[0.8rem]"
        >
          <DoorOpen className="h-3.5 w-3.5" /> Entra con codice
        </button>
        <button onClick={invite} disabled={busy === "invite"} className="pillola min-h-[36px] flex-1 px-2 text-[0.8rem] disabled:opacity-60">
          {busy === "invite" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><UserPlus className="h-3.5 w-3.5" /> Invita</>}
        </button>
      </div>

      {/* Codice invito appena generato */}
      {code && (
        <div className="mt-2 rounded-card bg-white p-3 text-center">
          <p className="micro">Codice invito (valido 7 giorni)</p>
          <p className="num my-1.5 text-[2.2rem] font-extrabold leading-none tracking-[0.12em] text-ink">{code}</p>
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
            className="campo min-w-0 flex-1 tracking-[0.15em] text-ink"
          />
          <Button variant="primary" size="sm" onClick={join} disabled={busy === "join" || !joinCode.trim()}>
            {busy === "join" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entra"}
          </Button>
        </div>
      )}

      {msg && <p className="mt-2 text-center text-[0.86rem] font-bold text-ink">{msg}</p>}

      {/* Esci dal nucleo (solo se ne hai un altro a cui tornare) */}
      {households.length > 1 && (
        <button
          onClick={leave}
          disabled={busy === "leave"}
          className="link mt-2 flex min-h-[36px] w-full items-center justify-center gap-2 text-[0.9rem] text-ink disabled:opacity-60"
        >
          <LogOut className="h-3.5 w-3.5" /> Esci
        </button>
      )}
    </>
  );
}
