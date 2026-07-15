-- ============================================================
--  Migration 11 — Piano pasti settimanale (FASE 2)
--  Additiva: nuova tabella `meal_plan` (un piatto per nucleo+giorno+slot),
--  RLS identica ai dati condivisi, Realtime per il sync multi-dispositivo.
--  NON tocca le tabelle esistenti. Idempotente (puoi rieseguirla).
--  Esegui nel SQL Editor.
-- ============================================================

create table if not exists public.meal_plan (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,
  user_id      uuid not null default auth.uid()
               references auth.users(id) on delete cascade, -- audit: chi ha pianificato
  date         date not null,
  slot         text not null check (slot in ('pranzo','cena')),
  title        text not null,      -- denormalizzato per la lista (mostrato senza aprire data)
  data         jsonb,              -- ricetta completa (formato saved_recipes.data);
                                   -- NULL = "piatto libero" (es. "Pizza fuori", "Avanzi")
  cooked_at    timestamptz,        -- quando segnato "cucinato" dal piano
  created_at   timestamptz not null default now()
);

-- Un solo piatto per (nucleo, giorno, slot). Le righe senza nucleo (ripiego
-- personale) sono uniche per utente: coalesce copre entrambi i casi.
create unique index if not exists meal_plan_slot_uniq
  on public.meal_plan (coalesce(household_id, user_id), date, slot);

-- Ricerche tipiche: la settimana del nucleo attivo.
create index if not exists meal_plan_household_date_idx
  on public.meal_plan (household_id, date);

alter table public.meal_plan enable row level security;

-- RLS: stesso schema di pantry_items/shopping_items (migration-8) — accesso ai
-- membri del nucleo, con ripiego difensivo per le righe senza household_id.
drop policy if exists meal_select on public.meal_plan;
create policy meal_select on public.meal_plan for select using (
  is_household_member(household_id)
  or (household_id is null and auth.uid() = user_id)
);
drop policy if exists meal_insert on public.meal_plan;
create policy meal_insert on public.meal_plan for insert with check (
  is_household_member(household_id)
  or (household_id is null and auth.uid() = user_id)
);
drop policy if exists meal_update on public.meal_plan;
create policy meal_update on public.meal_plan for update using (
  is_household_member(household_id)
  or (household_id is null and auth.uid() = user_id)
);
drop policy if exists meal_delete on public.meal_plan;
create policy meal_delete on public.meal_plan for delete using (
  is_household_member(household_id)
  or (household_id is null and auth.uid() = user_id)
);

-- Realtime (come migration-3 per pantry/shopping): righe complete negli eventi
-- e tabella nella publication. Il DO gestisce l'idempotenza dell'ADD TABLE.
alter table public.meal_plan replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.meal_plan;
exception when duplicate_object then
  null; -- già aggiunta: ok
end;
$$;

-- Verifica rapida:
--   select * from public.meal_plan order by date, slot;
--   -- inserimento di prova (poi cancellalo):
--   insert into public.meal_plan (date, slot, title) values (current_date, 'cena', 'Prova');
