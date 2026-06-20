-- BauBook beta maintenance - pulizia totale Safety/Aiuto.
-- Da eseguire nel Supabase SQL Editor quando vuoi azzerare tutte le segnalazioni di test.
-- Non e una migration di prodotto: non committarla come migration.

begin;

-- Segnalazioni abuso collegate agli alert safety.
delete from public.reports
where target_type in ('lost_dog_alert', 'danger_report');

-- Eventuali tabelle avvistamenti create in varianti locali: cancella solo se esistono.
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

-- Audit safety opzionale: pulisce la cronologia dei test, non tocca altri audit.
delete from public.audit_logs
where target_type in ('lost_dog_alert', 'danger_report')
   or action in (
    'lost_dog_alert_created',
    'lost_dog_alert_closed',
    'danger_report_created',
    'danger_report_closed',
    'safety_content_reported'
   );

-- Alert veri e propri.
delete from public.danger_reports;
delete from public.lost_dog_alerts;

commit;

-- Verifica attesa: tutti 0.
select 'danger_reports' as table_name, count(*) as rows_left from public.danger_reports
union all
select 'lost_dog_alerts' as table_name, count(*) as rows_left from public.lost_dog_alerts
union all
select 'reports_safety' as table_name, count(*) as rows_left
from public.reports
where target_type in ('lost_dog_alert', 'danger_report');
