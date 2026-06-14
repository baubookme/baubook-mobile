-- Grants for Dog friends runtime access.
-- RLS policies still control which rows each authenticated user can read/insert/delete.

grant usage on schema public to authenticated;

grant select, insert, delete
on table public.dog_friends
to authenticated;

grant execute
on function public.list_dog_friends(uuid)
to authenticated;

grant execute
on function public.search_dog_friend_candidates(uuid, text, integer)
to authenticated;
