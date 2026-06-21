-- BauBook 0.6.1 - Enforce one abuse report per profile/target.
-- Keeps one report per reporter_id + target_type + target_id and removes duplicated rows created during beta tests.

with ranked_reports as (
  select
    id,
    row_number() over (
      partition by reporter_id, target_type, target_id
      order by created_at asc nulls last, id asc
    ) as rn
  from public.reports
  where reporter_id is not null
    and target_type is not null
    and target_id is not null
)
delete from public.reports r
using ranked_reports d
where r.id = d.id
  and d.rn > 1;

drop index if exists public.reports_reporter_target_open_uidx;
drop index if exists public.reports_one_reporter_per_target_uidx;

create unique index reports_one_reporter_per_target_uidx
  on public.reports(reporter_id, target_type, target_id)
  where reporter_id is not null
    and target_type is not null
    and target_id is not null;

drop function if exists public.report_safety_content(text, uuid, text, text);

create or replace function public.report_safety_content(
  target_type_input text,
  target_id_input uuid,
  reason_input text default 'false_alert',
  description_input text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_uuid uuid;
  existing_report_id uuid;
  new_report_id uuid;
  normalized_reason public.report_reason;
begin
  current_profile_uuid := public.current_profile_id();

  if current_profile_uuid is null then
    raise exception 'Profile not found for current user';
  end if;

  normalized_reason := coalesce(nullif(trim(reason_input), ''), 'false_alert')::public.report_reason;

  select r.id
    into existing_report_id
  from public.reports r
  where r.reporter_id = current_profile_uuid
    and r.target_type = target_type_input
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
    target_type_input,
    target_id_input,
    normalized_reason,
    nullif(trim(coalesce(description_input, '')), ''),
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
      and r.target_type = target_type_input
      and r.target_id = target_id_input
    order by r.created_at asc nulls last, r.id asc
    limit 1;

    return jsonb_build_object(
      'ok', true,
      'alreadyReported', true,
      'reportId', existing_report_id
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'alreadyReported', false,
    'reportId', new_report_id
  );
end;
$$;

grant execute on function public.report_safety_content(text, uuid, text, text) to authenticated;