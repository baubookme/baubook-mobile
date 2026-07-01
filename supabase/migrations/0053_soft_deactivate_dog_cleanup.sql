-- BauBook 0.7.4
-- Atomically soft-deactivate a dog profile and close its live content.

set check_function_bodies = off;

create or replace function public.soft_deactivate_my_dog(dog_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_dog_id uuid;
  selected_profile_id uuid;
begin
  select d.id, d.owner_id
    into selected_dog_id, selected_profile_id
  from public.dogs d
  join public.profiles p on p.id = d.owner_id
  where d.id = dog_id_input
    and d.is_active = true
    and p.user_id = auth.uid()
    and p.status = 'active'
    and p.account_status = 'active'
  for update of d;

  if selected_dog_id is null then
    raise exception 'Profilo cane non trovato o gia rimosso.';
  end if;

  update public.walk_plans
     set active = false,
         visibility = 'private',
         ends_at = coalesce(ends_at, now()),
         updated_at = now()
   where dog_id = selected_dog_id
     and owner_id = selected_profile_id
     and active = true;

  update public.presence_sessions
     set active = false,
         status = 'offline',
         visibility = 'private',
         expires_at = least(expires_at, now()),
         updated_at = now()
   where dog_id = selected_dog_id
     and profile_id = selected_profile_id
     and active = true;

  update public.lost_dog_alerts
     set status = 'removed'::public.alert_status,
         closed_at = coalesce(closed_at, now()),
         expires_at = least(expires_at, now()),
         updated_at = now()
   where dog_id = selected_dog_id
     and owner_id = selected_profile_id
     and status = 'active'::public.alert_status;

  update public.dogs
     set is_active = false,
         visibility = 'private',
         updated_at = now()
   where id = selected_dog_id
     and owner_id = selected_profile_id;
end;
$$;

grant execute on function public.soft_deactivate_my_dog(uuid) to authenticated;

set check_function_bodies = on;
