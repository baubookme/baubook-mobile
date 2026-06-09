# BauBook! Release Candidate Checklist

Checklist operativa per una build beta/store candidate.

## Versioni

- [ ] package.json aggiornato
- [ ] package-lock.json allineato
- [ ] app.json aggiornato
- [ ] Android versionCode incrementato
- [ ] iOS buildNumber incrementato
- [ ] tag Git previsto nel README_VERSIONING.md

## Environment

- [ ] EXPO_PUBLIC_APP_ENV configurato
- [ ] EXPO_PUBLIC_SUPABASE_URL configurato
- [ ] EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY configurata
- [ ] EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY configurata
- [ ] EXPO_PUBLIC_BAUBOOK_CONTACT_EMAIL configurata
- [ ] EXPO_PUBLIC_BAUBOOK_PRIVACY_URL configurata
- [ ] EXPO_PUBLIC_BAUBOOK_TERMS_URL configurata
- [ ] EXPO_PUBLIC_BAUBOOK_DELETE_ACCOUNT_URL configurata
- [ ] EXPO_PUBLIC_BAUBOOK_SPONSORED_LITE_ENABLED esplicito true/false

## Smoke test

- [ ] npm run docs:check
- [ ] npm run launch:check
- [ ] npm run typecheck
- [ ] npm run safety:smoke
- [ ] npm run beta:check

## App smoke manuale

- [ ] Login Supabase
- [ ] Creazione profilo
- [ ] Creazione cane
- [ ] Home caricata
- [ ] Mappa caricata
- [ ] Passeggiata creabile
- [ ] Presenza visibile
- [ ] Safety / Aiuto visibile
- [ ] Segnalazione cane smarrito testata
- [ ] Segnalazione pericolo testata
- [ ] Sponsored Lite spento: nessuno slot sponsored visibile
- [ ] Sponsored Lite acceso: label "Sponsorizzato" sempre visibile

## Store readiness

- [ ] Privacy policy pubblicabile
- [ ] Termini d'uso pubblicabili
- [ ] Procedura eliminazione account disponibile
- [ ] Listing italiano revisionato
- [ ] Screenshot store preparati
- [ ] Data safety Google Play compilabile
- [ ] App Privacy Apple compilabile
