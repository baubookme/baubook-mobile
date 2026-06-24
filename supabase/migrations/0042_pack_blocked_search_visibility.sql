-- BauBook 0.7.3 hotfix
-- Keep profiles blocked by the current user visible in Branco search so they can be recognized and unblocked.
-- If the other profile blocked the current user, keep respecting that block and do not show them.

set check_function_bodies = off;

drop function if exists public.search_dog_friend_candidates(uuid, text, integer);

create function public.search_dog_friend_candidates(
  dog_id_input uuid,
  query_input text,
  limit_input integer default 8
)
returns table (
  dog_id uuid,
  owner_id uuid,
  dog_name text,
  avatar_url text,
  city_label text,
  tags text[],
  is_blocked boolean
)
language sql
security definer
set search_path = public
as $$
  with current_dog as (
    select d.id as dog_id, d.owner_id
    from public.dogs d
    join public.profiles p on p.id = d.owner_id
    where d.id = dog_id_input
      and p.user_id = auth.uid()
    limit 1
  )
  select
    fd.id as dog_id,
    fd.owner_id,
    fd.name as dog_name,
    fd.avatar_url,
    fp.city_label,
    fd.sociality_tags as tags,
    (own_block.id is not null) as is_blocked
  from current_dog cd
  join public.dogs fd on fd.id <> cd.dog_id
  join public.profiles fp on fp.id = fd.owner_id
  left join public.blocks own_block
    on own_block.blocker_id = cd.owner_id
   and own_block.blocked_profile_id = fd.owner_id
  where length(btrim(coalesce(query_input, ''))) >= 2
    and fd.owner_id <> cd.owner_id
    and coalesce(fd.visibility::text, 'public') in ('public', 'friends')
    and fd.moderation_status = 'approved'::public.moderation_status
    and (
      lower(fd.name) like '%' || lower(btrim(query_input)) || '%'
      or lower(fp.display_name) like '%' || lower(btrim(query_input)) || '%'
    )
    and not exists (
      select 1
      from public.dog_friends f
      where f.dog_id = cd.dog_id
        and f.friend_dog_id = fd.id
    )
    and not exists (
      select 1
      from public.blocks other_block
      where other_block.blocker_id = fd.owner_id
        and other_block.blocked_profile_id = cd.owner_id
    )
  order by
    case
      when own_block.id is not null then 0
      when lower(fd.name) = lower(btrim(query_input)) then 1
      when lower(fp.display_name) = lower(btrim(query_input)) then 2
      else 3
    end,
    fd.name asc
  limit greatest(1, least(coalesce(limit_input, 8), 20));
$$;

grant execute on function public.search_dog_friend_candidates(uuid, text, integer) to authenticated;

set check_function_bodies = on;
