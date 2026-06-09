# BauBook! schema DB

Riferimento compatto dello schema Supabase usato dalla beta BauBook! Venezia-Mestre.

Lo schema e' una base MVP estendibile: copre funzioni reali beta senza pretendere di modellare subito ogni scenario futuro.

## Ordine migrations

Eseguire in Supabase SQL Editor in questo ordine:

```txt
supabase/migrations/0001_initial_schema.sql
supabase/seeds/venezia_mestre_demo.sql
supabase/migrations/0002_api_access_grants.sql
supabase/migrations/0003_auth_profile_bootstrap.sql
supabase/migrations/0004_walks_presence_bootstrap.sql
supabase/migrations/0005_safety_alerts_bootstrap.sql
supabase/migrations/0006_official_venice_dog_areas.sql
supabase/migrations/0007_geocoded_dog_area_radius_search.sql
supabase/migrations/0008_launch_readiness_native_sponsored_slots.sql
```

## Aree funzionali

| Area | Tabelle/RPC principali |
|---|---|
| Config pubblica | `feature_flags`, `app_config` |
| Luoghi | `cities`, `city_areas`, `places`, `place_reviews` |
| Profilo | `profiles`, `dogs` |
| Passeggiate | `walk_plans`, `community_events`, `community_event_participants` |
| Presenza temporanea | `presence_sessions` |
| Safety | `lost_dog_alerts`, `lost_dog_sightings`, `danger_reports`, `reports`, `audit_logs` |
| Aree cani ufficiali | `places` con dati ufficiali/geocodificati |
| Sponsored Lite | native sponsored slots gestiti da DB/config, senza SDK ads |

## RLS e API grants

`0002_api_access_grants.sql` espone a PostgREST le operazioni minime per `anon` e `authenticated`.

I grant aprono la porta API; le policy RLS restano il vero controllo di sicurezza.

Regola di progetto: quando un'operazione e' sensibile o fragile, preferire RPC `security definer` con input controllato invece di insert/update liberi dal client.

## Auth e profili

`0003_auth_profile_bootstrap.sql` aggiunge il bootstrap per:

- sessione utente Supabase;
- profilo umano `profiles`;
- primo cane `dogs`;
- flussi Setup e Io sono.

## Walks e presenza

`0004_walks_presence_bootstrap.sql` rende operative:

- passeggiate pianificate;
- interesse/partecipazione;
- presenza temporanea;
- chiusura presenza.

Nessun live tracking continuo nella beta: la presenza resta temporanea e controllata.

## Safety

`0005_safety_alerts_bootstrap.sql` aggiunge RPC controllate per:

- `create_lost_dog_alert(...)`;
- `close_lost_dog_alert(...)`;
- `create_lost_dog_sighting(...)`;
- `create_danger_report(...)`;
- `close_danger_report(...)`;
- `report_safety_content(...)`;
- `expire_stale_safety_alerts()`.

Regole principali:

- login obbligatorio;
- email verificata per alert critici;
- disclaimer obbligatorio lato app e lato DB;
- TTL clampato lato DB;
- rate limit beta per profilo;
- un solo alert smarrimento attivo per cane;
- area approssimata attorno a un luogo BauBook;
- chiusura/dismissione esplicita;
- report abuso/falso alert;
- audit log minimo.

## Dog areas ufficiali e ricerca raggio

`0006` e `0007` aggiungono:

- aree cani Venezia/Mestre;
- geocodifica dati utili;
- ricerca per raggio;
- supporto UI Mappa/Home.

## Launch readiness e Sponsored Lite

`0008_launch_readiness_native_sponsored_slots.sql` prepara monetizzazione leggera nativa:

- slot sponsorizzati gestiti da Supabase;
- nessun SDK ads;
- nessun advertising ID;
- disclosure obbligatoria in UI quando uno slot e' visibile;
- feature flag spento di default.

## Rimandato

Non sono ancora modellati in modo definitivo:

- chat privata;
- pagamenti/IAP reali;
- live location continua;
- marketplace dog sitter;
- dashboard admin completa;
- notifiche push geospaziali automatiche;
- generazione PDF premium.

Queste aree richiedono decisioni privacy, sicurezza e policy prima di nuove migrations.
