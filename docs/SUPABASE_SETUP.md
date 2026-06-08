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

## 3. Schema, seed, API grants e Auth helper

Nel Dashboard Supabase usa `SQL Editor > New query`.

Ordine da rispettare:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/seeds/venezia_mestre_demo.sql`
3. `supabase/migrations/0002_api_access_grants.sql`
4. `supabase/migrations/0003_auth_profile_bootstrap.sql`

`0002_api_access_grants.sql` espone a PostgREST le operazioni minime. Le policy RLS restano il vero controllo di sicurezza.

`0003_auth_profile_bootstrap.sql` aggiunge:

- trigger per creare un `profiles` quando nasce un nuovo `auth.users`;
- funzione `ensure_current_profile(...)` richiamata dall'app dopo login;
- grant `execute` per utenti autenticati.

## 4. Auth email OTP / magic link

Nel tab **Setup** l'app puo':

- inviare email OTP/magic link;
- verificare un codice OTP se il template email Supabase lo include;
- gestire sessione persistente;
- creare/aggiornare il profilo umano;
- fare logout.

Per il link magico su Development Build aggiungi in Supabase:

```txt
Authentication > URL Configuration > Redirect URLs
baubook://auth/callback
```

Per test web puoi aggiungere anche l'origin locale mostrato dal browser Expo, per esempio:

```txt
http://localhost:8081
http://127.0.0.1:8081
```

Il test piu' semplice resta OTP: se modifichi il template email per mostrare `{{ .Token }}`, puoi inserire il codice direttamente nel tab Setup.

## 5. App live

Dalla 1.7.0 l'app usa Supabase per:

- `places` nella schermata **Mappa**;
- `app_config`, `feature_flags`, `places` nella schermata **Setup**;
- `auth.users` + `profiles` nel tab **Setup**;
- `dogs` nella schermata **Io sono...!**.

Se Supabase non risponde, BauBook deve mostrare fallback demo o errore parlante. Non deve crashare.

## 6. Test consigliati

Dopo aver eseguito gli SQL:

```powershell
cd C:\baubook
.\baubook.ps1 -Mode supabase-doctor
.\baubook.ps1 -Mode web
```

Nel browser:

1. **Mappa** deve mostrare `Supabase live`.
2. **Setup** deve mostrare `DB raggiungibile`.
3. **Setup > Account BauBook** deve inviare email OTP/magic link.
4. Dopo login, salva il nome umano.
5. **Io sono...!** deve salvare il primo cane su `dogs`.

Poi ricostruisci Android se vuoi testare la Development Build:

```powershell
.\baubook.ps1 -Mode android-build -CleanPrebuild
.\baubook.ps1 -Mode android-dev
```
