-- BauBook 0.7.2 - Safety gate aligned to beta auth policy.
--
-- Current beta policy:
--   an email/password authenticated BauBook account is enough to create Safety reports.
--
-- Older Safety RPCs use profiles.is_verified_email / is_verified_phone as the server-side gate.
-- With password auth and no mandatory OTP/email confirmation, profiles created by the auth trigger
-- may keep is_verified_email = false, so Safety RPCs reject legitimate logged-in beta users with:
--   "Utente non verificato".
--
-- This migration keeps the existing RPCs and RLS model intact, but aligns the profile flag semantics:
-- for the current beta, an active Supabase Auth user with an email-backed account is marked as
-- email-enabled/allowed for Safety actions.

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
  has_email_account boolean;
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

-- Backfill existing active beta users created before this alignment.
update public.profiles p
set is_verified_email = true,
    updated_at = now()
from auth.users u
where u.id = p.user_id
  and nullif(trim(coalesce(u.email, '')), '') is not null
  and coalesce(p.status, 'active') <> 'deleted'
  and coalesce(p.account_status, 'active') = 'active'
  and coalesce(p.is_verified_email, false) = false;

-- Keep profiles aligned if an email-backed auth user is updated after profile creation.
create or replace function public.mark_profile_email_backed_for_safety()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(coalesce(new.email, '')), '') is not null then
    update public.profiles p
       set is_verified_email = true,
           updated_at = now()
     where p.user_id = new.id
       and coalesce(p.status, 'active') <> 'deleted'
       and coalesce(p.account_status, 'active') = 'active'
       and coalesce(p.is_verified_email, false) = false;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_email_backed_for_safety on auth.users;
create trigger on_auth_user_email_backed_for_safety
  after insert or update of email on auth.users
  for each row execute function public.mark_profile_email_backed_for_safety();
