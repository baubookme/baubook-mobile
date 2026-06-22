-- BauBook 0.7.0 - Unique visible profile names.
-- Prevent two profiles from using the same visible name, ignoring case and surrounding spaces.

create unique index if not exists profiles_display_name_unique_normalized_idx
on public.profiles (lower(btrim(display_name)))
where display_name is not null
  and btrim(display_name) <> '';