# BauBook 1.4.2 - Doctor script hotfix

Correzioni:

- `scripts/doctor.ps1` non usa piu' `node -e require(...)` per leggere le versioni dei package.
- Risolto problema con package scoped come `@expo/metro-runtime`.
- I comandi nativi vengono eseguiti con timeout, cosi' `doctor` non resta appeso su ADB o altri processi.
- `npx expo install --check` non viene piu' eseguito automaticamente in doctor: resta un comando manuale consigliato.

File modificato:

- `scripts/doctor.ps1`
