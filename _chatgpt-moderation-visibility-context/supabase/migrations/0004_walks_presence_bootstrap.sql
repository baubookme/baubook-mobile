-- BauBook! 1.8.0
-- Passeggiate e presenza temporanea: funzioni sicure per MVP "So chi c'e'".
-- Run after 0001, seed, 0002 and 0003.

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

  select * into current_profile
  from public.profiles
  where user_id = auth.uid()
    and status = 'active'
  limit 1;

  if current_profile.id is null then
    raise exception 'Profilo BauBook non trovato o non attivo.';
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
    moderation_status
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
    'approved'
  )
  returning * into created_walk;

  insert into public.community_event_participants (event_id, profile_id, dog_id, status, note)
  values (created_event.id, current_profile.id, selected_dog.id, 'joined', 'organizer')
  on conflict (event_id, profile_id) do update
    set dog_id = excluded.dog_id,
        status = 'joined',
        updated_at = now();

  return created_walk;
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

  select * into current_profile
  from public.profiles
  where user_id = auth.uid()
    and status = 'active'
  limit 1;

  if current_profile.id is null then
    raise exception 'Profilo BauBook non trovato o non attivo.';
  end if;

  select * into selected_walk
  from public.walk_plans
  where id = walk_plan_id_input
    and visibility = 'public'
    and moderation_status = 'approved'
    and starts_at > now() - interval '12 hours'
    and accepts_company = true
  limit 1;

  if selected_walk.id is null then
    raise exception 'Passeggiata non disponibile o non aperta a compagnia.';
  end if;

  if dog_id_input is not null then
    select * into selected_dog
    from public.dogs
    where id = dog_id_input
      and owner_id = current_profile.id
      and visibility <> 'removed'
    limit 1;

    if selected_dog.id is null then
      raise exception 'Cane non trovato nel tuo profilo.';
    end if;
  end if;

  insert into public.walk_plan_participants (walk_plan_id, profile_id, dog_id, status)
  values (selected_walk.id, current_profile.id, selected_dog.id, 'interested')
  on conflict (walk_plan_id, profile_id) do update
    set dog_id = excluded.dog_id,
        status = 'interested'
  returning * into result;

  if selected_walk.community_event_id is not null then
    insert into public.community_event_participants (event_id, profile_id, dog_id, status, note)
    values (selected_walk.community_event_id, current_profile.id, selected_dog.id, 'interested', 'walk_plan_interest')
    on conflict (event_id, profile_id) do update
      set dog_id = excluded.dog_id,
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

  select * into current_profile
  from public.profiles
  where user_id = auth.uid()
    and status = 'active'
  limit 1;

  if current_profile.id is null then
    raise exception 'Profilo BauBook non trovato o non attivo.';
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

  if selected_place.id is null then
    raise exception 'Luogo non disponibile per la presenza beta.';
  end if;

  safe_status := case when status_input in ('available', 'walking', 'playing') then status_input else 'walking' end;
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
    expires_at
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
    now() + make_interval(mins => safe_minutes)
  )
  returning * into result;

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

  select * into current_profile
  from public.profiles
  where user_id = auth.uid()
    and status = 'active'
  limit 1;

  if current_profile.id is null then
    raise exception 'Profilo BauBook non trovato o non attivo.';
  end if;

  update public.presence_sessions
     set status = 'offline',
         expires_at = now(),
         updated_at = now()
   where profile_id = current_profile.id
     and expires_at > now()
     and status <> 'offline';

  get diagnostics closed_count = row_count;
  return closed_count;
end;
$$;

grant execute on function public.create_beta_walk_plan(uuid, uuid, timestamptz, text, boolean) to authenticated;
grant execute on function public.join_beta_walk_plan(uuid, uuid) to authenticated;
grant execute on function public.create_or_refresh_presence_session(uuid, uuid, text, text, integer) to authenticated;
grant execute on function public.end_my_presence_sessions() to authenticated;
