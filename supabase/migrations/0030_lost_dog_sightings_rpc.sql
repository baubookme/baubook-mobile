-- BauBook 0.6.1 - Lost dog sightings controlled RPC
-- Scope: Aiuto / Mi sono perso / Avvistato
-- Baseline: baubook-0.6.1-auth-current-baseline

alter table public.lost_dog_sightings
  add column if not exists location_mode text,
  add column if not exists location_label text,
  add column if not exists location_latitude double precision,
  add column if not exists location_longitude double precision,
  add column if not exists manual_address text,
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists closed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lost_dog_sightings_status_check'
      and conrelid = 'public.lost_dog_sightings'::regclass
  ) then
    alter table public.lost_dog_sightings
      add constraint lost_dog_sightings_status_check
      check (status in ('active', 'closed', 'expired', 'dismissed')) not valid;

    alter table public.lost_dog_sightings
      validate constraint lost_dog_sightings_status_check;
  end if;
end;
$$;

-- Compatibility prelude: older beta schemas may not have these columns yet.
alter table public.lost_dog_sightings
  add column if not exists updated_at timestamptz;

alter table public.lost_dog_sightings
  add column if not exists sighted_at timestamptz;

update public.lost_dog_sightings
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

update public.lost_dog_sightings
set sighted_at = coalesce(sighted_at, updated_at, created_at, now())
where sighted_at is null;

alter table public.lost_dog_sightings
  alter column updated_at set default now();

alter table public.lost_dog_sightings
  alter column sighted_at set default now();
-- Keep the newest sighting if old beta data contains duplicated sightings by the same user.
with ranked_sightings as (
  select
    ctid,
    row_number() over (
      partition by alert_id, reporter_id
      order by coalesce(updated_at, sighted_at, created_at) desc, ctid desc
    ) as rn
  from public.lost_dog_sightings
)
delete from public.lost_dog_sightings s
using ranked_sightings r
where s.ctid = r.ctid
  and r.rn > 1;

create unique index if not exists lost_dog_sightings_alert_reporter_uidx
  on public.lost_dog_sightings(alert_id, reporter_id);

create index if not exists lost_dog_sightings_alert_status_sighted_idx
  on public.lost_dog_sightings(alert_id, status, sighted_at desc);

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
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_id uuid := auth.uid();
  alert_record record;
  sighting_id uuid;
  normalized_mode text := coalesce(nullif(btrim(location_mode_input), ''), 'current');
  normalized_label text := nullif(btrim(coalesce(location_label_input, manual_address_input, '')), '');
  normalized_note text := nullif(btrim(coalesce(note_input, '')), '');
begin
  if current_profile_id is null then
    raise exception 'Utente non autenticato.';
  end if;

  if disclaimer_accepted_input is not true then
    raise exception 'Devi confermare il disclaimer prima di registrare un avvistamento.';
  end if;

  if normalized_mode not in ('current', 'manual') then
    raise exception 'Modalita posizione non valida.';
  end if;

  if normalized_mode = 'manual' and length(coalesce(manual_address_input, '')) < 10 then
    raise exception 'Inserisci un indirizzo manuale piu dettagliato.';
  end if;

  select id, owner_id, status, moderation_status, expires_at
    into alert_record
  from public.lost_dog_alerts
  where id = alert_id_input
  limit 1;

  if not found then
    raise exception 'Alert smarrimento non trovato.';
  end if;

  if alert_record.owner_id = current_profile_id then
    raise exception 'Il proprietario non puo registrare un avvistamento sul proprio alert.';
  end if;

  if alert_record.status <> 'active'
     or alert_record.moderation_status <> 'approved'
     or alert_record.expires_at <= now() then
    raise exception 'Alert smarrimento non piu attivo.';
  end if;

  insert into public.lost_dog_sightings (
    alert_id,
    reporter_id,
    place_id,
    sighting_type,
    note,
    disclaimer_accepted,
    sighted_at,
    created_at,
    updated_at,
    location_mode,
    location_label,
    location_latitude,
    location_longitude,
    manual_address,
    status,
    closed_at
  ) values (
    alert_id_input,
    current_profile_id,
    null,
    coalesce(nullif(btrim(sighting_type_input), ''), 'seen'),
    normalized_note,
    true,
    now(),
    now(),
    now(),
    normalized_mode,
    coalesce(normalized_label, 'Posizione condivisa'),
    location_latitude_input,
    location_longitude_input,
    nullif(btrim(coalesce(manual_address_input, '')), ''),
    'active',
    null
  )
  on conflict (alert_id, reporter_id)
  do update set
    place_id = null,
    sighting_type = excluded.sighting_type,
    note = excluded.note,
    disclaimer_accepted = true,
    sighted_at = now(),
    updated_at = now(),
    location_mode = excluded.location_mode,
    location_label = excluded.location_label,
    location_latitude = excluded.location_latitude,
    location_longitude = excluded.location_longitude,
    manual_address = excluded.manual_address,
    status = 'active',
    closed_at = null
  returning id into sighting_id;

  return sighting_id;
end;
$$;

grant execute on function public.upsert_lost_dog_sighting(uuid, text, text, boolean, text, text, double precision, double precision, text) to authenticated;

