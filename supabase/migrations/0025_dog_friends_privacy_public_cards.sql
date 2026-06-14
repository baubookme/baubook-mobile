drop function if exists public.list_dog_friends(uuid);

create function public.list_dog_friends(dog_id_input uuid)
returns table (
  friendship_id uuid,
  dog_id uuid,
  friend_owner_id uuid,
  friend_dog_id uuid,
  friend_dog_name text,
  friend_dog_avatar_url text,
  friend_city_label text,
  friend_tags text[],
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    f.id as friendship_id,
    f.dog_id,
    f.friend_owner_id,
    f.friend_dog_id,
    fd.name as friend_dog_name,
    fd.avatar_url as friend_dog_avatar_url,
    fp.city_label as friend_city_label,
    fd.sociality_tags as friend_tags,
    f.created_at
  from public.dog_friends f
  join public.dogs owner_dog on owner_dog.id = f.dog_id
  join public.profiles owner_profile on owner_profile.id = owner_dog.owner_id
  join public.dogs fd on fd.id = f.friend_dog_id
  join public.profiles fp on fp.id = fd.owner_id
  where f.dog_id = dog_id_input
    and owner_profile.user_id = auth.uid()
  order by f.created_at desc;
$$;

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
  tags text[]
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
    fd.sociality_tags as tags
  from current_dog cd
  join public.dogs fd on fd.id <> cd.dog_id
  join public.profiles fp on fp.id = fd.owner_id
  where length(btrim(coalesce(query_input, ''))) >= 2
    and fd.owner_id <> cd.owner_id
    and coalesce(fd.visibility, 'public') in ('public', 'friends')
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
  order by
    case
      when lower(fd.name) = lower(btrim(query_input)) then 0
      when lower(fp.display_name) = lower(btrim(query_input)) then 1
      else 2
    end,
    fd.name asc
  limit greatest(1, least(coalesce(limit_input, 8), 20));
$$;

grant execute on function public.list_dog_friends(uuid) to authenticated;
grant execute on function public.search_dog_friend_candidates(uuid, text, integer) to authenticated;
