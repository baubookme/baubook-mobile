# BauBook - Git setup

Quando `web` e `android-build` sono ok, inizializza Git.

```powershell
cd C:\baubook
git init -b main
git config user.name "BauBook"
git config user.email "admin@baubook.me"
git add .
git commit -m "chore: bootstrap BauBook MVP clean workspace"
```

Poi crea su GitHub un repository vuoto, consigliato:

```txt
baubook-mobile
```

Senza README, senza .gitignore, senza licenza.

Collega remoto:

```powershell
git remote add origin https://github.com/<TUO_USERNAME>/baubook-mobile.git
git push -u origin main
```

## Cosa non va committato

Gia' coperto da `.gitignore`:

- `node_modules/`
- `.expo/`
- `dist/`
- `.env`
- `android/` e `ios/` generati da prebuild
- keystore e chiavi

Per ora lasciamo `android/` fuori dal repository: Expo prebuild lo rigenera. Se in futuro modifichiamo codice nativo manualmente, cambieremo strategia.
