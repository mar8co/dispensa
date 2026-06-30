-- ============================================================
--  Migration 6 — Dispensa familiare (multi-household) · FASE 1
--  Schema + colonne + backfill. NON cambia ancora le RLS dei dati:
--  l'app continua a funzionare con le policy attuali (auth.uid() = user_id),
--  quindi questa fase e' a rischio zero e reversibile.
--  Esegui nel SQL Editor di Supabase (una volta). Idempotente.
--
--  Fasi successive (in app + migration-7):
--   - l'app imposta household_id sugli insert e filtra per "household attivo"
--     (salvato in user_settings) — siamo multi-household;
--   - il Realtime passa al filtro household_id;
--   - SOLO ALLA FINE si cambiano le RLS dei dati a is_household_member()
--     (con test a due account) e household_id diventa NOT NULL.
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
-- Nullable per ora: il backfill la riempie; diventera' NOT NULL solo quando
-- l'app la imposta su tutti gli insert (fase successiva).
alter table public.pantry_items   add column if not exists household_id uuid references public.households (id) on delete cascade;
alter table public.shopping_items add column if not exists household_id uuid references public.households (id) on delete cascade;
alter table public.saved_recipes  add column if not exists household_id uuid references public.households (id) on delete cascade;

create index if not exists pantry_items_household_idx   on public.pantry_items   (household_id);
create index if not exists shopping_items_household_idx on public.shopping_items (household_id);
create index if not exists saved_recipes_household_idx  on public.saved_recipes  (household_id);

-- ---------- 4) RLS sulle NUOVE tabelle (households / membri) ----------
alter table public.households        enable row level security;
alter table public.household_members enable row level security;

-- households: vedi/aggiorni solo i nuclei di cui sei membro; crei solo a tuo nome.
drop policy if exists "households_select_member" on public.households;
create policy "households_select_member" on public.households
  for select using (public.is_household_member(id));

drop policy if exists "households_insert_self" on public.households;
create policy "households_insert_self" on public.households
  for insert with check (auth.uid() = created_by);

drop policy if exists "households_update_member" on public.households;
create policy "households_update_member" on public.households
  for update using (public.is_household_member(id)) with check (public.is_household_member(id));

-- household_members: vedi i membri dei tuoi nuclei; aggiungi/togli SOLO te stesso
-- (l'accettazione di un invito inserisce la TUA riga).
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
-- Crea un nucleo per ogni utente che ha gia' dati, lo rende owner, e assegna
-- household_id a tutte le sue righe ancora senza nucleo. Idempotente.
do $$
declare
  u   record;
  hid uuid;
begin
  for u in
    select distinct user_id from (
      select user_id from public.pantry_items
      union select user_id from public.shopping_items
      union select user_id from public.saved_recipes
    ) s where user_id is not null
  loop
    -- household personale gia' creato da un run precedente?
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
    update public.saved_recipes  set household_id = hid where user_id = u.user_id and household_id is null;
  end loop;
end $$;

-- Verifica rapida (esegui a parte se vuoi):
--   select count(*) from public.households;
--   select count(*) from public.pantry_items where household_id is null;  -- atteso: 0
