# BauBook - troubleshooting setup

## npm prova a scaricare da applied-caas/artifactory

Il lockfile e' sporco. Risolvi con:

```powershell
.\scripts\install-clean.ps1
```

Il progetto include `.npmrc` con registry pubblico:

```txt
registry=https://registry.npmjs.org/
```

## Gradle richiede JVM 17+

Installa JDK 17:

```powershell
winget install EclipseAdoptium.Temurin.17.JDK
```

Chiudi e riapri WebStorm, poi:

```powershell
java -version
.\baubook.ps1 -Mode android-build
```

## Expo Go: IOException failed to download update

Non perdere tempo su Expo Go. Usa Development Build:

```powershell
.\baubook.ps1 -Mode android-build
```

## ADB non vede device

```powershell
adb start-server
adb devices -l
```

Se non compare l'emulatore, apri Android Studio Device Manager o lancia:

```powershell
C:\AndroidSDK\emulator\emulator.exe -avd Pixel_8_Pro -no-snapshot-load
```

Poi:

```powershell
adb devices -l
```

## Icona launcher vecchia

Le icone sono cache/native. Reinstalla dev build:

```powershell
.\baubook.ps1 -Mode android-build -CleanPrebuild
```

Se resta vecchia, disinstalla BauBook dall'emulatore e rilancia la build.


## Popup crashpad/qemu dell'emulatore

Le finestre `qemu`/`crashpad` e il popup "Android Emulator closed unexpectedly" sono dell'emulatore Android, non dell'app BauBook.

Per ridurli, il comando `android-dev` avvia l'AVD da CLI con cold boot pulito, niente snapshot e GPU software stabile. Flusso consigliato:

```powershell
adb devices -l
.\baubook.ps1 -Mode android-dev
```

Se vuoi evitare qualunque avvio automatico dell'AVD, usa:

```powershell
.\baubook.ps1 -Mode android-dev -NoStartEmulator
```
