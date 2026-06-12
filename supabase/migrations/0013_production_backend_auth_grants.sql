-- BauBook 2.3.0 / app 0.6.0
-- Production backend grants for tables introduced in 0012_production_backend_cutover.sql.
-- RLS policies continue to scope access to auth.uid().

begin;

grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.dog_diary_events to authenticated;
grant select, insert, delete on table public.place_favorites to authenticated;
grant select, insert on table public.place_reports to authenticated;

commit;
