-- BauBook! 1.9.6 - Geocoded Venice dog areas + radius search.
-- Source list: user-provided PDF "Aree cani per sito_2.pdf" imported by 0006.
-- This migration adds a first beta geocoding pass for the official dog areas.
-- Coordinates are used for MVP radius search and must remain reviewable in metadata.

begin;

with dog_area_points(slug, lat, lng, precision, note) as (
  values
    ('dog-area-murano-parco-angeli', 45.4589, 12.3517, 'address_or_park_centroid', 'Murano, Calle Salviati / Parco Angeli'),
    ('dog-area-giudecca-fondamenta-collalto', 45.4263, 12.3244, 'address_or_park_centroid', 'Giudecca, Fondamenta Beata Giuliana di Collalto'),
    ('dog-area-cannareggio-parco-savorgnan', 45.4432, 12.3233, 'park_centroid', 'Cannaregio, Parco Savorgnan'),
    ('dog-area-lido-area-case-bianche-parco-turcato', 45.3984, 12.3543, 'address_or_park_centroid', 'Lido, Via Malamocco / Parco Turcato'),
    ('dog-area-favaro-parco-gobbi', 45.5040, 12.2863, 'address_or_park_centroid', 'Favaro, Via Gobbi'),
    ('dog-area-campalto-area-marchesi', 45.4815, 12.2815, 'address_or_park_centroid', 'Campalto, Via Marchesi'),
    ('dog-area-favaro-area-monte-cervino', 45.4999, 12.2860, 'address_or_park_centroid', 'Favaro, Via Monte Cervino'),
    ('dog-area-carpenedo-bissuola-area-bissagola', 45.5030, 12.2583, 'address_or_park_centroid', 'Carpenedo-Bissuola, Via Bissagola'),
    ('dog-area-mestre-centro-parco-piraghetto', 45.4862, 12.2369, 'park_centroid', 'Mestre Centro, Parco Piraghetto'),
    ('dog-area-carpenedo-bissuola-via-pertini', 45.5038, 12.2608, 'address_or_park_centroid', 'Carpenedo-Bissuola, Via E. Pertini'),
    ('dog-area-mestre-centro-parco-sabbioni', 45.4906, 12.2402, 'address_or_park_centroid', 'Mestre Centro, Via Baldassarre Galuppi / Parco Sabbioni'),
    ('dog-area-mestre-centro-via-terraglio-borgo-pezzana', 45.4985, 12.2446, 'address_or_park_centroid', 'Mestre Centro, Via Terraglio / Borgo Pezzana'),
    ('dog-area-carpenedo-bissuola-viale-don-sturzo', 45.5066, 12.2536, 'address_or_park_centroid', 'Carpenedo-Bissuola, Viale Don Luigi Sturzo / Parco Kennedy'),
    ('dog-area-mestre-centro-parco-villa-querini', 45.4914, 12.2429, 'park_centroid', 'Mestre Centro, Parco Villa Querini'),
    ('dog-area-carpenedo-bissuola-parco-bissuola-parco-albanese', 45.5097, 12.2605, 'park_centroid', 'Carpenedo-Bissuola, Parco Bissuola / Parco Albanese'),
    ('dog-area-mestre-centro-parco-san-giuliano', 45.4706, 12.2820, 'park_centroid', 'Mestre Centro, Parco San Giuliano'),
    ('dog-area-zelarino-parco-hayez', 45.5150, 12.2036, 'address_or_park_centroid', 'Zelarino, Via Caravaggio / Parco Hayez'),
    ('dog-area-chirignago-area-montessori', 45.4725, 12.2086, 'address_or_park_centroid', 'Chirignago, Via Maria Montessori'),
    ('dog-area-gazzera-forte-gazzera', 45.4915, 12.1926, 'park_centroid', 'Gazzera, Forte Gazzera / Via Pirano'),
    ('dog-area-chirignago-parco-rodari', 45.4689, 12.2072, 'park_centroid', 'Chirignago, Parco Rodari / Via Miranese'),
    ('dog-area-zelarino-area-scaramuzza', 45.5188, 12.2135, 'address_or_park_centroid', 'Zelarino, Via E. Scaramuzza'),
    ('dog-area-trivignano-parco-vicentino', 45.5235, 12.1715, 'address_or_park_centroid', 'Trivignano, Via Andrea Vicentino'),
    ('dog-area-zelarino-parco-marzenego', 45.5200, 12.2220, 'park_centroid', 'Zelarino, Parco Marzenego / Via Selvanese'),
    ('dog-area-chirignago-parco-giulia-cecchettin', 45.4740, 12.1964, 'park_centroid', 'Chirignago, Parco Giulia Cecchettin / Via Oriago'),
    ('dog-area-marghera-parco-baden-powell-area-scarsellini', 45.4664, 12.2374, 'park_centroid', 'Marghera, Parco Baden Powell / Area Scarsellini'),
    ('dog-area-marghera-parco-catene', 45.4665, 12.2159, 'park_centroid', 'Marghera, Parco Catene / Via Trieste'),
    ('dog-area-marghera-parco-emmer', 45.4647, 12.2204, 'park_centroid', 'Marghera, Parco Emmer / Via Pietro Cornaglia')
)
update public.places p
set
  location = ST_SetSRID(ST_MakePoint(dap.lng, dap.lat), 4326),
  metadata = p.metadata || jsonb_build_object(
    'needsGeocoding', false,
    'geocodingStatus', 'beta_geocoded',
    'geocodingSource', 'baubook_manual_geocoding_pass_2026_06',
    'geocodingPrecision', dap.precision,
    'geocodingNote', dap.note,
    'lat', dap.lat,
    'lng', dap.lng
  ),
  updated_at = now()
