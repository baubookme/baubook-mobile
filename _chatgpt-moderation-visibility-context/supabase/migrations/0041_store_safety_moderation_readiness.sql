-- BauBook 0.7.3 - Store Safety Moderation Readiness.
-- Store-facing UGC controls:
--   - report visible BauBook content beyond Safety alerts
--   - block abusive users
--   - show blocked users with reversible state in Dog Friends, Walks, Presences and Safety
--   - support admin hide/restore actions through service_role Edge Function

create index if not exists blocks_blocker_idx
  on public.blocks(blocker_id, created_at desc);

create index if not exists blocks_blocked_profile_idx
  on public.blocks(blocked_profile_id, created_at desc);

create index if not exists reports_target_status_idx
  on public.reports(target_type, target_id, status, created_at desc);

alter table public.blocks enable row level security;

drop policy if exists blocks_owner_select on public.blocks;
create policy blocks_owner_select
  on public.blocks
  for select
  to authenticated
  using (blocker_id = public.current_profile_id());

drop policy if exists blocks_owner_insert on public.blocks;
create policy blocks_owner_insert
  on public.blocks
  for insert
  to authenticated
  with check (
    blocker_id = public.current_profile_id()
    and blocked_profile_id <> public.current_profile_id()
  );

drop policy if exists blocks_owner_delete on public.blocks;
create policy blocks_owner_delete
  on public.blocks
  for delete
  to authenticated
  using (blocker_id = public.current_profile_id());

revoke all on table public.blocks from anon;
revoke all on table public.blocks from authenticated;
grant select, insert, delete on table public.blocks to authenticated;
grant select, insert, delete on table public.blocks to service_role;

grant select, insert, update on table public.reports to service_role;
grant select, insert on table public.content_removals to service_role;
grant select, update on table public.dogs to service_role;
grant select, update on table public.walk_plans to service_role;
grant select, update on table public.presence_sessions to service_role;
grant select, update on table public.lost_dog_alerts to service_role;
grant select, update on table public.danger_reports to service_role;
grant select, update on table public.lost_dog_sightings to service_role;

drop function if exists public.report_baubook_content(text, uuid, text, text);

