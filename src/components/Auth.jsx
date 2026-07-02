// Schermata di accesso a pagina intera: 3 provider rapidi (Apple, Google,
// Face ID/passkey) in alto, poi accesso via email con link magico. Stile
// coerente con l'app (palette cream/paper/ink/tomato) e con il tema attivo
// (chiaro/scuro): niente card centrata, il contenuto riempie lo schermo.
import { useState } from "react";
import { Loader2, Mail, Check } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import PrivacySheet from "./PrivacySheet.jsx";
import FaceIdIcon from "./FaceIdIcon.jsx";

// WebAuthn/passkey disponibile solo su contesti sicuri con l'API credenziali
// (iPhone Safari/PWA la supporta). Se manca, nascondiamo il pulsante Face ID.
const CAN_USE_PASSKEY = typeof window !== "undefined" && !!window.PublicKeyCredential;

export default function Auth() {
  // Il pulsante Face ID compare SOLO se su questo dispositivo è stata
  // registrata una passkey (flag scritto dal Profilo alla registrazione):
  // un pulsante che fallisce al primo tocco per chi non l'ha mai attivata
  // è peggio di nessun pulsante. Letto al mount: il login si monta fresco.
  const [hasDevicePasskey] = useState(() => {
    try { return localStorage.getItem("dispensa-passkey-device") === "1"; } catch { return false; }
  });
  const showPasskey = CAN_USE_PASSKEY && hasDevicePasskey;
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false); // link email inviato
  const [passkeyBusy, setPasskeyBusy] = useState(false); // ceremony Face ID in corso
  const [err, setErr] = useState("");
  const [privacyOpen, setPrivacyOpen] = useState(false); // informativa privacy

  async function sendMagicLink(e) {
    e.preventDefault();
    const addr = email.trim();
    if (!addr || sending) return;
    setSending(true); setErr("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: addr,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setSent(true);
    } catch (e2) {
      console.error(e2);
      setErr("Invio non riuscito. Controlla l'indirizzo e riprova.");
    } finally {
      setSending(false);
    }
  }

  async function signInGoogle() {
    setErr("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (e2) {
      console.error(e2);
      setErr("Accesso con Google non riuscito o non ancora configurato.");
    }
  }

  async function signInApple() {
    setErr("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (e2) {
      console.error(e2);
      setErr("Accesso con Apple non riuscito o non ancora configurato.");
    }
  }

  // Accesso con Face ID/Touch ID (passkey già registrata dal Profilo su questo
  // dispositivo). Il prompt lo mostra il sistema; al successo l'auth listener
  // dell'app monta la schermata principale.
  async function signInPasskey() {
    if (passkeyBusy) return;
    setErr(""); setPasskeyBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPasskey();
      if (error) throw error;
    } catch (e2) {
      // L'utente ha annullato il prompt di sistema: niente da segnalare.
      if (e2?.name === "NotAllowedError" || e2?.name === "AbortError") return;
      console.error(e2);
      setErr("Nessun Face ID su questo dispositivo. Accedi con email o Google, poi attivalo dal Profilo.");
    } finally {
      setPasskeyBusy(false);
    }
  }

  return (
    <div className="flex min-h-[100svh] flex-col bg-cream px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(3.5rem,env(safe-area-inset-top))]">
      {/* Header: logo + titolo */}
      <div className="mx-auto w-full max-w-sm pt-2 text-center">
        <img
          src="/icon.svg"
          alt="Dispensa"
          className="mx-auto mb-4 h-16 w-16 rounded-[22%] shadow-lg shadow-black/10"
        />
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-tomato">Dispensa</div>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink">Bentornato 👋</h1>
        <p className="mx-auto mt-2 max-w-[16rem] text-sm text-stone-500">
          Accedi per ritrovare la tua dispensa ovunque.
        </p>
      </div>

      {/* Corpo: conferma email inviata oppure schermata principale */}
      <div className="mx-auto mt-8 w-full max-w-sm">
        {sent ? (
          // Conferma link email inviato
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-tomato/10">
              <Check className="h-6 w-6 text-tomato" />
            </div>
            <p className="text-sm font-semibold text-ink">Controlla la tua email</p>
            <p className="text-sm text-stone-500">
              Ti ho inviato un link di accesso a <span className="font-semibold text-ink">{email}</span>.
              Aprilo da questo dispositivo per entrare.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="mt-2 text-xs text-stone-400 transition hover:text-ink"
            >
              Usa un'altra email
            </button>
          </div>
        ) : (
          // Schermata principale: provider rapidi + OPPURE + email
          <>
            <div className={`grid gap-2.5 ${showPasskey ? "grid-cols-3" : "grid-cols-2"}`}>
              <SocialButton label="Continua con Apple" onClick={signInApple}>
                <AppleIcon />
              </SocialButton>
              <SocialButton label="Continua con Google" onClick={signInGoogle}>
                <GoogleIcon />
              </SocialButton>
              {showPasskey && (
                <SocialButton label="Accedi con Face ID" onClick={signInPasskey} busy={passkeyBusy}>
                  <FaceIdIcon className="h-[23px] w-[23px] text-ink" />
                </SocialButton>
              )}
            </div>

            <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-400">
              <div className="h-px flex-1 bg-hair" /> OPPURE <div className="h-px flex-1 bg-hair" />
            </div>

            <form onSubmit={sendMagicLink}>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="latua@email.it"
                className="w-full rounded-xl border border-hair bg-paper px-3.5 py-3 text-sm text-ink outline-none focus:border-stone-400 focus:ring-2 focus:ring-tomato/15"
              />
              <button
                type="submit"
                disabled={sending}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Invia link di accesso
              </button>
            </form>

            {err && <p className="mt-3 text-center text-xs font-semibold text-tomato">{err}</p>}
          </>
        )}
      </div>

      {/* Link discreto all'informativa privacy, ancorato in fondo alla pagina */}
      <div className="mx-auto mt-auto w-full max-w-sm pt-8 text-center">
        <button
          onClick={() => setPrivacyOpen(true)}
          className="text-[11px] text-stone-400 transition hover:text-stone-600 hover:underline"
        >
          Privacy Policy
        </button>
      </div>

      {privacyOpen && <PrivacySheet onClose={() => setPrivacyOpen(false)} />}
    </div>
  );
}

// Bottone-provider con la sola icona (riga in alto). `busy` mostra lo spinner.
function SocialButton({ onClick, label, children, busy = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      title={label}
      className="flex h-12 items-center justify-center rounded-2xl border border-hair bg-paper transition hover:bg-stone-50 active:scale-[0.98] disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-[22px] w-[22px] animate-spin text-stone-400" /> : children}
    </button>
  );
}

function AppleIcon() {
  return (
    <svg className="h-[22px] w-[22px] text-ink" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.89 2.65 3.24 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.03 2.29-1.27 3.15-2.53.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.72-1.04-2.75-4.13zM14.6 4.59c.72-.87 1.2-2.08 1.07-3.29-1.03.04-2.28.69-3.02 1.56-.66.77-1.24 2-1.08 3.18 1.15.09 2.32-.58 3.03-1.45z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
