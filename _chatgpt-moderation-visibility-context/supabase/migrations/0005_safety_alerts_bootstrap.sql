-- BauBook! 1.9.0
-- Safety bootstrap: Pericolo! + Mi sono perso! con TTL, disclaimer, rate limit base e chiusura esplicita.
-- Run after 0001, seed, 0002, 0003 and 0004.

-- Extra metadata columns for safety flows. These are additive and safe on an existing beta DB.
alter table public.lost_dog_alerts
  add column if not exists source_place_id uuid references public.places(id) on delete set null,
  add column if not exists radius_m integer not null default 350,
  add column if not exists disclaimer_accepted_at timestamptz,
  add column if not exists closed_reason text;

alter table public.danger_reports
  add column if not exists source_place_id uuid references public.places(id) on delete set null,
  add column if not exists radius_m integer not null default 250,
  add column if not exists disclaimer_accepted_at timestamptz,
  add column if not exists closed_reason text;

create index if not exists lost_dog_alerts_source_place_idx on public.lost_dog_alerts(source_place_id);
create index if not exists danger_reports_source_place_idx on public.danger_reports(source_place_id);
create index if not exists lost_dog_alerts_status_expiry_idx on public.lost_dog_alerts(status, expires_at);
create index if not exists danger_reports_status_expiry_idx on public.danger_reports(status, expires_at);

create or replace function public.expire_stale_safety_alerts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  lost_count integer := 0;
  danger_count integer := 0;
begin
  update public.lost_dog_alerts
     set status = 'expired',
         closed_at = coalesce(closed_at, now()),
         closed_reason = coalesce(closed_reason, 'TTL scaduto automaticamente'),
         updated_at = now()
   where status = 'active'
     and expires_at <= now();
  get diagnostics lost_count = row_count;

  update public.danger_reports
     set status = 'expired',
         closed_reason = coalesce(closed_reason, 'TTL scaduto automaticamente'),
         updated_at = now()
   where status in ('active', 'confirmed')
     and expires_at <= now();
  get diagnostics danger_count = row_count;

  return lost_count + danger_count;
end;
$$;

create or replace function public.create_lost_dog_alert(
  dog_id_input uuid,
  place_id_input uuid,
  description_input text default null,
  last_seen_minutes_ago_input integer default 30,
  ttl_hours_input integer default 24,
  disclaimer_accepted_input boolean default false
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
  existing_count integer;
  safe_ttl_hours integer;
  safe_minutes_ago integer;
  safe_description text;
  result public.lost_dog_alerts;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if coalesce(disclaimer_accepted_input, false) is not true then
    raise exception 'Devi accettare il disclaimer prima di creare un alert smarrimento.';
  end if;

  select * into current_profile
  from public.profiles
  where user_id = auth.uid()
    and status = 'active'
  limit 1;

  if current_profile.id is null then
    raise exception 'Profilo BauBook non trovato o non attivo.';
  end if;

  if current_profile.is_verified_email is not true then
    raise exception 'Per creare un alert smarrimento serve una email verificata.';
  end if;

  select * into selected_dog
  from public.dogs
  where id = dog_id_input
    and owner_id = current_profile.id
    and visibility <> 'removed'
  limit 1;

  if selected_dog.id is null then
    raise exception 'Cane non trovato nel tuo profilo.';
  end if;

  select * into selected_place
  from public.places
  where id = place_id_input
    and visibility = 'public'
    and moderation_status in ('approved', 'pending')
  limit 1;

  if selected_place.id is null or selected_place.location is null then
    raise exception 'Scegli un luogo BauBook valido come ultima zona nota.';
  end if;

  select count(*) into existing_count
  from public.lost_dog_alerts
  where dog_id = selected_dog.id
    and owner_id = current_profile.id
    and status = 'active'
    and expires_at > now();

  if existing_count > 0 then
    raise exception 'Esiste gia'' un alert attivo per questo cane. Chiudilo prima di crearne uno nuovo.';
  end if;

  select count(*) into existing_count
  from public.lost_dog_alerts
  where owner_id = current_profile.id
    and created_at > now() - interval '24 hours';

  if existing_count >= 3 then
    raise exception 'Limite beta: massimo 3 alert smarrimento in 24 ore per profilo.';
  end if;

  safe_ttl_hours := greatest(6, least(coalesce(ttl_hours_input, 24), 48));
  safe_minutes_ago := greatest(0, least(coalesce(last_seen_minutes_ago_input, 30), 1440));
  safe_description := left(nullif(trim(coalesce(description_input, '')), ''), 900);

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
    disclaimer_accepted_at
  )
  values (
    selected_dog.id,
    current_profile.id,
    coalesce(selected_place.city_id, current_profile.city_id),
    selected_place.id,
    st_buffer(selected_place.location::geography, 350)::geometry,
    now() - make_interval(mins => safe_minutes_ago),
    safe_description,
    'in_app',
    'active',
    'approved',
    now() + make_interval(hours => safe_ttl_hours),
    350,
    now()
  )
  returning * into result;

  insert into public.audit_logs (actor_profile_id, action, target_type, target_id, metadata)
  values (
    current_profile.id,
    'lost_dog_alert_created',
    'lost_dog_alert',
    result.id,
    jsonb_build_object('ttl_hours', safe_ttl_hours, 'source_place_id', selected_place.id, 'disclaimer', true)
  );

  return result;
