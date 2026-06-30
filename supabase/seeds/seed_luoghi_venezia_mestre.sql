-- BauBook! - Impianto luoghi Venezia-Mestre + aree cani ufficiali geocodificate.
-- Combina 0006_official_venice_dog_areas.sql e 0007_geocoded_dog_area_radius_search.sql.
-- Regole applicate:
-- - non modifica tags e description dei places esistenti negli upsert;
-- - non riscrive description dei feature flag esistenti;
-- - public.places.location resta geometry, non geography;
-- - PostGIS viene richiamato dallo schema extensions;
-- - la radius search usa cast geometry -> geography solo per distance/dwithin.
-- Source list: user-provided PDF "Aree cani per sito_2.pdf".

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

begin;

-- BauBook! 1.9.5 - Official Venice dog areas catalog.
-- Source data imported from the user-provided PDF: "Aree cani per sito_2.pdf".
-- The PDF provides official names and addresses, but no coordinates.
-- This migration intentionally stores the areas as address-only public dog_area places.
-- A future geocoding pass can fill location/area and remove needsGeocoding from metadata.
insert into public.cities (slug, name, country_code, region, status, center, timezone, metadata)
values (
  'venezia-mestre',
  'Venezia-Mestre',
  'IT',
  'Veneto',
  'beta',
  extensions.ST_SetSRID(extensions.ST_MakePoint(12.3155, 45.4408), 4326),
  'Europe/Rome',
  '{"betaName":"BauBook! Venezia-Mestre","officialDogAreas":"address-only import"}'::jsonb
)
on conflict (slug) do update
set name = excluded.name,
    region = excluded.region,
    status = excluded.status,
    center = excluded.center,
    timezone = excluded.timezone,
    metadata = public.cities.metadata || excluded.metadata,
    updated_at = now();

-- Allow curated official address-only dog areas until geocoding is completed.
alter table public.places drop constraint if exists places_has_geometry;
alter table public.places add constraint places_has_geometry check (
  location is not null
  or area is not null
  or (
    type = 'dog_area'
    and source = 'comune_venezia_official_dog_areas_2026_pdf'
    and metadata ? 'address'
  )
);

with city_ref as (
  select id from public.cities where slug = 'venezia-mestre'
)
insert into public.city_areas (city_id, slug, name, area_type, metadata)
values
  ((select id from city_ref), 'campalto', 'Campalto', 'neighborhood', '{"municipalityNumber": 3, "municipality": "Favaro Veneto"}'::jsonb),
  ((select id from city_ref), 'cannareggio', 'Cannareggio', 'neighborhood', '{"municipalityNumber": 1, "municipality": "Venezia Insulare"}'::jsonb),
  ((select id from city_ref), 'carpenedo-bissuola', 'Carpenedo - Bissuola', 'neighborhood', '{"municipalityNumber": 4, "municipality": "Mestre Centro"}'::jsonb),
  ((select id from city_ref), 'chirignago', 'Chirignago', 'neighborhood', '{"municipalityNumber": 5, "municipality": "Chirignago-Zelarino"}'::jsonb),
  ((select id from city_ref), 'favaro', 'Favaro', 'neighborhood', '{"municipalityNumber": 3, "municipality": "Favaro Veneto"}'::jsonb),
  ((select id from city_ref), 'gazzera', 'Gazzera', 'neighborhood', '{"municipalityNumber": 5, "municipality": "Chirignago-Zelarino"}'::jsonb),
  ((select id from city_ref), 'giudecca', 'Giudecca', 'neighborhood', '{"municipalityNumber": 1, "municipality": "Venezia Insulare"}'::jsonb),
  ((select id from city_ref), 'lido', 'Lido', 'neighborhood', '{"municipalityNumber": 2, "municipality": "Venezia Litorale"}'::jsonb),
  ((select id from city_ref), 'marghera', 'Marghera', 'neighborhood', '{"municipalityNumber": 6, "municipality": "Marghera"}'::jsonb),
  ((select id from city_ref), 'mestre-centro', 'Mestre Centro', 'neighborhood', '{"municipalityNumber": 4, "municipality": "Mestre Centro"}'::jsonb),
  ((select id from city_ref), 'murano', 'Murano', 'neighborhood', '{"municipalityNumber": 1, "municipality": "Venezia Insulare"}'::jsonb),
  ((select id from city_ref), 'trivignano', 'Trivignano', 'neighborhood', '{"municipalityNumber": 5, "municipality": "Chirignago-Zelarino"}'::jsonb),
  ((select id from city_ref), 'zelarino', 'Zelarino', 'neighborhood', '{"municipalityNumber": 5, "municipality": "Chirignago-Zelarino"}'::jsonb)
