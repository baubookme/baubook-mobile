-- BauBook 0.6.0 - Help / Safety restyle with free location payloads.
-- Adds real/manual location payloads to lost dog and danger reports.
-- Replaces RPCs so Safety no longer requires a 1:1 dog-area place.

alter table public.lost_dog_alerts
  add column if not exists location_mode text,
  add column if not exists location_label text,
  add column if not exists location_latitude double precision,
  add column if not exists location_longitude double precision,
  add column if not exists manual_address text;

alter table public.danger_reports
  add column if not exists location_mode text,
  add column if not exists location_label text,
  add column if not exists location_latitude double precision,
  add column if not exists location_longitude double precision,
  add column if not exists manual_address text;

alter table public.danger_reports alter column location drop not null;
alter table public.danger_reports alter column area drop not null;

create index if not exists lost_dog_alerts_owner_active_idx
  on public.lost_dog_alerts(owner_id, dog_id, status, expires_at);

create index if not exists danger_reports_reporter_active_idx
  on public.danger_reports(reporter_id, status, expires_at);

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
  limit 1;

  if current_profile.id is null then
    raise exception 'Profilo BauBook non trovato';
  end if;

  if not coalesce(current_profile.is_verified_email, false)
     and not coalesce(current_profile.is_verified_phone, false) then
    raise exception 'Utente non verificato';
  end if;

  select * into selected_dog
  from public.dogs
  where id = dog_id_input
    and owner_id = current_profile.id
  limit 1;

  if selected_dog.id is null then
    raise exception 'Cane non trovato o non associato al profilo';
  end if;

  if place_id_input is not null then
    select * into selected_place
    from public.places
    where id = place_id_input
      and moderation_status <> 'removed'
    limit 1;
  end if;

  safe_ttl_hours := greatest(1, least(coalesce(ttl_hours_input, 24), 48));
  safe_last_seen_minutes := greatest(0, least(coalesce(last_seen_minutes_ago_input, 30), 1440));
  safe_description := left(nullif(trim(coalesce(description_input, '')), ''), 900);
  safe_location_mode := case when location_mode_input = 'manual' then 'manual' else 'current' end;
  safe_location_label := left(
    nullif(trim(coalesce(location_label_input, manual_address_input, selected_place.name, 'Posizione condivisa')), ''),
    220
  );

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

  if recent_count >= 3 then
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
    safe_location_label,
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
      'source_place_id', selected_place.id,
      'disclaimer', true
    )
  );

  return result;
end;
$$;

drop function if exists public.create_danger_report(uuid, text, text, integer, integer, boolean);

