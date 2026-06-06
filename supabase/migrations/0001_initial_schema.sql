-- BauBook! Venezia-Mestre MVP
-- Schema iniziale per Supabase/PostgreSQL/PostGIS.
-- Da eseguire nel SQL editor Supabase dopo avere creato il progetto.

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ENUMS ----------------------------------------------------------------------
do $$ begin
  create type public.user_status as enum ('active', 'suspended', 'banned', 'deleted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.moderation_status as enum ('pending', 'approved', 'rejected', 'hidden', 'escalated', 'removed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.content_visibility as enum ('public', 'friends', 'private', 'shadow_hidden', 'removed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.place_type as enum ('dog_area', 'walk', 'vet', 'pet_shop', 'warning_zone', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.alert_status as enum ('active', 'resolved', 'expired', 'abuse_locked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_reason as enum (
    'spam',
    'abuse',
    'harassment',
    'false_alert',
    'dangerous_content',
    'privacy_violation',
    'scam',
    'inappropriate',
    'other'
  );
exception when duplicate_object then null; end $$;

-- HELPERS --------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_current_user_profile(profile_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = profile_uuid
      and p.user_id = auth.uid()
      and p.status = 'active'
  );
$$;

-- CORE TABLES ----------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null default 'Nuovo umano BauBook',
  avatar_url text,
  city text not null default 'Venezia-Mestre',
  home_area geometry(Point, 4326),
  is_verified_email boolean not null default false,
  is_verified_phone boolean not null default false,
  trust_score integer not null default 0,
  status public.user_status not null default 'active',
  suspension_reason text,
  suspended_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  avatar_url text,
  birth_year integer,
  size text check (size in ('small', 'medium', 'large', 'giant') or size is null),
  personality_tags text[] not null default '{}',
  sociality_tags text[] not null default '{}',
  walk_tags text[] not null default '{}',
  notes_public text,
  notes_private text,
  visibility public.content_visibility not null default 'public',
  moderation_status public.moderation_status not null default 'approved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dog_media (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text,
  visibility public.content_visibility not null default 'public',
  moderation_status public.moderation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.place_type not null,
  location geometry(Point, 4326),
  area geometry(Polygon, 4326),
  google_place_id text,
  source text not null default 'user',
  tags text[] not null default '{}',
  city text not null default 'Venezia-Mestre',
  description text,
  moderation_status public.moderation_status not null default 'pending',
  visibility public.content_visibility not null default 'public',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint places_has_geometry check (location is not null or area is not null)
);

create table if not exists public.place_reviews (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text,
  tags text[] not null default '{}',
  moderation_status public.moderation_status not null default 'pending',
  visibility public.content_visibility not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_id, reviewer_id)
);

create table if not exists public.walk_plans (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references public.places(id) on delete set null,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  message text,
  accepts_company boolean not null default true,
  visibility public.content_visibility not null default 'public',
  moderation_status public.moderation_status not null default 'approved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint walk_ends_after_start check (ends_at is null or ends_at > starts_at)
);

