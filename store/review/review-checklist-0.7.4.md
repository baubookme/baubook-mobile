# Review checklist - BauBook 0.7.4

## Prima del commit
- [ ] URL legali pubblici aperti da browser anonimo.
- [ ] Privacy, Terms, Community Guidelines, Support, Account deletion hanno footer con Home + link legali.
- [ ] `src/shared/constants/legalUrls.ts` contiene gli stessi URL pubblici.
- [ ] `app.json` contiene `expo.extra.legalUrls`.
- [ ] `package.json` contiene `baubook.legalUrls` e release tag 0.7.4.
- [ ] `package-lock.json` root version aggiornata a 0.7.4.
- [ ] Nessuna modifica a Passeggiate/Presenze/Alert per bottoni blocco/sblocco.
- [ ] Warning PostGIS `spatial_ref_sys` lasciato fuori perimetro.

## Comandi

```powershell
cd C:\baubook
powershell -ExecutionPolicy Bypass -File .\scripts\apply-0.7.4-store-legal-readiness.ps1
npm run typecheck
npm run launch:check
git status --short
```

## Commit/tag consigliati

```powershell
git add app.json package.json package-lock.json src/shared/constants/legalUrls.ts docs/STORE_LEGAL_READINESS_0.7.4.md store
git commit -m "chore: prepare store metadata and legal readiness"
git tag -a baubook-0.7.4-store-metadata-legal-readiness -m "BauBook 0.7.4 Store Metadata & Legal Readiness"
git push origin main
git push origin baubook-0.7.4-store-metadata-legal-readiness
```

