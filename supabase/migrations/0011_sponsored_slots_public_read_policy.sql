-- BauBook 2.0.5
-- Sponsored Places Lite: allow public/anon read access only for active, currently valid slots.

alter table if exists public.sponsored_slots enable row level security;

grant usage on schema public to anon, authenticated;
grant select on table public.sponsored_slots to anon, authenticated;

drop policy if exists "sponsored_slots_public_read_active" on public.sponsored_slots;

create policy "sponsored_slots_public_read_active"
on public.sponsored_slots
for select
to anon, authenticated
using (
  status = 'active'
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);
