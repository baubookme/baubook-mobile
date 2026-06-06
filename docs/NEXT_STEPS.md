# BauBook! next steps

## Baseline corrente

Baseline consigliata: **1.5.1 super-stable**.

Prima di sviluppare feature nuove:

```powershell
cd C:\baubook
.\baubook.ps1 -Mode doctor
.\baubook.ps1 -Mode web
.\baubook.ps1 -Mode android-build -CleanPrebuild
.\baubook.ps1 -Mode android-dev
.\baubook.ps1 -Mode supabase-doctor
```

## Commit baseline 1.5.1

```powershell
git add .
git commit -m "chore: stabilize workspace and prepare Supabase setup"
git tag -a v0.1.5-super-stable -m "BauBook super-stable baseline 1.5.1"
git push
git push origin v0.1.5-super-stable
```

## Step 1 completato: launcher icon

Il logo completo resta per splash/Home/store. Il launcher Android usa il muso del cane, piu' leggibile e non tagliato dalla maschera adaptive icon.

Guida:

```txt
docs/ANDROID_LAUNCHER_ICON.md
```

## Step 2: Supabase

1. Crea progetto `baubook-beta`.
2. Compila `.env`.
3. Esegui schema SQL.
4. Esegui seed demo opzionale.
5. Rilancia `supabase-doctor`.

Guida:

```txt
docs/SUPABASE_SETUP.md
```

## Dopo Supabase

Quando il progetto Supabase e' creato, la tranche successiva sara':

- installazione dipendenze Supabase React Native;
- `src/shared/lib/supabase.ts` reale;
- Auth email OTP/magic link;
- creazione profilo utente automatico;
- lettura luoghi demo da Supabase nella schermata Mappa/List;
- primo commit feature: `feat: connect Supabase client and auth bootstrap`.