create table if not exists public.walk_plan_participants (
  id uuid primary key default gen_random_uuid(),
  walk_plan_id uuid not null references public.walk_plans(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  dog_id uuid references public.dogs(id) on delete set null,
  status text not null default 'interested' check (status in ('interested', 'joined', 'declined', 'blocked')),
  created_at timestamptz not null default now(),
  unique (walk_plan_id, profile_id)
);

-- SAFETY ---------------------------------------------------------------------
create table if not exists public.lost_dog_alerts (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  last_seen_area geometry(Polygon, 4326) not null,
  last_seen_at timestamptz not null,
  description text,
  contact_mode text not null default 'in_app' check (contact_mode in ('in_app', 'phone_reveal_after_contact', 'public_phone')),
  status public.alert_status not null default 'active',
  moderation_status public.moderation_status not null default 'approved',
  expires_at timestamptz not null default now() + interval '24 hours',
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lost_alert_close_status check ((closed_at is null) or (status in ('resolved', 'expired', 'abuse_locked')))
);

create table if not exists public.lost_dog_sightings (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.lost_dog_alerts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  location geometry(Point, 4326),
  area geometry(Polygon, 4326),
  note text,
  sighting_type text not null default 'seen' check (sighting_type in ('seen', 'maybe_seen', 'recovered')),
  moderation_status public.moderation_status not null default 'approved',
  created_at timestamptz not null default now(),
  constraint sighting_has_geometry check (location is not null or area is not null)
);

create table if not exists public.danger_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  danger_type text not null,
  location geometry(Point, 4326),
  area geometry(Polygon, 4326),
  description text,
  severity integer not null default 2 check (severity between 1 and 5),
  status text not null default 'active' check (status in ('active', 'confirmed', 'dismissed', 'expired', 'removed')),
  moderation_status public.moderation_status not null default 'pending',
  expires_at timestamptz not null default now() + interval '6 hours',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint danger_has_geometry check (location is not null or area is not null)
);

create table if not exists public.alert_notifications (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null check (alert_type in ('lost_dog', 'danger')),
  alert_id uuid not null,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  delivery_status text not null default 'queued' check (delivery_status in ('queued', 'sent', 'failed', 'skipped')),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- MODERATION -----------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason public.report_reason not null,
  description text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'actioned', 'rejected', 'duplicate')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint no_self_block check (blocker_id <> blocked_profile_id),
  unique (blocker_id, blocked_profile_id)
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  reason text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.user_suspensions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  moderator_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.content_removals (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid references public.profiles(id) on delete set null,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('android', 'ios', 'web')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, token)
);

create table if not exists public.supporter_entitlements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  entitlement text not null,
  source text not null default 'manual',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  unique (profile_id, entitlement, source)
);

-- INDEXES --------------------------------------------------------------------
create index if not exists profiles_user_id_idx on public.profiles(user_id);
create index if not exists dogs_owner_id_idx on public.dogs(owner_id);
create index if not exists places_location_gix on public.places using gist(location);
create index if not exists places_area_gix on public.places using gist(area);
create index if not exists lost_dog_alerts_area_gix on public.lost_dog_alerts using gist(last_seen_area);
create index if not exists danger_reports_location_gix on public.danger_reports using gist(location);
create index if not exists danger_reports_area_gix on public.danger_reports using gist(area);
create index if not exists walk_plans_starts_at_idx on public.walk_plans(starts_at);
create index if not exists reports_target_idx on public.reports(target_type, target_id);
create index if not exists audit_logs_target_idx on public.audit_logs(target_type, target_id);

-- TRIGGERS -------------------------------------------------------------------
do $$ begin
  create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger dogs_set_updated_at before update on public.dogs for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger dog_media_set_updated_at before update on public.dog_media for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger places_set_updated_at before update on public.places for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger place_reviews_set_updated_at before update on public.place_reviews for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger walk_plans_set_updated_at before update on public.walk_plans for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger lost_dog_alerts_set_updated_at before update on public.lost_dog_alerts for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger danger_reports_set_updated_at before update on public.danger_reports for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger reports_set_updated_at before update on public.reports for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger push_tokens_set_updated_at before update on public.push_tokens for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- RLS ------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.dogs enable row level security;
alter table public.dog_media enable row level security;
alter table public.places enable row level security;
alter table public.place_reviews enable row level security;
alter table public.walk_plans enable row level security;
alter table public.walk_plan_participants enable row level security;
alter table public.lost_dog_alerts enable row level security;
alter table public.lost_dog_sightings enable row level security;
alter table public.danger_reports enable row level security;
alter table public.alert_notifications enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.user_suspensions enable row level security;
alter table public.content_removals enable row level security;
alter table public.audit_logs enable row level security;
alter table public.push_tokens enable row level security;
alter table public.supporter_entitlements enable row level security;

