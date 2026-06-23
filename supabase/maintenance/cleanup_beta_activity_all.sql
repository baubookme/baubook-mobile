-- BauBook beta maintenance - pulizia totale attività test.
-- Da eseguire nel Supabase SQL Editor quando vuoi azzerare:
-- - passeggiate
-- - presenze live
-- - alert smarrimento
-- - segnalazioni pericolo
-- - report abuso collegati
--
-- NON e una migration di prodotto.
-- NON committare in supabase/migrations.
-- Suggerimento repo: salvarlo eventualmente in supabase/maintenance/cleanup_beta_activity_all.sql.

begin;

-- ============================================================
-- 1) Report abuso collegati agli alert Safety/Aiuto.
-- ============================================================
delete from public.reports
where target_type in ('lost_dog_alert', 'danger_report');

-- ============================================================
-- 2) Eventuali tabelle avvistamenti create in varianti locali.
--    Cancella solo se esistono.
-- ============================================================
do $$
begin
  if to_regclass('public.lost_dog_sightings') is not null then
    execute 'delete from public.lost_dog_sightings';
  end if;

  if to_regclass('public.lost_dog_alert_sightings') is not null then
    execute 'delete from public.lost_dog_alert_sightings';
  end if;

  if to_regclass('public.safety_sightings') is not null then
    execute 'delete from public.safety_sightings';
  end if;

  if to_regclass('public.alert_sightings') is not null then
    execute 'delete from public.alert_sightings';
  end if;
end $$;

-- ============================================================
-- 3) Eventuali tabelle collegate a passeggiate/presenze.
--    Manteniamo il blocco difensivo per non fallire se una tabella
--    non esiste nella beta corrente.
-- ============================================================
do $$
begin
  if to_regclass('public.walk_plan_interests') is not null then
    execute 'delete from public.walk_plan_interests';
  end if;

  if to_regclass('public.walk_interests') is not null then
    execute 'delete from public.walk_interests';
  end if;

  if to_regclass('public.walk_participants') is not null then
    execute 'delete from public.walk_participants';
  end if;

  if to_regclass('public.walk_join_requests') is not null then
    execute 'delete from public.walk_join_requests';
  end if;

  if to_regclass('public.presence_participants') is not null then
    execute 'delete from public.presence_participants';
  end if;

  if to_regclass('public.presence_session_participants') is not null then
    execute 'delete from public.presence_session_participants';
  end if;
end $$;

-- ============================================================
-- 4) Audit collegati ai test Safety/Passeggiate/Presenze.
--    Non tocca audit generici di profilo/cane/auth.
-- ============================================================
delete from public.audit_logs
where target_type in (
    'lost_dog_alert',
    'danger_report',
    'walk_plan',
    'presence_session'
  )
  or action in (
    'lost_dog_alert_created',
    'lost_dog_alert_closed',
    'danger_report_created',
    'danger_report_closed',
    'safety_content_reported',
    'walk_plan_created',
    'walk_plan_closed',
    'walk_plan_deactivated',
    'presence_session_created',
    'presence_session_closed',
    'presence_session_deactivated'
  );

-- ============================================================
-- 5) Tabelle principali da azzerare.
-- ============================================================
delete from public.lost_dog_sightings;
delete from public.danger_reports;
delete from public.lost_dog_alerts;
delete from public.contact_requests;
delete from public.walk_plans;
delete from public.presence_sessions;
delete from public.account_deletion_requests;
commit;

-- ============================================================
-- Verifica attesa: tutti 0.
-- ============================================================
select 'danger_reports' as table_name, count(*) as rows_left
from public.danger_reports
union all
select 'lost_dog_alerts' as table_name, count(*) as rows_left
from public.lost_dog_alerts
union all
select 'reports_safety' as table_name, count(*) as rows_left
from public.reports
where target_type in ('lost_dog_alert', 'danger_report')
union all
select 'walk_plans' as table_name, count(*) as rows_left
from public.walk_plans
union all
select 'presence_sessions' as table_name, count(*) as rows_left
from public.presence_sessions;


--utenti
begin;

-- Cancella dati applicativi utente.
-- CASCADE dovrebbe pulire dogs, friends, diary, walks, presenze e dati legati ai profili.
truncate table public.profiles cascade;

-- Cancella utenti Supabase Auth.
delete from auth.users;

commit;

begin;

-- Dati di supporto/contatto beta, se vuoi ripartire davvero pulito.
truncate table public.contact_requests restart identity cascade;
truncate table public.account_deletion_requests restart identity cascade;

-- Dati applicativi utente.
-- Il cascade dovrebbe pulire cani, diary, walks, presenze, amici, ecc.
truncate table public.profiles restart identity cascade;

-- Utenti Supabase Auth.
delete from auth.users;

commit;
