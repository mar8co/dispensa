-- ============================================================
--  La Mia Dispensa — schema database (Supabase / Postgres)
--  Esegui questo script nel SQL Editor di Supabase (una volta).
-- ============================================================

-- ---------- Tabella prodotti della dispensa ----------
create table if not exists public.pantry_items (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null default auth.uid()
                          references auth.users (id) on delete cascade,
  name        text        not null,
  qty         text        not null default '1',
  category    text        not null default 'Altro',
  created_at  timestamptz not null default now()
);

create index if not exists pantry_items_user_id_idx on public.pantry_items (user_id);

alter table public.pantry_items enable row level security;

-- Ogni utente vede e modifica SOLO le proprie righe.
drop policy if exists "pantry_select_own" on public.pantry_items;
create policy "pantry_select_own" on public.pantry_items
  for select using (auth.uid() = user_id);

drop policy if exists "pantry_insert_own" on public.pantry_items;
create policy "pantry_insert_own" on public.pantry_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "pantry_update_own" on public.pantry_items;
create policy "pantry_update_own" on public.pantry_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "pantry_delete_own" on public.pantry_items;
create policy "pantry_delete_own" on public.pantry_items
  for delete using (auth.uid() = user_id);


-- ---------- Tabella impostazioni utente (jsonb sincronizzato) ----------
-- Contiene: ordine categorie, ordine occasioni, stato collassato.
create table if not exists public.user_settings (
  user_id     uuid        primary key default auth.uid()
                          references auth.users (id) on delete cascade,
  settings    jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "settings_select_own" on public.user_settings;
create policy "settings_select_own" on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "settings_insert_own" on public.user_settings;
create policy "settings_insert_own" on public.user_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "settings_update_own" on public.user_settings;
create policy "settings_update_own" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
