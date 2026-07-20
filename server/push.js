// Core delle notifiche push per le scadenze (FASE 1), indipendente dal
// framework. Usato dalla serverless function Vercel (api/push.js), invocata
// dal cron pg_cron (migration-10) tre volte al giorno.
//
// Sicurezza / design:
//  - Endpoint SOLO per il cron: protetto da un segreto condiviso
//    (header `x-cron-secret` == env.CRON_SECRET). Nessun token utente qui.
//  - Usa il SERVICE ROLE per leggere le subscription e le scadenze di tutti
//    gli utenti (bypassa la RLS in modo controllato, come account/rate-limit).
//  - La VAPID private key vive SOLO qui (env server), mai nel client.
//  - Lo "slot" (pranzo/cena/sera) NON arriva dal cron: lo ricava il server
//    dall'ora di Roma, così è robusto al cambio ora legale (vedi migration-10).

import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { apnsConfigured, createApnsSender, isDeadToken } from "./apns.js";

// Momenti canonici, in MINUTI dall'inizio del giorno, ORA DI ROMA.
const SLOTS = {
  pranzo: 14 * 60 + 30, // 870  → "hai cucinato? aggiorna la dispensa"
  cena:   18 * 60 + 30, // 1110 → scadenze / "cosa cuciniamo stasera"
  sera:   21 * 60 + 45, // 1305 → "com'era la cena? aggiorna la dispensa"
};
// Tolleranza attorno all'orario: i due "gemelli" UTC del cron distano 60 min,
// quindi con ±20 solo quello giusto della stagione rientra nella finestra.
const TOLERANCE_MIN = 20;

// Ora corrente di Roma in minuti dall'inizio del giorno (DST-aware via Intl).
function romeMinutes(now) {
  const [h, m] = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(now).split(":").map(Number);
  return h * 60 + m;
}

// Quale slot stiamo servendo (o null se siamo fuori da ogni finestra: è il
// "gemello" UTC della stagione sbagliata, o una chiamata manuale fuori orario).
function currentSlot(now) {
  const mins = romeMinutes(now);
  for (const [name, target] of Object.entries(SLOTS)) {
    if (Math.abs(mins - target) <= TOLERANCE_MIN) return name;
  }
  return null;
}

