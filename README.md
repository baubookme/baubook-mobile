# BauBook! Venezia-Mestre MVP Workspace

**BauBook 0.7.4 Store Metadata & Legal Readiness** per Expo, React Native, TypeScript e Supabase.

Root locale standard del repo: `C:\baubook`.


## Comandi base

```powershell
cd C:\baubook
.\scripts\install-clean.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\docs-structure-check.ps1
npm run launch:check
npm run typecheck
npm run check
.\baubook.ps1 -Mode web
.\baubook.ps1 -Mode android-build -CleanPrebuild
.\baubook.ps1 -Mode android-dev
```



## GitHub

Repository:

```txt
https://github.com/baubookme/baubook-mobile

*generate schema SQL
supabase\maintenance> node dump-schema.js "postgresql://postgres.tuqqomkkhnjsugydftlx:Xc...y!!!@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
```



