// Sezione "Dispensa familiare" nel Profilo: nucleo attivo, membri, invito con
// codice, entra-con-codice, cambio del nucleo attivo, esci. Le funzioni che
// cambiano il nucleo attivo (e quindi ricaricano i dati) passano da Dispensa
// via props (onSwitch / onChanged); le altre chiamano db.js direttamente.
import { useState, useEffect } from "react";
import { Users, Copy, Check, Share2, LogOut, Loader2, UserPlus, DoorOpen } from "lucide-react";
import Button from "./Button.jsx";
import { createInvite, acceptInvite, fetchMembers, leaveHousehold } from "../lib/db.js";

export default function HouseholdSection({ households = [], activeHouseholdId, email, onSwitch, onChanged }) {
  const active = households.find((h) => h.id === activeHouseholdId) || households[0] || null;
  const [members, setMembers] = useState([]);
  const [code, setCode] = useState("");      // codice invito appena generato
  const [copied, setCopied] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState("");      // "invite" | "join" | "leave"
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let off = false;
    setCode(""); setCopied(false); setMsg("");
    if (active) {
      fetchMembers(active.id).then((m) => { if (!off) setMembers(m); }).catch(() => {});
    } else setMembers([]);
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHouseholdId]);

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

  if (!active) return null;

  return (
    <>
      <p className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-stone-400">Dispensa familiare</p>

      {/* Nucleo attivo + membri */}
      <div className="rounded-xl border border-hair bg-paper p-3.5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-tomato" />
          <span className="min-w-0 truncate text-sm font-semibold text-ink">{members.length > 1 ? "La nostra dispensa" : "La tua dispensa"}</span>
          <span className="ml-auto shrink-0 text-xs text-stone-400">{members.length} {members.length === 1 ? "membro" : "membri"}</span>
        </div>
        {members.length > 0 && (
          <ul className="mt-2 space-y-1">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center gap-2 text-xs text-stone-600">
                <span className="min-w-0 truncate">{m.email || "—"}{m.email && m.email === email ? " (tu)" : ""}</span>
                {m.role === "owner" && <span className="ml-auto shrink-0 rounded-full bg-tomato/10 px-2 py-0.5 text-[10px] font-bold text-tomato">creatore</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

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

      {/* Invito */}
      {code ? (
        <div className="mt-2 rounded-xl border border-tomato/30 bg-tomato/5 p-3 text-center">
          <p className="text-[11px] font-semibold text-stone-500">Codice invito (valido 7 giorni)</p>
          <p className="my-1 font-display text-2xl font-extrabold tracking-[0.2em] text-tomato">{code}</p>
          <div className="flex justify-center gap-2">
            <Button variant="secondary" size="sm" onClick={copyCode}>
              {copied ? <><Check className="h-4 w-4" /> Copiato</> : <><Copy className="h-4 w-4" /> Copia</>}
            </Button>
            <Button variant="cook" size="sm" onClick={shareCode}><Share2 className="h-4 w-4" /> Condividi</Button>
          </div>
        </div>
      ) : (
        <Button variant="cook" full size="sm" className="mt-2" onClick={invite} disabled={busy === "invite"}>
          {busy === "invite" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4" /> Invita in famiglia</>}
        </Button>
      )}

      {/* Entra con codice */}
      {joinOpen ? (
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
      ) : (
        <button
          onClick={() => { setJoinOpen(true); setMsg(""); }}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-hair px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
        >
          <DoorOpen className="h-4 w-4 text-stone-400" /> Entra in un nucleo con un codice
        </button>
      )}

      {msg && <p className="mt-1.5 text-center text-xs font-semibold text-tomato">{msg}</p>}

      {/* Esci dal nucleo (solo se ne hai un altro a cui tornare) */}
      {households.length > 1 && (
        <button
          onClick={leave}
          disabled={busy === "leave"}
          className="mt-2 flex w-full items-center justify-center gap-2 text-xs font-semibold text-stone-400 transition hover:text-tomato disabled:opacity-60"
        >
          <LogOut className="h-3.5 w-3.5" /> Esci dal nucleo
        </button>
      )}
    </>
  );
}
