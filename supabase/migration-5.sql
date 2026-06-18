-- ============================================================================
--  Dispensa — Migrazione 5: rate-limit AI per utente/giorno
--  Eseguire nel SQL Editor di Supabase (idempotente).
--  Usata dal proxy server/claude.js (solo con service role) per limitare gli
--  abusi della quota AI. Se non viene eseguita, il proxy semplicemente NON
--  applica il limite (best-effort) e tutto continua a funzionare.
-- ============================================================================

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  count int not null default 0,
  primary key (user_id, day)
);

-- Nessuna policy: la tabella è scritta SOLO dal service role (che bypassa la
-- RLS). Gli utenti non devono leggerla né scriverla direttamente.
alter table public.ai_usage enable row level security;

-- Incrementa (in modo atomico) il contatore odierno dell'utente e restituisce
-- il nuovo valore. Chiamata dal proxy via service role passando p_uid.
create or replace function public.bump_ai_usage(p_uid uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  c int;
begin
  insert into public.ai_usage (user_id, day, count)
       values (p_uid, current_date, 1)
  on conflict (user_id, day)
       do update set count = public.ai_usage.count + 1
    returning count into c;
  return c;
end;
$$;
