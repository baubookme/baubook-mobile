-- BauBook 0.6.0 - Help/Safety lost alert rate limit.
-- Align lost-dog alerts with the beta Safety limit pattern:
-- max 2 lost alerts per profile every rolling 24 hours.

begin;

create index if not exists lost_dog_alerts_owner_recent_idx
  on public.lost_dog_alerts(owner_id, created_at desc);

-- Recreate only the lost-alert RPC, preserving the 0027 geometry/manual-location fix.
drop function if exists public.create_lost_dog_alert(
  uuid, uuid, text, integer, integer, boolean, text, text, double precision, double precision, text
);

drop function if exists public.create_lost_dog_alert(uuid, uuid, text, integer, integer, boolean);

create or replace function public.create_lost_dog_alert(
  dog_id_input uuid,
  place_id_input uuid default null,
  description_input text default null,
  last_seen_minutes_ago_input integer default 30,
  ttl_hours_input integer default 24,
  disclaimer_accepted_input boolean default false,
  location_mode_input text default 'current',
  location_label_input text default null,
  location_latitude_input double precision default null,
  location_longitude_input double precision default null,
  manual_address_input text default null
)
returns public.lost_dog_alerts
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
  selected_dog public.dogs;
  selected_place public.places;
  safe_ttl_hours integer;
  safe_last_seen_minutes integer;
  safe_description text;
  safe_location_mode text;
  safe_location_label text;
  safe_point geometry(Point, 4326);
  safe_area geometry(Polygon, 4326);
  active_count integer;
  recent_count integer;
  result public.lost_dog_alerts;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into current_profile
  from public.profiles
  where user_id = auth.uid()
    and status = 'active'
  limit 1;

  if current_profile.id is null then
    raise exception 'Profilo BauBook non trovato o non attivo';
  end if;

  if not coalesce(current_profile.is_verified_email, false)
     and not coalesce(current_profile.is_verified_phone, false) then
    raise exception 'Utente non verificato';
  end if;

  select * into selected_dog
  from public.dogs
  where id = dog_id_input
    and owner_id = current_profile.id
    and visibility <> 'removed'
  limit 1;

  if selected_dog.id is null then
    raise exception 'Cane non trovato o non associato al profilo';
  end if;

  if place_id_input is not null then
    select * into selected_place
    from public.places
    where id = place_id_input
      and visibility = 'public'
      and moderation_status in ('approved', 'pending')
    limit 1;

    if selected_place.id is null then
      raise exception 'Luogo BauBook non valido';
    end if;
  end if;

  safe_ttl_hours := greatest(1, least(coalesce(ttl_hours_input, 24), 48));
  safe_last_seen_minutes := greatest(0, least(coalesce(last_seen_minutes_ago_input, 30), 1440));
  safe_description := left(nullif(trim(coalesce(description_input, '')), ''), 900);
  safe_location_mode := case when location_mode_input = 'manual' then 'manual' else 'current' end;
  safe_location_label := left(
    nullif(trim(coalesce(location_label_input, manual_address_input, selected_place.name, 'Posizione condivisa')), ''),
    220
  );

  if location_latitude_input is not null and location_longitude_input is not null then
    safe_point := st_setsrid(st_makepoint(location_longitude_input, location_latitude_input), 4326);
  elsif selected_place.id is not null and selected_place.location is not null then
    safe_point := selected_place.location;
  else
    safe_point := null;
  end if;

  safe_area := case
    when safe_point is null then null
    else st_buffer(safe_point::geography, 350)::geometry
  end;

  if disclaimer_accepted_input is distinct from true then
    raise exception 'Disclaimer obbligatorio';
  end if;

  if safe_description is null or length(safe_description) < 15 then
    raise exception 'Descrizione obbligatoria';
  end if;

  if safe_location_label is null then
    raise exception 'Posizione obbligatoria';
  end if;

  select count(*) into active_count
  from public.lost_dog_alerts
  where owner_id = current_profile.id
    and dog_id = selected_dog.id
    and status = 'active'
    and expires_at > now();

  if active_count > 0 then
    raise exception 'Hai un alert smarrimento gia attivo';
  end if;

  select count(*) into recent_count
  from public.lost_dog_alerts
  where owner_id = current_profile.id
    and created_at > now() - interval '24 hours';

  if recent_count >= 2 then
    raise exception 'Limite beta smarrimento raggiunto';
  end if;

  insert into public.lost_dog_alerts (
    dog_id,
    owner_id,
    city_id,
    source_place_id,
    last_seen_area,
    last_seen_at,
    description,
    contact_mode,
    status,
    moderation_status,
    expires_at,
    radius_m,
    disclaimer_accepted_at,
    location_mode,
    location_label,
    location_latitude,
    location_longitude,
    manual_address
  )
  values (
    selected_dog.id,
    current_profile.id,
    coalesce(selected_place.city_id, current_profile.city_id),
    selected_place.id,
    safe_area,
    now() - make_interval(mins => safe_last_seen_minutes),
    safe_description,
    'in_app',
    'active',
    'approved',
    now() + make_interval(hours => safe_ttl_hours),
    350,
    now(),
    safe_location_mode,
    safe_location_label,
    location_latitude_input,
    location_longitude_input,
    nullif(trim(coalesce(manual_address_input, '')), '')
  )
  returning * into result;

  insert into public.audit_logs (actor_profile_id, action, target_type, target_id, metadata)
  values (
    current_profile.id,
    'lost_dog_alert_created',
    'lost_dog_alert',
    result.id,
    jsonb_build_object(
      'ttl_hours', safe_ttl_hours,
      'location_mode', safe_location_mode,
      'location_label', safe_location_label,
      'has_geometry', safe_area is not null,
      'source_place_id', selected_place.id,
      'rate_limit_window_hours', 24,
      'rate_limit_max', 2,
      'disclaimer', true
    )
  );

  return result;
end;
$$;

grant execute on function public.create_lost_dog_alert(
  uuid, uuid, text, integer, integer, boolean, text, text, double precision, double precision, text
) to authenticated;

commit;
