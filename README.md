# BauBook! Venezia-Mestre MVP

Workspace **BauBook 1.9.0 Safety bootstrap** per Expo + React Native + TypeScript.

Questa baseline e' pensata per:

- sviluppo UI rapido da browser;
- test Android tramite Expo Development Build, non Expo Go;
- backend Supabase managed con schema estendibile;
- letture live da Supabase: `places`, `feature_flags`, `app_config`;
- Auth email OTP/magic link con sessione persistente;
- profilo umano `profiles` e primo cane `dogs`;
- passeggiate reali su `walk_plans` + `community_events`;
- presenza temporanea su `presence_sessions`, senza live tracking continuo;
- safety live: `lost_dog_alerts`, `lost_dog_sightings`, `danger_reports`, `reports`, `audit_logs`;
- fallback demo locale se il backend non risponde;
- repository Git pulito, senza `node_modules`, `.env`, `.expo`, `android/` o `ios/`.

## Comandi base

```powershell
cd C:\baubook
.\scripts\install-clean.ps1
.\baubook.ps1 -Mode doctor
.\baubook.ps1 -Mode supabase-doctor
.\baubook.ps1 -Mode web
.\baubook.ps1 -Mode android-build -CleanPrebuild
.\baubook.ps1 -Mode android-dev
```

## Supabase live + Auth + Walks + Safety

La 1.9.0 usa il progetto `baubook-beta` per:

- **Mappa**: luoghi pubblici da `places`.
- **Setup**: conteggi live di config, luoghi, passeggiate, presenze e safety.
- **Setup > Account BauBook**: email OTP/magic link, sessione persistente, profilo umano, logout.
- **Io sono...!**: primo cane salvato/aggiornato su `dogs`.
- **Passeggio**: passeggiata, interesse, presenza temporanea e chiusura presenze.
- **Aiuto**: alert smarrimento, pericolo, avvistamento, recupero, chiusura e report abuso.

Ordine SQL richiesto in Supabase:

```txt
supabase/migrations/0001_initial_schema.sql
supabase/seeds/venezia_mestre_demo.sql
supabase/migrations/0002_api_access_grants.sql
supabase/migrations/0003_auth_profile_bootstrap.sql
supabase/migrations/0004_walks_presence_bootstrap.sql
supabase/migrations/0005_safety_alerts_bootstrap.sql
```

## Safety guardrail

Le funzioni **Mi sono perso!** e **Pericolo!** non inseriscono righe libere dal client. L'app chiama RPC Supabase che applicano:

- login obbligatorio;
- email verificata per creare alert critici;
- disclaimer obbligatorio lato app e lato DB;
- TTL clampato lato DB;
- rate limit beta per profilo;
- area indicativa attorno a un luogo BauBook;
- chiusura/dismissione esplicita;
- report abuso/falso alert;
- audit log minimo.

## Documentazione

La cartella `docs/` resta volutamente piccola:

- `docs/DEVELOPMENT.md` - ambiente, script, Android/WebStorm e troubleshooting essenziale.
- `docs/SUPABASE_SETUP.md` - progetto Supabase, `.env`, schema, migrations, Auth, Walks, Safety e test live.
- `docs/SCHEMA_OVERVIEW.md` - riepilogo modello dati e aree future.
- `docs/NEXT_STEPS.md` - roadmap tecnica immediata.

Non teniamo file `HOTFIX_*.md` o `BASELINE_*.md`: versioni e milestone si tracciano con Git commit/tag.

## GitHub

Repository:

```txt
https://github.com/baubookme/baubook-mobile
```

Commit/tag consigliati per questa baseline:

```powershell
git add .
git commit -m "feat: add safety alerts and danger reports"
git tag -a v0.2.0-safety-bootstrap -m "BauBook safety alerts baseline 1.9.0"
git push
git push origin v0.2.0-safety-bootstrap
```