-- Public-ish reads: solo contenuti approvati/pubblici.
do $$ begin
  create policy profiles_public_read on public.profiles for select using (status = 'active');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy profiles_owner_insert on public.profiles for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy profiles_owner_update on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy dogs_public_read on public.dogs for select using (visibility = 'public' and moderation_status = 'approved');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy dogs_owner_all on public.dogs for all using (public.is_current_user_profile(owner_id)) with check (public.is_current_user_profile(owner_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy dog_media_public_read on public.dog_media for select using (visibility = 'public' and moderation_status = 'approved');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy dog_media_owner_all on public.dog_media for all using (public.is_current_user_profile(owner_id)) with check (public.is_current_user_profile(owner_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy places_public_read on public.places for select using (visibility = 'public' and moderation_status in ('approved', 'pending'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy places_authenticated_insert on public.places for insert to authenticated with check (created_by is null or public.is_current_user_profile(created_by));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy reviews_public_read on public.place_reviews for select using (visibility = 'public' and moderation_status = 'approved');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy reviews_owner_all on public.place_reviews for all using (public.is_current_user_profile(reviewer_id)) with check (public.is_current_user_profile(reviewer_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy walk_plans_public_read on public.walk_plans for select using (visibility = 'public' and moderation_status = 'approved' and starts_at > now() - interval '12 hours');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy walk_plans_owner_all on public.walk_plans for all using (public.is_current_user_profile(owner_id)) with check (public.is_current_user_profile(owner_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy walk_participants_own_read on public.walk_plan_participants for select using (public.is_current_user_profile(profile_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy walk_participants_own_all on public.walk_plan_participants for all using (public.is_current_user_profile(profile_id)) with check (public.is_current_user_profile(profile_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy lost_alerts_public_read on public.lost_dog_alerts for select using (status = 'active' and moderation_status = 'approved' and expires_at > now());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy lost_alerts_owner_all on public.lost_dog_alerts for all using (public.is_current_user_profile(owner_id)) with check (public.is_current_user_profile(owner_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy lost_sightings_alert_owner_read on public.lost_dog_sightings for select using (
    exists (
      select 1 from public.lost_dog_alerts a
      where a.id = alert_id and public.is_current_user_profile(a.owner_id)
    ) or public.is_current_user_profile(reporter_id)
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy lost_sightings_reporter_insert on public.lost_dog_sightings for insert to authenticated with check (public.is_current_user_profile(reporter_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy danger_reports_public_read on public.danger_reports for select using (status in ('active', 'confirmed') and moderation_status in ('approved', 'pending') and expires_at > now());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy danger_reports_reporter_all on public.danger_reports for all using (public.is_current_user_profile(reporter_id)) with check (public.is_current_user_profile(reporter_id));
exception when duplicate_object then null; end $$;

-- Report e blocchi: visibili solo al creatore. Admin/service role userà bypass RLS.
do $$ begin
  create policy reports_owner_insert on public.reports for insert to authenticated with check (public.is_current_user_profile(reporter_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy reports_owner_read on public.reports for select using (public.is_current_user_profile(reporter_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy blocks_owner_all on public.blocks for all using (public.is_current_user_profile(blocker_id)) with check (public.is_current_user_profile(blocker_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy push_tokens_owner_all on public.push_tokens for all using (public.is_current_user_profile(profile_id)) with check (public.is_current_user_profile(profile_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy supporter_owner_read on public.supporter_entitlements for select using (public.is_current_user_profile(profile_id));
exception when duplicate_object then null; end $$;

-- Tabelle moderator-only: nessuna policy client al momento.
-- moderation_actions, user_suspensions, content_removals, audit_logs, alert_notifications
-- saranno gestite da dashboard/Edge Functions con service role.

-- STORAGE BUCKETS ------------------------------------------------------------
-- Da lanciare solo se storage schema è disponibile nel progetto Supabase.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('dog-media', 'dog-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4']),
  ('alert-media', 'alert-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
