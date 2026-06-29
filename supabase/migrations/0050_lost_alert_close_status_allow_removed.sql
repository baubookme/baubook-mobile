-- 0050_lost_alert_close_status_allow_removed.sql
-- Allow moderation-hidden lost dog alerts to have closed_at populated.

alter type public.alert_status add value if not exists 'removed';

alter table public.lost_dog_alerts
  drop constraint if exists lost_alert_close_status;

alter table public.lost_dog_alerts
  add constraint lost_alert_close_status
  check (
    closed_at is null
    or status::text in ('resolved', 'expired', 'abuse_locked', 'removed')
  );

notify pgrst, 'reload schema';

select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.lost_dog_alerts'::regclass
  and conname = 'lost_alert_close_status';
