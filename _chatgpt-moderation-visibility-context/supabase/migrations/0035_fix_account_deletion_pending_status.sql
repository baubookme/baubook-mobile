-- BauBook 0.7.0 - Account deletion requested status hardening.
-- The account_deletion_requests table does not allow "pending".
-- "requested" is the active/waiting status for beta account deletion requests.

drop index if exists public.account_deletion_requests_one_pending_per_user_uidx;
drop index if exists public.account_deletion_requests_one_pending_user_idx;
drop index if exists public.account_deletion_requests_one_pending_profile_idx;
drop index if exists public.account_deletion_requests_one_requested_user_idx;
drop index if exists public.account_deletion_requests_one_requested_profile_idx;

-- Normalize beta active-like rows to requested.
-- Keep terminal states untouched.
update public.account_deletion_requests
set status = 'requested'
where status is null
   or status not in ('requested', 'processed', 'cancelled', 'canceled', 'failed', 'rejected', 'completed');

-- Keep the oldest requested row per auth user and cancel duplicated active rows.
with ranked_requested as (
  select
    id,
    row_number() over (
      partition by user_id
      order by requested_at asc nulls last, id asc
    ) as rn
  from public.account_deletion_requests
  where user_id is not null
    and status = 'requested'
)
update public.account_deletion_requests r
set
  status = 'cancelled',
  metadata = coalesce(r.metadata, '{}'::jsonb) || jsonb_build_object(
    'cancelled_by', 'migration_0035',
    'cancelled_reason', 'duplicate_requested_user_request'
  )
from ranked_requested d
where r.id = d.id
  and d.rn > 1;

-- Same protection for profile_id, useful if old rows are missing user_id but have profile_id.
with ranked_requested as (
  select
    id,
    row_number() over (
      partition by profile_id
      order by requested_at asc nulls last, id asc
    ) as rn
  from public.account_deletion_requests
  where profile_id is not null
    and status = 'requested'
)
update public.account_deletion_requests r
set
  status = 'cancelled',
  metadata = coalesce(r.metadata, '{}'::jsonb) || jsonb_build_object(
    'cancelled_by', 'migration_0035',
    'cancelled_reason', 'duplicate_requested_profile_request'
  )
from ranked_requested d
where r.id = d.id
  and d.rn > 1;

create unique index account_deletion_requests_one_requested_user_idx
  on public.account_deletion_requests(user_id)
  where user_id is not null
    and status = 'requested';

create unique index account_deletion_requests_one_requested_profile_idx
  on public.account_deletion_requests(profile_id)
  where profile_id is not null
    and status = 'requested';