# BauBook! Supabase

## Migration iniziale

```txt
supabase/migrations/0001_initial_schema.sql
```

Schema 1.5.2 per MVP + fondamenta di espansione.

## Seed demo

```txt
supabase/seeds/venezia_mestre_demo.sql
```

Dati demo per Venezia-Mestre. Non usare come dataset pubblico senza verifica fonti/licenze.

## Migration successive

```txt
supabase/migrations/0002_api_access_grants.sql
supabase/migrations/0003_auth_profile_bootstrap.sql
```

`0002` abilita i grant PostgREST minimi per client anon/authenticated.

`0003` collega Supabase Auth a `profiles` e al primo flusso cane/account.

## Flusso attuale

Per ora applichiamo migration/seed dal Supabase SQL Editor.
La Supabase CLI sara' introdotta dopo la prima verifica manuale del database.
