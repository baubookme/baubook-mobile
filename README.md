# BauBook! Venezia-Mestre MVP

Workspace **BauBook 1.7.0 Auth bootstrap** per Expo + React Native + TypeScript.

Questa baseline e' pensata per:

- sviluppo UI rapido da browser;
- test Android tramite Expo Development Build, non Expo Go;
- backend Supabase managed con schema estendibile;
- letture live da Supabase: `places`, `feature_flags`, `app_config`;
- Auth email OTP/magic link con sessione persistente;
- creazione/aggiornamento profilo umano `profiles`;
- creazione/aggiornamento primo cane `dogs`;
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

## Flusso consigliato

- Usa `web` per layout, testi, schermate, theme e logica React.
- Usa `android-build` quando cambiano asset nativi, `app.json`, icone, splash, permessi o librerie native.
- Usa `android-dev` quando la Development Build BauBook e' gia' installata sull'emulatore.
- Usa `supabase-doctor` per verificare `.env`, migration, seed e dipendenze Supabase.

## Supabase live + Auth

La 1.7.0 usa il progetto `baubook-beta` per:

- **Mappa**: luoghi pubblici da `places`.
- **Setup**: conteggi live di `app_config`, `feature_flags` e `places`.
- **Setup > Account BauBook**: invio email OTP/magic link, sessione, profilo umano, logout.
- **Io sono...!**: primo cane salvato/aggiornato su `dogs`.

Ordine SQL richiesto in Supabase:

```txt
supabase/migrations/0001_initial_schema.sql
supabase/seeds/venezia_mestre_demo.sql
supabase/migrations/0002_api_access_grants.sql
supabase/migrations/0003_auth_profile_bootstrap.sql
```

## Documentazione

La cartella `docs/` resta volutamente piccola:

- `docs/DEVELOPMENT.md` - ambiente, script, Android/WebStorm e troubleshooting essenziale.
- `docs/SUPABASE_SETUP.md` - progetto Supabase, `.env`, schema, seed, API grants, Auth e test live.
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
git commit -m "feat: bootstrap Supabase Auth and dog profile"
git tag -a v0.1.8-auth-bootstrap -m "BauBook Auth bootstrap baseline 1.7.0"
git push
git push origin v0.1.8-auth-bootstrap
```
