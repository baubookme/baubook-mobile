# BauBook! next steps

Baseline corrente: **1.7.0 Auth bootstrap**.

## Gia' fatto

- Workspace stabile Web + Android Development Build.
- Schema Supabase 1.5.2 applicato.
- Seed Venezia-Mestre applicato.
- App collegata a Supabase per letture pubbliche.
- Auth email OTP/magic link predisposta.
- Profilo umano `profiles` creato/aggiornabile.
- Primo cane `dogs` creato/aggiornabile.
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

1. apri **Setup**;
2. invia email OTP/magic link;
3. verifica codice OTP oppure usa link magico se Redirect URL e' configurato;
4. salva nome umano;
5. apri **Io sono...!**;
6. salva il primo cane;
7. torna in Supabase Table Editor e verifica `profiles` + `dogs`.

## Prossima tranche tecnica

`feat: authenticated places and walk planning`

- Creazione evento passeggiata autenticato.
- Lettura `community_events` / `walk_plans` dal DB.
- Primo check-in/presenza temporanea.
- Report abuso base su contenuti.
- Nessuna chat privata ancora.

## Commit suggerito per questa tranche

```powershell
git add .
git commit -m "feat: bootstrap Supabase Auth and dog profile"
git tag -a v0.1.8-auth-bootstrap -m "BauBook Auth bootstrap baseline 1.7.0"
git push
git push origin v0.1.8-auth-bootstrap
```