// Data di Roma (YYYY-MM-DD) di riferimento per la finestra scadenze.
function romeDateISO(now, addDays = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now); // en-CA → "YYYY-MM-DD"
  const d = new Date(`${parts}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + addDays);
  return d.toISOString().slice(0, 10);
}

// Articolo determinativo "best effort" per il nome di un prodotto (usato solo
// nel titolo con UN prodotto: "Il Latte sta per scadere"). L'italiano non si
// indovina sempre dal nome: euristiche + eccezioni per i cibi più comuni; nel
// dubbio "Il". Sbagliare articolo è peggio che ometterlo, ma i casi coperti
// qui sono la stragrande maggioranza di una dispensa reale.
const ART_LE = new Set(["uova", "patate", "zucchine", "carote", "mele", "pere", "banane", "fragole", "cipolle", "melanzane", "olive", "noci", "verdure", "acciughe", "vongole", "cozze", "lenticchie", "arance", "albicocche", "uvette", "erbe"]);
const ART_LA = new Set(["carne"]);
const ART_I = new Set(["biscotti", "pomodori", "fagioli", "ceci", "piselli", "funghi", "peperoni", "cetrioli", "limoni", "gamberi", "wurstel"]);
const ART_GLI = new Set(["spinaci", "gnocchi", "asparagi"]);
function articleFor(name) {
  const w = String(name || "").trim().toLowerCase().split(/\s+/)[0];
  if (!w) return "";
  if (ART_LE.has(w)) return "Le ";
  if (ART_LA.has(w)) return "La ";
  if (ART_I.has(w)) return "I ";
  if (ART_GLI.has(w)) return "Gli ";
  if (/^[aeiou]/.test(w)) return "L'";
  if (/^(s[bcdfglmnpqrtvz]|z|gn|ps|pn|x|y)/.test(w)) return "Lo ";
  if (/a$/.test(w)) return "La ";
  return "Il ";
}

// Copy delle notifiche (scritto dall'utente, 2026-07-19, rifinito 2026-07-20:
// amichevole, tono "noi" — la dispensa parla come una compagna di cucina, non
// da assistente — e invoglia ad aprire). `url` = deep-link PWA.
// `dinner` = cena di stasera dal Piano Alimentare (solo slot cena, solo se
// niente scadenze): in quel caso la notifica apre direttamente il Piano.
function buildPayload(slot, expiringNames, dinner = null) {
  if (slot === "pranzo") {
    return {
      title: "Hai mangiato? 🍽️",
      body: "Dimmi cosa hai usato e penso io a tenere tutto in ordine",
      url: "/", tag: "dispensa-pranzo",
    };
  }
  if (slot === "sera") {
    return {
      title: "Com'era la cena? 😋",
      body: "Togliamo dalla dispensa quello che hai usato?",
      url: "/", tag: "dispensa-sera",
    };
  }
  // cena: se c'è qualcosa in scadenza lo mettiamo in primo piano, altrimenti
  // l'invito generico a cucinare. Entrambe aprono le Ricette.
  const uniq = [...new Set(expiringNames.map((n) => String(n || "").trim()).filter(Boolean))];
  const cena = { url: "/?view=ricette", tag: "dispensa-cena" };
  if (uniq.length === 1) {
    return {
      ...cena,
      title: `${articleFor(uniq[0])}${uniq[0]} sta per scadere 🚨`,
      body: "Ti faccio vedere cosa possiamo cucinarci",
    };
  }
  if (uniq.length === 2) {
    return {
      ...cena,
      title: `${uniq[0]} e ${uniq[1]} stanno per scadere 🚨`,
      body: "Ho qualche idea per usarli prima che sia troppo tardi",
    };
  }
  if (uniq.length >= 3) {
    return {
      ...cena,
      title: `${uniq[0]}, ${uniq[1]} e altri ${uniq.length - 2} stanno per scadere 🚨`,
      body: "Ci sono un po' di cose da usare, vediamo cosa possiamo combinare",
    };
  }
  if (dinner?.title) {
    return {
      ...cena,
      url: "/?view=piano",
      title: `Stasera c'è ${dinner.title} 👨‍🍳`,
      body: "Tutto già deciso: apri e mettiamoci ai fornelli",
    };
  }
  return {
    ...cena,
    title: "Stasera che si mangia? 🍽️",
    body: "Vediamo cosa possiamo preparare",
  };
}

// Nuclei di cui l'utente fa parte (per lo scope delle query che seguono).
async function fetchHouseholdIds(admin, userId) {
  const { data } = await admin
    .from("household_members").select("household_id").eq("user_id", userId);
  return (data || []).map((m) => m.household_id).filter(Boolean);
}

// Applica a una query lo scope "cose visibili all'utente": i suoi nuclei +
// le righe personali (household_id null), rispecchiando la RLS.
function scopeToUser(q, hhIds, userId) {
  if (hhIds.length) {
    return q.or(`household_id.in.(${hhIds.join(",")}),and(household_id.is.null,user_id.eq.${userId})`);
  }
  return q.is("household_id", null).eq("user_id", userId);
}

// Prodotti con scadenza visibili all'utente.
async function fetchUserPantry(admin, userId, hhIds) {
  const q = admin.from("pantry_items").select("name, expiry").not("expiry", "is", null);
  const { data } = await scopeToUser(q, hhIds, userId);
  return data || [];
}

// La cena di STASERA nel Piano Alimentare (se pianificata e non ancora
// cucinata): la notifica delle 18:30 la mette in primo piano e apre il Piano.
async function fetchTonightDinner(admin, userId, hhIds, dateIso) {
  const q = admin.from("meal_plan").select("title")
    .eq("date", dateIso).eq("slot", "cena").is("cooked_at", null).limit(1);
  const { data } = await scopeToUser(q, hhIds, userId);
  return data?.[0] || null;
}

