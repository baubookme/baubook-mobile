# BauBook! README versioning

Regole pratiche per versionare BauBook senza moltiplicare documenti temporanei.

## Stato corrente

Baseline di questo pacchetto:

```txt
BauBook 0.7.4 Store Metadata & Legal Readiness
app/package: 0.7.4
baseline: 2.3.0
tag consigliato: baubook-0.7.4-store-metadata-legal-readiness
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
- `src/shared/version/baubookVersion.ts`;
- `app.json` locale, non tracciato nel repo;
- Android `versionCode`;
- iOS `buildNumber`;
- `app.json` `expo.extra.baseline`;
- README/documenti stabili se la baseline cambia.

## Commit

Commit piccoli, uno per blocco stabile:

```powershell
git add package.json package-lock.json src docs store
git status --short
git commit -m "chore: align BauBook 0.7.4 metadata"
```

Evitare commit con:

```txt
_baubook_work/
_baubook_backups/
.env
app.json
node_modules/
.expo/
android/
ios/
```

## Tag

Taggare solo baseline funzionanti:

```powershell
git tag -a baubook-0.7.4-store-metadata-legal-readiness -m "BauBook 0.7.4 Store Metadata & Legal Readiness"
git push origin main
git push origin baubook-0.7.4-store-metadata-legal-readiness
```

Se un tag BauBook appena creato viene messo sul commit sbagliato prima del push finale:

```powershell
git tag -f -a baubook-0.7.4-store-metadata-legal-readiness HEAD -m "BauBook 0.7.4 Store Metadata & Legal Readiness"
git push --force origin baubook-0.7.4-store-metadata-legal-readiness
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
powershell -ExecutionPolicy Bypass -File .\scripts\docs-structure-check.ps1
npm run launch:check
npm run typecheck
git status --short
```

Poi:

```powershell
git push origin main
git push origin baubook-0.7.4-store-metadata-legal-readiness
```
