-- ============================================================
--  Migration 9 — Username membri + espulsione (owner) · FASE 5
--  Additiva: nuova colonna `username` + funzioni SECURITY DEFINER.
--  NON cambia le RLS dei dati: l'app continua a funzionare. Idempotente
--  (puoi rieseguirla). Esegui nel SQL Editor.
-- ============================================================

-- ---------- Username denormalizzato sui membri ----------
alter table public.household_members add column if not exists username text;

-- ---------- Imposta il MIO nome (username) su tutte le mie membership ----------
-- SECURITY DEFINER: non c'e' una policy UPDATE su household_members, quindi
-- l'update deve passare da qui (gira come owner). Aggiorna tutte le righe
-- dell'utente, cosi' il nome lo segue in ogni nucleo a cui appartiene.
create or replace function public.set_username(new_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean text := nullif(btrim(new_username), '');
begin
  update public.household_members
     set username = clean
   where user_id = auth.uid();
end;
$$;

-- ---------- Il creatore fa uscire un membro dal nucleo ----------
-- SECURITY DEFINER: la policy members_delete_self permette solo di togliere
-- se' stessi. Qui l'owner puo' rimuovere ALTRI membri (mai se' stesso: per
-- quello c'e' "Esci"; mai un altro owner, difensivo). Ritorna true se ha
-- rimosso qualcuno.
create or replace function public.remove_member(p_household_id uuid, p_target uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  is_owner boolean;
begin
  select exists (
    select 1 from public.household_members
     where household_id = p_household_id
       and user_id = auth.uid()
       and role = 'owner'
  ) into is_owner;

  if not is_owner then
    raise exception 'Solo il creatore puo'' rimuovere i membri.';
  end if;
  if p_target = auth.uid() then
    raise exception 'Il creatore non puo'' rimuovere se stesso.';
  end if;

  delete from public.household_members
   where household_id = p_household_id
     and user_id = p_target
     and role <> 'owner';

  return found;
end;
$$;

-- ---------- accept_invite: porta con se' lo username gia' scelto ----------
-- Quando entri in un nuovo nucleo, la nuova riga eredita il nome che hai gia'
-- impostato altrove (se presente). Sostituisce la versione della migration 7.
create or replace function public.accept_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  em  text;
  un  text;
begin
  select household_id into hid
    from public.household_invites
   where code = invite_code and expires_at > now();
  if hid is null then
    return null;
  end if;
  select email into em from auth.users where id = auth.uid();
  select username into un
    from public.household_members
   where user_id = auth.uid() and username is not null
   limit 1;
  insert into public.household_members (household_id, user_id, role, email, username)
  values (hid, auth.uid(), 'member', em, un)
  on conflict (household_id, user_id) do nothing;
  return hid;
end;
$$;

-- Verifica rapida:
--   select username from public.household_members where user_id = auth.uid();
--   -- imposta un nome di prova:  select public.set_username('Marco');
