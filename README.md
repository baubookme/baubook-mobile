# BauBook! Venezia-Mestre MVP

Workspace **BauBook 1.5.2 schema-ready** per Expo + React Native + TypeScript.

Questa baseline e' pensata per:

- sviluppo UI rapido da browser;
- test Android tramite Expo Development Build, non Expo Go;
- backend Supabase managed con schema iniziale gia' estendibile;
- repository Git pulito, senza `node_modules`, `.env`, `.expo`, `android/` o `ios/`.

## Comandi base

```powershell
cd C:\baubook
.\scripts\install-clean.ps1
.\baubook.ps1 -Mode doctor
.\baubook.ps1 -Mode web
.\baubook.ps1 -Mode android-build -CleanPrebuild
.\baubook.ps1 -Mode android-dev
.\baubook.ps1 -Mode supabase-doctor
```

## Flusso consigliato

- Usa `web` per layout, testi, schermate, theme e logica React.
- Usa `android-build` quando cambiano asset nativi, `app.json`, icone, splash, permessi o librerie native.
- Usa `android-dev` quando la Development Build BauBook e' gia' installata sull'emulatore.
- Usa `supabase-doctor` per verificare `.env`, migration e seed locali.

## Documentazione

La cartella `docs/` resta volutamente piccola:

- `docs/DEVELOPMENT.md` - ambiente, script, Android/WebStorm e troubleshooting essenziale.
- `docs/SUPABASE_SETUP.md` - creazione progetto Supabase, `.env`, schema, seed, Auth base.
- `docs/SCHEMA_OVERVIEW.md` - riepilogo del modello dati 1.5.2 e aree future.
- `docs/NEXT_STEPS.md` - roadmap tecnica immediata.

Non teniamo file `HOTFIX_*.md` o `BASELINE_*.md`: versioni e milestone si tracciano con Git commit/tag.

## Supabase

File principali:

```txt
.env.example
supabase/migrations/0001_initial_schema.sql
supabase/seeds/venezia_mestre_demo.sql
```

La migration 1.5.2 include le fondamenta per:

- beta multi-citta' (`cities`, `city_areas`);
- profili e cani;
- media, preferenze alimentari future e knowledge card safety;
- luoghi, recensioni e PostGIS;
- relazioni profilo-profilo e cane-cane;
- eventi community e passeggiate MVP;
- servizi consigliati;
- alert cane smarrito e pericoli;
- moderazione UGC, report, blocchi, audit log;
- push token, supporter entitlements;
- feature flags e app config.

## GitHub

Repository:

```txt
https://github.com/baubookme/baubook-mobile
```

Commit/tag consigliati per questa baseline:

```powershell
git add .
git commit -m "chore: prepare schema-ready Supabase baseline"
git tag -a v0.1.6-schema-ready -m "BauBook schema-ready baseline 1.5.2"
git push
git push origin v0.1.6-schema-ready
```
