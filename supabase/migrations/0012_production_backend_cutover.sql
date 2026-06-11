-- BauBook 2.3.0 / app 0.6.0
-- Production backend cutover: no runtime demo places, Dog Diary backend, map favorites backend.

begin;

create extension if not exists pgcrypto;

create table if not exists public.dog_diary_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dog_id uuid null references public.dogs(id) on delete set null,
  event_type text not null check (event_type in ('walk', 'food', 'vet', 'medicine', 'grooming', 'note')),
  title text not null default '',
  note text null,
  event_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dog_diary_events_user_date_idx
  on public.dog_diary_events (user_id, event_date desc);

alter table public.dog_diary_events enable row level security;

drop policy if exists dog_diary_events_select_own on public.dog_diary_events;
create policy dog_diary_events_select_own
  on public.dog_diary_events
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists dog_diary_events_insert_own on public.dog_diary_events;
create policy dog_diary_events_insert_own
  on public.dog_diary_events
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists dog_diary_events_update_own on public.dog_diary_events;
create policy dog_diary_events_update_own
  on public.dog_diary_events
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists dog_diary_events_delete_own on public.dog_diary_events;
create policy dog_diary_events_delete_own
  on public.dog_diary_events
  for delete
  to authenticated
  using (user_id = auth.uid());

create table if not exists public.place_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, place_id)
);

create index if not exists place_favorites_user_created_idx
  on public.place_favorites (user_id, created_at desc);

alter table public.place_favorites enable row level security;

drop policy if exists place_favorites_select_own on public.place_favorites;
create policy place_favorites_select_own
  on public.place_favorites
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists place_favorites_insert_own on public.place_favorites;
create policy place_favorites_insert_own
  on public.place_favorites
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists place_favorites_delete_own on public.place_favorites;
create policy place_favorites_delete_own
  on public.place_favorites
  for delete
  to authenticated
  using (user_id = auth.uid());

create table if not exists public.place_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  place_id uuid null references public.places(id) on delete set null,
  report_type text not null check (report_type in ('wrong_info', 'suggest_place', 'claim_owner', 'partnership', 'other')),
  message text not null,
  contact_email text null,
  status text not null default 'new' check (status in ('new', 'triaged', 'closed', 'spam')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists place_reports_status_created_idx
  on public.place_reports (status, created_at desc);

alter table public.place_reports enable row level security;

drop policy if exists place_reports_insert_authenticated on public.place_reports;
create policy place_reports_insert_authenticated
  on public.place_reports
  for insert
  to authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists place_reports_select_own on public.place_reports;
create policy place_reports_select_own
  on public.place_reports
  for select
  to authenticated
  using (user_id = auth.uid());

-- Production cutover: remove legacy demo rows from the real places table.
-- This is intentionally destructive for rows marked as demo/mock/sample/test placeholders.
delete from public.place_favorites
where place_id in (
  select id from public.places
  where lower(coalesce(source, '')) in ('demo', 'mock', 'sample', 'test')
     or lower(coalesce(name, '')) like '%demo%'
     or lower(coalesce(slug, '')) like '%demo%'
);

delete from public.places
where lower(coalesce(source, '')) in ('demo', 'mock', 'sample', 'test')
   or lower(coalesce(name, '')) like '%demo%'
   or lower(coalesce(slug, '')) like '%demo%';

-- Guardrail: keep production-visible places away from demo sources going forward.
do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'places'
      and constraint_name = 'places_no_demo_source_check'
  ) then
    alter table public.places drop constraint places_no_demo_source_check;
  end if;

  alter table public.places
    add constraint places_no_demo_source_check
    check (lower(coalesce(source, '')) not in ('demo', 'mock', 'sample', 'test'));
end $$;

commit;
