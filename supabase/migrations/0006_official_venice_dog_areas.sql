-- BauBook! 1.9.5 - Official Venice dog areas catalog.
-- Source data imported from the user-provided PDF: "Aree cani per sito_2.pdf".
-- The PDF provides official names and addresses, but no coordinates.
-- This migration intentionally stores the areas as address-only public dog_area places.
-- A future geocoding pass can fill location/area and remove needsGeocoding from metadata.

begin;

insert into public.cities (slug, name, country_code, region, status, center, timezone, metadata)
values (
  'venezia-mestre',
  'Venezia-Mestre',
  'IT',
  'Veneto',
  'beta',
  ST_SetSRID(ST_MakePoint(12.3155, 45.4408), 4326),
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
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'murano'), 'dog-area-murano-parco-angeli', 'Parco Angeli', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'murano', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Calle Salviati 30141 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Calle Salviati 30141 Venezia VE", "municipalityNumber": 1, "municipality": "Venezia Insulare", "zone": "Murano", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'giudecca'), 'dog-area-giudecca-fondamenta-collalto', 'Fondamenta Collalto', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'giudecca', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Fondamenta Beata Giuliana di Collalto, 52 30133 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Fondamenta Beata Giuliana di Collalto, 52 30133 Venezia VE", "municipalityNumber": 1, "municipality": "Venezia Insulare", "zone": "Giudecca", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'cannareggio'), 'dog-area-cannareggio-parco-savorgnan', 'Parco Savorgnan', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'cannareggio', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Calle Pesaro, 427, 30121 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Calle Pesaro, 427, 30121 Venezia VE", "municipalityNumber": 1, "municipality": "Venezia Insulare", "zone": "Cannareggio", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'lido'), 'dog-area-lido-area-case-bianche-parco-turcato', 'Area Case Bianche - Parco Turcato', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'lido', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Malamocco, 20, 30126 Lido VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via Malamocco, 20, 30126 Lido VE", "municipalityNumber": 2, "municipality": "Venezia Litorale", "zone": "Lido", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'favaro'), 'dog-area-favaro-parco-gobbi', 'Parco Gobbi', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'favaro', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Gobbi, 13 30173 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via Gobbi, 13 30173 Venezia VE", "municipalityNumber": 3, "municipality": "Favaro Veneto", "zone": "Favaro", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'campalto'), 'dog-area-campalto-area-marchesi', 'Area Marchesi', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'campalto', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Marchesi 30173 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via Marchesi 30173 Venezia VE", "municipalityNumber": 3, "municipality": "Favaro Veneto", "zone": "Campalto", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'favaro'), 'dog-area-favaro-area-monte-cervino', 'Area Monte Cervino', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'favaro', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Monte Cervino, 126 30173 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via Monte Cervino, 126 30173 Venezia VE", "municipalityNumber": 3, "municipality": "Favaro Veneto", "zone": "Favaro", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'carpenedo-bissuola'), 'dog-area-carpenedo-bissuola-area-bissagola', 'Area Bissagola', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'carpenedo bissuola', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Bissagola, 16, 30173 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via Bissagola, 16, 30173 Venezia VE", "municipalityNumber": 4, "municipality": "Mestre Centro", "zone": "Carpenedo - Bissuola", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'mestre-centro'), 'dog-area-mestre-centro-parco-piraghetto', 'Parco Piraghetto', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'mestre centro', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Alfredo Catalani, 9, 30171 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via Alfredo Catalani, 9, 30171 Venezia VE", "municipalityNumber": 4, "municipality": "Mestre Centro", "zone": "Mestre Centro", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'carpenedo-bissuola'), 'dog-area-carpenedo-bissuola-via-pertini', 'Via Pertini', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'carpenedo bissuola', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via E. Pertini 30173 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via E. Pertini 30173 Venezia VE", "municipalityNumber": 4, "municipality": "Mestre Centro", "zone": "Carpenedo - Bissuola", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'mestre-centro'), 'dog-area-mestre-centro-parco-sabbioni', 'Parco Sabbioni', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'mestre centro', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Baldassarre Galuppi, 30171 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via Baldassarre Galuppi, 30171 Venezia VE", "municipalityNumber": 4, "municipality": "Mestre Centro", "zone": "Mestre Centro", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'mestre-centro'), 'dog-area-mestre-centro-via-terraglio-borgo-pezzana', 'Via Terraglio / Borgo Pezzana', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'mestre centro', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Borgo Pezzana, 15-3 30174 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via Borgo Pezzana, 15-3 30174 Venezia VE", "municipalityNumber": 4, "municipality": "Mestre Centro", "zone": "Mestre Centro", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'carpenedo-bissuola'), 'dog-area-carpenedo-bissuola-viale-don-sturzo', 'Viale Don Sturzo', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'carpenedo bissuola', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Viale don Luigi Sturzo, 30174 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Viale don Luigi Sturzo, 30174 Venezia VE", "municipalityNumber": 4, "municipality": "Mestre Centro", "zone": "Carpenedo - Bissuola", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'mestre-centro'), 'dog-area-mestre-centro-parco-villa-querini', 'Parco Villa Querini', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'mestre centro', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Giuseppe Verdi, 35, 30171 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via Giuseppe Verdi, 35, 30171 Venezia VE", "municipalityNumber": 4, "municipality": "Mestre Centro", "zone": "Mestre Centro", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'carpenedo-bissuola'), 'dog-area-carpenedo-bissuola-parco-bissuola-parco-albanese', 'Parco Bissuola - Parco Albanese', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'carpenedo bissuola', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Rielta, 49 30174 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via Rielta, 49 30174 Venezia VE", "municipalityNumber": 4, "municipality": "Mestre Centro", "zone": "Carpenedo - Bissuola", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'mestre-centro'), 'dog-area-mestre-centro-parco-san-giuliano', 'Parco San Giuliano', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'mestre centro', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Orlanda, 30173 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via Orlanda, 30173 Venezia VE", "municipalityNumber": 4, "municipality": "Mestre Centro", "zone": "Mestre Centro", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'zelarino'), 'dog-area-zelarino-parco-hayez', 'Parco Hayez', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'zelarino', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Caravaggio 30174 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via Caravaggio 30174 Venezia VE", "municipalityNumber": 5, "municipality": "Chirignago-Zelarino", "zone": "Zelarino", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'chirignago'), 'dog-area-chirignago-area-montessori', 'Area Montessori', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'chirignago', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Maria Montessori 30174 Chirignago-Zelarino VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via Maria Montessori 30174 Chirignago-Zelarino VE", "municipalityNumber": 5, "municipality": "Chirignago-Zelarino", "zone": "Chirignago", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'gazzera'), 'dog-area-gazzera-forte-gazzera', 'Forte Gazzera', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'gazzera', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Pirano, 30174 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via Pirano, 30174 Venezia VE", "municipalityNumber": 5, "municipality": "Chirignago-Zelarino", "zone": "Gazzera", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'chirignago'), 'dog-area-chirignago-parco-rodari', 'Parco Rodari', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'chirignago', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Miranese, 400, 30173 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via Miranese, 400, 30173 Venezia VE", "municipalityNumber": 5, "municipality": "Chirignago-Zelarino", "zone": "Chirignago", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'zelarino'), 'dog-area-zelarino-area-scaramuzza', 'Area Scaramuzza', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'zelarino', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via E. Scaramuzza 30174 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via E. Scaramuzza 30174 Venezia VE", "municipalityNumber": 5, "municipality": "Chirignago-Zelarino", "zone": "Zelarino", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'trivignano'), 'dog-area-trivignano-parco-vicentino', 'Parco Vicentino', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'trivignano', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Andrea Vicentino 30174 Chirignago-Zelarino VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via Andrea Vicentino 30174 Chirignago-Zelarino VE", "municipalityNumber": 5, "municipality": "Chirignago-Zelarino", "zone": "Trivignano", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'zelarino'), 'dog-area-zelarino-parco-marzenego', 'Parco Marzenego', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'zelarino', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Selvanese, 34, 30174 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via Selvanese, 34, 30174 Venezia VE", "municipalityNumber": 5, "municipality": "Chirignago-Zelarino", "zone": "Zelarino", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'chirignago'), 'dog-area-chirignago-parco-giulia-cecchettin', 'Parco Giulia Cecchettin', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'chirignago', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Oriago, 12 30174 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via Oriago, 12 30174 Venezia VE", "municipalityNumber": 5, "municipality": "Chirignago-Zelarino", "zone": "Chirignago", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'marghera'), 'dog-area-marghera-parco-baden-powell-area-scarsellini', 'Parco Baden Powell - Area Scarsellini', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'marghera', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via C. Beccaria, 29-35, 30175 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via C. Beccaria, 29-35, 30175 Venezia VE", "municipalityNumber": 6, "municipality": "Marghera", "zone": "Marghera", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'marghera'), 'dog-area-marghera-parco-catene', 'Parco Catene', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'marghera', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Trieste, 179 30175 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via Trieste, 179 30175 Venezia VE", "municipalityNumber": 6, "municipality": "Marghera", "zone": "Marghera", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb),
  ((select id from city_ref), (select id from public.city_areas where city_id = (select id from city_ref) and slug = 'marghera'), 'dog-area-marghera-parco-emmer', 'Parco Emmer', 'dog_area', 'comune_venezia_official_dog_areas_2026_pdf', array['area cani', 'ufficiale', 'venezia', 'marghera', 'da geocodificare'], 'Area cani ufficiale dell''elenco Venezia. Indirizzo: Via Pietro Cornaglia 30175 Venezia VE. Coordinate da geocodificare prima della mappa reale.', 'approved', 'public', '{"address": "Via Pietro Cornaglia 30175 Venezia VE", "municipalityNumber": 6, "municipality": "Marghera", "zone": "Marghera", "sourceFile": "Aree cani per sito_2.pdf", "sourceKind": "official_pdf_import", "needsGeocoding": true, "geocodingStatus": "address_only"}'::jsonb)
