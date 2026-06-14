create or replace function public.is_my_profile(p_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
      from public.profiles p
     where p.id = p_profile_id
       and p.user_id = auth.uid()
  );
$$;

create or replace function public.dog_belongs_to_profile(p_dog_id uuid, p_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
      from public.dogs d
     where d.id = p_dog_id
       and d.owner_id = p_profile_id
  );
$$;

grant execute on function public.is_my_profile(uuid) to authenticated;
grant execute on function public.dog_belongs_to_profile(uuid, uuid) to authenticated;

grant usage on schema public to authenticated;
grant select, insert, delete on table public.dog_friends to authenticated;

alter table public.dog_friends enable row level security;

drop policy if exists "Dog owners can read dog friends" on public.dog_friends;
drop policy if exists "Dog owners can add dog friends" on public.dog_friends;
drop policy if exists "Dog owners can remove dog friends" on public.dog_friends;
drop policy if exists "dog_friends_select_own" on public.dog_friends;
drop policy if exists "dog_friends_insert_own" on public.dog_friends;
drop policy if exists "dog_friends_delete_own" on public.dog_friends;

create policy "Dog owners can read dog friends"
on public.dog_friends
for select
to authenticated
using (
  public.is_my_profile(owner_id)
);

create policy "Dog owners can add dog friends"
on public.dog_friends
for insert
to authenticated
with check (
  public.is_my_profile(owner_id)
  and public.dog_belongs_to_profile(dog_id, owner_id)
  and public.dog_belongs_to_profile(friend_dog_id, friend_owner_id)
  and owner_id <> friend_owner_id
  and dog_id <> friend_dog_id
);

create policy "Dog owners can remove dog friends"
on public.dog_friends
for delete
to authenticated
using (
  public.is_my_profile(owner_id)
);
