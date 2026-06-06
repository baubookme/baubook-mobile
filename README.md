# BauBook! Venezia-Mestre MVP

Workspace pulito **BauBook 1.4.6** per Expo + React Native + TypeScript.

Decisione tecnica dopo i test locali:

- **browser = flusso principale per UI/layout**;
- **Android = Development Build**, non Expo Go;
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
.\baubook.ps1 -Mode android-dev -NoStartEmulator  # non avvia emulatore, richiede device gia' aperto
.\baubook.ps1 -Mode doctor           # diagnostica Node, npm, Java, Android, Expo
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

Dopo la prima build, per lavorare sul bundle JS puoi lanciare direttamente:

```powershell
.\baubook.ps1 -Mode android-dev
```

Se invece vuoi gestire tu un emulatore gia' aperto, senza avvio automatico da script:

```powershell
.\baubook.ps1 -Mode android-dev -NoStartEmulator
```

Apri l'app **BauBook! Venezia-Mestre** installata sull'emulatore, non Expo Go.

## Icone aggiornate

Il launcher usa ora asset full-size coerenti con il brand:

- `assets/icon.png`
- `assets/android-icon-foreground.png`
- `assets/android-icon-background.png`
- `assets/android-icon-monochrome.png`
- `assets/splash-icon.png`

Per vedere la nuova icona sull'emulatore puo' servire reinstallare la dev build:

```powershell
.\baubook.ps1 -Mode android-build -CleanPrebuild
```

## JetBrains/WebStorm

Sono incluse run configuration condivise in `.run/`:

- `BauBook Web`
- `BauBook Android Build`
- `BauBook Android Dev Metro`
- `BauBook Android Dev Metro Manual Device`
- `BauBook Doctor`

Se WebStorm non le mostra subito, riapri il progetto o usa direttamente il terminale integrato.

## Git iniziale

Quando browser e Android sono ok:

```powershell
git init -b main
git config user.name "BauBook"
git config user.email "admin@baubook.me"
git add .
git commit -m "chore: bootstrap BauBook MVP clean workspace"
```

Poi crea un repository GitHub vuoto e collega il remoto.

## Cosa contiene

- layout Home aggiornato con logo trasparente e badge Coming Soon;
- tab bar inferiore ripulita;
- debug parlante con ErrorBoundary e diagnostica runtime;
- schema Supabase iniziale in `supabase/migrations/0001_initial_schema.sql`;
- seed demo Venezia/Mestre in `supabase/seeds/venezia_mestre_demo.sql`;
- script PowerShell parlanti per Windows/WebStorm.
