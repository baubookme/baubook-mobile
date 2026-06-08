# BauBook! Claude / AI coding notes

This project is an Expo SDK 56 React Native app for BauBook! Venezia-Mestre.

Current baseline: **1.8.0 Walks + Presence bootstrap**.

## Ground rules

- Prefer small, testable changes.
- Keep `docs/` small and durable: no `HOTFIX_*.md`, no `BASELINE_*.md`.
- Do not commit `.env`, `node_modules/`, `.expo/`, `android/`, `ios/`, `dist/`.
- Do not use Expo Go as the primary Android workflow. Use Development Build.
- Avoid manual native edits until the project intentionally commits native folders.

## Commands

```powershell
.\baubook.ps1 -Mode doctor
.\baubook.ps1 -Mode supabase-doctor
.\baubook.ps1 -Mode web
.\baubook.ps1 -Mode android-build -CleanPrebuild
.\baubook.ps1 -Mode android-dev
```

## Supabase client layers

Runtime client:

```txt
src/shared/lib/supabase.ts
```

Public data layer:

```txt
src/shared/api/supabaseContent.ts
src/shared/hooks/useSupabasePublicData.ts
```

Auth/profile/dogs:

```txt
src/shared/auth/AuthProvider.tsx
src/shared/api/authAccount.ts
```

Walks/presence:

```txt
src/shared/api/walks.ts
src/shared/hooks/useWalksBoard.ts
src/features/walks/WalksScreen.tsx
```

SQL order in Dashboard:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/seeds/venezia_mestre_demo.sql`
3. `supabase/migrations/0002_api_access_grants.sql`
4. `supabase/migrations/0003_auth_profile_bootstrap.sql`
5. `supabase/migrations/0004_walks_presence_bootstrap.sql`

Next major task: safety alerts bootstrap for `danger_reports`, `lost_dog_alerts` and `lost_dog_sightings`.
