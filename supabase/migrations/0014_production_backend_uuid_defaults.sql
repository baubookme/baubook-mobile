-- BauBook 2.3.0 / app 0.6.0
-- Production backend UUID defaults for tables introduced by 0012_production_backend_cutover.sql.
-- This is intentionally additive: if the tables already existed before 0012, CREATE TABLE IF NOT EXISTS
-- did not retrofit column defaults, so inserts without an explicit id could fail with 23502.

begin;

create extension if not exists pgcrypto;

alter table public.dog_diary_events
  alter column id set default gen_random_uuid();

alter table public.place_favorites
  alter column id set default gen_random_uuid();

alter table public.place_reports
  alter column id set default gen_random_uuid();

commit;
