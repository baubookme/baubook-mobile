-- BauBook 0.7.2 - Admin/moderation foundation.
-- Adds a small admin allowlist and indexes for the existing reports/moderation tables.
-- This does not replace the existing "Segnala abuso" flow: it creates the admin foundation above it.

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'moderator',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  constraint admin_users_profile_id_key unique (profile_id),
  constraint admin_users_role_check check (role in ('owner', 'admin', 'moderator'))
);

create index if not exists admin_users_profile_active_idx
  on public.admin_users(profile_id, active);

create index if not exists admin_users_role_active_idx
  on public.admin_users(role, active);

create index if not exists reports_status_created_at_idx
  on public.reports(status, created_at desc);

create index if not exists reports_target_idx
  on public.reports(target_type, target_id);

create index if not exists moderation_actions_target_created_at_idx
  on public.moderation_actions(target_type, target_id, created_at desc);

alter table public.admin_users enable row level security;

drop policy if exists admin_users_self_read on public.admin_users;
create policy admin_users_self_read
  on public.admin_users
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = admin_users.profile_id
        and p.user_id = auth.uid()
        and p.status = 'active'
        and p.account_status = 'active'
    )
  );

revoke all on table public.admin_users from anon;
revoke all on table public.admin_users from authenticated;
grant select on table public.admin_users to authenticated;
grant select, insert, update, delete on table public.admin_users to service_role;
grant select, update on table public.reports to service_role;
grant select, insert on table public.moderation_actions to service_role;
grant select on table public.profiles to service_role;
grant select on table public.lost_dog_alerts to service_role;
grant select on table public.danger_reports to service_role;
grant select on table public.lost_dog_sightings to service_role;

-- Manual seed example, run with a real admin profile id after applying the migration:
-- insert into public.admin_users (profile_id, role)
-- values ('00000000-0000-0000-0000-000000000000', 'owner')
-- on conflict (profile_id) do update set role = excluded.role, active = true;
