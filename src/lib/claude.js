// Chiamate AI dal client: ora passano dal proxy /api/claude, che tiene la
// API key Anthropic lato server. Qui mandiamo solo il contenuto del prompt
// (invariato) e il token Supabase dell'utente per autenticare la richiesta.
import { supabase } from "./supabase.js";

export function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1]);
    r.onerror = () => rej(new Error("Lettura file fallita"));
    r.readAsDataURL(file);
  });
}

// Recupera URL di foto (Pexels) per una lista di query. Mai bloccante:
// in caso di errore restituisce un array vuoto.
export async function fetchPhotos(queries) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    const res = await fetch("/api/photo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ queries }),
    });
    if (!res.ok) return [];
    const j = await res.json();
    return Array.isArray(j.urls) ? j.urls : [];
  } catch {
    return [];
  }
}

// Messaggio utente per un errore AI: i casi noti (offline, limiti, timeout)
// hanno testi specifici, il resto usa il fallback del chiamante. Tenuto qui
// così tutti i flussi AI (ricette, voce, scontrino, barcode) parlano uguale.
export function aiErrorMessage(err, fallback) {
  if (err?.status === 0) return "Sei offline: controlla la connessione e riprova.";
  if (err?.code === "daily_limit") return "Limite giornaliero AI raggiunto. Riprova domani.";
  if (err?.status === 429) return "Limite di richieste AI raggiunto. Attendi qualche secondo e riprova.";
  if (err?.status === 408) return "Il servizio AI non ha risposto in tempo. Riprova.";
  return fallback;
}

// Chiama il proxy AI e restituisce il JSON già parsato.
// opts:
//  - schema: responseSchema Gemini (output strutturato garantito)
//  - temperature: 0–2 (bassa per estrazione, alta/omessa per ricette)
//  - timeoutMs: stacca la richiesta se il servizio non risponde (default 30s)
//  - retries: tentativi residui su errori transitori (default 2)
//  - signal: AbortSignal esterno (es. "Annulla" dell'utente): annulla la
//    richiesta senza retry; l'errore ha code "cancelled" (status 499)
export async function callClaude(content, maxTokens = 1000, opts = {}) {
  const { schema = null, temperature, timeoutMs = 30000, retries = 2, signal: extSignal = null } = opts;
  // Fail-fast offline: navigator.onLine === false è affidabile (il contrario
  // no). Meglio un errore chiaro subito che 30s di attesa + retry a vuoto.
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const err = new Error("Sei offline: controlla la connessione e riprova.");
    err.status = 0; // non ritentabile: torna online e riprova l'utente
    throw err;
  }
  if (extSignal?.aborted) {
    const err = new Error("Operazione annullata.");
    err.status = 499; err.code = "cancelled";
    throw err;
  }
  // Timeout esplicito: senza, una richiesta lenta lascia la UI appesa all'infinito.
  // L'eventuale segnale esterno (Annulla) aborta lo stesso controller.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onExtAbort = () => controller.abort();
  extSignal?.addEventListener("abort", onExtAbort, { once: true });
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;

    const res = await fetch("/api/claude", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        content,
        max_tokens: maxTokens,
        ...(schema ? { schema } : {}),
        ...(temperature != null ? { temperature } : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const info = await res.json().catch(() => null);
      const detail = info?.detail?.error?.message;
      const err = new Error((info?.error || `API ${res.status}`) + (detail ? `: ${detail}` : ""));
      err.status = res.status;
      err.code = info?.code; // es. "daily_limit": non ritentare
      throw err;
    }

    const payload = await res.json();
    const text = (payload.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const clean = text.replace(/```json|```/g, "").trim();

    try {
      return JSON.parse(clean);
    } catch {
      // Fallback: estrae il primo blocco JSON se la risposta è un po' sporca.
      const m = clean.match(/[{[][\s\S]*[}\]]/);
      if (m) {
        try { return JSON.parse(m[0]); } catch { /* niente */ }
      }
      const err = new Error("Risposta AI non valida");
      err.status = 502;
      throw err;
    }
  } catch (err) {
    if (err.name === "AbortError") {
      if (extSignal?.aborted) {
        // Annullata dall'utente: niente retry, il chiamante la tratta in silenzio.
        err.status = 499; err.code = "cancelled";
        err.message = "Operazione annullata.";
      } else {
        err.status = 408; // timeout: trattato come transitorio (ritentabile)
        err.message = "Il servizio AI non ha risposto in tempo.";
      }
    }
    // Riprova su timeout (408), errori temporanei (500/502/503) o 429 transitorio,
    // con attese crescenti (2s, poi 4s). NON ritenta il limite giornaliero
    // (code: "daily_limit"): è inutile, il tetto si azzera solo l'indomani.
    const retriable = [408, 429, 500, 502, 503].includes(err.status) && err.code !== "daily_limit";
    if (retries > 0 && retriable) {
      await new Promise((r) => setTimeout(r, 2000 * (3 - retries)));
      return callClaude(content, maxTokens, { ...opts, retries: retries - 1 });
    }
    throw err;
  } finally {
    clearTimeout(timer);
    extSignal?.removeEventListener("abort", onExtAbort);
  }
}
