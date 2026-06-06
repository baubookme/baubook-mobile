# Android launcher icon

Nella baseline 1.5.1 il launcher non usa piu' il logo completo con testo.

Motivo: Android adaptive icon applica una maschera circolare/squircle. Un logo completo con scritte e fumetto rischia di apparire tagliato o troppo piccolo.

Asset aggiornati:

```txt
assets/icon.png
assets/favicon.png
assets/android-icon-background.png
assets/android-icon-foreground.png
assets/android-icon-monochrome.png
assets/baubook/launcher-dog-avatar-source.png
docs/launcher-icon-preview.png
```

Scelta grafica:

- launcher: muso del cane, centrato, leggibile anche piccolo;
- splash/home/store: logo completo BauBook!;
- tab Home: badge dedicato.

Per vedere la nuova icona sull'emulatore devi reinstallare la Development Build:

```powershell
cd C:\baubook
.\baubook.ps1 -Mode android-build -CleanPrebuild
```

Se Android mostra ancora l'icona vecchia:

```powershell
adb uninstall me.baubook.app
.\baubook.ps1 -Mode android-build -CleanPrebuild
```
