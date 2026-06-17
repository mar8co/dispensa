// Schermata di accesso: magic link via email + accesso con Google.
// Coerente con lo stile dell'app (palette stone/amber, card arrotondate).
import { useState } from "react";
import { Loader2, Mail, Check } from "lucide-react";
import { supabase } from "../lib/supabase.js";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-5">
      <div className="w-full max-w-sm">
        {/* Logo + titolo */}
        <div className="mb-7 text-center">
          <img
            src="/icon.svg"
            alt="Dispensa"
            className="mx-auto mb-4 h-16 w-16 rounded-[22%] shadow-lg shadow-black/10"
          />
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-tomato">Dispensa</div>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink">Bentornato 👋</h1>
          <p className="mt-2 text-sm text-stone-500">Accedi per ritrovare la tua dispensa ovunque.</p>
        </div>

        <div className="rounded-2xl border border-hair bg-paper p-5">
          {sent ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
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
                className="mt-2 text-xs text-stone-400 hover:text-ink"
              >
                Usa un'altra email
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={sendMagicLink}>
                <label className="mb-1.5 block text-sm font-semibold text-ink">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@email.it"
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

              <div className="my-4 flex items-center gap-3 text-xs text-stone-400">
                <div className="h-px flex-1 bg-hair" /> oppure <div className="h-px flex-1 bg-hair" />
              </div>

              <button
                onClick={signInGoogle}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-hair bg-paper px-4 py-3 text-sm font-semibold text-ink transition hover:bg-stone-50"
              >
                <GoogleIcon /> Continua con Google
              </button>

              {err && <p className="mt-3 text-center text-xs font-semibold text-tomato">{err}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
