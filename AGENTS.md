# BauBook! agent notes

Project: Expo SDK 56 + React Native + TypeScript.

Current workspace baseline: **BauBook 1.5.2 schema-ready**.

Operational workflow:

1. UI/layout first in browser:

```powershell
.\baubook.ps1 -Mode web
```

2. Android uses Development Build, not Expo Go:

```powershell
.\baubook.ps1 -Mode android-build
.\baubook.ps1 -Mode android-dev
```

3. Supabase bootstrap is documented, but the app is not yet connected to Supabase at runtime:

```powershell
.\baubook.ps1 -Mode supabase-doctor
```

4. Before changing dependencies, keep npm on the public registry. Never commit a lockfile containing `applied-caas` or `artifactory` URLs.

5. Run before handoff:

```powershell
npm run typecheck
npm run export:web
```

6. Keep `android/` and `ios/` generated for now. Do not commit native folders until BauBook needs manual native edits.

7. Keep `docs/` small. Do not create `HOTFIX_*.md` or `BASELINE_*.md`.

Notes:

- `android-dev` avvia l'emulatore da CLI se non trova device ADB.
- Per gestione manuale usare `-NoStartEmulator`.
- Launcher icon is dog/avatar only; full logo remains for splash/Home/store.
