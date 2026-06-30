-- ============================================================
--  Migration 7 — Inviti household + email membri · FASE 4
--  Additiva (nuova tabella + colonna + funzione). NON cambia le RLS dei dati:
--  l'app continua a funzionare. Esegui nel SQL Editor. Idempotente.
-- ============================================================

-- ---------- Email denormalizzata sui membri (per mostrare chi e' nel nucleo) ----------
alter table public.household_members add column if not exists email text;

-- backfill email dai membri gia' esistenti
update public.household_members m
   set email = u.email
  from auth.users u
 where u.id = m.user_id and m.email is null;

-- ---------- Inviti ----------
create table if not exists public.household_invites (
  code         text        primary key,
  household_id uuid        not null references public.households (id) on delete cascade,
  created_by   uuid        default auth.uid() references auth.users (id) on delete set null,
  expires_at   timestamptz not null default (now() + interval '7 days'),
  created_at   timestamptz not null default now()
);

create index if not exists household_invites_household_idx on public.household_invites (household_id);

alter table public.household_invites enable row level security;

-- I membri del nucleo creano/vedono/cancellano gli inviti del proprio nucleo.
drop policy if exists "invites_select_member" on public.household_invites;
create policy "invites_select_member" on public.household_invites
  for select using (public.is_household_member(household_id));

drop policy if exists "invites_insert_member" on public.household_invites;
create policy "invites_insert_member" on public.household_invites
  for insert with check (public.is_household_member(household_id));

drop policy if exists "invites_delete_member" on public.household_invites;
create policy "invites_delete_member" on public.household_invites
  for delete using (public.is_household_member(household_id));

-- ---------- Accetta invito ----------
-- SECURITY DEFINER: l'invitato NON e' ancora membro, quindi non potrebbe
-- leggere l'invito via RLS. La funzione (gira come owner) valida il codice e lo
-- aggiunge ai membri. Ritorna l'id del nucleo, o NULL se il codice non e' valido.
create or replace function public.accept_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  em  text;
begin
  select household_id into hid
    from public.household_invites
   where code = invite_code and expires_at > now();
  if hid is null then
    return null;
  end if;
  select email into em from auth.users where id = auth.uid();
  insert into public.household_members (household_id, user_id, role, email)
  values (hid, auth.uid(), 'member', em)
  on conflict (household_id, user_id) do nothing;
  return hid;
end;
$$;
