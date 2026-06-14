begin;

alter table public.walk_plans
  add column if not exists location_mode text,
  add column if not exists location_label text,
  add column if not exists location_latitude double precision,
  add column if not exists location_longitude double precision,
  add column if not exists manual_address text;

alter table public.presence_sessions
  add column if not exists location_mode text,
  add column if not exists location_label text,
  add column if not exists location_latitude double precision,
  add column if not exists location_longitude double precision,
  add column if not exists manual_address text;

alter table public.walk_plans
  drop constraint if exists walk_plans_location_mode_check;

alter table public.walk_plans
  add constraint walk_plans_location_mode_check
  check (location_mode is null or location_mode in ('current', 'manual'));

alter table public.presence_sessions
  drop constraint if exists presence_sessions_location_mode_check;

alter table public.presence_sessions
  add constraint presence_sessions_location_mode_check
  check (location_mode is null or location_mode in ('current', 'manual'));

drop function if exists public.create_beta_walk_plan(uuid, uuid, timestamptz, text, boolean);
drop function if exists public.update_my_active_walk_plan(uuid, uuid, timestamptz, text, boolean);
drop function if exists public.create_or_refresh_presence_session(uuid, uuid, text, text, integer);
drop function if exists public.update_my_active_presence_session(uuid, uuid, text, text, integer);

create or replace function public.create_beta_walk_plan(
  place_id_input uuid,
  dog_id_input uuid,
  starts_at_input timestamptz,
  message_input text default null,
  accepts_company_input boolean default true,
  location_mode_input text default null,
  location_label_input text default null,
  location_latitude_input double precision default null,
  location_longitude_input double precision default null,
  manual_address_input text default null
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
  safe_location_mode text;
  safe_location_label text;
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
    raise exception 'Hai gia'' una passeggiata attiva. Usa Aggiorna o Tornato a casa.';
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
  safe_location_mode := case when location_mode_input in ('current', 'manual') then location_mode_input else null end;
  safe_location_label := nullif(trim(coalesce(location_label_input, '')), '');

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
    selected_dog.name || ' va a ' || coalesce(safe_location_label, selected_place.name),
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
    active,
    location_mode,
    location_label,
    location_latitude,
    location_longitude,
    manual_address
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
    true,
    safe_location_mode,
    safe_location_label,
    location_latitude_input,
    location_longitude_input,
    nullif(trim(coalesce(manual_address_input, '')), '')
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
  accepts_company_input boolean default true,
  location_mode_input text default null,
  location_label_input text default null,
  location_latitude_input double precision default null,
  location_longitude_input double precision default null,
  manual_address_input text default null
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
  updated_walk public.walk_plans;
  clean_message text;
  safe_starts_at timestamptz;
  safe_location_mode text;
  safe_location_label text;
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
  safe_location_mode := case when location_mode_input in ('current', 'manual') then location_mode_input else null end;
  safe_location_label := nullif(trim(coalesce(location_label_input, '')), '');

  update public.walk_plans
     set place_id = selected_place.id,
         dog_id = selected_dog.id,
         starts_at = safe_starts_at,
         ends_at = safe_starts_at + interval '90 minutes',
         message = clean_message,
         accepts_company = coalesce(accepts_company_input, true),
         location_mode = safe_location_mode,
         location_label = safe_location_label,
         location_latitude = location_latitude_input,
         location_longitude = location_longitude_input,
         manual_address = nullif(trim(coalesce(manual_address_input, '')), ''),
         updated_at = now()
   where owner_id = current_profile.id
     and active = true
   returning * into updated_walk;

  if updated_walk.id is null then
    raise exception 'Nessuna passeggiata attiva da aggiornare.';
  end if;

  update public.community_events
     set place_id = selected_place.id,
         dog_id = selected_dog.id,
         title = selected_dog.name || ' va a ' || coalesce(safe_location_label, selected_place.name),
         description = clean_message,
         starts_at = safe_starts_at,
         ends_at = safe_starts_at + interval '90 minutes',
         accepts_new_participants = coalesce(accepts_company_input, true),
         updated_at = now()
   where id = updated_walk.community_event_id;

  return updated_walk;
end;
$$;

create or replace function public.create_or_refresh_presence_session(
  place_id_input uuid,
  dog_id_input uuid,
  status_input text default 'walking',
  message_input text default null,
  expires_minutes_input integer default 90,
  location_mode_input text default null,
  location_label_input text default null,
  location_latitude_input double precision default null,
  location_longitude_input double precision default null,
  manual_address_input text default null
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
  safe_location_mode text;
  safe_location_label text;
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
      from public.presence_sessions
     where profile_id = current_profile.id
       and active = true
  ) then
    raise exception 'Hai gia'' una presenza attiva. Usa Aggiorna o Tornato a casa.';
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
    when status_input in ('available', 'walking', 'playing', 'dog_area') then status_input
    else 'walking'
  end;

  safe_minutes := greatest(30, least(coalesce(expires_minutes_input, 90), 180));
  safe_location_mode := case when location_mode_input in ('current', 'manual') then location_mode_input else null end;
  safe_location_label := nullif(trim(coalesce(location_label_input, '')), '');

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
    active,
    location_mode,
    location_label,
    location_latitude,
    location_longitude,
    manual_address
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
    true,
    safe_location_mode,
    safe_location_label,
    location_latitude_input,
    location_longitude_input,
    nullif(trim(coalesce(manual_address_input, '')), '')
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
  expires_minutes_input integer default 90,
  location_mode_input text default null,
  location_label_input text default null,
  location_latitude_input double precision default null,
  location_longitude_input double precision default null,
  manual_address_input text default null
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
  safe_location_mode text;
  safe_location_label text;
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
    when status_input in ('available', 'walking', 'playing', 'dog_area') then status_input
    else 'walking'
  end;

  safe_minutes := greatest(30, least(coalesce(expires_minutes_input, 90), 180));
  safe_location_mode := case when location_mode_input in ('current', 'manual') then location_mode_input else null end;
  safe_location_label := nullif(trim(coalesce(location_label_input, '')), '');

  update public.presence_sessions
     set dog_id = selected_dog.id,
         city_id = coalesce(selected_place.city_id, current_profile.city_id),
         place_id = selected_place.id,
         status = safe_status,
         message = nullif(trim(coalesce(message_input, '')), ''),
         expires_at = now() + make_interval(mins => safe_minutes),
         location_mode = safe_location_mode,
         location_label = safe_location_label,
         location_latitude = location_latitude_input,
         location_longitude = location_longitude_input,
         manual_address = nullif(trim(coalesce(manual_address_input, '')), ''),
         updated_at = now()
   where profile_id = current_profile.id
     and active = true
   returning * into result;

  if result.id is null then
    raise exception 'Nessuna presenza attiva da aggiornare.';
  end if;

  return result;
end;
$$;

grant execute on function public.create_beta_walk_plan(uuid, uuid, timestamptz, text, boolean, text, text, double precision, double precision, text) to authenticated;
grant execute on function public.update_my_active_walk_plan(uuid, uuid, timestamptz, text, boolean, text, text, double precision, double precision, text) to authenticated;
grant execute on function public.create_or_refresh_presence_session(uuid, uuid, text, text, integer, text, text, double precision, double precision, text) to authenticated;
grant execute on function public.update_my_active_presence_session(uuid, uuid, text, text, integer, text, text, double precision, double precision, text) to authenticated;

commit;
