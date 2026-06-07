# BauBook! next steps

Baseline corrente: **1.6.0 Supabase live read-only**.

## Gia' fatto

- Workspace stabile Web + Android Development Build.
- Schema Supabase 1.5.2 applicato.
- Seed Venezia-Mestre applicato.
- App collegata a Supabase per letture pubbliche.
- Fallback locale se Supabase non risponde.

## Test base

```powershell
cd C:\baubook
.\baubook.ps1 -Mode doctor
.\baubook.ps1 -Mode supabase-doctor
.\baubook.ps1 -Mode web
.\baubook.ps1 -Mode android-build -CleanPrebuild
.\baubook.ps1 -Mode android-dev
```

## Prima verifica funzionale

Nel browser:

1. apri **Mappa**;
2. verifica badge `Supabase live`;
3. verifica luoghi seed dal DB;
4. apri **Setup**;
5. verifica `DB raggiungibile` e conteggi `config`, `flag`, `luoghi`.

Se vedi `permission denied`, esegui in Supabase SQL Editor:

```txt
supabase/migrations/0002_api_access_grants.sql
```

## Prossima tranche tecnica

`feat: bootstrap Supabase Auth`

- Email OTP/magic link.
- Creazione profilo utente.
- Logout.
- Schermata account minima.
- `profiles` collegato ad `auth.users`.
- Nessun telefono finche' non partono alert smarrimento.

## Commit suggerito per questa tranche

```powershell
git add .
git commit -m "feat: connect Supabase public data"
git tag -a v0.1.7-supabase-live -m "BauBook Supabase live read-only baseline 1.6.0"
git push
git push origin v0.1.7-supabase-live
```
