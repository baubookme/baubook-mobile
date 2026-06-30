-- BauBook! - HARD RESET utenti/profili + bootstrap admin owner moderazione (v5)
-- ATTENZIONE: script distruttivo.
-- Obiettivo:
--   1) fare piazza pulita degli utenti Auth e dei profili applicativi;
--   2) ricreare un solo utente admin@baubook.me;
--   3) impostare password iniziale 1234567;
--   4) battezzarlo come owner in public.admin_users(profile_id, role, active).
--
-- Da eseguire solo da Supabase SQL Editor o da connessione DB amministrativa.
-- Non eseguire in produzione con utenti reali da conservare.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

begin;

set local search_path = public, auth, extensions;

-- Helper temporaneo: sceglie un valore admin compatibile con colonne enum/text.
-- Preferisce 'administrator'; se l'enum non lo accetta, prova 'admin', poi 'moderator'.
create or replace function pg_temp.baubook_role_literal(
  p_schema text,
  p_table text,
  p_column text,
  p_preferred text default 'administrator'
)
returns text
language plpgsql
stable
as $$
declare
  v_data_type text;
  v_udt_schema text;
  v_udt_name text;
  v_value text;
begin
  select c.data_type, c.udt_schema, c.udt_name
  into v_data_type, v_udt_schema, v_udt_name
  from information_schema.columns c
  where c.table_schema = p_schema
    and c.table_name = p_table
    and c.column_name = p_column
  limit 1;

  if v_data_type = 'USER-DEFINED' then
    select e.enumlabel
    into v_value
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
    where n.nspname = v_udt_schema
      and t.typname = v_udt_name
      and e.enumlabel in (p_preferred, 'administrator', 'admin', 'owner', 'moderator')
    order by case e.enumlabel
      when p_preferred then 0
      when 'administrator' then 1
      when 'admin' then 2
      when 'owner' then 3
      when 'moderator' then 4
      else 10
    end
    limit 1;

    if v_value is null then
      select e.enumlabel
      into v_value
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      join pg_enum e on e.enumtypid = t.oid
      where n.nspname = v_udt_schema
        and t.typname = v_udt_name
      order by e.enumsortorder
      limit 1;
    end if;

    return quote_literal(coalesce(v_value, p_preferred));
  end if;

  return quote_literal(p_preferred);
end;
$$;

do $$
declare
  v_email text := 'admin@baubook.me';
  v_password text := '12345678';
  v_username text := 'admin';
  v_admin_role text := 'administrator';
  v_user_id uuid := extensions.gen_random_uuid();
  v_cols text[];
  v_vals text[];
  v_sets text[];
  v_profile_key_col text;
  v_exists boolean;
  v_sql text;
  fk record;
  v_set_null text;
