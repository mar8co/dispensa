-- ============================================================
--  La Mia Dispensa — Migrazione 4: ricettario (salvate + cucinate)
--  Esegui nel SQL Editor di Supabase (una volta).
-- ============================================================

create table if not exists public.saved_recipes (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null default auth.uid()
                              references auth.users (id) on delete cascade,
  title           text        not null,
  data            jsonb       not null,            -- la ricetta completa
  image           text,                            -- url foto (Pexels)
  saved           boolean     not null default true,  -- ❤️ preferita
  cooked_count    int         not null default 0,     -- quante volte cucinata
  last_cooked_at  timestamptz,
  created_at      timestamptz not null default now()
);

-- Una riga per (utente, titolo): consente l'upsert da app.
create unique index if not exists saved_recipes_user_title_idx
  on public.saved_recipes (user_id, title);

alter table public.saved_recipes enable row level security;

drop policy if exists "recipes_select_own" on public.saved_recipes;
create policy "recipes_select_own" on public.saved_recipes
  for select using (auth.uid() = user_id);

drop policy if exists "recipes_insert_own" on public.saved_recipes;
create policy "recipes_insert_own" on public.saved_recipes
  for insert with check (auth.uid() = user_id);

drop policy if exists "recipes_update_own" on public.saved_recipes;
create policy "recipes_update_own" on public.saved_recipes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "recipes_delete_own" on public.saved_recipes;
create policy "recipes_delete_own" on public.saved_recipes
  for delete using (auth.uid() = user_id);
