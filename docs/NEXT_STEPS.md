# BauBook - prossimi step

## 1. Stabilizzare workspace

```powershell
.\scripts\install-clean.ps1
.\baubook.ps1 -Mode web
.\baubook.ps1 -Mode android-build
.\baubook.ps1 -Mode doctor
```

## 2. GitHub

Segui `docs/GIT_SETUP.md` e fai il primo commit pulito.

## 3. Supabase

Dopo Git:

1. crea progetto Supabase;
2. abilita PostGIS;
3. esegui `supabase/migrations/0001_initial_schema.sql`;
4. esegui seed demo se necessario: `supabase/seeds/venezia_mestre_demo.sql`;
5. copia `.env.example` in `.env`.

## 4. Milestone 2 app

- installare `@supabase/supabase-js`;
- client Supabase reale;
- login email OTP/magic link;
- `profiles` e `dogs` collegati a Auth;
- upload avatar cane su Supabase Storage.

## 5. Milestone 3 mappe

- Development Build gia' pronto;
- aggiungere `react-native-maps`;
- configurare API key Android;
- leggere marker da tabella `places`.
