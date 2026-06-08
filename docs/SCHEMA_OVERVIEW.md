# BauBook! schema overview

Lo schema e' una base **MVP estendibile**, non una modellazione definitiva di ogni funzione futura.

## Promesse MVP coperte

| Promessa | Tabelle principali |
|---|---|
| So dove andare col cane | `cities`, `city_areas`, `places`, `place_reviews` |
| So chi c'e' o chi va a passeggiare | `walk_plans`, `community_events`, `community_event_participants`, `presence_sessions` |
| Se succede qualcosa, la community locale mi aiuta | `lost_dog_alerts`, `lost_dog_sightings`, `danger_reports`, `reports`, `audit_logs` |

## Fondazioni per la versione estesa

| Area futura | Tabelle predisposte |
|---|---|
| Altre citta' | `cities`, `city_areas` |
| I miei amici | `profile_relationships`, `dog_relationships` |
| Il mio fidanzato/a | `dog_relationships` con `relationship_type = partner` e `anniversary_date` |
| Gite, raduni, vacanze | `community_events`, `community_event_participants` |
| Dog sitter / veterinari / servizi | `service_recommendations`, `places` |
| 4Crocche in Padella | `dog_food_preferences`, `knowledge_cards` |
| Funzioni beta accendibili | `feature_flags`, `app_config` |
| Monetizzazione leggera | `supporter_entitlements` |

## Safety bootstrap

La migration `0005_safety_alerts_bootstrap.sql` rende operative le funzioni critiche:

- smarrimento cane con `lost_dog_alerts`;
- avvistamenti/recupero con `lost_dog_sightings`;
- pericoli temporanei con `danger_reports`;
- report abuso/falso alert con `reports`;
- audit minimo con `audit_logs`.

### Regole tecniche safety

- le scritture passano da RPC `security definer`, non da insert liberi del client;
- disclaimer obbligatorio lato app e lato database;
- TTL clampato lato database;
- rate limit beta per profilo;
- chiusura esplicita per proprietario/segnalatore;
- area indicativa derivata da `places.location`, in attesa di disegno poligonale su mappa;
- `expire_stale_safety_alerts()` aggiorna gli alert scaduti.

## Cosa e' volutamente rimandato

Non sono ancora modellati in dettaglio:

- chat privata;
- pagamenti/IAP reali;
- live location continua;
- marketplace dog sitter;
- dashboard admin completa;
- motore notifiche geospaziali/push;
- volantino PDF premium.

Queste aree richiedono decisioni privacy, sicurezza e policy. Verranno aggiunte con migrazioni dedicate.

## Moderazione e sicurezza

Tutte le tabelle UGC partono con:

- `moderation_status` dove rilevante;
- `visibility` dove rilevante;
- RLS abilitata;
- `reports`, `blocks`, `moderation_actions`, `content_removals`, `user_suspensions`, `audit_logs`.

Le tabelle moderator-only non hanno policy client: saranno gestite da Dashboard o Edge Functions con service role.

## API grants e RPC

La migration `0002_api_access_grants.sql` assegna i privilegi PostgREST a `anon` e `authenticated`.

Le RLS policy restano il vero controllo di sicurezza: i grant aprono solo la porta API, mentre le policy decidono cosa e' visibile o modificabile.

Le migration `0003`, `0004` e `0005` aggiungono RPC per evitare payload client fragili e per concentrare le regole sensibili nel database.
