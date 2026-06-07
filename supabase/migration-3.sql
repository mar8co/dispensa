-- ============================================================
--  La Mia Dispensa — Migrazione 3: abilita il Realtime
--  Esegui nel SQL Editor di Supabase (una volta).
-- ============================================================

-- REPLICA IDENTITY FULL: serve perché negli eventi DELETE/UPDATE arrivi la
-- riga "vecchia" completa (incluso user_id), così funzionano filtro e RLS.
alter table public.pantry_items   replica identity full;
alter table public.shopping_items replica identity full;

-- Aggiunge le tabelle alla publication usata dal Realtime di Supabase.
-- I blocchi DO rendono lo script ripetibile senza errori se già presenti.
do $$ begin
  alter publication supabase_realtime add table public.pantry_items;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.shopping_items;
exception when duplicate_object then null; end $$;
