-- Optional DEV seed for the Avvistato flow.
-- It creates two fake active lost-dog alerts for the already registered dog named 'Test Dog'.
-- Run only in beta/dev data, not in production without review.

do $$
declare
  test_dog record;
  first_alert_id uuid := gen_random_uuid();
  second_alert_id uuid := gen_random_uuid();
begin
  select id, owner_id, name
    into test_dog
  from public.dogs
  where lower(btrim(name)) = lower('Test Dog')
  order by created_at desc nulls last
  limit 1;

  if test_dog.id is null then
    raise notice 'Test Dog non trovato: nessun alert test creato.';
    return;
  end if;

  insert into public.lost_dog_alerts (
    id,
    dog_id,
    owner_id,
    source_place_id,
    location_mode,
    location_label,
    location_latitude,
    location_longitude,
    manual_address,
    description,
    status,
    moderation_status,
    expires_at,
    created_at,
    last_seen_at,
    radius_m
  ) values
  (
    first_alert_id,
    test_dog.id,
    test_dog.owner_id,
    null,
    'manual',
    'Area test BauBook - Campo Santa Margherita, Venezia',
    null,
    null,
    'Campo Santa Margherita, Venezia',
    'Segnalazione test: Test Dog smarrito, usare solo per verificare il flusso Avvistato.',
    'active',
    'approved',
    now() + interval '24 hours',
    now() - interval '10 minutes',
    now() - interval '30 minutes',
    350),
  (
    second_alert_id,
    test_dog.id,
    test_dog.owner_id,
    null,
    'manual',
    'Area test BauBook - Parco San Giuliano, Mestre',
    null,
    null,
    'Parco San Giuliano, Mestre',
    'Seconda segnalazione test: Test Dog smarrito, utile per verificare abuso e lista avvistamenti.',
    'active',
    'approved',
    now() + interval '48 hours',
    now() - interval '5 minutes',
    now() - interval '20 minutes',
    350)
  on conflict (id) do nothing;

  raise notice 'Creati alert test per Test Dog: %, %', first_alert_id, second_alert_id;
end;
$$;
