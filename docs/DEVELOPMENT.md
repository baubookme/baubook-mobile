# BauBook! development runbook

Documento operativo unico per sviluppo locale, Supabase, env, Android e launch checks.

## Root e prerequisiti

Root standard del repo sul PC di sviluppo:

```powershell
cd C:\baubook
```

Prerequisiti:

- Node compatibile con Expo SDK usato dal progetto;
- PowerShell;
- Android Studio installato per SDK/AVD Manager;
- JDK 17+;
- Supabase project `baubook-beta`;
- `.env` locale creato da `.env.example`.

Non committare mai:

```txt
.env
node_modules/
.expo/
android/
ios/
dist/
_baubook_work/
_baubook_backups/
```

## Install e avvio

```powershell
.\scripts\install-clean.ps1
.\baubook.ps1 -Mode doctor
.\baubook.ps1 -Mode web
```

Per Android usa Development Build, non Expo Go:

```powershell
.\baubook.ps1 -Mode android-build -CleanPrebuild
.\baubook.ps1 -Mode android-dev
```

`android-build` ricompila l'app nativa. Usalo quando cambiano asset nativi, `app.json`, permessi o librerie native.

`android-dev` avvia Metro per la Development Build gia' installata. Usalo per lavoro quotidiano su TypeScript/React.

## Environment

Crea `.env`:

```powershell
Copy-Item .env.example .env
notepad .env
```

Chiavi pubbliche Expo previste:

```env
EXPO_PUBLIC_APP_ENV=local
EXPO_PUBLIC_SUPABASE_URL=https://TUO_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=LA_TUA_PUBLISHABLE_KEY
EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY=
EXPO_PUBLIC_BAUBOOK_SPONSORED_LITE_ENABLED=false
EXPO_PUBLIC_BAUBOOK_CONTACT_EMAIL=support@baubook.me
EXPO_PUBLIC_BAUBOOK_PRIVACY_URL=https://baubook.me/privacy
EXPO_PUBLIC_BAUBOOK_TERMS_URL=https://baubook.me/terms
EXPO_PUBLIC_BAUBOOK_DELETE_ACCOUNT_URL=https://baubook.me/account/delete
```

Regole:

- usare `EXPO_PUBLIC_*`, non `NEXT_PUBLIC_*`;
- non mettere password database in `.env`;
- la publishable key Supabase e' pubblica ma va comunque gestita con ordine;
- `EXPO_PUBLIC_BAUBOOK_SPONSORED_LITE_ENABLED` resta `false` di default.

## Supabase project

Valori operativi beta:

```txt
Organization: BauBook
Project name: baubook-beta
Region: Europe
Plan: Free
```

La database password resta solo nel password manager. Non va in GitHub, `.env`, chat o documentazione.

Verifica connessione:

```powershell
.\baubook.ps1 -Mode supabase-doctor
npm run safety:smoke
```

## Auth email OTP / magic link

Nel tab Setup l'app puo':

- inviare email OTP/magic link;
- verificare codice OTP se il template Supabase lo include;
- mantenere sessione persistente;
- creare/aggiornare profilo umano;
- fare logout;
- registrare richiesta cancellazione account tramite flow controllato.

Redirect URL per Development Build:

```txt
baubook://auth/callback
```

Per web locale aggiungi anche l'origin Expo mostrato dal browser, per esempio:

```txt
http://localhost:8081
http://127.0.0.1:8081
```

## Launch checks

Prima di ogni commit stabile:

```powershell
git status --short
npm run docs:check
npm run launch:check
npm run typecheck
```

Per una pre-beta piu' severa:

```powershell
npm run beta:check
npm run launch:check:strict
```

`launch:check:strict` puo' richiedere `.env` reale e export web. Se fallisce per configurazioni non ancora definitive, leggere l'errore prima di modificare codice.

## Store readiness

Tenere aggiornati:

```txt
store/metadata/it-IT/listing.md
store/legal/privacy-policy-draft-it.md
store/qa/release-candidate-checklist.md
```

Sponsored Places Lite deve rimanere:

- spento di default;
- senza SDK advertising;
- senza advertising ID;
- sempre etichettato come contenuto sponsorizzato quando visibile;
- configurabile lato Supabase/app config.

## Troubleshooting rapido

Se Metro o Expo si incastrano:

```powershell
.\baubook.ps1 -Mode clean
.\baubook.ps1 -Mode web
```

Se Android non parte:

```powershell
.\stop_emu.ps1
.\baubook.ps1 -Mode android-build -CleanPrebuild
.\baubook.ps1 -Mode android-dev
```

Se Supabase non risponde:

```powershell
.\baubook.ps1 -Mode supabase-doctor
npm run safety:smoke
```
