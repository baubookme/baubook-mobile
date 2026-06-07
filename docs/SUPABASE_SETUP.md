# BauBook! Supabase setup

Backend managed per la beta **BauBook! Venezia-Mestre**.

## 1. Progetto

Valori usati:

```txt
Organization: BauBook
Project name: baubook-beta
Region: Europe
Plan: Free
```

La database password resta solo nel password manager. Non va in `.env`, GitHub, chat o documentazione.

## 2. Variabili locali Expo

Crea `C:\baubook\.env` partendo da `.env.example`:

```powershell
cd C:\baubook
Copy-Item .env.example .env
notepad .env
```

Compila:

```env
EXPO_PUBLIC_SUPABASE_URL=https://TUO_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=LA_TUA_PUBLISHABLE_KEY
EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY=
```

`NEXT_PUBLIC_*` e' per Next.js, non per Expo.

Verifica:

```powershell
.\baubook.ps1 -Mode supabase-doctor
```

## 3. Schema, seed e API grants

Nel Dashboard Supabase usa `SQL Editor > New query`.

Ordine da rispettare:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/seeds/venezia_mestre_demo.sql`
3. `supabase/migrations/0002_api_access_grants.sql`

`0002_api_access_grants.sql` e' importante: le policy RLS decidono cosa si puo' leggere/scrivere, ma il client Supabase ha comunque bisogno dei privilegi PostgREST corretti per `anon` e `authenticated`.

## 4. App live read-only

Dalla 1.6.0 l'app legge da Supabase:

- `places` nella schermata **Mappa**;
- `app_config`, `feature_flags`, `places` nella schermata **Setup**.

Se Supabase non risponde, BauBook mostra fallback demo locali e un messaggio parlante. Non deve crashare.

## 5. Test consigliati

Dopo aver eseguito gli SQL:

```powershell
cd C:\baubook
.\baubook.ps1 -Mode supabase-doctor
.\baubook.ps1 -Mode web
```

Nel browser:

- **Mappa** deve mostrare `Supabase live` e luoghi `seed Supabase`;
- **Setup** deve mostrare `DB raggiungibile` con conteggi config/flag/luoghi.

Poi ricostruisci Android almeno una volta, perche' sono state aggiunte dipendenze native:

```powershell
.\baubook.ps1 -Mode android-build -CleanPrebuild
.\baubook.ps1 -Mode android-dev
```

## 6. Auth base: prossimo step

La prossima tranche sara':

- email OTP/magic link;
- creazione automatica `profiles`;
- primo cane locale/su DB;
- upload avatar piu' avanti.

Il telefono resta rimandato alle funzioni ad alto rischio, come `Mi sono perso!`.
