-- BauBook 0.7.0 - One pending account deletion request per user.
-- Cleanup beta duplicates, then enforce a single pending request per auth user.

with ranked_pending_requests as (
  select
    id,
    row_number() over (
      partition by user_id
      order by requested_at asc nulls last, id asc
    ) as rn
  from public.account_deletion_requests
  where user_id is not null
    and status = 'pending'
)
delete from public.account_deletion_requests r
using ranked_pending_requests d
where r.id = d.id
  and d.rn > 1;

drop index if exists public.account_deletion_requests_one_pending_per_user_uidx;

create unique index account_deletion_requests_one_pending_per_user_uidx
  on public.account_deletion_requests(user_id)
  where user_id is not null
    and status = 'pending';