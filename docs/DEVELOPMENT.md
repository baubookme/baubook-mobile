# BauBook! development runbook

Documento operativo unico per sviluppo locale WebStorm/PowerShell.

## Flusso consigliato

Per UI e layout lavora prima da browser:

```powershell
cd C:\baubook
.\baubook.ps1 -Mode web
```

Per Android usa la Development Build, non Expo Go:

```powershell
.\baubook.ps1 -Mode android-build
.\baubook.ps1 -Mode android-dev
```

`android-build` compila e installa l'app nativa sull'emulatore. Usalo quando cambiano asset nativi, `app.json`, permessi o librerie native.

`android-dev` avvia Metro per la Development Build gia' installata. Usalo per lavoro quotidiano su TypeScript/React.

## Comandi base di test

```powershell
.\baubook.ps1 -Mode doctor
.\baubook.ps1 -Mode supabase-doctor
.\baubook.ps1 -Mode web
.\baubook.ps1 -Mode android-build -CleanPrebuild
.\baubook.ps1 -Mode android-dev
```

## Script principali

```powershell
.\scripts\install-clean.ps1       # install npm pulito da registry pubblico
.\baubook.ps1 -Mode typecheck     # TypeScript
.\baubook.ps1 -Mode clean         # pulizia cache Expo/Metro
.\baubook.ps1 -Mode supabase-doctor
.\stop_emu.ps1                    # spegne emulatori Android via adb
```

## Note Android

- JDK richiesto: 17+.
- Se Java manca: `winget install EclipseAdoptium.Temurin.17.JDK`.
- Android Studio non deve restare aperto: serve solo per SDK/AVD Manager.
- L'emulatore viene avviato dallo script tramite `emulator.exe`.
- Dopo nuove dipendenze native usa `android-build -CleanPrebuild`.

## Git

Prima di ogni commit:

```powershell
git status --short
.\baubook.ps1 -Mode typecheck
```

Non committare mai:

```txt
.env
node_modules/
.expo/
android/
ios/
dist/
```
