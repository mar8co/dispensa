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

export async function callClaude(content, maxTokens = 1000) {
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
    const msg = info?.error || `API ${res.status}`;
    throw new Error(msg + (info?.detail?.error?.message ? `: ${info.detail.error.message}` : ""));
  }

  const payload = await res.json();
  const text = (payload.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}
