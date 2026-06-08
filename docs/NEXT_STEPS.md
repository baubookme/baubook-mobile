# BauBook! next steps

Baseline corrente: **1.8.0 Walks + Presence bootstrap**.

## Gia' fatto

- Workspace stabile Web + Android Development Build.
- Schema Supabase 1.5.2 applicato.
- Seed Venezia-Mestre applicato.
- App collegata a Supabase per letture pubbliche.
- Auth email OTP/magic link funzionante.
- Profilo umano `profiles` creato/aggiornabile.
- Primo cane `dogs` creato/aggiornabile.
- Passeggiate reali su `walk_plans` + `community_events`.
- Presenza temporanea su `presence_sessions`.
- Bacheca passeggiate e presenze con fallback demo se Supabase non risponde.

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

1. apri **Setup** e verifica sessione attiva;
2. se serve, login con OTP/magic link;
3. apri **Io sono...!** e verifica che esista almeno un cane;
4. apri **Passeggio**;
5. scegli cane, luogo e orario;
6. crea una passeggiata;
7. attiva una presenza temporanea;
8. torna in Supabase Table Editor e verifica `walk_plans`, `community_events`, `community_event_participants`, `presence_sessions`.

## Prossima tranche tecnica

`feat: safety alerts bootstrap`

- Creazione `danger_reports` autenticata con TTL.
- Creazione `lost_dog_alerts` autenticata, senza push iniziale.
- Primo flusso `Avvistato!` su `lost_dog_sightings`.
- Report abuso su alert e passeggiate.
- UI piu' forte per disclaimer e responsabilita'.

## Commit suggerito per questa tranche

```powershell
git add .
git commit -m "feat: add live walk planning and temporary presence"
git tag -a v0.1.9-walks-presence -m "BauBook walks and presence baseline 1.8.0"
git push
git push origin v0.1.9-walks-presence
```