begin
  -- 0) Svuota esplicitamente le tabelle applicative profilo/admin note.
  if to_regclass('public.admin_users') is not null then
    execute 'delete from public.admin_users';
    raise notice 'Deleted all rows from public.admin_users';
  end if;

  if to_regclass('public.profiles') is not null then
    execute 'delete from public.profiles';
    raise notice 'Deleted all rows from public.profiles';
  else
    raise notice 'public.profiles does not exist; skipping profile cleanup';
  end if;

  -- 1) Pulisce tabelle Auth figlie note, prima di cancellare auth.users.
  foreach v_sql in array ARRAY[
    'auth.mfa_amr_claims',
    'auth.mfa_challenges',
    'auth.mfa_factors',
    'auth.one_time_tokens',
    'auth.refresh_tokens',
    'auth.sessions',
    'auth.identities'
  ] loop
    if to_regclass(v_sql) is not null then
      execute format('delete from %s', v_sql);
      raise notice 'Deleted all rows from %', v_sql;
    end if;
  end loop;

  -- 2) Gestisce altre foreign key pubbliche verso auth.users.
  --    Se la FK e' nullable, mette NULL per non cancellare contenuti come places.created_by.
  --    Se non e' nullable, cancella le righe dipendenti.
  for fk in
    select
      con.conrelid,
      ns.nspname as child_schema,
      cls.relname as child_table,
      array_agg(att.attname order by ord.ordinality) as child_columns,
      bool_and(not att.attnotnull) as all_nullable
    from pg_constraint con
    join pg_class cls on cls.oid = con.conrelid
    join pg_namespace ns on ns.oid = cls.relnamespace
    join unnest(con.conkey) with ordinality as ord(attnum, ordinality) on true
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = ord.attnum
    where con.contype = 'f'
      and con.confrelid = 'auth.users'::regclass
      and ns.nspname not in ('auth')
      and not (ns.nspname = 'public' and cls.relname in ('profiles', 'admin_users'))
    group by con.conrelid, ns.nspname, cls.relname
  loop
    if fk.all_nullable then
      select string_agg(format('%I = null', col), ', ')
      into v_set_null
      from unnest(fk.child_columns) as col;

      execute format(
        'update %I.%I set %s where %s',
        fk.child_schema,
        fk.child_table,
        v_set_null,
        (
          select string_agg(format('%I is not null', col), ' or ')
          from unnest(fk.child_columns) as col
        )
      );

      raise notice 'Nullified nullable FK to auth.users on %.%', fk.child_schema, fk.child_table;
    else
      execute format('delete from %I.%I', fk.child_schema, fk.child_table);
      raise notice 'Deleted rows from %.% because FK to auth.users is not nullable', fk.child_schema, fk.child_table;
    end if;
  end loop;

  -- 3) Piazza pulita Auth: cancella tutti gli utenti registrati.
  if to_regclass('auth.users') is not null then
    execute 'delete from auth.users';
    raise notice 'Deleted all rows from auth.users';
  else
    raise exception 'auth.users does not exist';
  end if;

  -- 4) Crea l'utente Auth admin@baubook.me da zero.
  v_cols := ARRAY[]::text[];
  v_vals := ARRAY[]::text[];

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
  -- confirmed_at is a generated column in current Supabase Auth schemas.
  -- Do not insert/update it directly; email_confirmed_at above is enough.
  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'last_sign_in_at') then
    v_cols := array_append(v_cols, 'last_sign_in_at');
    v_vals := array_append(v_vals, 'now()');
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'raw_app_meta_data') then
    v_cols := array_append(v_cols, 'raw_app_meta_data');
    v_vals := array_append(v_vals, quote_literal(jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', v_admin_role, 'can_moderate', true)::text) || '::jsonb');
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'raw_user_meta_data') then
    v_cols := array_append(v_cols, 'raw_user_meta_data');
    v_vals := array_append(v_vals, quote_literal(jsonb_build_object('username', v_username, 'display_name', v_username, 'role', v_admin_role, 'can_moderate', true)::text) || '::jsonb');
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

  raise notice 'Created only auth user % with id %', v_email, v_user_id;

  -- 5) Crea identity email per login password.
  if to_regclass('auth.identities') is not null then
    v_cols := ARRAY[]::text[];
    v_vals := ARRAY[]::text[];

    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'identities' and column_name = 'id') then
      v_cols := array_append(v_cols, 'id');
      v_vals := array_append(v_vals, quote_literal(v_user_id::text));
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'identities' and column_name = 'provider_id') then
      v_cols := array_append(v_cols, 'provider_id');
      v_vals := array_append(v_vals, quote_literal(v_email));
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
    -- auth.identities.email is a generated column in current Supabase Auth schemas.
    -- Do not insert it directly; Supabase derives it from identity_data.
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
  end if;

  -- 6) Crea/aggiorna profilo admin/moderatore.
  --    Nota BauBook/Supabase: dopo insert in auth.users puo' esistere gia' un profilo
  --    creato da trigger con profiles.user_id = v_user_id. Quindi NON facciamo
  --    insert cieco: prima cerchiamo la riga per user_id/id, poi la aggiorniamo.
  if to_regclass('public.profiles') is not null then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id') then
      v_profile_key_col := 'user_id';
    elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'id') then
      v_profile_key_col := 'id';
    else
      raise exception 'public.profiles exists but has no user_id/id column';
    end if;

    execute format(
      'select exists (select 1 from public.profiles where %I = %L::uuid)',
      v_profile_key_col,
      v_user_id::text
    ) into v_exists;

    if not v_exists then
      v_cols := ARRAY[]::text[];
      v_vals := ARRAY[]::text[];

      if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'id') then
        v_cols := array_append(v_cols, 'id');
        v_vals := array_append(v_vals, quote_literal(v_user_id::text));
      end if;
      if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id') then
        v_cols := array_append(v_cols, 'user_id');
        v_vals := array_append(v_vals, quote_literal(v_user_id::text));
      end if;
      if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'display_name') then
        v_cols := array_append(v_cols, 'display_name');
        v_vals := array_append(v_vals, quote_literal(v_username));
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

      raise notice 'Inserted administrator profile shell for %', v_email;
    else
      raise notice 'Profile already exists for % via %, updating it', v_email, v_profile_key_col;
    end if;

    v_sets := ARRAY[]::text[];

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'email') then
      v_sets := array_append(v_sets, format('email = %L', v_email));
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'username') then
      v_sets := array_append(v_sets, format('username = %L', v_username));
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'display_name') then
      v_sets := array_append(v_sets, format('display_name = %L', v_username));
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'full_name') then
      v_sets := array_append(v_sets, format('full_name = %L', v_username));
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'name') then
      v_sets := array_append(v_sets, format('name = %L', v_username));
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'role') then
      v_sets := array_append(v_sets, format('role = %s', pg_temp.baubook_role_literal('public', 'profiles', 'role', v_admin_role)));
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'account_role') then
      v_sets := array_append(v_sets, format('account_role = %s', pg_temp.baubook_role_literal('public', 'profiles', 'account_role', v_admin_role)));
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'app_role') then
      v_sets := array_append(v_sets, format('app_role = %s', pg_temp.baubook_role_literal('public', 'profiles', 'app_role', v_admin_role)));
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'moderation_role') then
      v_sets := array_append(v_sets, format('moderation_role = %s', pg_temp.baubook_role_literal('public', 'profiles', 'moderation_role', v_admin_role)));
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_admin') then
      v_sets := array_append(v_sets, 'is_admin = true');
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_administrator') then
      v_sets := array_append(v_sets, 'is_administrator = true');
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'can_moderate') then
      v_sets := array_append(v_sets, 'can_moderate = true');
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'updated_at') then
      v_sets := array_append(v_sets, 'updated_at = now()');
    end if;

    if array_length(v_sets, 1) is not null then
      execute format(
        'update public.profiles set %s where %I = %L::uuid',
        array_to_string(v_sets, ', '),
        v_profile_key_col,
        v_user_id::text
      );
    end if;

    raise notice 'Created/updated administrator profile for %', v_email;
  end if;

  -- 7) Crea record admin/moderation esattamente via profile_id.
  --    BauBook usa public.admin_users(profile_id, role, active) e il ruolo owner.
  if to_regclass('public.admin_users') is not null then
    insert into public.admin_users (profile_id, role)
    select id, 'owner'
    from public.profiles
    where display_name = 'admin'
    on conflict (profile_id) do update
      set role = excluded.role,
          active = true;

    raise notice 'Created/updated public.admin_users owner record for profile display_name=admin';
  else
    raise notice 'public.admin_users does not exist; skipping moderation owner bootstrap';
  end if;
end $$;

commit;

-- Verifica: deve restare un solo utente Auth, admin@baubook.me.
select
  count(*) as auth_users_total,
  count(*) filter (where lower(email) = lower('admin@baubook.me')) as admin_users_total
from auth.users;

select
  u.id,
  u.email,
  u.email_confirmed_at,
  u.raw_app_meta_data,
  u.raw_user_meta_data,
  u.created_at,
  u.updated_at
from auth.users u
where lower(u.email) = lower('admin@baubook.me');


select
  au.profile_id,
  p.display_name,
  au.role,
  au.active
from public.admin_users au
join public.profiles p on p.id = au.profile_id
where p.display_name = 'admin';

-- Verifica profili/admin table, se presenti.
select
  table_schema,
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'admin_users')
order by table_name, ordinal_position;
