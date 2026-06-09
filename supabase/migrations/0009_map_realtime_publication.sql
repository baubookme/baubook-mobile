-- BauBook 2.0.2 - Live Map Realtime Radar
-- Abilita la publication realtime per i dati che alimentano mappa, passeggiate e safety radar.
-- La migration e idempotente: se una tabella e gia nella publication, prosegue senza errore.

alter table if exists public.places replica identity full;
alter table if exists public.presence_sessions replica identity full;
alter table if exists public.walk_plans replica identity full;
alter table if exists public.lost_dog_alerts replica identity full;
alter table if exists public.danger_reports replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.places;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.presence_sessions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.walk_plans;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.lost_dog_alerts;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.danger_reports;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
