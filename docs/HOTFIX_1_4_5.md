# Hotfix 1.4.5 - superata da 1.4.6

Questa hotfix e' stata superata dalla 1.4.6. La 1.4.6 ripristina l'avvio automatico dell'emulatore da CLI, senza richiedere Android Studio aperto, e mantiene `-NoStartEmulator` come opzione manuale.

---

# Hotfix 1.4.5

## Obiettivo

Rendere `android-dev` non invasivo per evitare avvii duplicati dell'emulatore e popup `qemu`/`crashpad`.

## Modifica

- Aggiunto parametro `-StartEmulator`.
- `android-dev` non avvia piu' automaticamente `Pixel_8_Pro` se non trova device ADB.
- `android-dev -StartEmulator` mantiene il vecchio comportamento automatico.
- `android-build` continua ad avviare l'emulatore se necessario, perche' serve installare la Development Build.

## Uso consigliato

```powershell
.\baubook.ps1 -Mode web
.\baubook.ps1 -Mode android-build
.\baubook.ps1 -Mode android-dev
```

Se l'emulatore non e' gia' aperto:

```powershell
.\baubook.ps1 -Mode android-dev -NoStartEmulator
```
