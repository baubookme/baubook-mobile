begin;

create or replace function public.deactivate_stale_live_walks_presence()
returns table (
  deactivated_walks integer,
  deactivated_presences integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
walks_count integer := 0;
  presences_count integer := 0;
begin
update public.walk_plans
set active = false,
    updated_at = now()
where active = true
  and created_at < now() - interval '8 hours';

get diagnostics walks_count = row_count;

update public.presence_sessions
set active = false,
    updated_at = now()
where active = true
  and created_at < now() - interval '8 hours';

get diagnostics presences_count = row_count;

return query select walks_count, presences_count;
end;
$$;

grant execute on function public.deactivate_stale_live_walks_presence() to authenticated;
grant execute on function public.deactivate_stale_live_walks_presence() to service_role;

commit;