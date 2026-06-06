# Hotfix 1.4.6 - Android dev da CLI senza Android Studio

## Obiettivo

Non obbligare a tenere aperto Android Studio durante lo sviluppo quotidiano.

## Cambiamenti

- `android-dev` torna ad avviare automaticamente `Pixel_8_Pro` se non trova un device ADB.
- L'avvio avviene tramite `emulator.exe`, non tramite Android Studio.
- L'emulatore viene avviato con parametri più stabili:
  - `-no-snapshot-load`
  - `-no-snapshot-save`
  - `-no-boot-anim`
  - `-gpu swiftshader_indirect` di default
- Aggiunto parametro `-NoStartEmulator` per chi vuole gestire manualmente l'AVD.
- Aggiunto parametro `-EmulatorGpu` per cambiare GPU mode se serve.

## Uso consigliato

```powershell
.\baubook.ps1 -Mode android-dev
```

## Uso manuale

```powershell
.\baubook.ps1 -Mode android-dev -NoStartEmulator
```

## GPU alternative

```powershell
.\baubook.ps1 -Mode android-dev -EmulatorGpu host
.\baubook.ps1 -Mode android-dev -EmulatorGpu angle_indirect
.\baubook.ps1 -Mode android-dev -EmulatorGpu auto
```
