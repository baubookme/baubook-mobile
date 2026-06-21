-- BauBook 0.6.1 - Fix report_safety_content enum cast.
-- reports.reason is report_reason, not text.

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
  current_user_id uuid;
  existing_report_id uuid;
  new_report_id uuid;
  normalized_reason public.report_reason;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  normalized_reason := coalesce(nullif(trim(reason_input), ''), 'false_alert')::public.report_reason;

  select r.id
    into existing_report_id
  from public.reports r
  where r.reporter_id = current_user_id
    and r.target_type = target_type_input
    and r.target_id = target_id_input
    and r.status in ('open', 'reviewing', 'actioned')
  order by r.created_at desc
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
    current_user_id,
    target_type_input,
    target_id_input,
    normalized_reason,
    nullif(trim(coalesce(description_input, '')), ''),
    'open',
    now(),
    now()
  )
  returning id into new_report_id;

  return jsonb_build_object(
    'ok', true,
    'alreadyReported', false,
    'reportId', new_report_id
  );
end;
$$;

grant execute on function public.report_safety_content(text, uuid, text, text) to authenticated;