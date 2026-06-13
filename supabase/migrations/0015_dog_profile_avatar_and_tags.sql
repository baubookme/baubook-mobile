alter table public.dogs
  add column if not exists avatar_url text;

create table if not exists public.dog_profile_tag_options (
  key text primary key,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dog_profile_tag_options enable row level security;

drop policy if exists "Dog profile tags are public readable" on public.dog_profile_tag_options;
create policy "Dog profile tags are public readable"
  on public.dog_profile_tag_options
  for select
  to anon, authenticated
  using (is_active = true);

insert into public.dog_profile_tag_options (key, label, sort_order, is_active) values
  ('calmo', 'calmo', 10, true),
  ('curioso', 'curioso', 20, true),
  ('coccolone', 'coccolone', 30, true),
  ('giocherellone', 'giocherellone', 40, true),
  ('timido', 'timido', 50, true),
  ('coraggioso', 'coraggioso', 60, true),
  ('protettivo', 'protettivo', 70, true),
  ('dolce', 'dolce', 80, true),
  ('buffo', 'buffo', 90, true),
  ('vivace', 'vivace', 100, true),
  ('riflessivo', 'riflessivo', 110, true),
  ('testardo', 'testardo', 120, true),
  ('socievole', 'socievole', 130, true),
  ('selettivo', 'selettivo', 140, true),
  ('ama umani calmi', 'ama umani calmi', 150, true),
  ('ama bambini', 'ama bambini', 160, true),
  ('ok cani piccoli', 'ok cani piccoli', 170, true),
  ('ok cani grandi', 'ok cani grandi', 180, true),
  ('meglio al guinzaglio', 'meglio al guinzaglio', 190, true),
  ('no caos', 'no caos', 200, true),
  ('pausa sniff', 'pausa sniff', 210, true),
  ('ama l ombra', 'ama l ombra', 220, true),
  ('ama il sole', 'ama il sole', 230, true),
  ('fontanella lover', 'fontanella lover', 240, true),
  ('passeggiata lenta', 'passeggiata lenta', 250, true),
  ('passeggiata lunga', 'passeggiata lunga', 260, true),
  ('parco preferito', 'parco preferito', 270, true),
  ('area cani si', 'area cani si', 280, true),
  ('area cani no', 'area cani no', 290, true),
  ('acqua sempre', 'acqua sempre', 300, true),
  ('pallina dipendente', 'pallina dipendente', 310, true),
  ('bastoncino fan', 'bastoncino fan', 320, true),
  ('fiuta tutto', 'fiuta tutto', 330, true),
  ('saluta tutti', 'saluta tutti', 340, true),
  ('non ama sorprese', 'non ama sorprese', 350, true),
  ('sensibile ai rumori', 'sensibile ai rumori', 360, true),
  ('paura botti', 'paura botti', 370, true),
  ('veterano', 'veterano', 380, true),
  ('cucciolo', 'cucciolo', 390, true),
  ('senior', 'senior', 400, true),
  ('energia alta', 'energia alta', 410, true),
  ('energia bassa', 'energia bassa', 420, true),
  ('cerca amici', 'cerca amici', 430, true),
  ('preferisce spazio', 'preferisce spazio', 440, true),
  ('training mode', 'training mode', 450, true),
  ('premietti ok', 'premietti ok', 460, true),
  ('allergie', 'allergie', 470, true),
  ('non condividere cibo', 'non condividere cibo', 480, true),
  ('zampa delicata', 'zampa delicata', 490, true),
  ('super annusatore', 'super annusatore', 500, true)
on conflict (key) do update set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dog-avatars',
  'dog-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Dog avatars are public readable" on storage.objects;
create policy "Dog avatars are public readable"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'dog-avatars');

drop policy if exists "Dog owners can upload avatars" on storage.objects;
create policy "Dog owners can upload avatars"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'dog-avatars'
    and exists (
      select 1
      from public.dogs d
      join public.profiles p on p.id = d.owner_id
      where d.id::text = (storage.foldername(name))[1]
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Dog owners can update avatars" on storage.objects;
create policy "Dog owners can update avatars"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'dog-avatars'
    and exists (
      select 1
      from public.dogs d
      join public.profiles p on p.id = d.owner_id
      where d.id::text = (storage.foldername(name))[1]
        and p.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'dog-avatars'
    and exists (
      select 1
      from public.dogs d
      join public.profiles p on p.id = d.owner_id
      where d.id::text = (storage.foldername(name))[1]
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Dog owners can delete avatars" on storage.objects;
create policy "Dog owners can delete avatars"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'dog-avatars'
    and exists (
      select 1
      from public.dogs d
      join public.profiles p on p.id = d.owner_id
      where d.id::text = (storage.foldername(name))[1]
        and p.user_id = auth.uid()
    )
  );
