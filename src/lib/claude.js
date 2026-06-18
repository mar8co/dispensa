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

export async function callClaude(content, maxTokens = 1000, retries = 2) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;

    const res = await fetch("/api/claude", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content, max_tokens: maxTokens }),
    });

    if (!res.ok) {
      const info = await res.json().catch(() => null);
      const detail = info?.detail?.error?.message;
      const err = new Error((info?.error || `API ${res.status}`) + (detail ? `: ${detail}` : ""));
      err.status = res.status;
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
    // Riprova automatico su limite di richieste (429), errori temporanei del
    // servizio (500/503) o risposta vuota/non valida (502), con attese
    // crescenti: 2s al primo tentativo, 4s al secondo.
    const retriable = [429, 500, 502, 503].includes(err.status);
    if (retries > 0 && retriable) {
      await new Promise((r) => setTimeout(r, 2000 * (3 - retries)));
      return callClaude(content, maxTokens, retries - 1);
    }
    throw err;
  }
}