from dog_area_points dap
where p.slug = dap.slug
  and p.type = 'dog_area'
  and p.source = 'comune_venezia_official_dog_areas_2026_pdf';

create index if not exists places_dog_area_location_gix
  on public.places using gist(location)
  where type = 'dog_area' and location is not null;

create or replace function public.search_dog_areas_nearby(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 3,
  p_limit integer default 50
)
returns table (
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
set search_path = public
as $$
  with origin as (
    select ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326) as geom
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
    round((ST_Distance(p.location::geography, origin.geom::geography) / 1000.0)::numeric, 2)::double precision as distance_km,
    ST_Y(p.location)::double precision as lat,
    ST_X(p.location)::double precision as lng,
    p.metadata
  from public.places p
  cross join origin
  left join public.city_areas ca on ca.id = p.city_area_id
  left join public.cities c on c.id = p.city_id
  where p.type = 'dog_area'
    and p.visibility = 'public'
    and p.moderation_status = 'approved'
    and p.location is not null
    and ST_DWithin(
      p.location::geography,
      origin.geom::geography,
      least(greatest(coalesce(p_radius_km, 3), 0.2), 50) * 1000.0
    )
  order by distance_km asc, p.name asc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

grant execute on function public.search_dog_areas_nearby(double precision, double precision, double precision, integer) to anon, authenticated;

insert into public.feature_flags (key, title, description, enabled, min_app_version, rollout)
values (
  'mvp.dog_area_radius_search',
  'Ricerca aree cani nel raggio',
  'Abilita la ricerca delle aree cani ufficiali nel raggio di X km dalla posizione attuale.',
  true,
  '0.2.6',
  '{"city":"venezia-mestre","source":"0007_geocoded_dog_area_radius_search"}'::jsonb
)
on conflict (key) do update set
  title = excluded.title,
  description = excluded.description,
  enabled = excluded.enabled,
  min_app_version = excluded.min_app_version,
  rollout = feature_flags.rollout || excluded.rollout,
  updated_at = now();

commit;
