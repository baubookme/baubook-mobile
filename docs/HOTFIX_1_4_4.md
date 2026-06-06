# Hotfix 1.4.4

Corregge lo script `baubook.ps1` per Android Development Build.

## Fix

- `android-dev` ora aspetta `sys.boot_completed=1`.
- `android-dev` verifica che il package manager Android sia pronto prima di lanciare Expo CLI.
- Controllo esplicito della presenza della Development Build `me.baubook.app`.
- Errore parlante se bisogna eseguire prima `android-build`.

Il problema corretto era l'errore Expo/ADB:

```txt
cmd: Can't find service: package
```

che accade quando ADB vede già il device, ma Android non ha ancora completato il boot.
