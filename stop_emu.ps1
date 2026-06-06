$ErrorActionPreference = "Continue"
Write-Host "Spengo emulatori Android visibili ad ADB" -ForegroundColor Cyan
$devices = adb devices | Select-String "emulator-"
foreach ($device in $devices) {
  $serial = ($device -split "\s+")[0]
  if ($serial) {
    Write-Host "adb -s $serial emu kill"
    adb -s $serial emu kill
  }
}
Write-Host "Fatto." -ForegroundColor Green