export async function handlePushCron({ headers = {}, env, now = new Date() }) {
  // 1) Autorizzazione: segreto del cron.
  const got = headers["x-cron-secret"] || headers["X-Cron-Secret"];
  if (!env.CRON_SECRET || got !== env.CRON_SECRET) {
    return { status: 401, json: { error: "Non autorizzato." } };
  }
  // 2) Config server.
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return { status: 500, json: { error: "Configurazione Supabase mancante sul server." } };
  }
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    return { status: 500, json: { error: "Chiavi VAPID mancanti sul server." } };
  }
  // 3) Slot dall'ora di Roma (fuori finestra = no-op, non è un errore).
  const slot = currentSlot(now);
  if (!slot) return { status: 200, json: { skipped: true, reason: "fuori orario" } };

  webpush.setVapidDetails(
    env.VAPID_SUBJECT || "mailto:mar8co@gmail.com",
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );

  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // `platform`/`apns_token` esistono dalla migration-12: se non è ancora stata
  // eseguita la select fallisce, quindi si ripiega sulle sole colonne web e le
  // notifiche PWA continuano a partire (nessuna regressione).
  let subs, subsErr;
  {
    const full = await admin.from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth, platform, apns_token");
    if (full.error) {
      const legacy = await admin.from("push_subscriptions")
        .select("id, user_id, endpoint, p256dh, auth");
      subs = legacy.data;
      subsErr = legacy.error;
      if (!legacy.error) console.warn("push: migration-12 non applicata, solo Web Push");
    } else {
      subs = full.data;
    }
  }
  if (subsErr) return { status: 500, json: { error: "Lettura subscription fallita.", detail: subsErr.message } };
  if (!subs?.length) return { status: 200, json: { slot, sent: 0, removed: 0 } };

  // Canale APNs aperto una sola volta per tutto il giro (se configurato e se
  // c'è almeno un dispositivo iOS da servire).
  const hasIos = subs.some((s) => s.platform === "ios" && s.apns_token);
  const apns = hasIos && apnsConfigured(env) ? createApnsSender(env) : null;
  if (hasIos && !apns) console.warn("push: dispositivi iOS presenti ma APNs non configurato");

  // Raggruppo le subscription per utente (un utente può avere più dispositivi).
  const byUser = new Map();
  for (const s of subs) {
    if (!byUser.has(s.user_id)) byUser.set(s.user_id, []);
    byUser.get(s.user_id).push(s);
  }

  let sent = 0, removed = 0;

  for (const [userId, userSubs] of byUser) {
    // Payload calcolato UNA volta per utente, poi inviato a tutti i suoi device.
    let payload;
    try {
      const hhIds = await fetchHouseholdIds(admin, userId);
      const pantry = await fetchUserPantry(admin, userId, hhIds);
      // Niente promemoria su una dispensa vuota (sarebbe rumore inutile).
      if (!pantry.length) continue;

      let expiringNames = [];
      let dinner = null;
      if (slot === "cena") {
        // Cadenza AUTOMATICA: un prodotto viene menzionato a 7, 3 e 1 giorno
        // dalla scadenza — tre richiami ben distanziati invece della
        // ripetizione quotidiana, e nessuna impostazione da configurare
        // (il selettore 1/3/7 è stato rimosso, decisione 2026-07-20).
        const targets = new Set([romeDateISO(now, 1), romeDateISO(now, 3), romeDateISO(now, 7)]);
        expiringNames = pantry
          .filter((p) => p.expiry && targets.has(p.expiry))
          .map((p) => p.name);
        // Le scadenze hanno la precedenza (anima anti-spreco dell'app); se non
        // ce ne sono e la cena è già nel piano, la notifica apre il Piano.
        if (!expiringNames.length) {
          dinner = await fetchTonightDinner(admin, userId, hhIds, romeDateISO(now, 0));
        }
      }
      payload = buildPayload(slot, expiringNames, dinner);
    } catch (e) {
      // Un utente che fallisce non deve bloccare gli altri.
      console.error("push: preparazione utente fallita", userId, e?.message || e);
      continue;
    }

    const body = JSON.stringify(payload);
    for (const s of userSubs) {
      // Stesso contenuto, due canali: APNs per l'app iOS, Web Push per la PWA.
      if (s.platform === "ios") {
        if (!apns) continue;
        const res = await apns.send(s.apns_token, payload);
        if (res.ok) sent++;
        else if (isDeadToken(res)) {
          await admin.from("push_subscriptions").delete().eq("id", s.id);
          removed++;
        } else {
          console.error("push: APNs fallito", res.status, res.reason);
        }
        continue;
      }
      const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
      try {
        await webpush.sendNotification(subscription, body);
        sent++;
      } catch (e) {
        // 404/410 = subscription non più valida (app disinstallata / permesso
        // revocato): la rimuoviamo per non riprovare all'infinito.
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", s.id);
          removed++;
        } else {
          console.error("push: invio fallito", s.endpoint, e?.statusCode || e?.message || e);
        }
      }
    }
  }

  apns?.close();
  return { status: 200, json: { slot, sent, removed } };
}
