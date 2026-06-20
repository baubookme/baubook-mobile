-- BauBook 0.6.0 - Help/Safety geometry fix.
-- Fixes free/manual locations for Safety alerts.
-- Root cause: manual addresses such as "Via ..." must be stored as labels,
-- not inserted into PostGIS geometry columns.

begin;

-- Manual/free-text locations may not have coordinates. Keep the public label,
-- and make geometry optional for lost alerts.
alter table public.lost_dog_alerts
  alter column last_seen_area drop not null;

-- Danger reports already have location_label from 0026; make the geometry check
-- accept label-only manual reports as valid beta records.
alter table public.danger_reports
  drop constraint if exists danger_has_geometry;

alter table public.danger_reports
  add constraint danger_has_context
  check (
    location is not null
    or area is not null
    or nullif(trim(coalesce(location_label, '')), '') is not null
  );

-- Recreate lost alert RPC: last_seen_area receives a buffered geometry only when
-- real coordinates or a legacy place are available. The address/label stays text.
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
      'disclaimer', true
    )
  );

  return result;
end;
$$;

-- Recreate danger RPC too: fixes duplicate danger_type insert from 0026 and keeps
-- manual address text out of geometry columns.
drop function if exists public.create_danger_report(
  uuid, text, text, integer, integer, boolean, text, text, double precision, double precision, text
);

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
  safe_area geometry(Polygon, 4326);
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
    and status = 'active'
  limit 1;

  if current_profile.id is null then
    raise exception 'Profilo BauBook non trovato o non attivo';
  end if;

  if not coalesce(current_profile.is_verified_email, false)
     and not coalesce(current_profile.is_verified_phone, false) then
    raise exception 'Utente non verificato';
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
  elsif selected_place.id is not null and selected_place.location is not null then
    safe_point := selected_place.location;
  else
    safe_point := null;
  end if;

  safe_area := case
    when safe_point is null then null
    else st_buffer(safe_point::geography, 250)::geometry
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
    safe_area,
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
      'has_geometry', safe_area is not null,
      'source_place_id', selected_place.id,
      'disclaimer', true
    )
  );

  return result;
end;
$$;

-- Also normalize the report-abuse RPC to the actual reports schema and keep it
-- moderation-only: reporting abuse never closes an alert automatically.
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
  safe_reason public.report_reason;
  normalized_target text;
  target_owner uuid;
  result public.reports;
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

  normalized_target := case
    when target_type_input in ('lost_dog_alert', 'danger_report') then target_type_input
    else null
  end;

  if normalized_target is null then
    raise exception 'Tipo contenuto non segnalabile da questa funzione';
  end if;

  if normalized_target = 'lost_dog_alert' then
    select owner_id into target_owner
    from public.lost_dog_alerts
    where id = target_id_input;

    if target_owner is null then
      raise exception 'Alert non trovato';
    end if;

    if target_owner = current_profile.id then
      raise exception 'Non puoi segnalare abuso su un tuo alert';
    end if;

    update public.lost_dog_alerts
    set moderation_status = case
          when moderation_status = 'approved'::public.moderation_status then 'escalated'::public.moderation_status
          else moderation_status
        end,
        updated_at = now()
    where id = target_id_input;
  else
    select reporter_id into target_owner
    from public.danger_reports
    where id = target_id_input;

    if target_owner is null then
      raise exception 'Segnalazione non trovata';
    end if;

    if target_owner = current_profile.id then
      raise exception 'Non puoi segnalare abuso su una tua segnalazione';
    end if;

    update public.danger_reports
    set moderation_status = case
          when moderation_status in ('approved'::public.moderation_status, 'pending'::public.moderation_status) then 'escalated'::public.moderation_status
          else moderation_status
        end,
        updated_at = now()
    where id = target_id_input;
  end if;

  safe_reason := case
    when reason_input in ('spam', 'abuse', 'harassment', 'false_alert', 'dangerous_content', 'privacy_violation', 'scam', 'inappropriate', 'other')
      then reason_input::public.report_reason
    else 'other'::public.report_reason
  end;

  insert into public.reports (
    reporter_id,
    target_type,
    target_id,
    reason,
    description,
    status
  )
  values (
    current_profile.id,
    normalized_target,
    target_id_input,
    safe_reason,
    left(nullif(trim(coalesce(description_input, '')), ''), 900),
    'open'
  )
  returning * into result;

  insert into public.audit_logs (actor_profile_id, action, target_type, target_id, metadata)
  values (
    current_profile.id,
    'safety_content_reported',
    normalized_target,
    target_id_input,
    jsonb_build_object('reason', safe_reason, 'report_id', result.id)
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

commit;
