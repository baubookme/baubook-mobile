# BauBook! hotfix 1.4.3

Corregge lo script `scripts/doctor.ps1` per Windows PowerShell 5.1.

## Fix

- Rimosso l'uso di `ProcessStartInfo.ArgumentList`, non affidabile su Windows PowerShell 5.1.
- Aggiunta risoluzione esplicita di `node.exe`, `npm.cmd`, `java.exe`, `adb.exe`.
- Evitati `.Trim()` e chiamate su output null.
- Aggiunti timeout sui comandi nativi.
- Reso il controllo porte non bloccante.

Il codice app non cambia.
