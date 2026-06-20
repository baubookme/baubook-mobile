-- BauBook 0.6.1 - account deletion requests grants/RLS + inactive profile state.
-- Migration di prodotto.
--
-- Obiettivi:
-- 1) consentire all'utente authenticated di creare e leggere la propria richiesta cancellazione;
-- 2) impedire doppie richieste pending per lo stesso user/profile;
-- 3) predisporre lo stato account inattivo su public.profiles per la gestione operativa.

begin;

-- Stato applicativo profilo: non cancella Auth, serve come stato prodotto/admin.
alter table public.profiles
  add column if not exists account_status text not null default 'active';

alter table public.profiles
  add column if not exists account_deactivated_at timestamptz;

alter table public.profiles
  add column if not exists account_deactivation_reason text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_account_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_account_status_check
      check (account_status in ('active', 'inactive'));
  end if;
end $$;

-- Colonne minime attese sulla tabella richieste.
alter table public.account_deletion_requests
  add column if not exists user_id uuid;

alter table public.account_deletion_requests
  add column if not exists profile_id uuid;

alter table public.account_deletion_requests
  add column if not exists email text;

alter table public.account_deletion_requests
  add column if not exists reason text;

alter table public.account_deletion_requests
  add column if not exists status text not null default 'pending';

alter table public.account_deletion_requests
  add column if not exists requested_at timestamptz not null default now();

alter table public.account_deletion_requests
  add column if not exists processed_at timestamptz;

alter table public.account_deletion_requests
  add column if not exists processed_by text;

alter table public.account_deletion_requests
  add column if not exists admin_notes text;

alter table public.account_deletion_requests
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'account_deletion_requests_status_check'
      and conrelid = 'public.account_deletion_requests'::regclass
  ) then
    alter table public.account_deletion_requests
      add constraint account_deletion_requests_status_check
      check (status in ('pending', 'approved', 'rejected', 'cancelled'));
  end if;
end $$;

-- Permessi SQL per client autenticato.
grant usage on schema public to authenticated;
grant select, insert on table public.account_deletion_requests to authenticated;

-- Se la tabella usa sequence/identity in qualche ambiente.
grant usage, select on all sequences in schema public to authenticated;

-- RLS: l'utente puo vedere e creare solo le proprie richieste.
alter table public.account_deletion_requests enable row level security;

drop policy if exists "account_deletion_requests_select_own" on public.account_deletion_requests;
drop policy if exists "account_deletion_requests_insert_own" on public.account_deletion_requests;

create policy "account_deletion_requests_select_own"
on public.account_deletion_requests
for select
to authenticated
using (
  user_id = auth.uid()
  or profile_id in (
    select p.id
    from public.profiles p
    where p.user_id = auth.uid()
  )
);

create policy "account_deletion_requests_insert_own"
on public.account_deletion_requests
for insert
to authenticated
with check (
  user_id = auth.uid()
  or profile_id in (
    select p.id
    from public.profiles p
    where p.user_id = auth.uid()
  )
);

-- Un solo pending alla volta per utente/profilo.
create unique index if not exists account_deletion_requests_one_pending_user_idx
on public.account_deletion_requests (user_id)
where status = 'pending' and user_id is not null;

create unique index if not exists account_deletion_requests_one_pending_profile_idx
on public.account_deletion_requests (profile_id)
where status = 'pending' and profile_id is not null;

commit;