on conflict (city_id, slug) do update
set name = excluded.name,
    area_type = excluded.area_type,
    metadata = public.city_areas.metadata || excluded.metadata,
    updated_at = now();

with city_ref as (
  select id from public.cities where slug = 'venezia-mestre'
)
insert into public.places (
  city_id,
  city_area_id,
  slug,
  name,
  type,
  source,
  tags,
  description,
  moderation_status,
  visibility,
  metadata
)
values
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'murano'), 'dog-area-murano-parco-angeli', 'Parco Angeli', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'murano'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Calle Salviati 30141 Venezia VE.', 'approved', 'public', '{"address": "Calle Salviati 30141 Venezia VE", "municipalityNumber": 1, "municipality": "Venezia Insulare", "zone": "Murano", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'giudecca'), 'dog-area-giudecca-fondamenta-collalto', 'Fondamenta Collalto', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'giudecca'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Fondamenta Beata Giuliana di Collalto, 52 30133 Venezia VE.', 'approved', 'public', '{"address": "Fondamenta Beata Giuliana di Collalto, 52 30133 Venezia VE", "municipalityNumber": 1, "municipality": "Venezia Insulare", "zone": "Giudecca", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'cannareggio'), 'dog-area-cannareggio-parco-savorgnan', 'Parco Savorgnan', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'cannareggio'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Calle Pesaro, 427, 30121 Venezia VE.', 'approved', 'public', '{"address": "Calle Pesaro, 427, 30121 Venezia VE", "municipalityNumber": 1, "municipality": "Venezia Insulare", "zone": "Cannareggio", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'lido'), 'dog-area-lido-area-case-bianche-parco-turcato', 'Area Case Bianche - Parco Turcato', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'lido'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Malamocco, 20, 30126 Lido VE.', 'approved', 'public', '{"address": "Via Malamocco, 20, 30126 Lido VE", "municipalityNumber": 2, "municipality": "Venezia Litorale", "zone": "Lido", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'favaro'), 'dog-area-favaro-parco-gobbi', 'Parco Gobbi', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'favaro'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Gobbi, 13 30173 Venezia VE.', 'approved', 'public', '{"address": "Via Gobbi, 13 30173 Venezia VE", "municipalityNumber": 3, "municipality": "Favaro Veneto", "zone": "Favaro", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'campalto'), 'dog-area-campalto-area-marchesi', 'Area Marchesi', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'campalto'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Marchesi 30173 Venezia VE.', 'approved', 'public', '{"address": "Via Marchesi 30173 Venezia VE", "municipalityNumber": 3, "municipality": "Favaro Veneto", "zone": "Campalto", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'favaro'), 'dog-area-favaro-area-monte-cervino', 'Area Monte Cervino', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'favaro'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Monte Cervino, 126 30173 Venezia VE.', 'approved', 'public', '{"address": "Via Monte Cervino, 126 30173 Venezia VE", "municipalityNumber": 3, "municipality": "Favaro Veneto", "zone": "Favaro", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'carpenedo-bissuola'), 'dog-area-carpenedo-bissuola-area-bissagola', 'Area Bissagola', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'carpenedo bissuola'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Bissagola, 16, 30173 Venezia VE.', 'approved', 'public', '{"address": "Via Bissagola, 16, 30173 Venezia VE", "municipalityNumber": 4, "municipality": "Mestre Centro", "zone": "Carpenedo - Bissuola", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'mestre-centro'), 'dog-area-mestre-centro-parco-piraghetto', 'Parco Piraghetto', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'mestre centro'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Alfredo Catalani, 9, 30171 Venezia VE.', 'approved', 'public', '{"address": "Via Alfredo Catalani, 9, 30171 Venezia VE", "municipalityNumber": 4, "municipality": "Mestre Centro", "zone": "Mestre Centro", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'carpenedo-bissuola'), 'dog-area-carpenedo-bissuola-via-pertini', 'Via Pertini', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'carpenedo bissuola'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via E. Pertini 30173 Venezia VE.', 'approved', 'public', '{"address": "Via E. Pertini 30173 Venezia VE", "municipalityNumber": 4, "municipality": "Mestre Centro", "zone": "Carpenedo - Bissuola", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'mestre-centro'), 'dog-area-mestre-centro-parco-sabbioni', 'Parco Sabbioni', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'mestre centro'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Baldassarre Galuppi, 30171 Venezia VE.', 'approved', 'public', '{"address": "Via Baldassarre Galuppi, 30171 Venezia VE", "municipalityNumber": 4, "municipality": "Mestre Centro", "zone": "Mestre Centro", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'mestre-centro'), 'dog-area-mestre-centro-via-terraglio-borgo-pezzana', 'Via Terraglio / Borgo Pezzana', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'mestre centro'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Borgo Pezzana, 15-3 30174 Venezia VE.', 'approved', 'public', '{"address": "Via Borgo Pezzana, 15-3 30174 Venezia VE", "municipalityNumber": 4, "municipality": "Mestre Centro", "zone": "Mestre Centro", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'carpenedo-bissuola'), 'dog-area-carpenedo-bissuola-viale-don-sturzo', 'Viale Don Sturzo / Parco Kennedy', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'carpenedo bissuola'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Viale don Luigi Sturzo, 30174 Venezia VE.', 'approved', 'public', '{"address": "Viale don Luigi Sturzo, 30174 Venezia VE", "municipalityNumber": 4, "municipality": "Mestre Centro", "zone": "Carpenedo - Bissuola", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'mestre-centro'), 'dog-area-mestre-centro-parco-villa-querini', 'Parco Villa Querini', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'mestre centro'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Giuseppe Verdi, 35, 30171 Venezia VE.', 'approved', 'public', '{"address": "Via Giuseppe Verdi, 35, 30171 Venezia VE", "municipalityNumber": 4, "municipality": "Mestre Centro", "zone": "Mestre Centro", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'carpenedo-bissuola'), 'dog-area-carpenedo-bissuola-parco-bissuola-parco-albanese', 'Parco Bissuola - Parco Albanese', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'carpenedo bissuola'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Rielta, 49 30174 Venezia VE.', 'approved', 'public', '{"address": "Via Rielta, 49 30174 Venezia VE", "municipalityNumber": 4, "municipality": "Mestre Centro", "zone": "Carpenedo - Bissuola", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'mestre-centro'), 'dog-area-mestre-centro-parco-san-giuliano', 'Parco San Giuliano', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'mestre centro'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Orlanda, 30173 Venezia VE.', 'approved', 'public', '{"address": "Via Orlanda, 30173 Venezia VE", "municipalityNumber": 4, "municipality": "Mestre Centro", "zone": "Mestre Centro", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'zelarino'), 'dog-area-zelarino-parco-hayez', 'Parco Hayez', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'zelarino'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Caravaggio 30174 Venezia VE.', 'approved', 'public', '{"address": "Via Caravaggio 30174 Venezia VE", "municipalityNumber": 5, "municipality": "Chirignago-Zelarino", "zone": "Zelarino", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'chirignago'), 'dog-area-chirignago-area-montessori', 'Area Montessori', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'chirignago'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Maria Montessori 30174 Chirignago-Zelarino VE.', 'approved', 'public', '{"address": "Via Maria Montessori 30174 Chirignago-Zelarino VE", "municipalityNumber": 5, "municipality": "Chirignago-Zelarino", "zone": "Chirignago", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'gazzera'), 'dog-area-gazzera-forte-gazzera', 'Forte Gazzera', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'gazzera'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Pirano, 30174 Venezia VE.', 'approved', 'public', '{"address": "Via Pirano, 30174 Venezia VE", "municipalityNumber": 5, "municipality": "Chirignago-Zelarino", "zone": "Gazzera", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'chirignago'), 'dog-area-chirignago-parco-rodari', 'Parco Rodari', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'chirignago'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Miranese, 400, 30173 Venezia VE.', 'approved', 'public', '{"address": "Via Miranese, 400, 30173 Venezia VE", "municipalityNumber": 5, "municipality": "Chirignago-Zelarino", "zone": "Chirignago", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'zelarino'), 'dog-area-zelarino-area-scaramuzza', 'Area Scaramuzza', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'zelarino'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via E. Scaramuzza 30174 Venezia VE.', 'approved', 'public', '{"address": "Via E. Scaramuzza 30174 Venezia VE", "municipalityNumber": 5, "municipality": "Chirignago-Zelarino", "zone": "Zelarino", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'trivignano'), 'dog-area-trivignano-parco-vicentino', 'Parco Vicentino', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'trivignano'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Andrea Vicentino 30174 Chirignago-Zelarino VE.', 'approved', 'public', '{"address": "Via Andrea Vicentino 30174 Chirignago-Zelarino VE", "municipalityNumber": 5, "municipality": "Chirignago-Zelarino", "zone": "Trivignano", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'zelarino'), 'dog-area-zelarino-parco-marzenego', 'Parco Marzenego', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'zelarino'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Selvanese, 34, 30174 Venezia VE.', 'approved', 'public', '{"address": "Via Selvanese, 34, 30174 Venezia VE", "municipalityNumber": 5, "municipality": "Chirignago-Zelarino", "zone": "Zelarino", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'chirignago'), 'dog-area-chirignago-parco-giulia-cecchettin', 'Parco Giulia Cecchettin', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'chirignago'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Oriago, 12 30174 Venezia VE.', 'approved', 'public', '{"address": "Via Oriago, 12 30174 Venezia VE", "municipalityNumber": 5, "municipality": "Chirignago-Zelarino", "zone": "Chirignago", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'marghera'), 'dog-area-marghera-parco-baden-powell-area-scarsellini', 'Parco Baden Powell - Area Scarsellini', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'marghera'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via C. Beccaria, 29-35, 30175 Venezia VE.', 'approved', 'public', '{"address": "Via C. Beccaria, 29-35, 30175 Venezia VE", "municipalityNumber": 6, "municipality": "Marghera", "zone": "Marghera", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'marghera'), 'dog-area-marghera-parco-catene', 'Parco Catene', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'marghera'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Trieste, 179 30175 Venezia VE.', 'approved', 'public', '{"address": "Via Trieste, 179 30175 Venezia VE", "municipalityNumber": 6, "municipality": "Marghera", "zone": "Marghera", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'marghera'), 'dog-area-marghera-parco-emmer', 'Parco Emmer', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'marghera'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Pietro Cornaglia 30175 Venezia VE.', 'approved', 'public', '{"address": "Via Pietro Cornaglia 30175 Venezia VE", "municipalityNumber": 6, "municipality": "Marghera", "zone": "Marghera", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb)
on conflict (city_id, slug) do update
set city_area_id = excluded.city_area_id,
    name = excluded.name,
    type = excluded.type,
    source = excluded.source,
    moderation_status = excluded.moderation_status,
    visibility = excluded.visibility,
    metadata = coalesce(public.places.metadata, '{}'::jsonb) || excluded.metadata,
    updated_at = now();

