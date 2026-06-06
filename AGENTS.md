# BauBook! agent notes

Project: Expo SDK 56 + React Native + TypeScript.

Operational workflow after local debugging:

1. UI/layout first in browser:

```powershell
.\baubook.ps1 -Mode web
```

2. Android uses Development Build, not Expo Go:

```powershell
.\baubook.ps1 -Mode android-build
.\baubook.ps1 -Mode android-dev
```

3. Before changing dependencies, keep npm on the public registry. Never commit a lockfile containing `applied-caas` or `artifactory` URLs.

4. Run before handoff:

```powershell
npm run typecheck
npm run export:web
```

5. Keep `android/` and `ios/` generated for now. Do not commit native folders until BauBook needs manual native edits.

Nota: `android-dev` avvia l'emulatore da CLI se non trova device ADB. Per gestione manuale usare `-NoStartEmulator`.
