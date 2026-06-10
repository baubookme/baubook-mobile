create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('partnership', 'feedback')),
  name text,
  city text,
  contact_email text,
  contact_phone text,
  message text not null,
  source text not null default 'app',
  app_version text,
  status text not null default 'new',
  email_sent boolean not null default false,
  email_status text,
  created_at timestamptz not null default now()
);

alter table public.contact_requests enable row level security;

drop policy if exists "contact_requests_insert_public" on public.contact_requests;
create policy "contact_requests_insert_public"
  on public.contact_requests
  for insert
  to anon, authenticated
  with check (true);