create or replace function public.create_danger_report(
  place_id_input uuid default null,
  danger_type_input text default 'other',
  description_input text default null,
  severity_input integer default 2,
  ttl_hours_input integer default 6,
  disclaimer_accepted_input boolean default false,
  location_mode_input text default 'current',
  location_label_input text default null,
  location_latitude_input double precision default null,
  location_longitude_input double precision default null,
  manual_address_input text default null
)
returns public.danger_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
  selected_place public.places;
  safe_type text;
  safe_severity integer;
  safe_ttl_hours integer;
  safe_description text;
  safe_location_mode text;
  safe_location_label text;
  safe_point geometry(Point, 4326);
  active_count integer;
  recent_count integer;
  result public.danger_reports;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into current_profile
  from public.profiles
  where user_id = auth.uid()
  limit 1;

  if current_profile.id is null then
    raise exception 'Profilo BauBook non trovato';
  end if;

  if not coalesce(current_profile.is_verified_email, false)
     and not coalesce(current_profile.is_verified_phone, false) then
    raise exception 'Utente non verificato';
  end if;

  if place_id_input is not null then
    select * into selected_place
    from public.places
    where id = place_id_input
      and moderation_status <> 'removed'
    limit 1;
  end if;

  safe_type := case danger_type_input
    when 'suspected_poison' then 'suspected_poison'
    when 'loose_dog' then 'loose_dog'
    when 'unsafe_area' then 'unsafe_area'
    when 'traffic' then 'traffic'
    when 'broken_fence' then 'broken_fence'
    else 'other'
  end;

  safe_severity := greatest(1, least(coalesce(severity_input, 2), 5));
  safe_ttl_hours := greatest(1, least(coalesce(ttl_hours_input, 6), 72));
  safe_description := left(nullif(trim(coalesce(description_input, '')), ''), 900);
  safe_location_mode := case when location_mode_input = 'manual' then 'manual' else 'current' end;
  safe_location_label := left(
    nullif(trim(coalesce(location_label_input, manual_address_input, selected_place.name, 'Posizione condivisa')), ''),
    220
  );

  if location_latitude_input is not null and location_longitude_input is not null then
    safe_point := st_setsrid(st_makepoint(location_longitude_input, location_latitude_input), 4326);
  elsif selected_place.id is not null then
    safe_point := selected_place.location;
  else
    safe_point := null;
  end if;

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
  from public.danger_reports
  where reporter_id = current_profile.id
    and status in ('active', 'confirmed')
    and expires_at > now();

  if active_count > 0 then
    raise exception 'Hai una segnalazione pericolo gia attiva';
  end if;

  select count(*) into recent_count
  from public.danger_reports
  where reporter_id = current_profile.id
    and created_at > now() - interval '24 hours';

  if recent_count >= 3 then
    raise exception 'Limite beta pericolo raggiunto';
  end if;

  insert into public.danger_reports (
    reporter_id,
    city_id,
    source_place_id,
    danger_type,
    location,
    area,
    description,
    severity,
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
    current_profile.id,
    coalesce(selected_place.city_id, current_profile.city_id),
    selected_place.id,
    safe_type,
    safe_point,
    case when safe_point is null then null else st_buffer(safe_point::geography, 250)::geometry end,
    safe_description,
    safe_severity,
    'active',
    'pending',
    now() + make_interval(hours => safe_ttl_hours),
    250,
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
    'danger_report_created',
    'danger_report',
    result.id,
    jsonb_build_object(
      'ttl_hours', safe_ttl_hours,
      'danger_type', safe_type,
      'severity', safe_severity,
      'location_mode', safe_location_mode,
      'location_label', safe_location_label,
      'source_place_id', selected_place.id,
      'disclaimer', true
    )
  );

  return result;
end;
$$;

create or replace function public.report_safety_content(
  target_type_input text,
  target_id_input uuid,
  reason_input text default 'other',
  description_input text default null
)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
  target_owner uuid;
  result public.reports;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into current_profile
  from public.profiles
  where user_id = auth.uid()
  limit 1;

  if current_profile.id is null then
    raise exception 'Profilo BauBook non trovato';
  end if;

  if target_type_input = 'lost_dog_alert' then
    select owner_id into target_owner
    from public.lost_dog_alerts
    where id = target_id_input;

    if target_owner = current_profile.id then
      raise exception 'Non puoi segnalare abuso su un tuo alert';
    end if;

    update public.lost_dog_alerts
    set moderation_status = case when moderation_status = 'approved' then 'escalated' else moderation_status end,
        updated_at = now()
    where id = target_id_input;
  elsif target_type_input = 'danger_report' then
    select reporter_id into target_owner
    from public.danger_reports
    where id = target_id_input;

    if target_owner = current_profile.id then
      raise exception 'Non puoi segnalare abuso su una tua segnalazione';
    end if;

    update public.danger_reports
    set moderation_status = case when moderation_status in ('approved', 'pending') then 'escalated' else moderation_status end,
        updated_at = now()
    where id = target_id_input;
  else
    raise exception 'Tipo target non supportato';
  end if;

  insert into public.reports (
    reporter_profile_id,
    target_type,
    target_id,
    reason,
    description,
    status
  )
  values (
    current_profile.id,
    target_type_input,
    target_id_input,
    coalesce(nullif(trim(reason_input), ''), 'other'),
    left(nullif(trim(coalesce(description_input, '')), ''), 900),
    'pending'
  )
  returning * into result;

  insert into public.audit_logs (actor_profile_id, action, target_type, target_id, metadata)
  values (
    current_profile.id,
    'safety_content_reported',
    target_type_input,
    target_id_input,
    jsonb_build_object('reason', reason_input, 'report_id', result.id)
  );

  return result;
end;
$$;

grant execute on function public.create_lost_dog_alert(
  uuid, uuid, text, integer, integer, boolean, text, text, double precision, double precision, text
) to authenticated;

grant execute on function public.create_danger_report(
  uuid, text, text, integer, integer, boolean, text, text, double precision, double precision, text
) to authenticated;

grant execute on function public.report_safety_content(text, uuid, text, text) to authenticated;
