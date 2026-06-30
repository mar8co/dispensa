-- ============================================================
--  Migration 8 — Switch RLS dei dati a household · FASE 5 (IL FLIP)
--  Da qui dispensa e spesa sono condivise per NUCLEO (household).
--  DIFENSIVO: le righe senza household_id restano visibili al proprietario
--  (auth.uid() = user_id), così nessun dato puo' sparire. La condivisione vale
--  per le righe taggate con household_id (tutte, dopo backfill + fase 2).
--  Esegui nel SQL Editor. In fondo c'è il ROLLBACK.
--
--  Verifica SUBITO dopo: apri l'app e controlla di vedere ancora TUTTA la tua
--  dispensa/spesa. Se manca qualcosa, esegui il blocco ROLLBACK e avvisami.
-- ============================================================

-- ---------- pantry_items ----------
do $$
declare p record;
begin
  for p in select policyname from pg_policies
            where schemaname = 'public' and tablename = 'pantry_items'
  loop execute format('drop policy if exists %I on public.pantry_items', p.policyname); end loop;
end $$;

create policy "pantry_select" on public.pantry_items for select
  using (public.is_household_member(household_id) or (household_id is null and auth.uid() = user_id));
create policy "pantry_insert" on public.pantry_items for insert
  with check (public.is_household_member(household_id) or (household_id is null and auth.uid() = user_id));
create policy "pantry_update" on public.pantry_items for update
  using (public.is_household_member(household_id) or (household_id is null and auth.uid() = user_id))
  with check (public.is_household_member(household_id) or (household_id is null and auth.uid() = user_id));
create policy "pantry_delete" on public.pantry_items for delete
  using (public.is_household_member(household_id) or (household_id is null and auth.uid() = user_id));

-- ---------- shopping_items ----------
do $$
declare p record;
begin
  for p in select policyname from pg_policies
            where schemaname = 'public' and tablename = 'shopping_items'
  loop execute format('drop policy if exists %I on public.shopping_items', p.policyname); end loop;
end $$;

create policy "shopping_select" on public.shopping_items for select
  using (public.is_household_member(household_id) or (household_id is null and auth.uid() = user_id));
create policy "shopping_insert" on public.shopping_items for insert
  with check (public.is_household_member(household_id) or (household_id is null and auth.uid() = user_id));
create policy "shopping_update" on public.shopping_items for update
  using (public.is_household_member(household_id) or (household_id is null and auth.uid() = user_id))
  with check (public.is_household_member(household_id) or (household_id is null and auth.uid() = user_id));
create policy "shopping_delete" on public.shopping_items for delete
  using (public.is_household_member(household_id) or (household_id is null and auth.uid() = user_id));

-- ---------- saved_recipes (solo se esiste) ----------
do $$
declare p record;
begin
  if to_regclass('public.saved_recipes') is null then return; end if;
  for p in select policyname from pg_policies
            where schemaname = 'public' and tablename = 'saved_recipes'
  loop execute format('drop policy if exists %I on public.saved_recipes', p.policyname); end loop;
  execute 'create policy "recipes_select" on public.saved_recipes for select using (public.is_household_member(household_id) or (household_id is null and auth.uid() = user_id))';
  execute 'create policy "recipes_insert" on public.saved_recipes for insert with check (public.is_household_member(household_id) or (household_id is null and auth.uid() = user_id))';
  execute 'create policy "recipes_update" on public.saved_recipes for update using (public.is_household_member(household_id) or (household_id is null and auth.uid() = user_id)) with check (public.is_household_member(household_id) or (household_id is null and auth.uid() = user_id))';
  execute 'create policy "recipes_delete" on public.saved_recipes for delete using (public.is_household_member(household_id) or (household_id is null and auth.uid() = user_id))';
end $$;

-- ============================================================
--  ROLLBACK (eseguire SOLO se qualcosa va storto: ripristina la RLS per-utente)
-- ============================================================
-- do $$
-- declare p record;
-- begin
--   for p in select policyname from pg_policies where schemaname='public' and tablename='pantry_items'
--   loop execute format('drop policy if exists %I on public.pantry_items', p.policyname); end loop;
--   for p in select policyname from pg_policies where schemaname='public' and tablename='shopping_items'
--   loop execute format('drop policy if exists %I on public.shopping_items', p.policyname); end loop;
-- end $$;
-- create policy "pantry_select_own"   on public.pantry_items   for select using (auth.uid() = user_id);
-- create policy "pantry_insert_own"   on public.pantry_items   for insert with check (auth.uid() = user_id);
-- create policy "pantry_update_own"   on public.pantry_items   for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- create policy "pantry_delete_own"   on public.pantry_items   for delete using (auth.uid() = user_id);
-- create policy "shopping_select_own" on public.shopping_items for select using (auth.uid() = user_id);
-- create policy "shopping_insert_own" on public.shopping_items for insert with check (auth.uid() = user_id);
-- create policy "shopping_update_own" on public.shopping_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- create policy "shopping_delete_own" on public.shopping_items for delete using (auth.uid() = user_id);
