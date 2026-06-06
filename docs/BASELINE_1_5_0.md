# BauBook baseline 1.5.0

Questa baseline consolida la 1.4.6 dopo i test locali riusciti.

## Stato verificato

- Web OK.
- Android Development Build OK.
- Android Dev Metro OK.
- GitHub repository creato e push baseline precedente OK.
- Expo Go non usato come flusso standard.

## Novita' 1.5.0

- Launcher icon Android rifatta con solo cane/avatar, adatta alla maschera adaptive icon.
- Asset launcher e favicon aggiornati.
- Preview launcher in `docs/launcher-icon-preview.png`.
- Setup Supabase documentato in `docs/SUPABASE_SETUP.md`.
- Script `scripts/supabase-doctor.ps1`.
- Modalita' script `supabase-doctor` in `baubook.ps1`.
- Run configuration JetBrains `BauBook Supabase Doctor`.
- `.env.example` aggiornato con publishable key Supabase.

## Test dopo override

```powershell
cd C:\baubook
.\scripts\install-clean.ps1
.\baubook.ps1 -Mode doctor
.\baubook.ps1 -Mode web
.\baubook.ps1 -Mode android-build -CleanPrebuild
.\baubook.ps1 -Mode android-dev
.\baubook.ps1 -Mode supabase-doctor
```

## Commit suggerito

```powershell
git add .
git status --short
git commit -m "chore: stabilize workspace and prepare Supabase setup"
git tag -a v0.1.5-super-stable -m "BauBook super-stable baseline 1.5.0"
git push
git push origin v0.1.5-super-stable
```
