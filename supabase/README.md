# Supabase - BauBook! beta

Questa cartella contiene migrations e seed per il progetto Supabase `baubook-beta`.

## Ordine esecuzione SQL Editor

```txt
migrations/0001_initial_schema.sql
seeds/venezia_mestre_demo.sql
migrations/0002_api_access_grants.sql
migrations/0003_auth_profile_bootstrap.sql
migrations/0004_walks_presence_bootstrap.sql
migrations/0005_safety_alerts_bootstrap.sql
```

## Note operative

- Usa SQL Editor finche' non installiamo/linkiamo la Supabase CLI.
- Non mettere password DB o service role key in `.env`.
- L'app usa solo `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Le scritture sensibili passano da RPC: Auth, Walks, Presence e Safety.

## Safety 0005

`0005_safety_alerts_bootstrap.sql` aggiunge la parte critica della promessa MVP:

- `create_lost_dog_alert`;
- `close_lost_dog_alert`;
- `create_lost_dog_sighting`;
- `create_danger_report`;
- `close_danger_report`;
- `report_safety_content`;
- `expire_stale_safety_alerts`.

Le RPC impongono disclaimer, TTL, profilo attivo, email verificata e rate limit beta.
