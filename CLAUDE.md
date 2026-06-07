# BauBook! Claude / AI coding notes

This project is an Expo SDK 56 React Native app for BauBook! Venezia-Mestre.

Current baseline: **1.6.0 Supabase live read-only**.

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

## Supabase

Runtime client:

```txt
src/shared/lib/supabase.ts
```

Read-only public data layer:

```txt
src/shared/api/supabaseContent.ts
src/shared/hooks/useSupabasePublicData.ts
```

SQL order in Dashboard:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/seeds/venezia_mestre_demo.sql`
3. `supabase/migrations/0002_api_access_grants.sql`

Next major task: Auth bootstrap with email OTP/magic link and profile creation.
