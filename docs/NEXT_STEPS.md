# BauBook! next steps

Baseline attuale: **1.9.8 Store Launch Hardening** sopra `v0.2.7-launch-readiness-sponsored-lite`.

## Fatto

- Workspace Expo/React Native stabile.
- Browser e Android Development Build funzionanti.
- Supabase schema estendibile con seed Venezia-Mestre.
- Auth email OTP/magic link, profilo umano e primo cane.
- Passeggiate live, presenza temporanea e Pack Pulse.
- Home Safety Radar.
- Aree cani ufficiali e ricerca per raggio.
- Safety alerts: smarrimento/pericolo con TTL, disclaimer, chiusura, avvistamenti e report abuso.
- Sponsored Places Lite come monetizzazione leggera, da tenere disattivabile via configurazione.
- Checklist launch/store e script `launch:check`.

## Prossima tranche consigliata

### 1. Store launch hardening reale

- Pubblicare URL reali per privacy, termini, supporto e richiesta eliminazione account.
- Preparare screenshot Android e iOS dalla stessa build.
- Compilare Play Console Data safety e App Store privacy details usando la matrice dati in `docs/LAUNCH_READINESS.md`.
- Fare smoke test: `npm run launch:check`, `npm run typecheck`, `npm run safety:smoke`.

### 2. Moderazione admin minima

- Lista `reports` aperti.
- Azioni: hide/remove/escalate.
- Chiusura manuale di contenuti abusivi.
- Log audit amministrativo.

### 3. UX safety

- Schermata dettaglio alert.
- Lista avvistamenti per proprietario alert.
- Filtri: smarriti/pericoli/solo miei.
- Disegno area su mappa invece di luogo + buffer.

### 4. Mappe native

- Google Maps Android key.
- `react-native-maps` o alternativa.
- Marker luoghi Supabase.
- Marker safety con raggio indicativo.

### 5. Push notification

- Expo Notifications.
- `push_tokens` reali.
- Prima notifica manuale/locale, poi Edge Function.

## Regola di lavoro

Ogni tranche deve avere:

1. migration SQL se cambia il DB;
2. fallback demo o errore parlante;
3. test web;
4. test Android dev/build se cambia nativo;
5. commit Git piccolo;
6. tag solo sulle baseline stabili.

Non creare file `HOTFIX_*.md` o `BASELINE_*.md`: versioni e milestone si tracciano con commit/tag Git.
