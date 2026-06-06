# BauBook - esecuzione Web e Android

## Regola operativa

Usa il browser per sviluppare layout e logica UI. Usa Android solo quando devi verificare comportamento nativo, icone, splash, permessi, mappe, notifiche o build.

## Web

```powershell
.\baubook.ps1 -Mode web
```

Oppure:

```powershell
npm run web
```

## Android Development Build

Prima volta:

```powershell
.\baubook.ps1 -Mode android-build
```

Cosa fa:

1. typecheck;
2. controllo JDK 17+;
3. controllo ADB/emulatore;
4. installazione `expo-dev-client` se manca;
5. `expo prebuild --platform android` se manca la cartella `android/`;
6. `expo run:android`.

Dopo la prima installazione, puoi avviare Metro e, se serve, l'emulatore direttamente da CLI:

```powershell
.\baubook.ps1 -Mode android-dev
```

Se invece vuoi gestire tu un emulatore gia' aperto, senza avvio automatico da script:

```powershell
.\baubook.ps1 -Mode android-dev -NoStartEmulator
```

Poi apri l'app BauBook installata sull'emulatore.

## Expo Go legacy

Expo Go non e' piu' il flusso consigliato per questo progetto.

```powershell
.\baubook.ps1 -Mode android-go
```

Usalo solo per test veloci. Se ricompare `IOException - failed to download update`, ignora Expo Go e torna a Development Build.

## Reinstallare app Android dopo cambio icona

Le icone launcher sono risorse native: dopo una modifica serve reinstallare la build.

```powershell
.\baubook.ps1 -Mode android-build -CleanPrebuild
```

Se l'emulatore mostra ancora l'icona vecchia, disinstalla BauBook dall'emulatore o fai wipe dati AVD, poi rilancia la build.
