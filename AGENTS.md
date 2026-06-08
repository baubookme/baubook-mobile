# BauBook! agent notes

Project: Expo SDK 56 + React Native + TypeScript.

Current workspace baseline: **BauBook 1.8.0 Walks + Presence bootstrap**.

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

3. Supabase runtime connection exists for public data, Auth, dogs, walks and temporary presence:

```powershell
.\baubook.ps1 -Mode supabase-doctor
```

Screens using Supabase now:

- `src/features/map/MapScreen.tsx` reads public `places`.
- `src/features/profile/ProfileScreen.tsx` checks `app_config`, `feature_flags`, `places`, `walk_plans`, `presence_sessions` and handles Auth/profile.
- `src/features/dogs/DogProfileScreen.tsx` saves the first dog.
- `src/features/walks/WalksScreen.tsx` creates live walk plans and temporary presence.

4. SQL order in Supabase Dashboard:

```txt
0001_initial_schema.sql
venezia_mestre_demo.sql
0002_api_access_grants.sql
0003_auth_profile_bootstrap.sql
0004_walks_presence_bootstrap.sql
```

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
