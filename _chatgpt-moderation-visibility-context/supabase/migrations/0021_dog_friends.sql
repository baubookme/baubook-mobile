create extension if not exists pgcrypto;

create table if not exists public.dog_friends (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  friend_owner_id uuid not null references public.profiles(id) on delete cascade,
  friend_dog_id uuid not null references public.dogs(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint dog_friends_not_same_dog check (dog_id <> friend_dog_id),
  constraint dog_friends_not_same_owner check (owner_id <> friend_owner_id),
  constraint dog_friends_unique unique (dog_id, friend_dog_id)
);

create index if not exists dog_friends_owner_id_idx on public.dog_friends(owner_id);
create index if not exists dog_friends_dog_id_idx on public.dog_friends(dog_id);
create index if not exists dog_friends_friend_dog_id_idx on public.dog_friends(friend_dog_id);

alter table public.dog_friends enable row level security;

drop policy if exists "Dog owners can read dog friends" on public.dog_friends;
create policy "Dog owners can read dog friends"
  on public.dog_friends
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = dog_friends.owner_id
        and p.user_id = auth.uid()
    )
  );

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
        and fd.visibility in ('public', 'friends')
        and fd.moderation_status = 'approved'
    )
  );

drop policy if exists "Dog owners can remove dog friends" on public.dog_friends;
create policy "Dog owners can remove dog friends"
  on public.dog_friends
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = dog_friends.owner_id
        and p.user_id = auth.uid()
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
      and d.visibility in ('public', 'friends')
      and d.moderation_status = 'approved'
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

drop trigger if exists dog_friends_integrity_trigger on public.dog_friends;
create trigger dog_friends_integrity_trigger
  before insert or update on public.dog_friends
  for each row
  execute function public.enforce_dog_friends_integrity();

create or replace function public.list_dog_friends(dog_id_input uuid)
returns table (
  friendship_id uuid,
  dog_id uuid,
  friend_owner_id uuid,
  friend_dog_id uuid,
  friend_dog_name text,
  friend_owner_name text,
  friend_dog_avatar_url text,
  friend_dog_size text,
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
    coalesce(fp.display_name, 'BauBook user') as friend_owner_name,
    fd.avatar_url as friend_dog_avatar_url,
    fd.size::text as friend_dog_size,
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
    and fd.visibility in ('public', 'friends')
    and fd.moderation_status = 'approved'
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
