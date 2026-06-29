-- BauBook 0.7.1
-- Presence duration polish: default temporary presence duration is 60 minutes.
-- Walk plans still keep their existing 90-minute window; this migration only changes presence sessions.

create or replace function public.create_or_refresh_presence_session(
  place_id_input uuid,
  dog_id_input uuid,
  status_input text default 'walking',
  message_input text default null,
  expires_minutes_input integer default 60,
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

  safe_minutes := greatest(30, least(coalesce(expires_minutes_input, 60), 180));
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
  expires_minutes_input integer default 60,
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

  safe_minutes := greatest(30, least(coalesce(expires_minutes_input, 60), 180));
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

grant execute on function public.create_or_refresh_presence_session(
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
) to authenticated;

grant execute on function public.update_my_active_presence_session(
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
) to authenticated;
