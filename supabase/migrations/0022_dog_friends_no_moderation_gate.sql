drop policy if exists "Dog owners can add dog friends" on public.dog_friends;
create policy "Dog owners can add dog friends"
  on public.dog_friends
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = owner_id
        and p.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.dogs d
      where d.id = dog_id
        and d.owner_id = owner_id
    )
    and exists (
      select 1
      from public.dogs fd
      where fd.id = friend_dog_id
        and fd.owner_id = friend_owner_id
        and fd.owner_id <> owner_id
        and coalesce(fd.visibility, 'public') in ('public', 'friends')
    )
  );

create or replace function public.enforce_dog_friends_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  if not exists (
    select 1
    from public.dogs d
    where d.id = new.dog_id
      and d.owner_id = new.owner_id
  ) then
    raise exception 'Dog friend owner mismatch.';
  end if;

  if not exists (
    select 1
    from public.dogs d
    where d.id = new.friend_dog_id
      and d.owner_id = new.friend_owner_id
      and d.owner_id <> new.owner_id
      and coalesce(d.visibility, 'public') in ('public', 'friends')
  ) then
    raise exception 'Dog friend candidate not available.';
  end if;

  select count(*)
    into current_count
  from public.dog_friends f
  where f.dog_id = new.dog_id
    and (tg_op = 'INSERT' or f.id <> new.id);

  if current_count >= 10 then
    raise exception 'Hai gia 10 Dog friends: rimuovine uno per aggiungerne un altro.';
  end if;

  return new;
end;
$$;

create or replace function public.search_dog_friend_candidates(
  dog_id_input uuid,
  query_input text,
  limit_input integer default 8
)
returns table (
  dog_id uuid,
  owner_id uuid,
  dog_name text,
  owner_name text,
  avatar_url text,
  size text,
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
    coalesce(fp.display_name, 'BauBook user') as owner_name,
    fd.avatar_url,
    fd.size::text as size,
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

grant execute on function public.search_dog_friend_candidates(uuid, text, integer) to authenticated;