end;
$$;

create or replace function public.close_lost_dog_alert(
  alert_id_input uuid,
  close_status_input text default 'resolved',
  note_input text default null
)
returns public.lost_dog_alerts
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
  selected_alert public.lost_dog_alerts;
  safe_status public.alert_status;
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
    raise exception 'Profilo BauBook non trovato o non attivo.';
  end if;

  select * into selected_alert
  from public.lost_dog_alerts
  where id = alert_id_input
    and owner_id = current_profile.id
  limit 1;

  if selected_alert.id is null then
    raise exception 'Alert non trovato o non appartenente al tuo profilo.';
  end if;

  safe_status := case
    when close_status_input = 'abuse_locked' then 'abuse_locked'::public.alert_status
    when close_status_input = 'expired' then 'expired'::public.alert_status
    else 'resolved'::public.alert_status
  end;

  update public.lost_dog_alerts
     set status = safe_status,
         closed_at = now(),
         expires_at = least(expires_at, now()),
         closed_reason = left(nullif(trim(coalesce(note_input, '')), ''), 600),
         updated_at = now()
   where id = selected_alert.id
  returning * into result;

  insert into public.audit_logs (actor_profile_id, action, target_type, target_id, metadata)
  values (
    current_profile.id,
    'lost_dog_alert_closed',
    'lost_dog_alert',
    result.id,
    jsonb_build_object('status', result.status, 'note_present', note_input is not null)
  );

  return result;
end;
$$;

