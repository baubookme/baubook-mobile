-- BauBook! - Admin bootstrap
-- Purpose:
--   If auth user admin@baubook.me does not exist, create it with password 12345678.
--   Ensure the matching public profile is marked as administrator when a compatible profile table exists.
-- Notes:
--   - This is intended as a controlled bootstrap/recovery SQL for Supabase SQL Editor.
--   - Change the password immediately after first login if this is not a disposable local/beta credential.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

begin;

set local search_path = public, auth, extensions;

do $$
declare
  v_email text := 'admin@baubook.me';
  v_password text := '12345678';
  v_username text := 'admin';
  v_admin_role text := 'administrator';
  v_user_id uuid;
  v_cols text[];
  v_vals text[];
  v_sets text[];
  v_profile_pk_col text;
  v_profile_exists boolean;
  v_sql text;
begin
  -- 1) Create auth user only if the email is not already registered.
  select u.id
  into v_user_id
  from auth.users u
  where lower(u.email) = lower(v_email)
  limit 1;

  if v_user_id is null then
    v_user_id := extensions.gen_random_uuid();

    v_cols := ARRAY[]::text[];
    v_vals := ARRAY[]::text[];

    -- Required/common Supabase auth.users columns. Each one is included only if present.
    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'instance_id') then
      v_cols := array_append(v_cols, 'instance_id');
      v_vals := array_append(v_vals, quote_literal('00000000-0000-0000-0000-000000000000'));
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'id') then
      v_cols := array_append(v_cols, 'id');
      v_vals := array_append(v_vals, quote_literal(v_user_id::text));
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'aud') then
      v_cols := array_append(v_cols, 'aud');
      v_vals := array_append(v_vals, quote_literal('authenticated'));
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'role') then
      v_cols := array_append(v_cols, 'role');
      v_vals := array_append(v_vals, quote_literal('authenticated'));
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'email') then
      v_cols := array_append(v_cols, 'email');
      v_vals := array_append(v_vals, quote_literal(v_email));
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'encrypted_password') then
      v_cols := array_append(v_cols, 'encrypted_password');
      v_vals := array_append(v_vals, format('extensions.crypt(%L, extensions.gen_salt(''bf''))', v_password));
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'email_confirmed_at') then
      v_cols := array_append(v_cols, 'email_confirmed_at');
      v_vals := array_append(v_vals, 'now()');
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'confirmed_at') then
      v_cols := array_append(v_cols, 'confirmed_at');
      v_vals := array_append(v_vals, 'now()');
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'last_sign_in_at') then
      v_cols := array_append(v_cols, 'last_sign_in_at');
      v_vals := array_append(v_vals, 'now()');
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'raw_app_meta_data') then
      v_cols := array_append(v_cols, 'raw_app_meta_data');
      v_vals := array_append(v_vals, quote_literal(jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'))::text) || '::jsonb');
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'raw_user_meta_data') then
      v_cols := array_append(v_cols, 'raw_user_meta_data');
      v_vals := array_append(v_vals, quote_literal(jsonb_build_object('username', v_username, 'role', v_admin_role)::text) || '::jsonb');
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'is_super_admin') then
      v_cols := array_append(v_cols, 'is_super_admin');
      v_vals := array_append(v_vals, 'false');
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'is_sso_user') then
      v_cols := array_append(v_cols, 'is_sso_user');
      v_vals := array_append(v_vals, 'false');
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'is_anonymous') then
      v_cols := array_append(v_cols, 'is_anonymous');
      v_vals := array_append(v_vals, 'false');
    end if;

    -- Empty auth tokens commonly required by Supabase auth.users with NOT NULL defaults in some versions.
    foreach v_sql in array ARRAY[
      'confirmation_token',
      'recovery_token',
      'email_change_token_new',
      'email_change',
      'email_change_token_current',
      'phone_change',
      'phone_change_token',
      'reauthentication_token'
    ] loop
      if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = v_sql) then
        v_cols := array_append(v_cols, quote_ident(v_sql));
        v_vals := array_append(v_vals, quote_literal(''));
      end if;
    end loop;

    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'email_change_confirm_status') then
      v_cols := array_append(v_cols, 'email_change_confirm_status');
      v_vals := array_append(v_vals, '0');
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'created_at') then
      v_cols := array_append(v_cols, 'created_at');
      v_vals := array_append(v_vals, 'now()');
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'updated_at') then
      v_cols := array_append(v_cols, 'updated_at');
      v_vals := array_append(v_vals, 'now()');
    end if;

    execute format(
      'insert into auth.users (%s) values (%s)',
      array_to_string(v_cols, ', '),
      array_to_string(v_vals, ', ')
    );

    raise notice 'Created auth user % with id %', v_email, v_user_id;
  else
    raise notice 'Auth user % already exists with id %. Password was not changed.', v_email, v_user_id;
  end if;

  -- 2) Ensure email identity exists for password login.
  if to_regclass('auth.identities') is not null then
    if not exists (
      select 1
      from auth.identities i
      where i.user_id = v_user_id
        and i.provider = 'email'
    ) then
      v_cols := ARRAY[]::text[];
      v_vals := ARRAY[]::text[];

      if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'identities' and column_name = 'id') then
        v_cols := array_append(v_cols, 'id');
        v_vals := array_append(v_vals, quote_literal(v_user_id::text));
      end if;

      if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'identities' and column_name = 'provider_id') then
        v_cols := array_append(v_cols, 'provider_id');
        v_vals := array_append(v_vals, quote_literal(v_user_id::text));
      end if;

      if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'identities' and column_name = 'user_id') then
        v_cols := array_append(v_cols, 'user_id');
        v_vals := array_append(v_vals, quote_literal(v_user_id::text));
      end if;

      if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'identities' and column_name = 'identity_data') then
        v_cols := array_append(v_cols, 'identity_data');
        v_vals := array_append(v_vals, quote_literal(jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false)::text) || '::jsonb');
      end if;

      if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'identities' and column_name = 'provider') then
        v_cols := array_append(v_cols, 'provider');
        v_vals := array_append(v_vals, quote_literal('email'));
      end if;

      if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'identities' and column_name = 'email') then
        v_cols := array_append(v_cols, 'email');
        v_vals := array_append(v_vals, quote_literal(v_email));
      end if;

      if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'identities' and column_name = 'last_sign_in_at') then
        v_cols := array_append(v_cols, 'last_sign_in_at');
        v_vals := array_append(v_vals, 'now()');
      end if;

      if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'identities' and column_name = 'created_at') then
        v_cols := array_append(v_cols, 'created_at');
        v_vals := array_append(v_vals, 'now()');
      end if;

      if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'identities' and column_name = 'updated_at') then
        v_cols := array_append(v_cols, 'updated_at');
        v_vals := array_append(v_vals, 'now()');
      end if;

      execute format(
        'insert into auth.identities (%s) values (%s)',
        array_to_string(v_cols, ', '),
        array_to_string(v_vals, ', ')
      );

      raise notice 'Created email identity for %', v_email;
    else
      raise notice 'Email identity for % already exists.', v_email;
    end if;
  end if;

  -- 3) Ensure public.profiles administrator profile if the table exists.
  -- Supports either profiles.id or profiles.user_id as the auth user reference.
  if to_regclass('public.profiles') is not null then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'id') then
      v_profile_pk_col := 'id';
    elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id') then
      v_profile_pk_col := 'user_id';
    else
      v_profile_pk_col := null;
    end if;

    if v_profile_pk_col is not null then
      begin
        execute format('select exists (select 1 from public.profiles where %I = $1)', v_profile_pk_col)
        into v_profile_exists
        using v_user_id;

        if not v_profile_exists then
          v_cols := ARRAY[quote_ident(v_profile_pk_col)];
          v_vals := ARRAY[quote_literal(v_user_id::text)];

          if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'email') then
            v_cols := array_append(v_cols, 'email');
            v_vals := array_append(v_vals, quote_literal(v_email));
          end if;
          if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'username') then
            v_cols := array_append(v_cols, 'username');
            v_vals := array_append(v_vals, quote_literal(v_username));
          end if;
          if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'display_name') then
            v_cols := array_append(v_cols, 'display_name');
            v_vals := array_append(v_vals, quote_literal(v_username));
          end if;
          if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'full_name') then
            v_cols := array_append(v_cols, 'full_name');
            v_vals := array_append(v_vals, quote_literal(v_username));
          end if;
          if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'role') then
            v_cols := array_append(v_cols, 'role');
            v_vals := array_append(v_vals, quote_literal(v_admin_role));
          end if;
          if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'account_role') then
            v_cols := array_append(v_cols, 'account_role');
            v_vals := array_append(v_vals, quote_literal(v_admin_role));
          end if;
          if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'app_role') then
            v_cols := array_append(v_cols, 'app_role');
            v_vals := array_append(v_vals, quote_literal(v_admin_role));
          end if;
          if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_admin') then
            v_cols := array_append(v_cols, 'is_admin');
            v_vals := array_append(v_vals, 'true');
          end if;
          if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_administrator') then
            v_cols := array_append(v_cols, 'is_administrator');
            v_vals := array_append(v_vals, 'true');
          end if;
          if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'created_at') then
            v_cols := array_append(v_cols, 'created_at');
            v_vals := array_append(v_vals, 'now()');
          end if;
          if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'updated_at') then
            v_cols := array_append(v_cols, 'updated_at');
            v_vals := array_append(v_vals, 'now()');
          end if;

          execute format(
            'insert into public.profiles (%s) values (%s)',
            array_to_string(v_cols, ', '),
            array_to_string(v_vals, ', ')
          );
        end if;

        -- Update admin-related profile fields without touching unrelated profile data.
        v_sets := ARRAY[]::text[];
        if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'email') then
          v_sets := array_append(v_sets, format('%I = %L', 'email', v_email));
        end if;
        if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'username') then
          v_sets := array_append(v_sets, format('%I = %L', 'username', v_username));
        end if;
        if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'role') then
          v_sets := array_append(v_sets, format('%I = %L', 'role', v_admin_role));
        end if;
        if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'account_role') then
          v_sets := array_append(v_sets, format('%I = %L', 'account_role', v_admin_role));
        end if;
        if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'app_role') then
          v_sets := array_append(v_sets, format('%I = %L', 'app_role', v_admin_role));
        end if;
        if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_admin') then
          v_sets := array_append(v_sets, format('%I = true', 'is_admin'));
        end if;
        if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_administrator') then
          v_sets := array_append(v_sets, format('%I = true', 'is_administrator'));
        end if;
        if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'updated_at') then
          v_sets := array_append(v_sets, 'updated_at = now()');
        end if;

        if coalesce(array_length(v_sets, 1), 0) > 0 then
          execute format(
            'update public.profiles set %s where %I = $1',
            array_to_string(v_sets, ', '),
            v_profile_pk_col
          ) using v_user_id;
        end if;

        raise notice 'Ensured administrator profile for %', v_email;
      exception
        when others then
          raise notice 'Profile bootstrap skipped/failed: %', sqlerrm;
      end;
    else
      raise notice 'public.profiles exists but has no id/user_id column; profile bootstrap skipped.';
    end if;
  else
    raise notice 'public.profiles does not exist; auth user was created/ensured only.';
  end if;

  -- 4) Optional: if project has admin_users table, insert/ensure admin membership.
  if to_regclass('public.admin_users') is not null then
    begin
      if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'admin_users' and column_name = 'user_id') then
        v_profile_pk_col := 'user_id';
      elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'admin_users' and column_name = 'id') then
        v_profile_pk_col := 'id';
      else
        v_profile_pk_col := null;
      end if;

      if v_profile_pk_col is not null then
        execute format('select exists (select 1 from public.admin_users where %I = $1)', v_profile_pk_col)
        into v_profile_exists
        using v_user_id;

        if not v_profile_exists then
          v_cols := ARRAY[quote_ident(v_profile_pk_col)];
          v_vals := ARRAY[quote_literal(v_user_id::text)];

          if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'admin_users' and column_name = 'role') then
            v_cols := array_append(v_cols, 'role');
            v_vals := array_append(v_vals, quote_literal(v_admin_role));
          end if;
          if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'admin_users' and column_name = 'created_at') then
            v_cols := array_append(v_cols, 'created_at');
            v_vals := array_append(v_vals, 'now()');
          end if;
          if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'admin_users' and column_name = 'updated_at') then
            v_cols := array_append(v_cols, 'updated_at');
            v_vals := array_append(v_vals, 'now()');
          end if;

          execute format(
            'insert into public.admin_users (%s) values (%s)',
            array_to_string(v_cols, ', '),
            array_to_string(v_vals, ', ')
          );
        elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'admin_users' and column_name = 'role') then
          execute format('update public.admin_users set role = %L%s where %I = $1',
            v_admin_role,
            case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'admin_users' and column_name = 'updated_at') then ', updated_at = now()' else '' end,
            v_profile_pk_col
          ) using v_user_id;
        end if;

        raise notice 'Ensured admin_users membership for %', v_email;
      end if;
    exception
      when others then
        raise notice 'admin_users bootstrap skipped/failed: %', sqlerrm;
    end;
  end if;
end $$;

commit;

-- Verification
select
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  u.updated_at
from auth.users u
where lower(u.email) = lower('admin@baubook.me');

select
  table_schema,
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'admin_users')
order by table_name, ordinal_position;
