-- BauBook 1.9.7 - Launch readiness + Sponsored Places Lite
-- Adds beta account deletion requests and native sponsor slots without ad-network SDKs.

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  email text,
  reason text,
  status text not null default 'requested' check (status in ('requested', 'queued', 'completed', 'cancelled', 'rejected')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists account_deletion_requests_user_id_idx on public.account_deletion_requests(user_id);
create index if not exists account_deletion_requests_status_idx on public.account_deletion_requests(status);

alter table public.account_deletion_requests enable row level security;

drop policy if exists account_deletion_requests_select_own on public.account_deletion_requests;
create policy account_deletion_requests_select_own
  on public.account_deletion_requests
  for select
  using (auth.uid() = user_id);

drop policy if exists account_deletion_requests_insert_own on public.account_deletion_requests;
create policy account_deletion_requests_insert_own
  on public.account_deletion_requests
  for insert
  with check (auth.uid() = user_id);

create table if not exists public.sponsored_slots (
  id uuid primary key default gen_random_uuid(),
  placement text not null,
  sponsor_name text not null,
  title text not null,
  body text not null,
  cta_label text not null default 'Scopri di piu',
  cta_url text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sponsored_slots_active_idx
  on public.sponsored_slots(placement, status, starts_at, ends_at);

alter table public.sponsored_slots enable row level security;

drop policy if exists sponsored_slots_public_read_active on public.sponsored_slots;
create policy sponsored_slots_public_read_active
  on public.sponsored_slots
  for select
  using (
    status = 'active'
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  document_key text not null unique,
  version text not null,
  title text not null,
  body text not null,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  last_reviewed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.legal_documents enable row level security;

drop policy if exists legal_documents_public_read_published on public.legal_documents;
create policy legal_documents_public_read_published
  on public.legal_documents
  for select
  using (status = 'published');

insert into public.sponsored_slots (placement, sponsor_name, title, body, cta_label, status, metadata)
values
  (
    'setup',
    'BauBook Partner Beta',
    'Sponsor nativo pronto per la beta',
    'Spazio locale per toelettatori, pet shop, veterinari e servizi dog-friendly. Nessun SDK ads, nessun tracking cross-app.',
    'Sponsorizzato',
    'active',
    jsonb_build_object('tracking', 'none', 'format', 'native_card', 'city', 'venezia-mestre')
  ),
  (
    'map',
    'BauBook Partner Beta',
    'Partner vicino alle aree cani',
    'Slot futuro per attivita locali vicino alle aree cani ufficiali.',
    'Partner locale',
    'active',
    jsonb_build_object('tracking', 'none', 'format', 'native_card', 'city', 'venezia-mestre')
  )
on conflict do nothing;

insert into public.legal_documents (document_key, version, title, body, status, metadata)
values
  (
    'privacy_beta',
    '0.1',
    'Privacy beta BauBook',
    'BauBook raccoglie email, profilo umano, profilo cane, contenuti safety e presenza temporanea per far funzionare la community locale. Nessun live tracking continuo predefinito.',
    'published',
    jsonb_build_object('scope', 'beta')
  ),
  (
    'terms_beta',
    '0.1',
    'Termini beta BauBook',
    'La beta e un servizio sperimentale locale. Le segnalazioni safety devono essere usate responsabilmente e non sostituiscono emergenze o autorita competenti.',
    'published',
    jsonb_build_object('scope', 'beta')
  ),
  (
    'sponsor_disclosure_beta',
    '0.1',
    'Sponsor disclosure beta',
    'BauBook puo mostrare sponsor nativi locali dichiarati. La beta non usa SDK pubblicitari o advertising ID.',
    'published',
    jsonb_build_object('scope', 'beta', 'ads_sdk', false)
  )
on conflict (document_key) do update
set version = excluded.version,
    title = excluded.title,
    body = excluded.body,
    status = excluded.status,
    last_reviewed_at = now(),
    metadata = excluded.metadata,
    updated_at = now();

insert into public.feature_flags (key, title, description, enabled, min_app_version)
values
  ('mvp.launch_readiness', 'Launch readiness cockpit', 'Mostra privacy, termini beta, delete-account request e checklist pubblicazione.', true, '0.2.7'),
  ('mvp.sponsored_places_lite', 'Sponsored Places Lite', 'Abilita slot sponsor nativi locali senza SDK ads.', true, '0.2.7')
on conflict (key) do update
set title = excluded.title,
    description = excluded.description,
    enabled = excluded.enabled,
    min_app_version = excluded.min_app_version;