create or replace function public.create_lost_dog_sighting(
  alert_id_input uuid,
  place_id_input uuid,
  sighting_type_input text default 'seen',
  note_input text default null,
  disclaimer_accepted_input boolean default false
)
returns public.lost_dog_sightings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
  selected_alert public.lost_dog_alerts;
  selected_place public.places;
  safe_type text;
  recent_count integer;
  result public.lost_dog_sightings;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if coalesce(disclaimer_accepted_input, false) is not true then
    raise exception 'Conferma il disclaimer prima di inviare un avvistamento.';
  end if;

  select * into current_profile
  from public.profiles
  where user_id = auth.uid()
    and status = 'active'
  limit 1;

  if current_profile.id is null then
    raise exception 'Profilo BauBook non trovato o non attivo.';
  end if;

  select * into selected_alert
  from public.lost_dog_alerts
  where id = alert_id_input
    and status = 'active'
    and moderation_status = 'approved'
    and expires_at > now()
  limit 1;

  if selected_alert.id is null then
    raise exception 'Alert non disponibile, scaduto o chiuso.';
  end if;

  select * into selected_place
  from public.places
  where id = place_id_input
    and visibility = 'public'
    and moderation_status in ('approved', 'pending')
  limit 1;

  if selected_place.id is null or selected_place.location is null then
    raise exception 'Scegli un luogo BauBook valido per l''avvistamento.';
  end if;

  select count(*) into recent_count
  from public.lost_dog_sightings
  where reporter_id = current_profile.id
    and created_at > now() - interval '1 hour';

  if recent_count >= 10 then
    raise exception 'Limite beta: troppi avvistamenti in poco tempo.';
  end if;

  safe_type := case
    when sighting_type_input in ('seen', 'maybe_seen', 'recovered') then sighting_type_input
    else 'seen'
  end;

  insert into public.lost_dog_sightings (
    alert_id,
    reporter_id,
    location,
    area,
    note,
    sighting_type,
    moderation_status
  )
  values (
    selected_alert.id,
    current_profile.id,
    selected_place.location,
    st_buffer(selected_place.location::geography, 120)::geometry,
    left(nullif(trim(coalesce(note_input, '')), ''), 700),
    safe_type,
    'approved'
  )
  returning * into result;

  if safe_type = 'recovered' and selected_alert.owner_id = current_profile.id then
    update public.lost_dog_alerts
       set status = 'resolved',
           closed_at = now(),
           expires_at = least(expires_at, now()),
           closed_reason = 'Recuperato dal proprietario tramite avvistamento',
           updated_at = now()
     where id = selected_alert.id;
  end if;

  insert into public.audit_logs (actor_profile_id, action, target_type, target_id, metadata)
  values (
    current_profile.id,
    'lost_dog_sighting_created',
    'lost_dog_sighting',
    result.id,
    jsonb_build_object('alert_id', selected_alert.id, 'sighting_type', safe_type, 'source_place_id', selected_place.id)
  );

  return result;
end;
$$;

create or replace function public.create_danger_report(
  place_id_input uuid,
  danger_type_input text,
  description_input text default null,
  severity_input integer default 2,
  ttl_hours_input integer default 6,
  disclaimer_accepted_input boolean default false
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
  safe_ttl_hours integer;
  safe_severity integer;
  recent_count integer;
  result public.danger_reports;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if coalesce(disclaimer_accepted_input, false) is not true then
    raise exception 'Devi accettare il disclaimer prima di creare una segnalazione Pericolo.';
  end if;

  select * into current_profile
  from public.profiles
  where user_id = auth.uid()
    and status = 'active'
  limit 1;

  if current_profile.id is null then
    raise exception 'Profilo BauBook non trovato o non attivo.';
  end if;

  if current_profile.is_verified_email is not true then
    raise exception 'Per creare segnalazioni di pericolo serve una email verificata.';
  end if;

  select * into selected_place
  from public.places
  where id = place_id_input
    and visibility = 'public'
    and moderation_status in ('approved', 'pending')
  limit 1;

  if selected_place.id is null or selected_place.location is null then
    raise exception 'Scegli un luogo BauBook valido per la segnalazione.';
  end if;

  select count(*) into recent_count
  from public.danger_reports
  where reporter_id = current_profile.id
    and created_at > now() - interval '24 hours';

  if recent_count >= 8 then
    raise exception 'Limite beta: massimo 8 segnalazioni Pericolo in 24 ore per profilo.';
  end if;

  safe_type := case
    when danger_type_input in ('suspected_poison', 'loose_dog', 'unsafe_area', 'traffic', 'broken_fence', 'other') then danger_type_input
    else 'other'
  end;
  safe_ttl_hours := case
    when coalesce(ttl_hours_input, 6) <= 2 then 2
    when coalesce(ttl_hours_input, 6) <= 6 then 6
    when coalesce(ttl_hours_input, 6) <= 24 then 24
    else 72
  end;
  safe_severity := greatest(1, least(coalesce(severity_input, 2), 5));

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
    disclaimer_accepted_at
  )
  values (
    current_profile.id,
    coalesce(selected_place.city_id, current_profile.city_id),
    selected_place.id,
    safe_type,
    selected_place.location,
    st_buffer(selected_place.location::geography, 250)::geometry,
    left(nullif(trim(coalesce(description_input, '')), ''), 900),
    safe_severity,
    'active',
    'pending',
    now() + make_interval(hours => safe_ttl_hours),
    250,
    now()
  )
  returning * into result;

  insert into public.audit_logs (actor_profile_id, action, target_type, target_id, metadata)
  values (
    current_profile.id,
    'danger_report_created',
    'danger_report',
    result.id,
    jsonb_build_object('ttl_hours', safe_ttl_hours, 'danger_type', safe_type, 'severity', safe_severity, 'source_place_id', selected_place.id, 'disclaimer', true)
  );

  return result;