create or replace function public.fetch_lost_dog_sightings_for_alerts(alert_ids_input uuid[])
returns table (
  alert_id uuid,
  sighting_id uuid,
  reporter_id uuid,
  reporter_name text,
  sighting_type text,
  note text,
  sighting_at timestamptz,
  updated_at timestamptz,
  location_mode text,
  location_label text,
  location_latitude double precision,
  location_longitude double precision,
  manual_address text,
  is_mine boolean
)
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select
      s.alert_id,
      s.id as sighting_id,
      s.reporter_id,
      coalesce(nullif(p.display_name, ''), 'Umano BauBook') as reporter_name,
      s.sighting_type,
      s.note,
      coalesce(s.sighted_at, s.created_at) as sighting_at,
      coalesce(s.updated_at, s.sighted_at, s.created_at) as updated_at,
      coalesce(s.location_mode, 'current') as location_mode,
      coalesce(nullif(s.location_label, ''), nullif(s.manual_address, ''), 'Posizione condivisa') as location_label,
      s.location_latitude,
      s.location_longitude,
      s.manual_address,
      (s.reporter_id = auth.uid()) as is_mine,
      row_number() over (
        partition by s.alert_id
        order by coalesce(s.sighted_at, s.updated_at, s.created_at) desc
      ) as rn
    from public.lost_dog_sightings s
    join public.lost_dog_alerts a on a.id = s.alert_id
    left join public.profiles p on p.id = s.reporter_id
    where s.alert_id = any(coalesce(alert_ids_input, array[]::uuid[]))
      and s.status = 'active'
      and a.status = 'active'
      and a.moderation_status = 'approved'
      and a.expires_at > now()
  )
  select
    ranked.alert_id,
    ranked.sighting_id,
    ranked.reporter_id,
    ranked.reporter_name,
    ranked.sighting_type,
    ranked.note,
    ranked.sighting_at,
    ranked.updated_at,
    ranked.location_mode,
    ranked.location_label,
    ranked.location_latitude,
    ranked.location_longitude,
    ranked.manual_address,
    ranked.is_mine
  from ranked
  where ranked.rn <= 5
  order by ranked.sighting_at desc;
$$;

grant execute on function public.fetch_lost_dog_sightings_for_alerts(uuid[]) to authenticated;

create or replace function public.fetch_my_safety_report_targets(target_ids_input uuid[])
returns table (
  target_type text,
  target_id uuid
)
language sql
security definer
set search_path = public
as $$
  select distinct r.target_type, r.target_id
  from public.reports r
  where r.reporter_id = auth.uid()
    and r.target_id = any(coalesce(target_ids_input, array[]::uuid[]))
    and r.target_type in ('lost_dog_alert', 'danger_report')
    and r.status in ('open', 'reviewing', 'actioned');
$$;

grant execute on function public.fetch_my_safety_report_targets(uuid[]) to authenticated;

alter table public.reports
  add column if not exists updated_at timestamptz not null default now();

-- Avoid duplicate abuse reports from the same user for the same active target.
with ranked_reports as (
  select
    ctid,
    row_number() over (
      partition by reporter_id, target_type, target_id
      order by coalesce(updated_at, created_at) desc, ctid desc
    ) as rn
  from public.reports
  where status in ('open', 'reviewing', 'actioned')
)
delete from public.reports r
using ranked_reports rr
where r.ctid = rr.ctid
  and rr.rn > 1;

create unique index if not exists reports_reporter_target_open_uidx
  on public.reports(reporter_id, target_type, target_id)
  where status in ('open', 'reviewing', 'actioned');

drop function if exists public.report_safety_content(text, uuid, text, text);

create or replace function public.report_safety_content(
  target_type_input text,
  target_id_input uuid,
  reason_input text default 'false_alert',
  description_input text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_id uuid := auth.uid();
  existing_report_id uuid;
  created_report_id uuid;
begin
  if current_profile_id is null then
    raise exception 'Utente non autenticato.';
  end if;

  if target_type_input not in ('lost_dog_alert', 'danger_report') then
    raise exception 'Tipo contenuto non valido.';
  end if;

  select id into existing_report_id
  from public.reports
  where reporter_id = current_profile_id
    and target_type = target_type_input
    and target_id = target_id_input
    and status in ('open', 'reviewing', 'actioned')
  order by coalesce(updated_at, created_at) desc
  limit 1;

  if existing_report_id is not null then
    return existing_report_id;
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
  ) values (
    current_profile_id,
    target_type_input,
    target_id_input,
    coalesce(nullif(btrim(reason_input), ''), 'false_alert'),
    nullif(btrim(coalesce(description_input, '')), ''),
    'open',
    now(),
    now()
  )
  returning id into created_report_id;

  return created_report_id;
end;
$$;

grant execute on function public.report_safety_content(text, uuid, text, text) to authenticated;

create or replace function public.close_lost_dog_sightings_when_alert_closes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'active' and new.status <> 'active' then
    update public.lost_dog_sightings
    set status = case when new.status = 'expired' then 'expired' else 'closed' end,
        closed_at = now(),
        updated_at = now()
    where alert_id = new.id
      and status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_close_lost_dog_sightings_when_alert_closes on public.lost_dog_alerts;
create trigger trg_close_lost_dog_sightings_when_alert_closes
after update of status on public.lost_dog_alerts
for each row
execute function public.close_lost_dog_sightings_when_alert_closes();
