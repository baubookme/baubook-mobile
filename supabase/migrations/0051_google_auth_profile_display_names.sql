-- BauBook 0.7.4 - Better profile names for native Google auth.
--
-- Google auth commonly provides full_name/name metadata instead of display_name.
-- Keep the visible BauBook name human-readable at first login, while avoiding
-- unique display-name collisions that could block auth profile creation.

create or replace function public.create_profile_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_city_id uuid;
  default_city_name text;
  preferred_display_name text;
  default_display_name text;
  has_email_account boolean;
  user_suffix text;
begin
  select id, name
    into default_city_id, default_city_name
  from public.cities
  where slug = 'venezia-mestre'
  limit 1;

  preferred_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'preferred_username'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'user_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Nuovo umano BauBook'
  );

  default_display_name := preferred_display_name;
  user_suffix := substring(replace(new.id::text, '-', '') from 1 for 6);

  if exists (
    select 1
    from public.profiles p
    where p.user_id <> new.id
      and lower(btrim(p.display_name)) = lower(btrim(default_display_name))
  ) then
    default_display_name := trim(left(preferred_display_name, 52)) || ' ' || user_suffix;
  end if;

  has_email_account := nullif(trim(coalesce(new.email, '')), '') is not null;

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
    has_email_account,
    'active'
  )
  on conflict (user_id) do update
    set is_verified_email = case
          when has_email_account then true
          else public.profiles.is_verified_email
        end,
        updated_at = now();

  return new;
end;
$$;
