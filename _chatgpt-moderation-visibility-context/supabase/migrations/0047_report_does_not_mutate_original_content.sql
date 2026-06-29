-- BauBook 0.7.3 hotfix
-- Abuse reports must create a moderation report, but must NOT automatically mutate
-- the original content moderation_status. Hiding/restoring content is an admin action.
-- This prevents public cards from losing real dog/profile data after a normal user report.

set check_function_bodies = off;

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

  -- Do not automatically update the original content moderation_status here.
  -- Admin moderation actions are responsible for hide/restore decisions.

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

grant execute on function public.report_baubook_content(text, uuid, text, text) to authenticated;

set check_function_bodies = on;
