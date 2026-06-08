# BauBook! next steps

Baseline attuale: **1.9.0 Safety bootstrap**.

## Fatto

- Workspace Expo/React Native stabile.
- Browser e Android Development Build funzionanti.
- Supabase schema estendibile.
- Seed Venezia-Mestre.
- Lettura luoghi live.
- Auth email OTP/magic link.
- Profilo umano e primo cane.
- Passeggiate live e presenza temporanea.
- Alert smarrimento/pericolo con TTL, disclaimer, chiusura, avvistamenti e report abuso.

## Prossima tranche consigliata

### 1. Migliorare UX safety

- Disegno area su mappa invece di luogo + buffer.
- Lista avvistamenti per proprietario alert.
- Schermata dettaglio alert.
- Volantino base non premium.
- Filtri: smarriti/pericoli/solo miei.

### 2. Moderazione admin minima

- Mini pagina web interna o schermata protetta.
- Lista `reports` open.
- Azioni: hide/remove/escalate.
- Chiusura manuale contenuti abusivi.

### 3. Mappe vere

- Google Maps Android key.
- `react-native-maps` o alternativa.
- Marker luoghi Supabase.
- Marker safety con raggio indicativo.

### 4. Push notification

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

Non creare file `HOTFIX_*.md` o `BASELINE_*.md`: le versioni si tracciano con commit/tag Git.
