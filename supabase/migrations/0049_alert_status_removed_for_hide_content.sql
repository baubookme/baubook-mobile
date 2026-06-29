-- BauBook 0.7.4 / baseline 2.3.0
-- Fix conservativo pre-store: la moderazione usa lo stato generico 'removed'
-- quando l'admin fa "Nascondi contenuto". Gli alert usano l'enum public.alert_status,
-- che nella build corrente non contiene ancora 'removed'.
--
-- NON tocca utenti, luoghi, profili o contenuti esistenti.
-- Aggiunge solo un valore enum idempotente e ricarica la schema cache PostgREST.

-- 1) Diagnostica: valori attuali dell'enum.
select
  t.typname as enum_name,
  e.enumsortorder,
  e.enumlabel
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
  and t.typname = 'alert_status'
order by e.enumsortorder;

-- 2) Diagnostica: colonne che usano public.alert_status.
select
  table_schema,
  table_name,
  column_name,
  udt_name
from information_schema.columns
where table_schema = 'public'
  and udt_name = 'alert_status'
order by table_name, ordinal_position;

-- 3) Fix idempotente.
alter type public.alert_status add value if not exists 'removed';

-- 4) Chiedi a PostgREST/Supabase di ricaricare la schema cache.
notify pgrst, 'reload schema';

-- 5) Verifica post-fix.
select
  t.typname as enum_name,
  e.enumsortorder,
  e.enumlabel
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
  and t.typname = 'alert_status'
order by e.enumsortorder;
