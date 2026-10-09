// Calendario Alimentare come CALENDARIO IN ABBONAMENTO (webcal): il telefono
// si collega una volta sola a un indirizzo e poi i pasti compaiono — e si
// aggiornano — da soli nel calendario di Apple o Google. Niente file da aprire.
//
// Due funzioni, usate da api/calendar.js:
//  - handleCalendarLink (POST, utente autenticato): restituisce l'indirizzo
//    personale del calendario;
//  - handleCalendarFeed (GET, chiamata dall'app Calendario, che NON può fare
//    login): restituisce il file .ics coi pasti.
//
// Sicurezza: l'indirizzo contiene l'id dell'utente e una FIRMA (HMAC) fatta
// con un segreto che sta solo sul server. Senza firma giusta non si legge
// nulla; chi non conosce l'indirizzo non può indovinarlo. Nessuna tabella
// nuova: la firma si ricalcola a ogni richiesta.
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";
import { mealsToIcs } from "../src/lib/ics.js";

const secretOf = (env) => env.CALENDAR_SECRET || env.SUPABASE_SERVICE_ROLE_KEY || "";

export function signUser(uid, secret) {
  return createHmac("sha256", secret).update(`calendario:${uid}`).digest("hex").slice(0, 40);
}
export function validSignature(uid, sig, secret) {
  if (!uid || !sig || !secret) return false;
  const a = Buffer.from(signUser(uid, secret));
  const b = Buffer.from(String(sig));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function handleCalendarLink({ authHeader, env }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !secretOf(env)) {
    return { status: 500, json: { error: "Calendario non disponibile: configurazione mancante sul server." } };
  }
  const token = String(authHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { status: 401, json: { error: "Non autenticato." } };
  const anon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) return { status: 401, json: { error: "Sessione non valida o scaduta." } };
  const uid = data.user.id;
  return { status: 200, json: { path: `/api/calendar?u=${uid}&k=${signUser(uid, secretOf(env))}` } };
}

export async function handleCalendarFeed({ query = {}, env, now = new Date() }) {
  const uid = String(query.u || "");
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return { status: 500, text: "Configurazione mancante." };
  if (!validSignature(uid, query.k, secretOf(env))) return { status: 403, text: "Indirizzo non valido." };

  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  // Stesso perimetro della RLS: i nuclei dell'utente + le sue righe personali.
  const { data: mem } = await admin.from("household_members").select("household_id").eq("user_id", uid);
  const hhIds = (mem || []).map((m) => m.household_id).filter(Boolean);
  // Dall'ultima settimana in poi: il passato lontano non serve nel calendario.
  const from = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  let q = admin.from("meal_plan").select("id, date, slot, title").gte("date", from).order("date").limit(400);
  q = hhIds.length
    ? q.or(`household_id.in.(${hhIds.join(",")}),and(household_id.is.null,user_id.eq.${uid})`)
    : q.is("household_id", null).eq("user_id", uid);
  const { data: meals, error } = await q;
  if (error) return { status: 500, text: "Lettura del calendario non riuscita." };
  return { status: 200, text: mealsToIcs(meals || [], now) };
}
