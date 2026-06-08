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

## 3. Schema e migrations

Nel Dashboard Supabase usa `SQL Editor > New query`.

Ordine da rispettare:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/seeds/venezia_mestre_demo.sql`
3. `supabase/migrations/0002_api_access_grants.sql`
4. `supabase/migrations/0003_auth_profile_bootstrap.sql`
5. `supabase/migrations/0004_walks_presence_bootstrap.sql`
6. `supabase/migrations/0005_safety_alerts_bootstrap.sql`

`0002` espone a PostgREST le operazioni minime. Le policy RLS restano il vero controllo di sicurezza.

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

## 5. Safety alerts

La migration `0005_safety_alerts_bootstrap.sql` aggiunge RPC controllate per:

- `create_lost_dog_alert(...)`;
- `close_lost_dog_alert(...)`;
- `create_lost_dog_sighting(...)`;
- `create_danger_report(...)`;
- `close_danger_report(...)`;
- `report_safety_content(...)`;
- `expire_stale_safety_alerts()`.

Regole principali:

- disclaimer obbligatorio anche lato database;
- email verificata per creare alert smarrimento/pericolo;
- TTL smarrimento clampato 6-48h;
- TTL pericolo normalizzato 2/6/24/72h;
- rate limit beta per profilo;
- un solo alert smarrimento attivo per cane;
- area approssimata a un luogo BauBook;
- audit log minimo su creazione, chiusura, avvistamenti e report abuso.

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
3. **Setup > Account BauBook** deve mantenere sessione attiva.
4. **Io sono...!** deve mostrare il cane salvato.
5. **Passeggio** deve creare una passeggiata e una presenza.
6. **Aiuto** deve creare un `lost_dog_alert` solo dopo disclaimer.
7. **Aiuto** deve creare un `danger_report` solo dopo disclaimer.
8. **Aiuto** deve creare `lost_dog_sightings`, chiudere alert e creare `reports`.

Poi ricostruisci Android se vuoi testare la Development Build:

```powershell
.\baubook.ps1 -Mode android-build -CleanPrebuild
.\baubook.ps1 -Mode android-dev
```
