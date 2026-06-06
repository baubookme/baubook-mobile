# BauBook! Venezia-Mestre MVP

Workspace pulito **BauBook 1.5.1 super-stable** per Expo + React Native + TypeScript.

Decisione tecnica dopo i test locali:

- **browser = flusso principale per UI/layout**;
- **Android = Development Build**, non Expo Go;
- **Supabase managed = backend MVP**;
- Expo Go resta solo come modalita' legacy, perche' sull'ambiente Windows/AVD ha generato `Failed to download update`.

## Primo avvio dopo override totale

```powershell
cd C:\baubook
.\scripts\install-clean.ps1
.\baubook.ps1 -Mode web
```

## Script principali

```powershell
.\baubook.ps1 -Mode web              # apre BauBook nel browser
.\baubook.ps1 -Mode android-build    # crea/installa Development Build Android
.\baubook.ps1 -Mode android-dev      # avvia/usa emulatore CLI e Metro dev client
.\baubook.ps1 -Mode android-dev -NoStartEmulator  # richiede device gia' aperto
.\baubook.ps1 -Mode doctor           # diagnostica Node, npm, Java, Android, Expo
.\baubook.ps1 -Mode supabase-doctor  # checklist Supabase locale
.\baubook.ps1 -Mode clean            # pulizia cache Expo/Metro
```

## Android Development Build

Prerequisiti:

- Node/npm funzionanti;
- Android SDK/ADB visibile;
- JDK 17 o superiore.

Se Java manca:

```powershell
winget install EclipseAdoptium.Temurin.17.JDK
```

Poi chiudi e riapri WebStorm/PowerShell.

Prima build Android:

```powershell
.\baubook.ps1 -Mode android-build
```

Lo script installa `expo-dev-client` se non e' gia' presente, genera `android/` con Expo prebuild se manca, e lancia `npx expo run:android`.

Dopo la prima build, per lavorare sul bundle JS:

```powershell
.\baubook.ps1 -Mode android-dev
```

Apri l'app **BauBook! Venezia-Mestre** installata sull'emulatore, non Expo Go.

## Icone launcher 1.5.1

Il launcher Android usa ora un asset dedicato, basato sul solo cane/avatar, per evitare tagli nella maschera adaptive icon.

Asset aggiornati:

- `assets/icon.png`
- `assets/favicon.png`
- `assets/android-icon-foreground.png`
- `assets/android-icon-background.png`
- `assets/android-icon-monochrome.png`
- `assets/baubook/launcher-dog-avatar-source.png`
- `docs/launcher-icon-preview.png`

Per vedere la nuova icona sull'emulatore:

```powershell
.\baubook.ps1 -Mode android-build -CleanPrebuild
```

## Supabase setup

La documentazione operativa e' in:

```txt
docs/SUPABASE_SETUP.md
```

Check locale:

```powershell
.\baubook.ps1 -Mode supabase-doctor
```

Lo schema iniziale resta in:

```txt
supabase/migrations/0001_initial_schema.sql
supabase/seeds/venezia_mestre_demo.sql
```

## JetBrains/WebStorm

Sono incluse run configuration condivise in `.run/`:

- `BauBook Web`
- `BauBook Android Build`
- `BauBook Android Dev Metro`
- `BauBook Android Dev Metro Manual Device`
- `BauBook Doctor`
- `BauBook Supabase Doctor`

Se WebStorm non le mostra subito, riapri il progetto o usa direttamente il terminale integrato.

## GitHub baseline

Repository:

```txt
https://github.com/baubookme/baubook-mobile
```

Commit suggerito per questa baseline:

```powershell
git add .
git status --short
git commit -m "chore: stabilize workspace and prepare Supabase setup"
git tag -a v0.1.5-super-stable -m "BauBook super-stable baseline 1.5.1"
git push
git push origin v0.1.5-super-stable
```

## Cosa contiene

- layout Home aggiornato con logo trasparente e badge Coming Soon;
- tab bar inferiore ripulita;
- debug parlante con ErrorBoundary e diagnostica runtime;
- launcher icon Android corretta per adaptive icon;
- schema Supabase iniziale;
- seed demo Venezia/Mestre;
- checklist Supabase;
- script PowerShell parlanti per Windows/WebStorm.
