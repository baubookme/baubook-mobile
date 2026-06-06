# Fix npm / registry pubblico

Il progetto deve installare le dipendenze dal registry pubblico npm:

```powershell
https://registry.npmjs.org/
```

Se `npm install` prova a scaricare da URL simili a questi:

```text
packages.applied-caas-gateway1.internal.api.openai.org
artifactory/api/npm/npm-public
```

significa che il `package-lock.json` e' stato generato dentro un ambiente non pubblico. In questo progetto quel problema e' gia' stato corretto: il lockfile punta al registry pubblico e la root contiene un file `.npmrc` esplicito.

## Installazione consigliata

Dalla cartella del progetto:

```powershell
.\scripts\install-clean.ps1
```

In alternativa:

```powershell
npm ci --no-audit --no-fund --registry=https://registry.npmjs.org/
```

## Avvio browser

```powershell
.\baubook.ps1
```

## Avvio Android

```powershell
.\baubook.ps1 -Mode android -Clear -ResetAdb
```