on conflict (city_id, slug) do update
set city_area_id = excluded.city_area_id,
    name = excluded.name,
    type = excluded.type,
    source = excluded.source,
    tags = excluded.tags,
    description = excluded.description,
    moderation_status = excluded.moderation_status,
    visibility = excluded.visibility,
    metadata = excluded.metadata,
    updated_at = now();

insert into public.feature_flags (key, title, description, enabled, rollout, min_app_version)
values (
  'mvp.official_dog_areas_venice',
  'Aree cani ufficiali Venezia',
  'Catalogo address-only delle aree cani Venezia importato da elenco PDF ufficiale/user-provided. Coordinate da geocodificare.',
  true,
  '{"city":"venezia-mestre","source":"comune_venezia_official_dog_areas_2026_pdf","count":27}'::jsonb,
  '0.2.5'
)
on conflict (key) do update
set title = excluded.title,
    description = excluded.description,
    enabled = excluded.enabled,
    rollout = excluded.rollout,
    min_app_version = excluded.min_app_version,
    updated_at = now();

insert into public.app_config (key, value, is_public)
values (
  'beta.officialDogAreasVenice',
  '{"source":"Aree cani per sito_2.pdf","sourceKind":"official_pdf_import","count":27,"coordinateStatus":"address_only","nextStep":"geocoding"}'::jsonb,
  true
)
on conflict (key) do update
set value = excluded.value,
    is_public = excluded.is_public,
    updated_at = now();

commit;
