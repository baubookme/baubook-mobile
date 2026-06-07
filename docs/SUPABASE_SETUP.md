# BauBook! Supabase setup

Obiettivo: configurare il backend managed Supabase per la beta **BauBook! Venezia-Mestre**.

## 1. Progetto Supabase

Valori consigliati:

```txt
Organization: BauBook
Project name: baubook-beta
Region: Europe
Plan: Free, per bootstrap e test interni
```

Salva la database password in un password manager. Non inserirla in `.env`, GitHub, chat o documentazione.

## 2. Variabili locali

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
```

`NEXT_PUBLIC_*` e' per Next.js, non per Expo.

Verifica:

```powershell
.\baubook.ps1 -Mode supabase-doctor
```

## 3. Auth base

Dashboard Supabase:

```txt
Authentication > Providers > Email
```

Per MVP useremo email OTP / magic link. Il telefono arrivera' solo per funzioni ad alto rischio come alert smarrimento.

URL consigliati:

```txt
Site URL:
https://baubook.me

Redirect URLs:
baubook://**
https://baubook.me/**
http://localhost:8081/**
http://127.0.0.1:8081/**
```

Lo scheme Expo e' gia':

```json
"scheme": "baubook"
```

## 4. Schema database

Apri:

```txt
Supabase Dashboard > SQL Editor > New query
```

Copia ed esegui tutto:

```txt
supabase/migrations/0001_initial_schema.sql
```

Lo schema crea fondazioni MVP e future-proof:

- citta' e zone;
- profili e cani;
- media, preferenze cibo e knowledge card safety;
- luoghi, recensioni, mappa;
- passeggiate, eventi community, presenza temporanea;
- relazioni profilo-profilo e cane-cane;
- alert smarrimento e pericoli;
- servizi consigliati;
- moderazione, report, block, audit;
- feature flags e app config;
- push token e supporter entitlements;
- storage bucket base.

## 5. Seed demo

Dopo lo schema, opzionalmente esegui:

```txt
supabase/seeds/venezia_mestre_demo.sql
```

Il seed crea citta', zone, luoghi demo e feature flags disattivate. I dati geografici sono placeholder da verificare.

## 6. CLI Supabase

Non e' obbligatoria subito. La config iniziale puo' avvenire da Dashboard.

Quando passeremo a migrazioni gestite professionalmente:

```powershell
supabase login
supabase link --project-ref TUO_PROJECT_REF
supabase db push
```
