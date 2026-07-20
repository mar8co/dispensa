-- ============================================================
--  Migration 13 — Abbonamento Premium: entitlements · FASE 3
--  Additiva. Introduce lo stato "Premium" e lo applica dove conta davvero
--  (creazione inviti), lasciando intatto tutto il resto.
--  Idempotente (puoi rieseguirla). Esegui nel SQL Editor.
--
--  Decisioni prese con l'utente (2026-07-20):
--   - Premium = Piano Alimentare + niente pubblicità + AI illimitata +
--     possibilità di INVITARE altri nella dispensa condivisa.
--   - Il Premium vale per NUCLEO: se un membro paga, ne beneficiano tutti.
--   - Il piano gratuito non perde nulla di ciò che ha già: si blocca solo
--     l'aggiunta di NUOVI membri. Un abbonamento scaduto non toglie mai
--     l'accesso ai dati altrui.
-- ============================================================

-- ---------- Stato dell'abbonamento ----------
-- SICUREZZA: questa tabella è la fonte di verità del Premium, quindi il
-- client NON deve poterla scrivere (altrimenti chiunque si regalerebbe
-- l'abbonamento da DevTools). Sotto c'è la sola policy di SELECT: gli
-- INSERT/UPDATE arrivano esclusivamente dal server col service role, dopo
-- aver verificato la ricevuta con Apple.
create table if not exists public.entitlements (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  source                  text not null default 'apple'
                          check (source in ('apple', 'comp')),   -- 'comp' = omaggio
  product_id              text,                                   -- es. dispensa.pro.yearly
  status                  text not null default 'none'
                          check (status in ('none','active','grace','expired','refunded')),
  expires_at              timestamptz,                            -- NULL = senza scadenza
  original_transaction_id text unique,                            -- lega rinnovi e rimborsi (Apple)
  updated_at              timestamptz not null default now()
);

alter table public.entitlements enable row level security;

drop policy if exists ent_select_own on public.entitlements;
create policy ent_select_own on public.entitlements
  for select using (auth.uid() = user_id);
-- NESSUNA policy di INSERT/UPDATE/DELETE: è voluto.

-- ---------- "Sei Premium?" ----------
-- Un solo punto di verità, usabile sia dal client sia dalle policy RLS.
-- `grace` = rinnovo fallito ma Apple sta ancora riprovando: non si spegne il
-- Premium a chi ha solo la carta scaduta.
-- Il Premium è di NUCLEO: vale se sei abbonato tu OPPURE se lo è qualcuno
-- dei nuclei a cui appartieni.
create or replace function public.is_pro(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.entitlements e
    where e.status in ('active', 'grace')
      and (e.expires_at is null or e.expires_at > now())
      and (
        e.user_id = uid
        or e.user_id in (
          select m2.user_id
            from public.household_members m1
            join public.household_members m2 on m2.household_id = m1.household_id
           where m1.user_id = uid
        )
      )
  );
$$;

-- ---------- Il blocco: invitare richiede il Premium ----------
-- Sostituisce la policy della migration-7 aggiungendo la condizione Premium.
-- Si blocca SOLO la creazione di nuovi inviti: leggere ed eliminare gli
-- inviti esistenti resta possibile a tutti i membri, e nessuno perde accesso
-- ai dati condivisi se l'abbonamento scade.
drop policy if exists "invites_insert_member" on public.household_invites;
create policy "invites_insert_member" on public.household_invites
  for insert with check (
    public.is_household_member(household_id) and public.is_pro()
  );

-- ---------- Utenti già esistenti: Premium omaggio a vita ----------
-- Chi usa Dispensa PRIMA dell'introduzione del Premium non deve perdere
-- niente da un giorno all'altro (oggi: l'autore e la sua famiglia, che usano
-- già la dispensa condivisa). Vale una volta sola: i nuovi iscritti non
-- entrano qui.
insert into public.entitlements (user_id, source, status, expires_at)
select id, 'comp', 'active', null
  from auth.users
on conflict (user_id) do nothing;

-- Verifica rapida:
--   select count(*) from public.entitlements where source = 'comp';
--   select public.is_pro();   -- deve tornare true per te
--
-- Per regalare il Premium a qualcuno in futuro (nuovo tester, familiare):
--   insert into public.entitlements (user_id, source, status, expires_at)
--   values ('<uuid-utente>', 'comp', 'active', null)
--   on conflict (user_id) do update
--     set source='comp', status='active', expires_at=null, updated_at=now();
