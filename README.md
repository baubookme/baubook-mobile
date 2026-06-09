# BauBook! Venezia-Mestre MVP Workspace

**BauBook 1.9.9 In-App Launch Compliance + Docs Compaction** per Expo, React Native, TypeScript e Supabase.

Root locale standard del repo: `C:\baubook`.

## Cosa copre questa baseline

- sviluppo UI rapido da browser;
- test Android tramite Expo Development Build, non Expo Go;
- backend Supabase managed con schema estendibile;
- letture live da Supabase: `places`, `feature_flags`, `app_config`;
- Auth email OTP/magic link con sessione persistente;
- profilo umano `profiles` e primo cane `dogs`;
- passeggiate reali su `walk_plans` + `community_events`;
- presenza temporanea su `presence_sessions`, senza live tracking continuo;
- safety live: `lost_dog_alerts`, `lost_dog_sightings`, `danger_reports`, `reports`, `audit_logs`;
- dog areas ufficiali e ricerca raggio;
- Sponsored Places Lite nativo, senza SDK ads e spento di default;
- documentazione compatta in `docs/`.

## Comandi base

```powershell
cd C:\baubook
.\scripts\install-clean.ps1
npm run docs:check
npm run launch:check
npm run typecheck
.\baubook.ps1 -Mode web
.\baubook.ps1 -Mode android-build -CleanPrebuild
.\baubook.ps1 -Mode android-dev
```

## Documentazione compatta

La cartella `docs/` deve restare corta e stabile:

- `docs/DEVELOPMENT.md` - sviluppo locale, Supabase, env, Android, store readiness e troubleshooting.
- `docs/SCHEMA_DB.md` - schema DB, migrations, RLS, RPC, safety e sponsored slots.
- `docs/README_VERSIONING.md` - regole versioni, commit, tag e release notes.

Non creare file `HOTFIX_*.md` o `BASELINE_*.md` in `docs/`. Versioni e milestone si tracciano con Git commit/tag.

## Supabase

Ordine SQL richiesto in Supabase:

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

## GitHub

Repository:

```txt
https://github.com/baubookme/baubook-mobile
```

Tag baseline consigliato per questo blocco:

```powershell
git tag -a v0.2.9-in-app-launch-compliance-docs -m "BauBook 1.9.9 In-App Launch Compliance + Docs Compaction"
```
