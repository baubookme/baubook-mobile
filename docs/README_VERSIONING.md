# BauBook! README versioning

Regole pratiche per versionare BauBook senza moltiplicare documenti temporanei.

## Stato corrente

Baseline di questo pacchetto:

```txt
BauBook 1.9.9 In-App Launch Compliance + Docs Compaction
app/package: 0.2.9
tag consigliato: v0.2.9-in-app-launch-compliance-docs
branch operativo: main
repo locale: C:\baubook
```

## Regola main-only

Per ora lavoriamo direttamente su `main`. Prima di applicare pacchetti:

```powershell
cd C:\baubook
git checkout main
git pull origin main
git status --short
```

Lo status deve essere pulito o consapevolmente gestito.

## Versioni

Ogni blocco stabile aggiorna insieme:

- `package.json` `version`;
- `package-lock.json` root/package version;
- `app.json` `expo.version`;
- Android `versionCode`;
- iOS `buildNumber`;
- `app.json` `expo.extra.baseline`;
- README/documenti stabili se la baseline cambia.

## Commit

Commit piccoli, uno per blocco stabile:

```powershell
git add .
git status --short
git commit -m "docs: compact launch documentation and versioning"
```

Evitare commit con:

```txt
_baubook_work/
_baubook_backups/
.env
node_modules/
.expo/
android/
ios/
```

## Tag

Taggare solo baseline funzionanti:

```powershell
git tag -a v0.2.9-in-app-launch-compliance-docs -m "BauBook 1.9.9 In-App Launch Compliance + Docs Compaction"
git push origin main
git push origin v0.2.9-in-app-launch-compliance-docs
```

Se un tag viene messo sul commit sbagliato prima del push finale:

```powershell
git tag -f -a v0.2.9-in-app-launch-compliance-docs HEAD -m "BauBook 1.9.9 In-App Launch Compliance + Docs Compaction"
git push --force origin v0.2.9-in-app-launch-compliance-docs
```

Usare force solo sui tag BauBook appena creati, non su branch condivisi.

## Documentazione

`docs/` contiene solo documenti stabili:

```txt
docs/DEVELOPMENT.md
docs/SCHEMA_DB.md
docs/README_VERSIONING.md
```

Non creare:

```txt
docs/HOTFIX_*.md
docs/BASELINE_*.md
```

Le note operative temporanee vanno nel messaggio di commit, nella conversazione o nei documenti stabili se restano utili.

## Checklist prima del push

```powershell
npm run docs:check
npm run launch:check
npm run typecheck
git status --short
```

Poi:

```powershell
git push origin main
git push origin v0.2.9-in-app-launch-compliance-docs
```

## BauBook 2.0.0 - v0.3.0-beta-experience-cartoon-toolbar

- Versione app/package: 0.3.0.
- Android versionCode: 13.
- iOS buildNumber: 13.
- Esperienza beta visibile: toolbar con badge cartoon coerenti con la Home.
- Check nuovo: npm run ui:check.

## BauBook 2.0.0

- Tag: `v0.3.0-beta-experience-cartoon-toolbar`
- Versione app/package: `0.3.0`
- Baseline: `2.0.0`
- Contenuto: Beta Experience + Cartoon Toolbar.


## v0.3.2-live-map-realtime-radar

Release BauBook 2.0.2: realtime/polling diagnostico per i dati mappa, migration Supabase 0009 e check `map:realtime:check`.

## v0.3.3-native-mapview-markers

- App/package version: 0.3.3.
- Baseline: 2.0.3.
- Introduce una mappa nativa con react-native-maps e marker reali per i luoghi BauBook.
- Mantiene il badge realtime/polling introdotto in 2.0.2 e aggiunge il check `npm run map:native:check`.

