-- ============================================================
--  Migration 12 — Notifiche push anche su app nativa iOS (APNs) · FASE 3
--  Additiva e RETROCOMPATIBILE: la stessa tabella `push_subscriptions`
--  ospita sia le iscrizioni Web Push (PWA) sia i token APNs (app iOS).
--  Le righe esistenti restano valide e continuano a funzionare.
--  Idempotente (puoi rieseguirla). Esegui nel SQL Editor.
-- ============================================================

-- Come distinguere le due sponde: 'web' = Web Push (endpoint + chiavi VAPID),
-- 'ios' = APNs (device token). Il default 'web' rende valide le righe già
-- presenti senza doverle toccare.
alter table public.push_subscriptions
  add column if not exists platform text not null default 'web';

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_platform_check;
alter table public.push_subscriptions
  add constraint push_subscriptions_platform_check
  check (platform in ('web', 'ios'));

-- Token APNs (solo per platform='ios').
alter table public.push_subscriptions
  add column if not exists apns_token text;

-- Le colonne Web Push diventano opzionali: una riga iOS non ha né chiavi né
-- endpoint. La coerenza è garantita dal vincolo qui sotto.
alter table public.push_subscriptions alter column p256dh drop not null;
alter table public.push_subscriptions alter column auth   drop not null;
alter table public.push_subscriptions alter column endpoint drop not null;

-- Ogni riga deve essere completa per la sua piattaforma: o è una web push con
-- endpoint+chiavi, o è un token APNs. Niente vie di mezzo.
alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_shape_check;
alter table public.push_subscriptions
  add constraint push_subscriptions_shape_check check (
    (platform = 'web' and endpoint is not null and p256dh is not null and auth is not null)
    or
    (platform = 'ios' and apns_token is not null)
  );

-- Un token APNs identifica un dispositivo: unico come lo è `endpoint` per il
-- web. Indice parziale perché apns_token è NULL su tutte le righe web.
create unique index if not exists push_subscriptions_apns_token_uniq
  on public.push_subscriptions (apns_token)
  where apns_token is not null;

-- ---------- Upsert del MIO token APNs ----------
-- Gemella di save_push_subscription (migration-10), stessa logica: SECURITY
-- DEFINER perché un re-register dello stesso token (o su un altro account
-- dello stesso telefono) collide sull'indice unico e va riassegnato
-- all'utente corrente.
create or replace function public.save_apns_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.push_subscriptions (user_id, platform, apns_token)
  values (auth.uid(), 'ios', p_token)
  on conflict (apns_token) where apns_token is not null
  do update set user_id = auth.uid();
end;
$$;

-- Verifica rapida:
--   select platform, count(*) from public.push_subscriptions group by platform;
--   -- le righe già esistenti devono risultare tutte 'web'.
