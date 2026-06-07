# BauBook! next steps

Baseline consigliata: **1.5.2 schema-ready**.

## Prima di eseguire lo schema

```powershell
cd C:\baubook
.\baubook.ps1 -Mode doctor
.\baubook.ps1 -Mode web
.\baubook.ps1 -Mode android-build -CleanPrebuild
.\baubook.ps1 -Mode android-dev
.\baubook.ps1 -Mode supabase-doctor
```

## Supabase

1. Verifica `.env` con `supabase-doctor`.
2. Esegui `supabase/migrations/0001_initial_schema.sql` nel SQL Editor.
3. Verifica le tabelle nel Table Editor.
4. Esegui opzionalmente `supabase/seeds/venezia_mestre_demo.sql`.

## Dopo lo schema

Prossima tranche tecnica:

- installazione `@supabase/supabase-js`, AsyncStorage e polyfill URL;
- `src/shared/lib/supabase.ts` reale;
- Auth email OTP/magic link;
- creazione automatica profilo utente;
- lettura luoghi demo da Supabase;
- primo commit feature: `feat: connect Supabase client and auth bootstrap`.

## Commit suggerito

```powershell
git add .
git commit -m "chore: prepare schema-ready Supabase baseline"
git tag -a v0.1.6-schema-ready -m "BauBook schema-ready baseline 1.5.2"
git push
git push origin v0.1.6-schema-ready
```
