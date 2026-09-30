// Schermata di accesso a pagina intera: 3 provider rapidi (Apple, Google,
// Face ID/passkey) in alto, poi accesso via email con link magico. Veste
// manifesto: arancio del marchio (lo imposta App.jsx), titolo enorme, i due
// barattoli, pillole bianche per i provider, campo con la sola riga sotto.
import { useState } from "react";
import { Loader2, Mail, Check } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { authRedirectUrl } from "../lib/native.js";
import PrivacySheet from "./PrivacySheet.jsx";
import FaceIdIcon from "./FaceIdIcon.jsx";
import Barattoli from "./Barattoli.jsx";
import { PAGE_COLOR } from "../lib/colors.js";

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
  // Spinner sul provider premuto: OAuth reindirizza la pagina, quindi al
  // successo lo spinner resta acceso fino al redirect (si azzera solo su errore).
  const [oauthBusy, setOauthBusy] = useState(null); // "apple" | "google" | null
  // Errori separati per vicinanza al punto d'azione: quelli dei provider
  // compaiono sotto la loro riga, quelli dell'email sotto il form.
  const [provErr, setProvErr] = useState("");
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
        options: { emailRedirectTo: authRedirectUrl() },
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
    if (oauthBusy) return;
    setProvErr(""); setOauthBusy("google");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: authRedirectUrl() },
      });
      if (error) throw error;
      // Successo: parte il redirect, lo spinner resta acceso fino al cambio pagina.
    } catch (e2) {
      console.error(e2);
      setOauthBusy(null);
      setProvErr("Accesso con Google non riuscito o non ancora configurato.");
    }
  }

  async function signInApple() {
    if (oauthBusy) return;
    setProvErr(""); setOauthBusy("apple");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: { redirectTo: authRedirectUrl() },
      });
      if (error) throw error;
      // Successo: parte il redirect, lo spinner resta acceso fino al cambio pagina.
    } catch (e2) {
      console.error(e2);
      setOauthBusy(null);
      setProvErr("Accesso con Apple non riuscito o non ancora configurato.");
    }
  }

  // Accesso con Face ID/Touch ID (passkey già registrata dal Profilo su questo
  // dispositivo). Il prompt lo mostra il sistema; al successo l'auth listener
  // dell'app monta la schermata principale.
  async function signInPasskey() {
    if (passkeyBusy) return;
    setProvErr(""); setPasskeyBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPasskey();
      if (error) throw error;
    } catch (e2) {
      // L'utente ha annullato il prompt di sistema: niente da segnalare.
      if (e2?.name === "NotAllowedError" || e2?.name === "AbortError") return;
      console.error(e2);
      setProvErr("Accesso con Face ID non riuscito. Entra con email o Google, poi riattivalo dal Profilo.");
    } finally {
      setPasskeyBusy(false);
    }
  }

  return (
    <div className="flex min-h-[100svh] flex-col bg-sfondo px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+2rem)]">
      {/* Testata: la domanda del brand, enorme, con la sottolineatura ondulata
          (la stessa che disegna l'intro) e i due barattoli. */}
      <div className="mx-auto w-full max-w-sm">
        <Barattoli size={92} fill={PAGE_COLOR.accesso} className="-ml-1 mb-3 text-ink" />
        <h1 className="gigante">
          Cosa c&rsquo;è in{" "}
          <span className="underline decoration-rosso-azione decoration-wavy decoration-[3px] underline-offset-[10px] [text-decoration-skip-ink:none]">dispensa</span>?
        </h1>

        {/* Sottotitolo: la promessa. "Meno sprechi" su pillola verde (il verde
            del brand: sull'arancio un testo verde non si leggerebbe). */}
        <p className="mt-6 text-[1.05rem] font-semibold leading-relaxed text-ink">
          La tua cucina, in tasca.{" "}
          <span className="whitespace-nowrap rounded-full bg-verde px-2 py-0.5 font-extrabold">Meno sprechi.</span>{" "}
          Zero pensieri.
        </p>
      </div>

      {/* Corpo: conferma email inviata oppure schermata principale */}
      <div className="mx-auto mt-8 w-full max-w-sm">
        {sent ? (
          // Conferma link email inviato
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <div className="tondo h-12 w-12 bg-ink text-white">
              <Check className="h-6 w-6" />
            </div>
            <p className="mt-1 text-[1.3rem] font-extrabold tracking-[-0.03em] text-ink">Controlla la tua email</p>
            <p className="text-[0.95rem] font-medium text-ink/75">
              Ti ho inviato un link di accesso a <span className="font-bold text-ink">{email}</span>.
              Aprilo da questo dispositivo per entrare.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="link mt-2 min-h-[36px] text-[0.9rem] text-ink"
            >
              Usa un'altra email
            </button>
          </div>
        ) : (
          // Schermata principale: provider rapidi + OPPURE + email
          <>
            <div className={`grid gap-2 ${showPasskey ? "grid-cols-3" : "grid-cols-2"}`}>
              <SocialButton label="Continua con Apple" onClick={signInApple} busy={oauthBusy === "apple"}>
                <AppleIcon />
              </SocialButton>
              <SocialButton label="Continua con Google" onClick={signInGoogle} busy={oauthBusy === "google"}>
                <GoogleIcon />
              </SocialButton>
              {showPasskey && (
                <SocialButton label="Accedi con Face ID" onClick={signInPasskey} busy={passkeyBusy}>
                  <FaceIdIcon className="h-[23px] w-[23px] text-ink" />
                </SocialButton>
              )}
            </div>
            {/* Errore dei provider: adiacente ai pulsanti, non in fondo pagina */}
            {provErr && <p className="mt-3 text-center text-[0.9rem] font-bold text-ink">{provErr}</p>}

            <div className="micro my-5 flex items-center gap-3 text-ink/70">
              <div className="h-px flex-1 bg-ink/30" /> Oppure <div className="h-px flex-1 bg-ink/30" />
            </div>

            <form onSubmit={sendMagicLink}>
              {/* Niente label: il placeholder fa da esempio, l'aria-label
                  copre gli screen reader (design "manifesto", meno rumore). */}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="latua@mail.it"
                aria-label="Email"
                className="campo testo-grande text-[1.1rem] text-ink"
              />
              <button type="submit" disabled={sending} className="bottone mt-4 w-full">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Invia il link di accesso
              </button>
            </form>

            {err && <p className="mt-3 text-center text-[0.9rem] font-bold text-ink">{err}</p>}
          </>
        )}
      </div>

      {/* Link discreto all'informativa privacy, ancorato in fondo alla pagina */}
      <div className="mx-auto mt-auto w-full max-w-sm pt-8 text-center">
        <button
          onClick={() => setPrivacyOpen(true)}
          className="min-h-[36px] text-[0.8rem] font-semibold text-ink/70 underline underline-offset-2"
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
      className="flex h-[52px] items-center justify-center rounded-full border-[1.5px] border-ink bg-white transition active:scale-[0.97] disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-[22px] w-[22px] animate-spin text-ink/50" /> : children}
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
