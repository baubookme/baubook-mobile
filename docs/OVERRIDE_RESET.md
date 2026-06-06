# Override totale cartella baubook

Procedura consigliata:

```powershell
cd C:\
ren baubook baubook_backup_pre_1_4
```

Scompatta lo ZIP in:

```txt
C:\baubook
```

Poi:

```powershell
cd C:\baubook
.\scripts\install-clean.ps1
.\baubook.ps1 -Mode web
```

Quando il browser e' ok:

```powershell
.\baubook.ps1 -Mode android-build
```

Non copiare `node_modules`, `.expo`, `android/build`, `.env` o chiavi dentro il nuovo workspace.