create or replace function public.report_baubook_content(
  target_type_input text,
  target_id_input uuid,
  reason_input text default 'abuse',
  description_input text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_uuid uuid;
  normalized_target text;
  normalized_reason public.report_reason;
  target_owner_uuid uuid;
  existing_report_id uuid;
  new_report_id uuid;
begin
  current_profile_uuid := public.current_profile_id();

  if current_profile_uuid is null then
    raise exception 'Profile not found for current user';
  end if;

  normalized_target := case
    when target_type_input in (
      'lost_dog_alert',
      'danger_report',
      'lost_dog_sighting',
      'walk_plan',
      'presence_session',
      'dog_profile'
    ) then target_type_input
    else null
  end;

  if normalized_target is null then
    raise exception 'Tipo contenuto non segnalabile.';
  end if;

  normalized_reason := case
    when reason_input in (
      'spam',
      'abuse',
      'harassment',
      'false_alert',
      'dangerous_content',
      'privacy_violation',
      'scam',
      'inappropriate',
      'other'
    ) then reason_input::public.report_reason
    else 'abuse'::public.report_reason
  end;

  if normalized_target = 'lost_dog_alert' then
    select owner_id into target_owner_uuid
    from public.lost_dog_alerts
    where id = target_id_input
    limit 1;
  elsif normalized_target = 'danger_report' then
    select reporter_id into target_owner_uuid
    from public.danger_reports
    where id = target_id_input
    limit 1;
  elsif normalized_target = 'lost_dog_sighting' then
    select reporter_id into target_owner_uuid
    from public.lost_dog_sightings
    where id = target_id_input
    limit 1;
  elsif normalized_target = 'walk_plan' then
    select owner_id into target_owner_uuid
    from public.walk_plans
    where id = target_id_input
    limit 1;
  elsif normalized_target = 'presence_session' then
    select profile_id into target_owner_uuid
    from public.presence_sessions
    where id = target_id_input
    limit 1;
  elsif normalized_target = 'dog_profile' then
    select owner_id into target_owner_uuid
    from public.dogs
    where id = target_id_input
    limit 1;
  end if;

  if target_owner_uuid is null then
    raise exception 'Contenuto non trovato.';
  end if;

  if target_owner_uuid = current_profile_uuid then
    raise exception 'Non puoi segnalare un tuo contenuto.';
  end if;

  select r.id
    into existing_report_id
  from public.reports r
  where r.reporter_id = current_profile_uuid
    and r.target_type = normalized_target
    and r.target_id = target_id_input
  order by r.created_at asc nulls last, r.id asc
  limit 1;

  if existing_report_id is not null then
    return jsonb_build_object(
      'ok', true,
      'alreadyReported', true,
      'reportId', existing_report_id
    );
  end if;

  insert into public.reports (
    reporter_id,
    target_type,
    target_id,
    reason,
    description,
    status,
    created_at,
    updated_at
  )
  values (
    current_profile_uuid,
    normalized_target,
    target_id_input,
    normalized_reason,
    left(nullif(trim(coalesce(description_input, '')), ''), 900),
    'open',
    now(),
    now()
  )
  on conflict do nothing
  returning id into new_report_id;

  if new_report_id is null then
    select r.id
      into existing_report_id
    from public.reports r
    where r.reporter_id = current_profile_uuid
      and r.target_type = normalized_target
      and r.target_id = target_id_input
    order by r.created_at asc nulls last, r.id asc
    limit 1;

    return jsonb_build_object(
      'ok', true,
      'alreadyReported', true,
      'reportId', existing_report_id
    );
  end if;

  if normalized_target = 'lost_dog_alert' then
    update public.lost_dog_alerts
       set moderation_status = case
             when moderation_status in ('approved'::public.moderation_status, 'pending'::public.moderation_status)
               then 'escalated'::public.moderation_status
             else moderation_status
           end,
           updated_at = now()
     where id = target_id_input;
  elsif normalized_target = 'danger_report' then
    update public.danger_reports
       set moderation_status = case
             when moderation_status in ('approved'::public.moderation_status, 'pending'::public.moderation_status)
               then 'escalated'::public.moderation_status
             else moderation_status
           end,
           updated_at = now()
     where id = target_id_input;
  elsif normalized_target = 'lost_dog_sighting' then
    update public.lost_dog_sightings
       set moderation_status = case
             when moderation_status in ('approved'::public.moderation_status, 'pending'::public.moderation_status)
               then 'escalated'::public.moderation_status
             else moderation_status
           end,
           updated_at = now()
     where id = target_id_input;
  elsif normalized_target = 'walk_plan' then
    update public.walk_plans
       set moderation_status = case
             when moderation_status in ('approved'::public.moderation_status, 'pending'::public.moderation_status)
               then 'escalated'::public.moderation_status
             else moderation_status
           end,
           updated_at = now()
     where id = target_id_input;
  elsif normalized_target = 'presence_session' then
    update public.presence_sessions
       set moderation_status = case
             when moderation_status in ('approved'::public.moderation_status, 'pending'::public.moderation_status)
               then 'escalated'::public.moderation_status
             else moderation_status
           end,
           updated_at = now()
     where id = target_id_input;
  elsif normalized_target = 'dog_profile' then
    update public.dogs
       set moderation_status = case
             when moderation_status in ('approved'::public.moderation_status, 'pending'::public.moderation_status)
               then 'escalated'::public.moderation_status
             else moderation_status
           end,
           updated_at = now()
     where id = target_id_input;
  end if;

  insert into public.audit_logs (actor_profile_id, action, target_type, target_id, metadata)
  values (
    current_profile_uuid,
    'ugc_content_reported',
    normalized_target,
    target_id_input,
    jsonb_build_object('reason', normalized_reason, 'report_id', new_report_id)
  );

  return jsonb_build_object(
    'ok', true,
    'alreadyReported', false,
    'reportId', new_report_id
  );
end;
$$;

drop function if exists public.block_baubook_profile(uuid);

create or replace function public.block_baubook_profile(blocked_profile_id_input uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_uuid uuid;
  target_exists boolean;
  inserted_count integer := 0;
begin
  current_profile_uuid := public.current_profile_id();

  if current_profile_uuid is null then
    raise exception 'Profile not found for current user';
  end if;

  if blocked_profile_id_input is null then
    raise exception 'Profilo da bloccare mancante.';
  end if;

  if blocked_profile_id_input = current_profile_uuid then
    raise exception 'Non puoi bloccare il tuo profilo.';
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.id = blocked_profile_id_input
      and coalesce(p.status::text, 'active') <> 'deleted'
      and coalesce(p.account_status, 'active') <> 'deleted'
  ) into target_exists;

  if target_exists is not true then
    raise exception 'Profilo da bloccare non trovato.';
  end if;

  insert into public.blocks (blocker_id, blocked_profile_id, created_at)
  values (current_profile_uuid, blocked_profile_id_input, now())
  on conflict (blocker_id, blocked_profile_id) do nothing;

  get diagnostics inserted_count = row_count;

  -- Blocking is reversible and must not destroy Dog Friends relationships.
  -- The app marks blocked profiles with an overlay and offers unblock.

  insert into public.audit_logs (actor_profile_id, action, target_type, target_id, metadata)
  values (
    current_profile_uuid,
    'profile_blocked',
    'profile',
    blocked_profile_id_input,
    jsonb_build_object('alreadyBlocked', inserted_count = 0)
  );

  return jsonb_build_object(
    'ok', true,
    'alreadyBlocked', inserted_count = 0,
    'blockedProfileId', blocked_profile_id_input
  );
end;
$$;

drop function if exists public.unblock_baubook_profile(uuid);

create or replace function public.unblock_baubook_profile(blocked_profile_id_input uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_uuid uuid;
  deleted_count integer := 0;
begin
  current_profile_uuid := public.current_profile_id();

  if current_profile_uuid is null then
    raise exception 'Profile not found for current user';
  end if;

  delete from public.blocks
  where blocker_id = current_profile_uuid
    and blocked_profile_id = blocked_profile_id_input;

  get diagnostics deleted_count = row_count;

  insert into public.audit_logs (actor_profile_id, action, target_type, target_id, metadata)
  values (
    current_profile_uuid,
    'profile_unblocked',
    'profile',
    blocked_profile_id_input,
    jsonb_build_object('deleted', deleted_count)
  );

  return jsonb_build_object(
    'ok', true,
    'unblocked', deleted_count > 0,
    'blockedProfileId', blocked_profile_id_input
  );
end;
$$;

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
  is_blocked boolean,
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
    exists (
      select 1
      from public.blocks b
      where b.blocker_id = owner_profile.id
        and b.blocked_profile_id = fp.id
    ) as is_blocked,
    f.created_at
  from public.dog_friends f
  join public.dogs owner_dog on owner_dog.id = f.dog_id
  join public.profiles owner_profile on owner_profile.id = owner_dog.owner_id
  join public.dogs fd on fd.id = f.friend_dog_id
  join public.profiles fp on fp.id = fd.owner_id
  where f.dog_id = dog_id_input
    and owner_profile.user_id = auth.uid()
    and coalesce(fd.visibility::text, 'public') in ('public', 'friends')
    and fd.moderation_status = 'approved'::public.moderation_status
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
      from public.blocks b
      where b.blocker_id = cd.owner_id
        and b.blocked_profile_id = fd.owner_id
    )
    and not exists (
      select 1
      from public.blocks b
      where b.blocker_id = fd.owner_id
        and b.blocked_profile_id = cd.owner_id
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

grant execute on function public.report_baubook_content(text, uuid, text, text) to authenticated;
grant execute on function public.block_baubook_profile(uuid) to authenticated;
grant execute on function public.unblock_baubook_profile(uuid) to authenticated;
grant execute on function public.list_dog_friends(uuid) to authenticated;
grant execute on function public.search_dog_friend_candidates(uuid, text, integer) to authenticated;
