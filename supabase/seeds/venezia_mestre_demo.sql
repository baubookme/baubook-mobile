-- Seed DEMO per test locale. Coordinate e luoghi sono placeholder da verificare prima della beta.
-- Non usare come dataset ufficiale pubblico.

insert into public.places (name, type, location, source, tags, city, description, moderation_status, visibility)
values
  (
    'Parco San Giuliano - demo',
    'walk',
    ST_SetSRID(ST_MakePoint(12.2819, 45.4736), 4326),
    'demo',
    array['passeggiata lunga', 'verde', 'da verificare'],
    'Venezia-Mestre',
    'Seed demo per collaudare la mappa. Verificare fonti e dati prima della pubblicazione.',
    'pending',
    'public'
  ),
  (
    'Area verde Bissuola - demo',
    'dog_area',
    ST_SetSRID(ST_MakePoint(12.2549, 45.5026), 4326),
    'demo',
    array['area cani', 'ombra', 'da verificare'],
    'Venezia-Mestre',
    'Seed demo per collaudare recensioni e tag.',
    'pending',
    'public'
  )
on conflict do nothing;