end;
$$;

create or replace function public.close_danger_report(
  danger_report_id_input uuid,
  close_status_input text default 'dismissed',
  note_input text default null
)
returns public.danger_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
  selected_report public.danger_reports;
  safe_status text;
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
    raise exception 'Profilo BauBook non trovato o non attivo.';
  end if;

  select * into selected_report
  from public.danger_reports
  where id = danger_report_id_input
    and reporter_id = current_profile.id
  limit 1;

  if selected_report.id is null then
    raise exception 'Segnalazione non trovata o non appartenente al tuo profilo.';
  end if;

  safe_status := case
    when close_status_input in ('dismissed', 'expired', 'removed') then close_status_input
    else 'dismissed'
  end;

  update public.danger_reports
     set status = safe_status,
         expires_at = least(expires_at, now()),
         closed_reason = left(nullif(trim(coalesce(note_input, '')), ''), 600),
         updated_at = now()
   where id = selected_report.id
  returning * into result;

  insert into public.audit_logs (actor_profile_id, action, target_type, target_id, metadata)
  values (
    current_profile.id,
    'danger_report_closed',
    'danger_report',
    result.id,
    jsonb_build_object('status', result.status, 'note_present', note_input is not null)
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
  safe_reason public.report_reason;
  normalized_target text;
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
    raise exception 'Profilo BauBook non trovato o non attivo.';
  end if;

  normalized_target := case
    when target_type_input in ('lost_dog_alert', 'danger_report', 'lost_dog_sighting') then target_type_input
    else null
  end;

  if normalized_target is null then
    raise exception 'Tipo contenuto non segnalabile da questa funzione.';
  end if;

  safe_reason := case
    when reason_input in ('spam', 'abuse', 'harassment', 'false_alert', 'dangerous_content', 'privacy_violation', 'scam', 'inappropriate', 'other') then reason_input::public.report_reason
    else 'other'::public.report_reason
  end;

  insert into public.reports (reporter_id, target_type, target_id, reason, description, status)
  values (
    current_profile.id,
    normalized_target,
    target_id_input,
    safe_reason,
    left(nullif(trim(coalesce(description_input, '')), ''), 900),
    'open'
  )
  returning * into result;

  if normalized_target = 'lost_dog_alert' then
    update public.lost_dog_alerts
       set moderation_status = case when safe_reason in ('false_alert', 'abuse', 'privacy_violation') then 'escalated'::public.moderation_status else moderation_status end,
           updated_at = now()
     where id = target_id_input;
  elsif normalized_target = 'danger_report' then
    update public.danger_reports
       set moderation_status = case when safe_reason in ('false_alert', 'abuse', 'privacy_violation') then 'escalated'::public.moderation_status else moderation_status end,
           updated_at = now()
     where id = target_id_input;
  end if;

  insert into public.audit_logs (actor_profile_id, action, target_type, target_id, metadata)
  values (
    current_profile.id,
    'safety_content_reported',
    normalized_target,
    target_id_input,
    jsonb_build_object('report_id', result.id, 'reason', safe_reason)
  );

  return result;
end;
$$;

grant execute on function public.expire_stale_safety_alerts() to anon, authenticated;
grant execute on function public.create_lost_dog_alert(uuid, uuid, text, integer, integer, boolean) to authenticated;
grant execute on function public.close_lost_dog_alert(uuid, text, text) to authenticated;
grant execute on function public.create_lost_dog_sighting(uuid, uuid, text, text, boolean) to authenticated;
grant execute on function public.create_danger_report(uuid, text, text, integer, integer, boolean) to authenticated;
grant execute on function public.close_danger_report(uuid, text, text) to authenticated;
grant execute on function public.report_safety_content(text, uuid, text, text) to authenticated;
