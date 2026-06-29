-- BauBook 0.6.1 - Safety RPC profile id fix.
-- auth.uid() is auth.users.id; safety FKs require public.profiles.id.

alter table public.lost_dog_sightings
  add column if not exists updated_at timestamptz;

alter table public.lost_dog_sightings
  add column if not exists sighted_at timestamptz;

alter table public.lost_dog_sightings
  add column if not exists status text not null default 'active';

alter table public.lost_dog_sightings
  add column if not exists location_mode text;

alter table public.lost_dog_sightings
  add column if not exists location_label text;

alter table public.lost_dog_sightings
  add column if not exists location_latitude double precision;

alter table public.lost_dog_sightings
  add column if not exists location_longitude double precision;

alter table public.lost_dog_sightings
  add column if not exists manual_address text;

alter table public.lost_dog_sightings
  add column if not exists closed_at timestamptz;

alter table public.lost_dog_sightings
  drop constraint if exists sighting_has_geometry;

alter table public.lost_dog_sightings
  drop constraint if exists sighting_has_context;

alter table public.lost_dog_sightings
  add constraint sighting_has_context
  check (
    location is not null
    or area is not null
    or nullif(trim(coalesce(location_label, '')), '') is not null
    or nullif(trim(coalesce(manual_address, '')), '') is not null
  );

create unique index if not exists lost_dog_sightings_alert_reporter_uidx
  on public.lost_dog_sightings(alert_id, reporter_id);

drop function if exists public.report_safety_content(text, uuid, text, text);

create or replace function public.report_safety_content(
  target_type_input text,
  target_id_input uuid,
  reason_input text default 'false_alert',
  description_input text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_uuid uuid;
  existing_report_id uuid;
  new_report_id uuid;
  normalized_reason public.report_reason;
begin
  current_profile_uuid := public.current_profile_id();

  if current_profile_uuid is null then
    raise exception 'Profile not found for current user';
  end if;

  normalized_reason := coalesce(nullif(trim(reason_input), ''), 'false_alert')::public.report_reason;

  select r.id
    into existing_report_id
  from public.reports r
  where r.reporter_id = current_profile_uuid
    and r.target_type = target_type_input
    and r.target_id = target_id_input
    and r.status in ('open', 'reviewing', 'actioned')
  order by r.created_at desc
  limit 1;

  if existing_report_id is not null then
    return jsonb_build_object(
      'ok', true,
      'alreadyReported', true,
      'reportId', existing_report_id
    );
  end if;

  insert into public.reports (
    reporter_id,
    target_type,
    target_id,
    reason,
    description,
    status,
    created_at,
    updated_at
  )
  values (
    current_profile_uuid,
    target_type_input,
    target_id_input,
    normalized_reason,
    nullif(trim(coalesce(description_input, '')), ''),
    'open',
    now(),
    now()
  )
  returning id into new_report_id;

  return jsonb_build_object(
    'ok', true,
    'alreadyReported', false,
    'reportId', new_report_id
  );
end;
$$;

grant execute on function public.report_safety_content(text, uuid, text, text) to authenticated;

drop function if exists public.upsert_lost_dog_sighting(
  uuid,
  text,
  text,
  boolean,
  text,
  text,
  double precision,
  double precision,
  text
);

create or replace function public.upsert_lost_dog_sighting(
  alert_id_input uuid,
  sighting_type_input text default 'seen',
  note_input text default null,
  disclaimer_accepted_input boolean default true,
  location_mode_input text default 'current',
  location_label_input text default null,
  location_latitude_input double precision default null,
  location_longitude_input double precision default null,
  manual_address_input text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_uuid uuid;
  alert_owner_uuid uuid;
  saved_sighting_id uuid;
  computed_location geometry(Point, 4326);
  normalized_sighting_type text;
begin
  current_profile_uuid := public.current_profile_id();

  if current_profile_uuid is null then
    raise exception 'Profile not found for current user';
  end if;

  if disclaimer_accepted_input is not true then
    raise exception 'Disclaimer not accepted';
  end if;

  normalized_sighting_type := coalesce(nullif(trim(sighting_type_input), ''), 'seen');

  if normalized_sighting_type not in ('seen', 'maybe_seen', 'recovered') then
    normalized_sighting_type := 'seen';
  end if;

  select a.owner_id
    into alert_owner_uuid
  from public.lost_dog_alerts a
  where a.id = alert_id_input
    and a.status = 'active'
    and a.moderation_status = 'approved'
    and a.expires_at > now()
  limit 1;

  if alert_owner_uuid is null then
    raise exception 'Lost dog alert is not active';
  end if;

  if location_latitude_input is not null and location_longitude_input is not null then
    computed_location := st_setsrid(st_makepoint(location_longitude_input, location_latitude_input), 4326);
  else
    computed_location := null;
  end if;

  insert into public.lost_dog_sightings (
    alert_id,
    reporter_id,
    location,
    area,
    note,
    sighting_type,
    moderation_status,
    created_at,
    updated_at,
    sighted_at,
    status,
    location_mode,
    location_label,
    location_latitude,
    location_longitude,
    manual_address
  )
  values (
    alert_id_input,
    current_profile_uuid,
    computed_location,
    null,
    nullif(trim(coalesce(note_input, '')), ''),
    normalized_sighting_type,
    'approved',
    now(),
    now(),
    now(),
    'active',
    coalesce(nullif(trim(location_mode_input), ''), 'current'),
    nullif(trim(coalesce(location_label_input, '')), ''),
    location_latitude_input,
    location_longitude_input,
    nullif(trim(coalesce(manual_address_input, '')), '')
  )
  on conflict (alert_id, reporter_id)
  do update set
    location = excluded.location,
    area = null,
    note = excluded.note,
    sighting_type = excluded.sighting_type,
    moderation_status = 'approved',
    updated_at = now(),
    sighted_at = now(),
    status = 'active',
    closed_at = null,
    location_mode = excluded.location_mode,
    location_label = excluded.location_label,
    location_latitude = excluded.location_latitude,
    location_longitude = excluded.location_longitude,
    manual_address = excluded.manual_address
  returning id into saved_sighting_id;

  return jsonb_build_object(
    'ok', true,
    'sightingId', saved_sighting_id,
    'updated', true
  );
end;
$$;

grant execute on function public.upsert_lost_dog_sighting(
  uuid,
  text,
  text,
  boolean,
  text,
  text,
  double precision,
  double precision,
  text
) to authenticated;