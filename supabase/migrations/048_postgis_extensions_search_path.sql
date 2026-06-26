-- BauBook 0.7.4
-- PostGIS is installed in the extensions schema.
-- Keep PostGIS-based RPCs compatible after Supabase relocated postgis.

create schema if not exists extensions;

create extension if not exists postgis with schema extensions;

create or replace function public.search_dog_areas_nearby(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 3,
  p_limit integer default 50
)
returns table(
  id uuid,
  slug text,
  name text,
  type public.place_type,
  area_name text,
  city_name text,
  address text,
  description text,
  tags text[],
  moderation_status public.moderation_status,
  source text,
  distance_km double precision,
  lat double precision,
  lng double precision,
  metadata jsonb
)
language sql
stable
security definer
set search_path to public, extensions
as $function$
  with origin as (
    select extensions.ST_SetSRID(
      extensions.ST_MakePoint(
        p_lng::double precision,
        p_lat::double precision
      ),
      4326
    ) as geom
  )
  select
    p.id,
    p.slug,
    p.name,
    p.type,
    ca.name as area_name,
    c.name as city_name,
    p.metadata ->> 'address' as address,
    p.description,
    p.tags,
    p.moderation_status,
    p.source,
    round(
      (
        extensions.ST_Distance(
          p.location::extensions.geography,
          origin.geom::extensions.geography
        ) / 1000.0
      )::numeric,
      2
    )::double precision as distance_km,
    extensions.ST_Y(p.location)::double precision as lat,
    extensions.ST_X(p.location)::double precision as lng,
    p.metadata
  from public.places p
  cross join origin
  left join public.city_areas ca on ca.id = p.city_area_id
  left join public.cities c on c.id = p.city_id
  where p.type = 'dog_area'
    and p.visibility = 'public'
    and p.moderation_status = 'approved'
    and p.location is not null
    and extensions.ST_DWithin(
      p.location::extensions.geography,
      origin.geom::extensions.geography,
      least(greatest(coalesce(p_radius_km, 3), 0.2), 50) * 1000.0
    )
  order by distance_km asc, p.name asc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$function$;

alter function if exists public.create_danger_report(
  uuid,
  text,
  text,
  integer,
  integer,
  boolean,
  text,
  text,
  double precision,
  double precision,
  text
)
set search_path = public, extensions;

alter function if exists public.create_lost_dog_alert(
  uuid,
  uuid,
  text,
  integer,
  integer,
  boolean,
  text,
  text,
  double precision,
  double precision,
  text
)
set search_path = public, extensions;

alter function if exists public.create_lost_dog_sighting(
  uuid,
  uuid,
  text,
  text,
  boolean
)
set search_path = public, extensions;

alter function if exists public.upsert_lost_dog_sighting(
  uuid,
  text,
  text,
  boolean,
  text,
  text,
  double precision,
  double precision,
  text
)
set search_path = public, extensions;

alter function if exists public.search_dog_areas_nearby(
  double precision,
  double precision,
  double precision,
  integer
)
set search_path = public, extensions;