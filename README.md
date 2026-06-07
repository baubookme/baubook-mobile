# BauBook! Venezia-Mestre MVP

Workspace **BauBook 1.6.0 Supabase live read-only** per Expo + React Native + TypeScript.

Questa baseline e' pensata per:

- sviluppo UI rapido da browser;
- test Android tramite Expo Development Build, non Expo Go;
- backend Supabase managed con schema estendibile;
- prime letture live da Supabase: `places`, `feature_flags`, `app_config`;
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

## Supabase live

La 1.6.0 legge dati reali dal progetto `baubook-beta`:

- **Mappa**: carica i luoghi pubblici da `places`.
- **Setup**: verifica conteggi live di `app_config`, `feature_flags` e `places`.

Se compare `permission denied`, esegui nel SQL Editor:

```txt
supabase/migrations/0002_api_access_grants.sql
```

## Documentazione

La cartella `docs/` resta volutamente piccola:

- `docs/DEVELOPMENT.md` - ambiente, script, Android/WebStorm e troubleshooting essenziale.
- `docs/SUPABASE_SETUP.md` - progetto Supabase, `.env`, schema, seed, API grants e test live.
- `docs/SCHEMA_OVERVIEW.md` - riepilogo modello dati e aree future.
- `docs/NEXT_STEPS.md` - roadmap tecnica immediata.

Non teniamo file `HOTFIX_*.md` o `BASELINE_*.md`: versioni e milestone si tracciano con Git commit/tag.

## File Supabase principali

```txt
.env.example
supabase/migrations/0001_initial_schema.sql
supabase/migrations/0002_api_access_grants.sql
supabase/seeds/venezia_mestre_demo.sql
```

## GitHub

Repository:

```txt
https://github.com/baubookme/baubook-mobile
```

Commit/tag consigliati per questa baseline:

```powershell
git add .
git commit -m "feat: connect Supabase public data"
git tag -a v0.1.7-supabase-live -m "BauBook Supabase live read-only baseline 1.6.0"
git push
git push origin v0.1.7-supabase-live
```
