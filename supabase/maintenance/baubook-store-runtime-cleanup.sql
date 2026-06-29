-- BauBook! store runtime cleanup
-- Purpose: clean volatile/runtime UGC before store review while preserving users, dogs and places.
-- Safe by default: dry-run only. To execute, change v_execute from false to true.
-- Run from Supabase SQL Editor with an owner/service role context.

DO $$
DECLARE
  v_execute boolean := false; -- <-- set to true only when you really want to delete
  v_table text;
  v_before bigint := 0;
  v_deleted bigint := 0;
  v_exists boolean := false;
  v_total_before bigint := 0;
  v_total_deleted bigint := 0;

  -- Explicit allow-list. Order matters: children/detail rows first, parents after.
  v_targets text[] := ARRAY[
    -- Passeggiate / walk runtime
    'walk_participants',
    'walk_attendees',
    'walk_invites',
    'walk_invitations',
    'walk_messages',
    'walk_comments',
    'walk_checkins',
    'walk_check_ins',
    'walk_locations',
    'walk_route_points',
    'walk_routes',
    'walk_plans',

    -- Presenze
    'presence_sessions',

    -- Alert smarrimento
    'lost_dog_sightings',
    'lost_dog_alerts',

    -- Alert pericolo
    'danger_report_votes',
    'danger_report_updates',
    'danger_reports',

    -- Segnalazioni moderazione. Keep target entities; delete only report rows.
    'moderation_reports',
    'user_reports',
    'place_reports',
    'reports'
  ];

  -- Hard guard: these tables must never be cleaned by this script.
  v_protected text[] := ARRAY[
    'users',
    'profiles',
    'user_profiles',
    'auth_users',
    'dogs',
    'places',
    'place_categories',
    'place_types',
    'feature_flags',
    'app_config',
    'audit_logs'
  ];
BEGIN
  RAISE NOTICE 'BauBook runtime cleanup started. execute=%', v_execute;
  RAISE NOTICE 'Protected by design: users/profiles/dogs/places/config/audit logs are NOT touched.';

  FOREACH v_table IN ARRAY v_targets LOOP
    IF v_table = ANY(v_protected) THEN
      RAISE EXCEPTION 'Safety guard: protected table % appeared in cleanup target list', v_table;
    END IF;

    SELECT to_regclass(format('public.%I', v_table)) IS NOT NULL INTO v_exists;

    IF NOT v_exists THEN
      RAISE NOTICE 'skip missing table: %', v_table;
      CONTINUE;
    END IF;

    EXECUTE format('select count(*) from public.%I', v_table) INTO v_before;
    v_total_before := v_total_before + v_before;

    IF v_execute THEN
      EXECUTE format('delete from public.%I', v_table);
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
      v_total_deleted := v_total_deleted + v_deleted;
      RAISE NOTICE 'cleaned public.%: before=%, deleted=%', v_table, v_before, v_deleted;
    ELSE
      RAISE NOTICE 'dry-run public.%: rows=%', v_table, v_before;
    END IF;
  END LOOP;

  IF v_execute THEN
    RAISE NOTICE 'BauBook runtime cleanup completed. total_before=%, total_deleted=%', v_total_before, v_total_deleted;
  ELSE
    RAISE NOTICE 'BauBook runtime cleanup DRY-RUN completed. total_candidate_rows=%', v_total_before;
    RAISE NOTICE 'No rows deleted. Set v_execute := true to run the cleanup.';
  END IF;
END $$;

-- Post-run verification: these should still contain data if they existed before.
-- They are intentionally not modified by the cleanup block above.
DO $$
DECLARE
  v_table text;
  v_rows bigint;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['profiles', 'user_profiles', 'dogs', 'places'] LOOP
    IF to_regclass(format('public.%I', v_table)) IS NOT NULL THEN
      EXECUTE format('select count(*) from public.%I', v_table) INTO v_rows;
      RAISE NOTICE 'protected public.% still has rows=%', v_table, v_rows;
    ELSE
      RAISE NOTICE 'protected public.% not present, skipped verification', v_table;
    END IF;
  END LOOP;
END $$;
