-- ============================================================
--  Migration 10 — Notifiche push per le scadenze (FASE 1)
--  Additiva: nuova tabella `push_subscriptions` (una riga per dispositivo),
--  RLS per-utente, funzione di upsert SECURITY DEFINER e 3 promemoria
--  giornalieri via pg_cron + pg_net. NON tocca le RLS dei dati esistenti.
--  Idempotente (puoi rieseguirla). Esegui nel SQL Editor.
--
--  PRIMA di eseguire questo file, imposta UNA volta il segreto del cron nel
--  Vault (NON committato, resta solo nel tuo DB):
--
--    select vault.create_secret(
--      'INCOLLA_QUI_IL_CRON_SECRET',   -- lo stesso valore messo su Vercel
--      'dispensa_cron_secret'
--    );
--
--  (se lo hai gia' creato e vuoi cambiarlo:
--     select vault.update_secret(
--       (select id from vault.secrets where name='dispensa_cron_secret'),
--       'NUOVO_VALORE'); )
-- ============================================================

-- ---------- Tabella subscription push ----------
-- Schema minimale (opzione A): solo i dati della subscription del browser.
-- L'anticipo di avviso (1/3/7 gg) NON sta qui: vive in
-- user_settings.settings.push.daysBefore (preferenza cross-device).
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,          -- univoco per dispositivo+push service
  p256dh     text not null,                 -- chiave pubblica del client
  auth       text not null,                 -- segreto di autenticazione del client
  created_at timestamptz not null default now()
);

-- Indice per il raggruppamento per utente lato cron.
create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- RLS: ognuno vede/gestisce SOLO le proprie subscription. Il cron gira col
-- service role (bypassa la RLS) per leggerle tutte e inviare.
drop policy if exists push_select_own on public.push_subscriptions;
create policy push_select_own on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists push_insert_own on public.push_subscriptions;
create policy push_insert_own on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists push_delete_own on public.push_subscriptions;
create policy push_delete_own on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- ---------- Upsert della MIA subscription (per endpoint) ----------
-- SECURITY DEFINER: un re-subscribe dello stesso endpoint (o su un account
-- diverso dello stesso dispositivo) collide sull'unique(endpoint); qui lo
-- risolviamo riassegnando la riga all'utente corrente. Evita l'attrito della
-- RLS sul conflitto. Il client chiama questa (vedi src/lib/db.js).
create or replace function public.save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
     set user_id = excluded.user_id,
         p256dh  = excluded.p256dh,
         auth    = excluded.auth;
end;
$$;

-- ============================================================
--  Cron giornaliero (pg_cron) → chiama l'endpoint /api/push su Vercel (pg_net)
-- ============================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- I 3 momenti scelti sono in ORA DI ROMA:
--   14:30  promemoria "hai cucinato? aggiorna la dispensa"
--   18:30  scadenze / "cosa cuciniamo stasera" (apre le Ricette)
--   21:45  promemoria "com'era la cena? aggiorna la dispensa"
--
-- pg_cron pero' interpreta gli orari in UTC. Per essere robusti al cambio
-- ora legale SENZA ritoccare l'SQL due volte l'anno, schedulo per OGNI
-- momento le DUE varianti UTC (ora solare CET = UTC+1 e ora legale CEST =
-- UTC+2). Il server (server/push.js) ricava lo slot dall'ora di Roma con
-- una tolleranza di ±20 min: cosi' solo il "gemello" giusto della stagione
-- corrente rientra nella finestra e invia davvero; l'altro cade fuori
-- orario ed e' un no-op. Risultato: 3 invii/giorno tutto l'anno.
--
--   Roma 14:30  ->  12:30 UTC (CEST)  |  13:30 UTC (CET)
--   Roma 18:30  ->  16:30 UTC (CEST)  |  17:30 UTC (CET)
--   Roma 21:45  ->  19:45 UTC (CEST)  |  20:45 UTC (CET)

-- Helper: comando eseguito da ogni job. Legge il secret dal Vault a runtime
-- e fa una POST all'endpoint. Nessun payload: lo slot lo decide il server.
-- (Definito come funzione per non ripetere il corpo in 6 job.)
create or replace function public.dispensa_push_ping()
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  secret text;
begin
  select decrypted_secret into secret
    from vault.decrypted_secrets
   where name = 'dispensa_cron_secret'
   limit 1;

  perform net.http_post(
    url     := 'https://la-dispensa-omega.vercel.app/api/push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', coalesce(secret, '')
    ),
    body    := '{}'::jsonb
  );
end;
$$;

-- (Ri)creazione idempotente dei 6 job. unschedule tollerante se non esistono.
do $$
declare
  j text;
  jobs text[] := array[
    'dispensa-push-1230','dispensa-push-1330',
    'dispensa-push-1630','dispensa-push-1730',
    'dispensa-push-1945','dispensa-push-2045'
  ];
begin
  foreach j in array jobs loop
    perform cron.unschedule(j) where exists (select 1 from cron.job where jobname = j);
  end loop;
end;
$$;

select cron.schedule('dispensa-push-1230', '30 12 * * *', $$ select public.dispensa_push_ping(); $$);
select cron.schedule('dispensa-push-1330', '30 13 * * *', $$ select public.dispensa_push_ping(); $$);
select cron.schedule('dispensa-push-1630', '30 16 * * *', $$ select public.dispensa_push_ping(); $$);
select cron.schedule('dispensa-push-1730', '30 17 * * *', $$ select public.dispensa_push_ping(); $$);
select cron.schedule('dispensa-push-1945', '45 19 * * *', $$ select public.dispensa_push_ping(); $$);
select cron.schedule('dispensa-push-2045', '45 20 * * *', $$ select public.dispensa_push_ping(); $$);

-- Verifica rapida:
--   select jobname, schedule, active from cron.job where jobname like 'dispensa-push-%';
--   -- test manuale (invia subito, se sei dentro una finestra oraria valida):
--   select public.dispensa_push_ping();
--   -- ultime risposte HTTP del cron:
--   select id, status_code, content from net._http_response order by id desc limit 5;
