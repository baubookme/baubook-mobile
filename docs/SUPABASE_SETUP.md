# BauBook! Supabase setup

Obiettivo della fase 2: creare il backend managed Supabase per la beta **BauBook! Venezia-Mestre**, senza ancora collegare schermate reali dell'app al database.

## Nome progetto consigliato

- Organization: `BauBook`
- Project name: `baubook-beta`
- Ambiente: `beta`
- Region: scegli una region europea vicina all'Italia, se disponibile nel tuo piano/dashboard.
- Piano iniziale: Free va bene per bootstrap e test interni.

Conserva la database password in un password manager. Non inserirla mai in `.env`, GitHub, chat o documentazione.

## 1. Crea progetto

1. Vai nella Supabase Dashboard.
2. Crea una organization `BauBook`, se non esiste.
3. Crea progetto `baubook-beta`.
4. Aspetta che il database sia pronto.

## 2. Recupera URL e client key

Dalla Dashboard Supabase, apri il progetto e recupera:

- Project URL
- Publishable key oppure anon/public key

Poi crea `.env` locale:

```powershell
cd C:\baubook
Copy-Item .env.example .env
notepad .env
```

Compila almeno:

```txt
EXPO_PUBLIC_SUPABASE_URL=https://TUO_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=LA_TUA_PUBLISHABLE_KEY
```

Se nella Dashboard vedi ancora la vecchia dicitura `anon key`, puoi copiarla anche in:

```txt
EXPO_PUBLIC_SUPABASE_ANON_KEY=LA_TUA_ANON_KEY
```

Non committare `.env`.

## 3. Configura Auth base

Per il primo MVP useremo email OTP / magic link, poi telefono solo per funzioni ad alto rischio.

Dashboard:

```txt
Authentication > Providers > Email
```

Lascia Email provider abilitato.

URL consigliati per la fase beta:

```txt
Site URL:
https://baubook.me

Redirect URLs:
baubook://**
https://baubook.me/**
http://localhost:8081/**
http://127.0.0.1:8081/**
```

Il progetto Expo ha gia' lo scheme:

```json
"scheme": "baubook"
```

## 4. Applica schema database

Apri Supabase Dashboard:

```txt
SQL Editor > New query
```

Copia ed esegui tutto il file:

```txt
supabase/migrations/0001_initial_schema.sql
```

Questo crea:

- estensione PostGIS;
- tabelle core BauBook;
- moderazione UGC;
- reports;
- blocks;
- audit logs;
- lost dog alerts;
- danger reports;
- policy RLS iniziali;
- storage bucket base.

## 5. Seed demo Venezia-Mestre

Solo dopo lo schema, opzionalmente esegui:

```txt
supabase/seeds/venezia_mestre_demo.sql
```

Serve per avere luoghi demo in mappa/lista.

## 6. Verifica locale

Da PowerShell:

```powershell
cd C:\baubook
.\baubook.ps1 -Mode supabase-doctor
```

Il doctor non contatta ancora il database: verifica file, `.env`, CLI opzionale e dipendenze app.

## 7. Supabase CLI, non obbligatoria subito

Per ora puoi usare la Dashboard. Quando inizieremo a gestire migrazioni in modo professionale installeremo la Supabase CLI e useremo:

```powershell
supabase login
supabase link --project-ref TUO_PROJECT_REF
supabase db push
```

Non farlo prima di avere il progetto creato e un backup del repository Git pulito.

## 8. Collegamento app, step successivo

Quando decideremo di collegare Auth/DB all'app installeremo:

```powershell
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
```

Poi `src/shared/lib/supabase.todo.ts` diventera' `src/shared/lib/supabase.ts`.

A quel punto, essendoci una dipendenza nativa (`@react-native-async-storage/async-storage`), rilanceremo:

```powershell
.\baubook.ps1 -Mode android-build
```
