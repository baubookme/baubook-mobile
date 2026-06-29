-- BauBook beta/service - gestione richieste cancellazione account.
-- Da eseguire nel Supabase SQL Editor.
-- Non e una migration di prodotto.
--
-- Flusso:
-- 1) monitori le richieste pending;
-- 2) copi l'id della richiesta;
-- 3) lo incolli nel blocco "ACCETTA";
-- 4) il profilo viene marcato inactive e la richiesta passa ad approved.
--
-- Nota: questo NON elimina automaticamente l'utente da Supabase Auth.
-- In questa fase e una disattivazione applicativa/manuale. La cancellazione o ban Auth
-- va gestita separatamente con service role/console quando decidi il processo definitivo.

-- ============================================================
-- 1) MONITOR PENDING
-- ============================================================
select
  adr.id as request_id,
  adr.status,
  adr.requested_at,
  adr.email,
  adr.reason,
  adr.user_id,
  adr.profile_id,
  p.display_name,
  p.account_status,
  p.account_deactivated_at,
  adr.metadata
from public.account_deletion_requests adr
left join public.profiles p
  on p.id = adr.profile_id
  or p.user_id = adr.user_id
where adr.status = 'pending'
order by adr.requested_at asc;

-- ============================================================
-- 2) ACCETTA RICHIESTA E METTI PROFILO INATTIVO
--    Sostituisci v_request_id prima di eseguire.
-- ============================================================
do $$
declare
  v_request_id uuid := '00000000-0000-0000-0000-000000000000';
  v_admin_note text := 'Richiesta cancellazione accettata manualmente da SQL Editor.';
  v_request record;
  v_profiles_updated integer := 0;
begin
  if v_request_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'Imposta v_request_id con un request_id reale prima di eseguire il blocco ACCETTA.';
  end if;

  select *
  into v_request
  from public.account_deletion_requests
  where id = v_request_id
  for update;

  if not found then
    raise exception 'Richiesta % non trovata.', v_request_id;
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Richiesta % non e pending: stato attuale = %.', v_request_id, v_request.status;
  end if;

  update public.profiles p
  set
    account_status = 'inactive',
    account_deactivated_at = now(),
    account_deactivation_reason = 'account_deletion_request:' || v_request_id::text
  where
    (v_request.profile_id is not null and p.id = v_request.profile_id)
    or
    (v_request.user_id is not null and p.user_id = v_request.user_id);

  get diagnostics v_profiles_updated = row_count;

  update public.account_deletion_requests
  set
    status = 'approved',
    processed_at = now(),
    processed_by = current_user,
    admin_notes = v_admin_note,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'approved_from', 'sql_editor',
      'approved_at', now(),
      'profiles_updated', v_profiles_updated
    )
  where id = v_request_id;

  raise notice 'Richiesta % approvata. Profili aggiornati: %.', v_request_id, v_profiles_updated;
end $$;

-- ============================================================
-- 3) RIFIUTA RICHIESTA, se serve
--    Sostituisci v_request_id prima di eseguire.
-- ============================================================
-- do $$
-- declare
--   v_request_id uuid := '00000000-0000-0000-0000-000000000000';
--   v_admin_note text := 'Richiesta cancellazione rifiutata manualmente da SQL Editor.';
-- begin
--   update public.account_deletion_requests
--   set
--     status = 'rejected',
--     processed_at = now(),
--     processed_by = current_user,
--     admin_notes = v_admin_note,
--     metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
--       'rejected_from', 'sql_editor',
--       'rejected_at', now()
--     )
--   where id = v_request_id
--     and status = 'pending';
-- end $$;

-- ============================================================
-- 4) VERIFICA GENERALE
-- ============================================================
select
  adr.id as request_id,
  adr.status,
  adr.requested_at,
  adr.processed_at,
  adr.email,
  adr.user_id,
  adr.profile_id,
  p.display_name,
  p.account_status,
  p.account_deactivated_at,
  adr.admin_notes
from public.account_deletion_requests adr
left join public.profiles p
  on p.id = adr.profile_id
  or p.user_id = adr.user_id
order by coalesce(adr.processed_at, adr.requested_at) desc
limit 50;
