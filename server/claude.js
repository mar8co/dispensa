// Core del proxy AI, indipendente dal framework.
// Usato sia dalla serverless function Vercel (api/claude.js) sia dal
// middleware di sviluppo locale (vite.config.js).
//
// Provider: Google Gemini (tier gratuito, supporta immagini per lo scontrino).
//
// Sicurezza / design:
//  - La API key vive SOLO qui (env var server), mai nel client.
//  - L'endpoint è protetto: ogni richiesta deve portare un token Supabase
//    valido (Authorization: Bearer <access_token>); altrimenti 401.
//  - Il client continua a mandare i blocchi in stile Anthropic (prompt
//    INVARIATI): qui li traduciamo nel formato Gemini e ritraduciamo la
//    risposta nel formato che il client già si aspetta. Così client e prompt
//    non cambiano se un domani si cambia provider.

import { createClient } from "@supabase/supabase-js";

const DEFAULT_MODEL = "gemini-2.5-flash";
const API_VERSION = "v1beta";

// Converte i blocchi in stile Anthropic inviati dal client nei "parts" di Gemini.
function toGeminiParts(content) {
  const blocks = Array.isArray(content) ? content : [{ type: "text", text: String(content) }];
  const parts = [];
  for (const b of blocks) {
    if (b?.type === "text") {
      parts.push({ text: b.text });
    } else if (b?.type === "image" && b.source?.type === "base64") {
      parts.push({ inlineData: { mimeType: b.source.media_type, data: b.source.data } });
    }
  }
  return parts;
}

export async function handleClaudeRequest({ authHeader, body, env }) {
  // 1) Configurazione server presente?
  if (!env.GEMINI_API_KEY) {
    return { status: 500, json: { error: "GEMINI_API_KEY non configurata sul server." } };
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return { status: 500, json: { error: "Configurazione Supabase mancante sul server." } };
  }

  // 2) Verifica del token Supabase dell'utente.
  const token = String(authHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { status: 401, json: { error: "Non autenticato." } };

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const { data: userData, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !userData?.user) {
    return { status: 401, json: { error: "Sessione non valida o scaduta." } };
  }

  // 3) Validazione minima del payload.
  const content = body?.content;
  const maxTokens = Number(body?.max_tokens) || 1000;
  if (!content) return { status: 400, json: { error: "Richiesta non valida: 'content' mancante." } };

  // 4) Chiamata all'API Gemini con la chiave server.
  const model = env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/${API_VERSION}/models/${model}:generateContent`;

  const generationConfig = {
    maxOutputTokens: maxTokens,
    responseMimeType: "application/json", // i prompt chiedono già JSON
  };
  // Sui modelli 2.5 il "thinking" è attivo di default e consumerebbe il budget
  // di token (rischio risposta troncata): lo disattiviamo per i nostri task JSON.
  if (model.includes("2.5")) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: toGeminiParts(content) }],
        generationConfig,
      }),
    });
  } catch (e) {
    return { status: 502, json: { error: "Impossibile contattare il servizio AI.", detail: String(e) } };
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return { status: res.status, json: { error: "Errore dal servizio AI.", detail: data } };
  }

  // 5) Estrae il testo dalla risposta Gemini e lo impacchetta nel formato che
  //    il client già si aspetta (stile Anthropic): { content: [{type:"text",...}] }.
  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "")
    .join("");

  if (!text) {
    return { status: 502, json: { error: "Risposta AI vuota.", detail: data } };
  }

  return { status: 200, json: { content: [{ type: "text", text }] } };
}
