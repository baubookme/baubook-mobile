do $$
begin
  if exists (
    select 1
    from public.dogs
    where owner_id is not null
      and btrim(coalesce(name, '')) <> ''
    group by owner_id, lower(btrim(name))
    having count(*) > 1
  ) then
    raise exception 'Cannot create dogs_owner_name_unique: duplicate dog names already exist for the same owner.';
end if;
end $$;

create unique index if not exists dogs_owner_name_unique
    on public.dogs (owner_id, lower(btrim(name)))
    where owner_id is not null
    and btrim(coalesce(name, '')) <> '';