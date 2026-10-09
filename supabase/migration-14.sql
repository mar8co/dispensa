-- ============================================================
--  Migration 14 — Invitare nella dispensa condivisa torna GRATUITO
--  Idempotente (puoi rieseguirla). Esegui nel SQL Editor di Supabase.
--
--  Decisione dell'utente (2026-10-09): condividere la dispensa è il modo
--  naturale in cui l'app si diffonde, quindi non sta più dietro il Premium.
--  Si toglie SOLO la condizione `is_pro()` che la migration-13 aveva aggiunto
--  alla creazione degli inviti: la policy torna quella della migration-7
--  (basta essere membri del nucleo). Tutto il resto della migration-13
--  (tabella entitlements, funzione is_pro, Premium per nucleo) resta com'è.
--
--  Finché questo file non viene eseguito, nel piano gratuito il pulsante
--  "Invita" continua a rispondere "Non sono riuscito a creare l'invito".
-- ============================================================

drop policy if exists "invites_insert_member" on public.household_invites;
create policy "invites_insert_member" on public.household_invites
  for insert with check (public.is_household_member(household_id));

-- Verifica rapida (deve mostrare la policy SENZA is_pro):
--   select policyname, with_check from pg_policies
--    where tablename = 'household_invites' and policyname = 'invites_insert_member';
