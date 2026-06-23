-- Seed DEMO per BauBook! Venezia-Mestre.
-- Coordinate e luoghi sono placeholder da verificare prima della beta pubblica.
-- Non usare come dataset ufficiale senza controllo fonti/licenze.

insert into public.admin_users (profile_id, role)
select id, 'owner'
from public.profiles
where display_name = 'admin'
    on conflict (profile_id) do update
                                    set role = excluded.role,
                                    active = true;

insert into public.cities (slug, name, country_code, region, status, center, timezone, metadata)
values (
  'venezia-mestre',
  'Venezia-Mestre',
  'IT',
  'Veneto',
  'beta',
  ST_SetSRID(ST_MakePoint(12.3155, 45.4408), 4326),
  'Europe/Rome',
  '{"betaName":"BauBook! Venezia-Mestre"}'::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  region = excluded.region,
  status = excluded.status,
  center = excluded.center,
  timezone = excluded.timezone,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.city_areas (city_id, slug, name, area_type, center)
values
  (
    (select id from public.cities where slug = 'venezia-mestre'),
    'mestre',
    'Mestre',
    'district',
    ST_SetSRID(ST_MakePoint(12.2426, 45.4935), 4326)
  ),
  (
    (select id from public.cities where slug = 'venezia-mestre'),
    'venezia',
    'Venezia',
    'district',
    ST_SetSRID(ST_MakePoint(12.3155, 45.4408), 4326)
  ),
  (
    (select id from public.cities where slug = 'venezia-mestre'),
    'parco-san-giuliano',
    'Parco San Giuliano',
    'park',
    ST_SetSRID(ST_MakePoint(12.2819, 45.4736), 4326)
  )
on conflict (city_id, slug) do update set
  name = excluded.name,
  area_type = excluded.area_type,
  center = excluded.center,
  updated_at = now();

insert into public.feature_flags (key, title, description, enabled, rollout, min_app_version)
values
  ('mvp.map_places', 'Mappa luoghi dog-friendly', 'Aree cani, passeggiate e luoghi utili per Venezia-Mestre.', true, '{"city":"venezia-mestre"}'::jsonb, '0.1.6'),
  ('mvp.walk_plans', 'Passeggiate e presenza locale', 'Check-in e appuntamenti leggeri per passeggiate.', true, '{"city":"venezia-mestre"}'::jsonb, '0.1.6'),
  ('mvp.safety_alerts', 'Emergenze e pericoli', 'Alert cane smarrito e segnalazioni pericolo.', true, '{"city":"venezia-mestre"}'::jsonb, '0.1.6'),
  ('extended.dog_relationships', 'I miei amici / Fidanzato', 'Relazioni giocose tra cani.', false, '{}'::jsonb, null),
  ('extended.service_recommendations', 'Dog sitter e servizi consigliati', 'Raccomandazioni della community per servizi pet.', false, '{}'::jsonb, null),
  ('extended.food_preferences', '4Crocche in Padella', 'Preferenze alimentari, Bleah e consigli snack.', false, '{}'::jsonb, null),
  ('extended.trips_vacations', 'Andiamo in vacanza', 'Itinerari e gruppi pet-friendly.', false, '{}'::jsonb, null)
on conflict (key) do update set
  title = excluded.title,
  description = excluded.description,
  enabled = excluded.enabled,
  rollout = excluded.rollout,
  min_app_version = excluded.min_app_version,
  updated_at = now();

insert into public.app_config (key, value, is_public)
values
  ('beta.city', '{"slug":"venezia-mestre","name":"Venezia-Mestre","displayName":"BauBook! Venezia-Mestre"}'::jsonb, true),
  ('beta.disclaimer.safety', '{"message":"BauBook aiuta la community, ma non sostituisce autorita'', veterinari o servizi di emergenza."}'::jsonb, true)
on conflict (key) do update set
  value = excluded.value,
  is_public = excluded.is_public,
  updated_at = now();

insert into public.places (city_id, city_area_id, slug, name, type, location, source, tags, description, moderation_status, visibility)
values
  (
    (select id from public.cities where slug = 'venezia-mestre'),
    (select a.id from public.city_areas a join public.cities c on c.id = a.city_id where c.slug = 'venezia-mestre' and a.slug = 'parco-san-giuliano'),
    'parco-san-giuliano-demo',
    'Parco San Giuliano - demo',
    'walk',
    ST_SetSRID(ST_MakePoint(12.2819, 45.4736), 4326),
    'demo',
    array['passeggiata lunga', 'verde', 'da verificare'],
    'Seed demo per collaudare la mappa. Verificare fonti e dati prima della pubblicazione.',
    'pending',
    'public'
  ),
  (
    (select id from public.cities where slug = 'venezia-mestre'),
    (select a.id from public.city_areas a join public.cities c on c.id = a.city_id where c.slug = 'venezia-mestre' and a.slug = 'mestre'),
    'area-verde-bissuola-demo',
    'Area verde Bissuola - demo',
    'dog_area',
    ST_SetSRID(ST_MakePoint(12.2549, 45.5026), 4326),
    'demo',
    array['area cani', 'ombra', 'da verificare'],
    'Seed demo per collaudare recensioni e tag.',
    'pending',
    'public'
  )
on conflict (city_id, slug) do update set
  name = excluded.name,
  type = excluded.type,
  location = excluded.location,
  source = excluded.source,
  tags = excluded.tags,
  description = excluded.description,
  moderation_status = excluded.moderation_status,
  visibility = excluded.visibility,
  updated_at = now();


insert into public.knowledge_cards (slug, category, title, body, severity, display_order, is_active, moderation_status)
values
  ('non-mangiare-cioccolato-demo', 'food_safety', 'Non mangiare cioccolato', 'Scheda demo: il cioccolato puo essere pericoloso per i cani. I contenuti safety saranno curati prima della beta pubblica.', 5, 10, true, 'approved'),
  ('alert-smarrito-disclaimer-demo', 'safety', 'Alert smarrimento: usa responsabilmente', 'Scheda demo: segnala uno smarrimento solo con informazioni veritiere e chiudi l alert appena risolto.', 4, 20, true, 'approved')
on conflict (slug) do update set
  category = excluded.category,
  title = excluded.title,
  body = excluded.body,
  severity = excluded.severity,
  display_order = excluded.display_order,
  is_active = excluded.is_active,
  moderation_status = excluded.moderation_status,
  updated_at = now();
