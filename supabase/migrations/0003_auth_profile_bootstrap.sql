-- BauBook! 1.7.0
-- Auth bootstrap: profile creation/update helpers for email OTP / magic link login.
-- Run after 0001_initial_schema.sql, seed and 0002_api_access_grants.sql.

create or replace function public.create_profile_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_city_id uuid;
  default_city_name text;
  default_display_name text;
begin
  select id, name
    into default_city_id, default_city_name
  from public.cities
  where slug = 'venezia-mestre'
  limit 1;

  default_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Nuovo umano BauBook'
  );

  insert into public.profiles (
    user_id,
    display_name,
    city_id,
    city_label,
    is_verified_email,
    status
  )
  values (
    new.id,
    default_display_name,
    default_city_id,
    coalesce(default_city_name, 'Venezia-Mestre'),
    new.email_confirmed_at is not null,
    'active'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_new_auth_user();

create or replace function public.ensure_current_profile(
  display_name_input text default null,
  city_slug_input text default 'venezia-mestre'
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
  default_city_id uuid;
  default_city_name text;
  clean_display_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select id, name
    into default_city_id, default_city_name
  from public.cities
  where slug = coalesce(nullif(trim(city_slug_input), ''), 'venezia-mestre')
  limit 1;

  clean_display_name := nullif(trim(coalesce(display_name_input, '')), '');

  insert into public.profiles (
    user_id,
    display_name,
    city_id,
    city_label,
    is_verified_email,
    status
  )
  values (
    auth.uid(),
    coalesce(clean_display_name, 'Nuovo umano BauBook'),
    default_city_id,
    coalesce(default_city_name, 'Venezia-Mestre'),
    true,
    'active'
  )
  on conflict (user_id) do update
    set display_name = coalesce(clean_display_name, public.profiles.display_name),
        city_id = coalesce(excluded.city_id, public.profiles.city_id),
        city_label = coalesce(excluded.city_label, public.profiles.city_label),
        is_verified_email = true,
        status = case when public.profiles.status = 'deleted' then 'active' else public.profiles.status end,
        updated_at = now()
  returning * into result;

  return result;
end;
$$;

grant execute on function public.ensure_current_profile(text, text) to authenticated;

grant usage on schema public to authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.dogs to authenticated;
