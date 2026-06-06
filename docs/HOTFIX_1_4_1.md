# BauBook 1.4.1 Hotfix

Correzione script PowerShell per il controllo Java/JDK.

`java -version` scrive intenzionalmente su stderr anche in caso di successo; PowerShell può trasformare quell'output in `NativeCommandError` quando `$ErrorActionPreference = "Stop"`.

La hotfix usa `System.Diagnostics.ProcessStartInfo` con stdout/stderr rediretti e parsing esplicito della versione Java.

Comandi consigliati:

```powershell
.\baubook.ps1 -Mode doctor
.\baubook.ps1 -Mode android-build
```
