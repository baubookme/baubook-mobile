begin;

drop index if exists public.walk_plans_one_active_per_owner_uidx;
drop index if exists public.walk_plans_owner_active_idx;
drop index if exists public.walk_plans_owner_active_starts_idx;
drop index if exists public.presence_sessions_one_active_per_profile_uidx;
drop index if exists public.presence_sessions_profile_active_expires_idx;

drop function if exists public.create_beta_walk_plan(
  uuid,
  uuid,
  timestamptz,
  text,
  boolean,
  text,
  text,
  double precision,
  double precision,
  text
);

drop function if exists public.create_or_refresh_presence_session(
  uuid,
  uuid,
  text,
  text,
  integer,
  text,
  text,
  double precision,
  double precision,
  text
);

drop function if exists public.update_my_active_walk_plan(uuid, uuid, timestamptz, text, boolean);
drop function if exists public.update_my_active_presence_session(uuid, uuid, text, text, integer);
drop function if exists public.end_my_walk_plan(uuid);
drop function if exists public.end_my_open_walk_plans();

alter table public.walk_plans
  drop column if exists location_mode,
  drop column if exists location_label,
  drop column if exists location_latitude,
  drop column if exists location_longitude,
  drop column if exists manual_address;

alter table public.presence_sessions
  drop column if exists location_mode,
  drop column if exists location_label,
  drop column if exists location_latitude,
  drop column if exists location_longitude,
  drop column if exists manual_address;

alter table public.walk_plans
  add column if not exists active boolean default false;

alter table public.presence_sessions
  add column if not exists active boolean default false;

update public.walk_plans
   set active = false
 where active is distinct from false;

update public.presence_sessions
   set active = false
 where active is distinct from false;

alter table public.walk_plans
  alter column active set default false,
  alter column active set not null;

alter table public.presence_sessions
  alter column active set default false,
  alter column active set not null;

create unique index if not exists walk_plans_one_active_per_owner_uidx
  on public.walk_plans(owner_id)
  where active = true;

create index if not exists walk_plans_owner_active_starts_idx
  on public.walk_plans(owner_id, active, starts_at desc);

create unique index if not exists presence_sessions_one_active_per_profile_uidx
  on public.presence_sessions(profile_id)
  where active = true;

create index if not exists presence_sessions_profile_active_expires_idx
  on public.presence_sessions(profile_id, active, expires_at desc);

create or replace function public.create_beta_walk_plan(
  place_id_input uuid,
  dog_id_input uuid,
  starts_at_input timestamptz,
  message_input text default null,
  accepts_company_input boolean default true
)
returns public.walk_plans
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
  selected_dog public.dogs;
  selected_place public.places;
  created_event public.community_events;
  created_walk public.walk_plans;
  clean_message text;
  safe_starts_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
    into current_profile
    from public.profiles
   where user_id = auth.uid()
     and status = 'active'
   limit 1;

  if current_profile.id is null then
    raise exception 'Profilo BauBook non trovato o non attivo.';
  end if;

  if exists (
    select 1
      from public.walk_plans
     where owner_id = current_profile.id
       and active = true
  ) then
    raise exception 'Hai gia'' una passeggiata attiva. Usa Aggiorna oppure Tornato a casa.';
  end if;

  select *
    into selected_dog
    from public.dogs
   where id = dog_id_input
     and owner_id = current_profile.id
     and visibility <> 'removed'
   limit 1;

  if selected_dog.id is null then
    raise exception 'Cane non trovato nel tuo profilo.';
  end if;

  select *
    into selected_place
    from public.places
   where id = place_id_input
     and visibility = 'public'
     and moderation_status in ('approved', 'pending')
   limit 1;

  if selected_place.id is null then
    raise exception 'Luogo non disponibile per la beta BauBook.';
  end if;

  safe_starts_at := coalesce(starts_at_input, now() + interval '30 minutes');

  if safe_starts_at < now() - interval '15 minutes' then
    raise exception 'La passeggiata non puo'' essere nel passato.';
  end if;

  if safe_starts_at > now() + interval '14 days' then
    raise exception 'Per la beta puoi programmare passeggiate entro 14 giorni.';
  end if;

  clean_message := nullif(trim(coalesce(message_input, '')), '');

  insert into public.community_events (
    city_id,
    place_id,
    organizer_id,
    dog_id,
    event_type,
    status,
    title,
    description,
    starts_at,
    ends_at,
    accepts_new_participants,
    visibility,
    moderation_status,
    metadata
  )
  values (
    coalesce(selected_place.city_id, current_profile.city_id),
    selected_place.id,
    current_profile.id,
    selected_dog.id,
    'walk',
    'scheduled',
    selected_dog.name || ' va a ' || selected_place.name,
    clean_message,
    safe_starts_at,
    safe_starts_at + interval '90 minutes',
    coalesce(accepts_company_input, true),
    'public',
    'approved',
    jsonb_build_object('source', 'baubook_beta_walk_plan', 'created_by_rpc', true)
  )
  returning * into created_event;

  insert into public.walk_plans (
    community_event_id,
    place_id,
    dog_id,
    owner_id,
    starts_at,
    ends_at,
    message,
    accepts_company,
    visibility,
    moderation_status,
    active
  )
  values (
    created_event.id,
    selected_place.id,
    selected_dog.id,
    current_profile.id,
    safe_starts_at,
    safe_starts_at + interval '90 minutes',
    clean_message,
    coalesce(accepts_company_input, true),
    'public',
    'approved',
    true
  )
  returning * into created_walk;

  insert into public.community_event_participants (
    event_id,
    profile_id,
    dog_id,
    status,
    note
  )
  values (
    created_event.id,
    current_profile.id,
    selected_dog.id,
    'joined',
    'organizer'
  )
  on conflict (event_id, profile_id)
  do update set
    dog_id = excluded.dog_id,
    status = 'joined',
    updated_at = now();

  return created_walk;
