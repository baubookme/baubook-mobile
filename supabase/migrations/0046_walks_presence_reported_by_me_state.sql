-- BauBook 0.7.3 hotfix
-- Passeggiate / Presenze: expose whether the current signed-in user already reported a live content item.
-- The UI can disable the Segnala button after one report from the current profile.

set check_function_bodies = off;

drop function if exists public.list_my_reported_baubook_content(text[]);

create function public.list_my_reported_baubook_content(target_types_input text[])
returns table (
  target_type text,
  target_id uuid
)
language sql
security definer
set search_path = public
as $$
  select
    r.target_type,
    r.target_id
  from public.reports r
  join public.profiles p on p.id = r.reporter_id
  where p.user_id = auth.uid()
    and r.target_type = any(coalesce(target_types_input, array[]::text[]))
    and r.target_id is not null;
$$;

grant execute on function public.list_my_reported_baubook_content(text[]) to authenticated;

set check_function_bodies = on;
