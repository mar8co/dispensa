-- ============================================================
--  migration-15 — Notifica "a pranzo c'è…" (Calendario Alimentare)
--
--  Aggiunge UN orario al cron delle notifiche (migration-10): le 11:00 ora di
--  Roma, circa due ore prima di pranzo. Il server (server/push.js, slot
--  "mattina") manda la notifica SOLO a chi ha un pranzo nel calendario di
--  oggi; per gli altri non parte nulla.
--
--  Come per gli altri orari, si schedulano le DUE varianti UTC (ora legale e
--  ora solare): il server tiene buona solo quella che cade alle 11:00 di Roma.
--    Roma 11:00  ->  09:00 UTC (CEST)  |  10:00 UTC (CET)
--
--  Non tocca tabelle né policy. Idempotente (puoi rieseguirla).
--  Richiede la migration-10 (funzione public.dispensa_push_ping).
--  Esegui nel SQL Editor di Supabase.
-- ============================================================

do $$
declare
  j text;
begin
  foreach j in array array['dispensa-push-0900', 'dispensa-push-1000'] loop
    perform cron.unschedule(j) where exists (select 1 from cron.job where jobname = j);
  end loop;
end $$;

select cron.schedule('dispensa-push-0900', '0 9 * * *',  $$ select public.dispensa_push_ping(); $$);
select cron.schedule('dispensa-push-1000', '0 10 * * *', $$ select public.dispensa_push_ping(); $$);

-- Verifica rapida (devono comparire 8 righe, tutte attive):
--   select jobname, schedule, active from cron.job where jobname like 'dispensa-push-%';