-- BauBook! - Restore geocoded Venice dog areas + radius search.
-- Fixed for current Supabase/PostGIS setup:
-- - PostGIS functions live in schema extensions
-- - public.places.location is geometry, not geography
-- - distance calculations cast geometry -> geography only inside the search function
with dog_area_points(slug, lat, lng, precision, note) as (
    values
        ('dog-area-murano-parco-angeli', 45.4589::double precision, 12.3517::double precision, 'address_or_park_centroid', 'Murano, Calle Salviati / Parco Angeli'),
        ('dog-area-giudecca-fondamenta-collalto', 45.4263::double precision, 12.3244::double precision, 'address_or_park_centroid', 'Giudecca, Fondamenta Beata Giuliana di Collalto'),
        ('dog-area-cannareggio-parco-savorgnan', 45.4432::double precision, 12.3233::double precision, 'park_centroid', 'Cannaregio, Parco Savorgnan'),
        ('dog-area-lido-area-case-bianche-parco-turcato', 45.3984::double precision, 12.3543::double precision, 'address_or_park_centroid', 'Lido, Via Malamocco / Parco Turcato'),
        ('dog-area-favaro-parco-gobbi', 45.5040::double precision, 12.2863::double precision, 'address_or_park_centroid', 'Favaro, Via Gobbi'),
        ('dog-area-campalto-area-marchesi', 45.4815::double precision, 12.2815::double precision, 'address_or_park_centroid', 'Campalto, Via Marchesi'),
        ('dog-area-favaro-area-monte-cervino', 45.4999::double precision, 12.2860::double precision, 'address_or_park_centroid', 'Favaro, Via Monte Cervino'),
        ('dog-area-carpenedo-bissuola-area-bissagola', 45.5030::double precision, 12.2583::double precision, 'address_or_park_centroid', 'Carpenedo-Bissuola, Via Bissagola'),
        ('dog-area-mestre-centro-parco-piraghetto', 45.4862::double precision, 12.2369::double precision, 'park_centroid', 'Mestre Centro, Parco Piraghetto'),
        ('dog-area-carpenedo-bissuola-via-pertini', 45.5038::double precision, 12.2608::double precision, 'address_or_park_centroid', 'Carpenedo-Bissuola, Via E. Pertini'),
        ('dog-area-mestre-centro-parco-sabbioni', 45.4906::double precision, 12.2402::double precision, 'address_or_park_centroid', 'Mestre Centro, Via Baldassarre Galuppi / Parco Sabbioni'),
        ('dog-area-mestre-centro-via-terraglio-borgo-pezzana', 45.4985::double precision, 12.2446::double precision, 'address_or_park_centroid', 'Mestre Centro, Via Terraglio / Borgo Pezzana'),
        ('dog-area-carpenedo-bissuola-viale-don-sturzo', 45.5066::double precision, 12.2536::double precision, 'address_or_park_centroid', 'Carpenedo-Bissuola, Viale Don Luigi Sturzo / Parco Kennedy'),
        ('dog-area-mestre-centro-parco-villa-querini', 45.4914::double precision, 12.2429::double precision, 'park_centroid', 'Mestre Centro, Parco Villa Querini'),
        ('dog-area-carpenedo-bissuola-parco-bissuola-parco-albanese', 45.5097::double precision, 12.2605::double precision, 'park_centroid', 'Carpenedo-Bissuola, Parco Bissuola / Parco Albanese'),
        ('dog-area-mestre-centro-parco-san-giuliano', 45.4706::double precision, 12.2820::double precision, 'park_centroid', 'Mestre Centro, Parco San Giuliano'),
        ('dog-area-zelarino-parco-hayez', 45.5150::double precision, 12.2036::double precision, 'address_or_park_centroid', 'Zelarino, Via Caravaggio / Parco Hayez'),
        ('dog-area-chirignago-area-montessori', 45.4725::double precision, 12.2086::double precision, 'address_or_park_centroid', 'Chirignago, Via Maria Montessori'),
        ('dog-area-gazzera-forte-gazzera', 45.4915::double precision, 12.1926::double precision, 'park_centroid', 'Gazzera, Forte Gazzera / Via Pirano'),
        ('dog-area-chirignago-parco-rodari', 45.4689::double precision, 12.2072::double precision, 'park_centroid', 'Chirignago, Parco Rodari / Via Miranese'),
        ('dog-area-zelarino-area-scaramuzza', 45.5188::double precision, 12.2135::double precision, 'address_or_park_centroid', 'Zelarino, Via E. Scaramuzza'),
        ('dog-area-trivignano-parco-vicentino', 45.5235::double precision, 12.1715::double precision, 'address_or_park_centroid', 'Trivignano, Via Andrea Vicentino'),
        ('dog-area-zelarino-parco-marzenego', 45.5200::double precision, 12.2220::double precision, 'park_centroid', 'Zelarino, Parco Marzenego / Via Selvanese'),
        ('dog-area-chirignago-parco-giulia-cecchettin', 45.4740::double precision, 12.1964::double precision, 'park_centroid', 'Chirignago, Parco Giulia Cecchettin / Via Oriago'),
        ('dog-area-marghera-parco-baden-powell-area-scarsellini', 45.4664::double precision, 12.2374::double precision, 'park_centroid', 'Marghera, Parco Baden Powell / Area Scarsellini'),
        ('dog-area-marghera-parco-catene', 45.4665::double precision, 12.2159::double precision, 'park_centroid', 'Marghera, Parco Catene / Via Trieste'),
        ('dog-area-marghera-parco-emmer', 45.4647::double precision, 12.2204::double precision, 'park_centroid', 'Marghera, Parco Emmer / Via Pietro Cornaglia')
)
update public.places p
set
    location = extensions.ST_SetSRID(
            extensions.ST_MakePoint(dap.lng, dap.lat),
            4326
               ),
    metadata = coalesce(p.metadata, '{}'::jsonb) || jsonb_build_object(
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
set search_path = public, extensions
as $$
  with origin as (
    select extensions.ST_SetSRID(
      extensions.ST_MakePoint(p_lng, p_lat),
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
$$;

grant execute on function public.search_dog_areas_nearby(
  double precision,
  double precision,
  double precision,
  integer
) to anon, authenticated;

do $$
begin
  if to_regclass('public.feature_flags') is not null then
    insert into public.feature_flags (
      key,
      title,
      description,
      enabled,
      rollout,
      min_app_version
    )
    values (
      'mvp.official_dog_areas_venice',
      'Aree cani ufficiali Venezia',
      'Catalogo ufficiale delle aree cani Venezia importato da elenco PDF ufficiale/user-provided.',
      true,
      '{"city":"venezia-mestre","source":"comune_venezia_official_dog_areas_2026_pdf","count":27,"coordinateStatus":"beta_geocoded"}'::jsonb,
      '0.2.5'
    )
    on conflict (key) do update set
      title = excluded.title,
      enabled = excluded.enabled,
      rollout = coalesce(public.feature_flags.rollout, '{}'::jsonb) || excluded.rollout,
      min_app_version = excluded.min_app_version,
      updated_at = now();

    insert into public.feature_flags (
      key,
      title,
      description,
      enabled,
      min_app_version,
      rollout
    )
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
      enabled = excluded.enabled,
      min_app_version = excluded.min_app_version,
      rollout = coalesce(public.feature_flags.rollout, '{}'::jsonb) || excluded.rollout,
      updated_at = now();
  end if;

  if to_regclass('public.app_config') is not null then
    insert into public.app_config (key, value, is_public)
    values (
      'beta.officialDogAreasVenice',
      '{"source":"Aree cani per sito_2.pdf","sourceKind":"official_pdf_import","count":27,"coordinateStatus":"beta_geocoded","geocodingSource":"baubook_manual_geocoding_pass_2026_06","radiusSearch":"enabled"}'::jsonb,
      true
    )
    on conflict (key) do update set
      value = excluded.value,
      is_public = excluded.is_public,
      updated_at = now();
  end if;
end $$;

commit;

insert into public.admin_users (profile_id, role)
select id, 'owner'
from public.profiles
where display_name = 'admin'
    on conflict (profile_id) do update
                                    set role = excluded.role,
                                    active = true;

-- Verifiche consigliate dopo l'esecuzione:
-- select count(*) as total, count(location) as with_location, count(*) - count(location) as without_location
-- from public.places
-- where type = 'dog_area'
--   and source = 'comune_venezia_official_dog_areas_2026_pdf';
--
-- select slug, name, extensions.ST_Y(location) as lat, extensions.ST_X(location) as lng,
--        metadata->>'geocodingStatus' as geocoding_status
-- from public.places
-- where type = 'dog_area'
--   and source = 'comune_venezia_official_dog_areas_2026_pdf'
--   and location is not null
-- order by name;
--
-- select *
-- from public.search_dog_areas_nearby(45.4862, 12.2369, 10, 50);
