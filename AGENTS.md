# BauBook! agent notes

Project: Expo SDK 56 + React Native + TypeScript.

Current workspace baseline: **BauBook 1.6.0 Supabase live read-only**.

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

3. Supabase runtime connection exists for public read-only data:

```powershell
.\baubook.ps1 -Mode supabase-doctor
```

Screens using Supabase now:

- `src/features/map/MapScreen.tsx` reads public `places`.
- `src/features/profile/ProfileScreen.tsx` checks `app_config`, `feature_flags`, `places`.

4. If live reads fail with permission errors, ensure `supabase/migrations/0002_api_access_grants.sql` was executed after schema + seed.

5. Before changing dependencies, keep npm on the public registry. Never commit a lockfile containing `applied-caas` or `artifactory` URLs.

6. Run before handoff:

```powershell
npm run typecheck
npm run export:web
```

7. Keep `android/` and `ios/` generated for now. Do not commit native folders until BauBook needs manual native edits.

8. Keep `docs/` small. Do not create `HOTFIX_*.md` or `BASELINE_*.md`.

Notes:

- `android-dev` avvia l'emulatore da CLI se non trova device ADB.
- Per gestione manuale usare `-NoStartEmulator`.
- Launcher icon is dog/avatar only; full logo remains for splash/Home/store.