end;
$$;

create or replace function public.update_my_active_walk_plan(
  place_id_input uuid,
  dog_id_input uuid,
  starts_at_input timestamptz,
  message_input text default null,
  accepts_company_input boolean default true
)
returns public.walk_plans
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
  selected_dog public.dogs;
  selected_place public.places;
  current_walk public.walk_plans;
  updated_walk public.walk_plans;
  clean_message text;
  safe_starts_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
    into current_profile
    from public.profiles
   where user_id = auth.uid()
     and status = 'active'
   limit 1;

  if current_profile.id is null then
    raise exception 'Profilo BauBook non trovato o non attivo.';
  end if;

  select *
    into current_walk
    from public.walk_plans
   where owner_id = current_profile.id
     and active = true
   order by updated_at desc nulls last, created_at desc
   limit 1;

  if current_walk.id is null then
    raise exception 'Non hai una passeggiata attiva da aggiornare.';
  end if;

  select *
    into selected_dog
    from public.dogs
   where id = dog_id_input
     and owner_id = current_profile.id
     and visibility <> 'removed'
   limit 1;

  if selected_dog.id is null then
    raise exception 'Cane non trovato nel tuo profilo.';
  end if;

  select *
    into selected_place
    from public.places
   where id = place_id_input
     and visibility = 'public'
     and moderation_status in ('approved', 'pending')
   limit 1;

  if selected_place.id is null then
    raise exception 'Luogo non disponibile per la beta BauBook.';
  end if;

  safe_starts_at := coalesce(starts_at_input, now() + interval '30 minutes');

  if safe_starts_at < now() - interval '15 minutes' then
    raise exception 'La passeggiata non puo'' essere nel passato.';
  end if;

  if safe_starts_at > now() + interval '14 days' then
    raise exception 'Per la beta puoi programmare passeggiate entro 14 giorni.';
  end if;

  clean_message := nullif(trim(coalesce(message_input, '')), '');

  update public.walk_plans
     set place_id = selected_place.id,
         dog_id = selected_dog.id,
         starts_at = safe_starts_at,
         ends_at = safe_starts_at + interval '90 minutes',
         message = clean_message,
         accepts_company = coalesce(accepts_company_input, true),
         visibility = 'public',
         moderation_status = 'approved',
         updated_at = now()
   where id = current_walk.id
     and owner_id = current_profile.id
     and active = true
  returning * into updated_walk;

  if updated_walk.community_event_id is not null then
    update public.community_events
       set city_id = coalesce(selected_place.city_id, current_profile.city_id),
           place_id = selected_place.id,
           dog_id = selected_dog.id,
           title = selected_dog.name || ' va a ' || selected_place.name,
           description = clean_message,
           starts_at = safe_starts_at,
           ends_at = safe_starts_at + interval '90 minutes',
           accepts_new_participants = coalesce(accepts_company_input, true),
           updated_at = now()
     where id = updated_walk.community_event_id
       and organizer_id = current_profile.id;

    insert into public.community_event_participants (
      event_id,
      profile_id,
      dog_id,
      status,
      note
    )
    values (
      updated_walk.community_event_id,
      current_profile.id,
      selected_dog.id,
      'joined',
      'organizer'
    )
    on conflict (event_id, profile_id)
    do update set
      dog_id = excluded.dog_id,
      status = 'joined',
      updated_at = now();
  end if;

  return updated_walk;
