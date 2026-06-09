# BauBook! launch readiness

Documento stabile per portare BauBook! da beta tecnica a release candidate store.

Baseline tecnica: **1.9.8 Store Launch Hardening**.
Base Git attesa: `v0.2.7-launch-readiness-sponsored-lite`.
Tag consigliato dopo verifica: `v0.2.8-store-launch-hardening`.

## Obiettivo della tranche

Questa tranche non aggiunge nuove funzioni utente rischiose. Mette in sicurezza il percorso di pubblicazione:

- versioni app allineate tra `package.json` e `app.json`;
- controlli automatici di release readiness;
- matrice privacy/dati pronta per Play Console e App Store Connect;
- guardrail per Sponsored Places Lite;
- checklist release candidate Android/iOS;
- policy draft e metadata store in cartella `store/`.

## Comandi gate

```powershell
npm run launch:check
npm run typecheck
npm run safety:smoke
```

Prima di una build candidata:

```powershell
npm run launch:check:strict
npm run export:web:prod
.\baubook.ps1 -Mode android-build -CleanPrebuild
```

Se `launch:check:strict` fallisce, non taggare la release.

## Regole store minime

### Privacy

- Pubblicare una privacy policy su URL pubblico e stabile.
- Inserire lo stesso URL nello store e, appena disponibile UI dedicata, anche in app.
- Tenere allineate privacy policy, Data safety Google Play e App Privacy Apple.
- Aggiornare la privacy policy quando si aggiungono SDK, analytics, ads, notifiche, geolocalizzazione nativa o pagamenti.

### Account deletion

L'app usa Auth e profili. Prima della pubblicazione pubblica serve una procedura chiara per chiedere eliminazione account e dati collegati.

Fino a quando non esiste self-service in app:

- pubblicare un URL o indirizzo email dedicato;
- indicare dati rimossi, dati conservati per sicurezza/audit e tempi di gestione;
- collegare l'URL in `EXPO_PUBLIC_BAUBOOK_DELETE_ACCOUNT_URL`.

### Safety e community

BauBook! contiene contenuti generati dagli utenti: alert, segnalazioni, avvistamenti, report abuso, presenza temporanea. Per la release pubblica:

- mantenere disclaimer obbligatorio per funzioni safety critiche;
- mantenere rate limit lato DB;
- mantenere report abuso sempre accessibile;
- verificare che `reports` e `audit_logs` non siano esposti liberamente al client;
- preparare una procedura di moderazione, anche manuale, prima di aprire oltre la beta controllata.

## Matrice dati per privacy/store

| Area | Dati trattati | Scopo | Collegati all'utente | Condivisione esterna | Note |
|---|---|---|---|---|---|
| Auth | email, sessione Supabase, user id | accesso account | si | Supabase | Non salvare password nell'app. |
| Profilo umano | nome pubblico o nickname, preferenze base | profilo community | si | no, salvo backend Supabase | Evitare campi non necessari. |
| Cane | nome cane, dati descrittivi, preferenze | profilo cane e community | si | no, salvo backend Supabase | Evitare dati sanitari non indispensabili. |
| Luoghi | preferiti, eventuali recensioni future | mappa e consigli | potenzialmente | no, salvo backend Supabase | Places pubblici da seed/backend. |
| Passeggiate | piani passeggiata, interessi, presenza temporanea | coordinamento locale | si | visibilita' community controllata | No live tracking continuo nella baseline. |
| Safety | alert smarrimento, pericoli, avvistamenti, report | sicurezza locale | si | visibilita' community controllata | TTL, disclaimer e audit obbligatori. |
| Sponsored Lite | slot sponsorizzati e click/visibilita' solo se implementati | monetizzazione leggera | da mantenere aggregato | sponsor solo se definito | Default spento; label sempre chiara. |
| Diagnostica | errori runtime locali/dev | debug | no nella baseline | no | Non introdurre analytics senza aggiornare policy. |

## Sponsored Places Lite guardrail

Regola di prodotto: BauBook! non deve sembrare un marketplace aggressivo.

- Sponsored Lite deve essere spento di default in `.env.example` e metadata app.
- Ogni slot sponsorizzato deve avere label chiara: `Sponsorizzato`.
- Nessuna profilazione sensibile per annunci nella baseline.
- Nessuna promessa sanitaria, veterinaria o di sicurezza assoluta.
- I luoghi ufficiali e safety devono restare distinguibili dai contenuti sponsorizzati.
- Se si aggiungono impression/click tracking, aggiornare privacy policy, Data safety e App Privacy.

## Build checklist release candidate

### Prima del commit

```powershell
git status --short
npm run launch:check
npm run typecheck
npm run safety:smoke
```

### Prima del tag

```powershell
npm run launch:check:strict
npm run export:web:prod
.\baubook.ps1 -Mode android-build -CleanPrebuild
```

### Test manuale minimo

- Home mostra radar safety senza crash.
- Mappa mostra luoghi live o fallback chiaro.
- Io sono... salva/legge il primo cane.
- Passeggio crea piano/interesse/presenza e chiude presenza.
- Branco mostra pulse senza bloccare la navigazione.
- Aiuto crea alert smarrimento solo dopo disclaimer.
- Aiuto crea pericolo solo dopo disclaimer.
- Report abuso disponibile sui contenuti safety.
- Setup mostra stato Supabase/Auth leggibile.
- Logout/login non rompe sessione o profilo.

## Metadata obbligatori prima della pubblicazione

Compilare o confermare:

- nome app;
- sottotitolo/short description;
- descrizione lunga;
- categoria;
- email supporto;
- privacy policy URL;
- termini URL;
- account deletion URL;
- screenshot telefono;
- icona store;
- classificazione contenuti;
- Data safety Google Play;
- App Privacy Apple;
- nota di review per funzioni safety e beta locale.

## Comandi Git consigliati

```powershell
git checkout main
git pull origin main
git status --short
npm run launch:check
npm run typecheck
git add .
git commit -m "chore: add store launch hardening checks"
git tag -a v0.2.8-store-launch-hardening -m "BauBook 1.9.8 Store Launch Hardening"
git push origin main
git push origin v0.2.8-store-launch-hardening
```

Non creare file `HOTFIX_*.md` o `BASELINE_*.md` in `docs/`.
