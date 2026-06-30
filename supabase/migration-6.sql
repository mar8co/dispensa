-- ============================================================
--  Migration 6 — Dispensa familiare (multi-household) · FASE 1
--  Schema + colonne + backfill. NON cambia le RLS dei dati: l'app continua a
--  funzionare con le policy attuali (auth.uid() = user_id). Rischio zero,
--  reversibile, IDEMPOTENTE (puoi rieseguirla). Esegui nel SQL Editor.
--
--  Robusta alle tabelle mancanti: se `saved_recipes` non esiste (ricettario
--  ancora solo in locale) viene semplicemente saltata.
-- ============================================================

-- ---------- 1) Nuclei (household) e membri ----------
create table if not exists public.households (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null default 'La mia dispensa',
  created_by  uuid        default auth.uid()
                          references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid        not null references public.households (id) on delete cascade,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  role         text        not null default 'member',   -- 'owner' | 'member'
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index if not exists household_members_user_idx on public.household_members (user_id);

-- ---------- 2) Helper: sei membro di questo household? ----------
-- SECURITY DEFINER con search_path fissato: gira come owner e BYPASSA la RLS
-- di household_members, cosi' le policy che lo useranno non vanno in ricorsione.
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = auth.uid()
  );
$$;

-- ---------- 3) Colonna household_id sui dati condivisi ----------
-- pantry_items e shopping_items esistono di sicuro; saved_recipes solo se creata.
alter table public.pantry_items   add column if not exists household_id uuid references public.households (id) on delete cascade;
alter table public.shopping_items add column if not exists household_id uuid references public.households (id) on delete cascade;

create index if not exists pantry_items_household_idx   on public.pantry_items   (household_id);
create index if not exists shopping_items_household_idx on public.shopping_items (household_id);

do $$
begin
  if to_regclass('public.saved_recipes') is not null then
    execute 'alter table public.saved_recipes add column if not exists household_id uuid references public.households (id) on delete cascade';
    execute 'create index if not exists saved_recipes_household_idx on public.saved_recipes (household_id)';
  end if;
end $$;

-- ---------- 4) RLS sulle NUOVE tabelle (households / membri) ----------
alter table public.households        enable row level security;
alter table public.household_members enable row level security;

drop policy if exists "households_select_member" on public.households;
create policy "households_select_member" on public.households
  for select using (public.is_household_member(id));

drop policy if exists "households_insert_self" on public.households;
create policy "households_insert_self" on public.households
  for insert with check (auth.uid() = created_by);

drop policy if exists "households_update_member" on public.households;
create policy "households_update_member" on public.households
  for update using (public.is_household_member(id)) with check (public.is_household_member(id));

drop policy if exists "members_select_same" on public.household_members;
create policy "members_select_same" on public.household_members
  for select using (public.is_household_member(household_id));

drop policy if exists "members_insert_self" on public.household_members;
create policy "members_insert_self" on public.household_members
  for insert with check (user_id = auth.uid());

drop policy if exists "members_delete_self" on public.household_members;
create policy "members_delete_self" on public.household_members
  for delete using (user_id = auth.uid());

-- ---------- 5) Backfill: un household "personale" per ogni utente esistente ----------
-- Utenti presi da pantry_items + shopping_items; aggiorna household_id sulle
-- righe ancora senza nucleo. saved_recipes solo se la tabella esiste. Idempotente.
do $$
declare
  u   record;
  hid uuid;
begin
  for u in
    select distinct user_id from (
      select user_id from public.pantry_items
      union select user_id from public.shopping_items
    ) s where user_id is not null
  loop
    select h.id into hid
      from public.households h
      join public.household_members m on m.household_id = h.id
     where m.user_id = u.user_id and m.role = 'owner'
     order by h.created_at asc
     limit 1;

    if hid is null then
      insert into public.households (name, created_by)
      values ('La mia dispensa', u.user_id)
      returning id into hid;

      insert into public.household_members (household_id, user_id, role)
      values (hid, u.user_id, 'owner')
      on conflict do nothing;
    end if;

    update public.pantry_items   set household_id = hid where user_id = u.user_id and household_id is null;
    update public.shopping_items set household_id = hid where user_id = u.user_id and household_id is null;

    if to_regclass('public.saved_recipes') is not null then
      execute format('update public.saved_recipes set household_id = %L where user_id = %L and household_id is null', hid, u.user_id);
    end if;
  end loop;
end $$;

-- Verifica rapida:
--   select count(*) from public.households;                                   -- atteso: >= 1
--   select count(*) from public.pantry_items   where household_id is null;    -- atteso: 0
--   select count(*) from public.shopping_items where household_id is null;    -- atteso: 0