end;
$$;

create or replace function public.end_my_walk_plan(
  walk_plan_id_input uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
  closed_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
    into current_profile
    from public.profiles
   where user_id = auth.uid()
     and status = 'active'
   limit 1;

  if current_profile.id is null then
    raise exception 'Profilo BauBook non trovato o non attivo.';
  end if;

  update public.walk_plans
     set active = false,
         updated_at = now()
   where id = walk_plan_id_input
     and owner_id = current_profile.id
     and active = true;

  get diagnostics closed_count = row_count;
  return closed_count;
end;
$$;

create or replace function public.join_beta_walk_plan(
  walk_plan_id_input uuid,
  dog_id_input uuid default null
)
returns public.walk_plan_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
  selected_walk public.walk_plans;
  selected_dog public.dogs;
  result public.walk_plan_participants;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
    into current_profile
    from public.profiles
   where user_id = auth.uid()
     and status = 'active'
   limit 1;

  if current_profile.id is null then
    raise exception 'Profilo BauBook non trovato o non attivo.';
  end if;

  select *
    into selected_walk
    from public.walk_plans
   where id = walk_plan_id_input
     and visibility = 'public'
     and moderation_status = 'approved'
     and active = true
     and accepts_company = true
   limit 1;

  if selected_walk.id is null then
    raise exception 'Passeggiata non disponibile o non aperta a compagnia.';
  end if;

  if dog_id_input is not null then
    select *
      into selected_dog
      from public.dogs
     where id = dog_id_input
       and owner_id = current_profile.id
       and visibility <> 'removed'
     limit 1;

    if selected_dog.id is null then
      raise exception 'Cane non trovato nel tuo profilo.';
    end if;
  end if;

  insert into public.walk_plan_participants (
    walk_plan_id,
    profile_id,
    dog_id,
    status
  )
  values (
    selected_walk.id,
    current_profile.id,
    selected_dog.id,
    'interested'
  )
  on conflict (walk_plan_id, profile_id)
  do update set
    dog_id = excluded.dog_id,
    status = 'interested'
  returning * into result;

  if selected_walk.community_event_id is not null then
    insert into public.community_event_participants (
      event_id,
      profile_id,
      dog_id,
      status,
      note
    )
    values (
      selected_walk.community_event_id,
      current_profile.id,
      selected_dog.id,
      'interested',
      'walk_plan_interest'
    )
    on conflict (event_id, profile_id)
    do update set
      dog_id = excluded.dog_id,
      status = 'interested',
      updated_at = now();
  end if;

  return result;
end;
$$;

create or replace function public.create_or_refresh_presence_session(
  place_id_input uuid,
  dog_id_input uuid,
  status_input text default 'walking',
  message_input text default null,
  expires_minutes_input integer default 90
)
returns public.presence_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
  selected_dog public.dogs;
  selected_place public.places;
  result public.presence_sessions;
  safe_status text;
  safe_minutes integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
    into current_profile
    from public.profiles
   where user_id = auth.uid()
     and status = 'active'
   limit 1;

  if current_profile.id is null then
    raise exception 'Profilo BauBook non trovato o non attivo.';
  end if;

  update public.presence_sessions
     set active = false,
         status = 'offline',
         updated_at = now()
   where profile_id = current_profile.id
     and active = true
     and expires_at <= now();

  if exists (
    select 1
      from public.presence_sessions
     where profile_id = current_profile.id
       and active = true
  ) then
    raise exception 'Hai gia'' una presenza attiva. Usa Aggiorna oppure chiudi la presenza.';
  end if;

  select *
    into selected_dog
    from public.dogs
   where id = dog_id_input
     and owner_id = current_profile.id
     and visibility <> 'removed'
   limit 1;

  if selected_dog.id is null then
    raise exception 'Cane non trovato nel tuo profilo.';
  end if;

  select *
    into selected_place
    from public.places
   where id = place_id_input
     and visibility = 'public'
     and moderation_status in ('approved', 'pending')
   limit 1;

  if selected_place.id is null then
    raise exception 'Luogo non disponibile per la presenza beta.';
  end if;

  safe_status := case
    when status_input in ('available', 'walking', 'playing') then status_input
    else 'walking'
  end;

  safe_minutes := greatest(30, least(coalesce(expires_minutes_input, 90), 180));

  insert into public.presence_sessions (
    profile_id,
    dog_id,
    city_id,
    place_id,
    status,
    message,
    visibility,
    moderation_status,
    expires_at,
    active
  )
  values (
    current_profile.id,
    selected_dog.id,
    coalesce(selected_place.city_id, current_profile.city_id),
    selected_place.id,
    safe_status,
    nullif(trim(coalesce(message_input, '')), ''),
    'public',
    'approved',
    now() + make_interval(mins => safe_minutes),
    true
  )
  returning * into result;

  return result;
end;
$$;

create or replace function public.update_my_active_presence_session(
  place_id_input uuid,
  dog_id_input uuid,
  status_input text default 'walking',
  message_input text default null,
  expires_minutes_input integer default 90
)
returns public.presence_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
  selected_dog public.dogs;
  selected_place public.places;
  result public.presence_sessions;
  safe_status text;
  safe_minutes integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
    into current_profile
    from public.profiles
   where user_id = auth.uid()
     and status = 'active'
   limit 1;

  if current_profile.id is null then
    raise exception 'Profilo BauBook non trovato o non attivo.';
  end if;

  select *
    into selected_dog
    from public.dogs
   where id = dog_id_input
     and owner_id = current_profile.id
     and visibility <> 'removed'
   limit 1;

  if selected_dog.id is null then
    raise exception 'Cane non trovato nel tuo profilo.';
  end if;

  select *
    into selected_place
    from public.places
   where id = place_id_input
     and visibility = 'public'
     and moderation_status in ('approved', 'pending')
   limit 1;

  if selected_place.id is null then
    raise exception 'Luogo non disponibile per la presenza beta.';
  end if;

  safe_status := case
    when status_input in ('available', 'walking', 'playing') then status_input
    else 'walking'
  end;

  safe_minutes := greatest(30, least(coalesce(expires_minutes_input, 90), 180));

  update public.presence_sessions
     set dog_id = selected_dog.id,
         city_id = coalesce(selected_place.city_id, current_profile.city_id),
         place_id = selected_place.id,
         status = safe_status,
         message = nullif(trim(coalesce(message_input, '')), ''),
         visibility = 'public',
         moderation_status = 'approved',
         expires_at = now() + make_interval(mins => safe_minutes),
         updated_at = now()
   where profile_id = current_profile.id
     and active = true
  returning * into result;

  if result.id is null then
    raise exception 'Non hai una presenza attiva da aggiornare.';
  end if;

  return result;
end;
$$;

create or replace function public.end_my_presence_sessions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
  closed_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
    into current_profile
    from public.profiles
   where user_id = auth.uid()
     and status = 'active'
   limit 1;

  if current_profile.id is null then
    raise exception 'Profilo BauBook non trovato o non attivo.';
  end if;

  update public.presence_sessions
     set active = false,
         status = 'offline',
         expires_at = least(expires_at, now()),
         updated_at = now()
   where profile_id = current_profile.id
     and active = true;

  get diagnostics closed_count = row_count;
  return closed_count;
end;
$$;

grant execute on function public.create_beta_walk_plan(uuid, uuid, timestamptz, text, boolean) to authenticated;
grant execute on function public.update_my_active_walk_plan(uuid, uuid, timestamptz, text, boolean) to authenticated;
grant execute on function public.end_my_walk_plan(uuid) to authenticated;
grant execute on function public.join_beta_walk_plan(uuid, uuid) to authenticated;
grant execute on function public.create_or_refresh_presence_session(uuid, uuid, text, text, integer) to authenticated;
grant execute on function public.update_my_active_presence_session(uuid, uuid, text, text, integer) to authenticated;
grant execute on function public.end_my_presence_sessions() to authenticated;

commit;
