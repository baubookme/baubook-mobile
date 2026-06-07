# BauBook! schema overview

Lo schema 1.5.2 e' una base **MVP estendibile**, non una modellazione definitiva di ogni funzione futura.

## Promesse MVP coperte

| Promessa | Tabelle principali |
|---|---|
| So dove andare col cane | `cities`, `city_areas`, `places`, `place_reviews` |
| So chi c'e' o chi va a passeggiare | `walk_plans`, `community_events`, `community_event_participants` |
| Se succede qualcosa, la community locale mi aiuta | `lost_dog_alerts`, `lost_dog_sightings`, `danger_reports`, `alert_notifications` |

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

## Cosa e' volutamente rimandato

Non sono ancora modellati in dettaglio:

- chat privata;
- pagamenti/IAP reali;
- live location continua;
- marketplace dog sitter;
- dashboard admin completa;
- motore notifiche geospaziali.

Queste aree richiedono decisioni privacy, sicurezza e policy. Verranno aggiunte con migrazioni dedicate.

## Moderazione e sicurezza

Tutte le tabelle UGC partono con:

- `moderation_status` dove rilevante;
- `visibility` dove rilevante;
- RLS abilitata;
- `reports`, `blocks`, `moderation_actions`, `content_removals`, `user_suspensions`, `audit_logs`.

Le tabelle moderator-only non hanno policy client: saranno gestite da Dashboard o Edge Functions con service role.
