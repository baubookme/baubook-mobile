# BauBook 1.5.1 - launcher/splash centering

Questa hotfix stabilizza gli asset nativi di avvio Android.

## Modifiche

- `assets/android-icon-foreground.png`: avatar cane centrato su canvas 1024x1024.
- `assets/android-icon-background.png`: background pieno caldo, senza elementi decentrati.
- `assets/android-icon-monochrome.png`: silhouette centrata.
- `assets/icon.png`: icona legacy centrata.
- `assets/favicon.png`: favicon aggiornata.
- `assets/splash-icon.png`: splash icon centrata su canvas 1080x1080.
- `docs/launcher-icon-preview.png` e `docs/splash-icon-preview.png`: preview di controllo.

## Nota operativa

Per vedere gli asset aggiornati su Android serve rigenerare/reinstallare la Development Build:

```powershell
.\baubook.ps1 -Mode android-build -CleanPrebuild
```

Se l'emulatore mantiene cache vecchie:

```powershell
adb uninstall me.baubook.app
.\baubook.ps1 -Mode android-build -CleanPrebuild
```

## Git

- `.idea/` resta ignorata; le configurazioni condivise sono in `.run/`.
