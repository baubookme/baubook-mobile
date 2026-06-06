param([string]$AvdName = "Pixel_8_Pro")

$ErrorActionPreference = "Continue"
Write-Host "Reset leggero Android/ADB" -ForegroundColor Cyan
adb start-server
adb devices -l
adb reverse --remove-all
adb reverse tcp:8081 tcp:8081
Write-Host "Fatto. Per BauBook usa Development Build: .\baubook.ps1 -Mode android-build" -ForegroundColor Green
Write-Host "Expo Go resta disponibile solo come legacy: .\baubook.ps1 -Mode android-go" -ForegroundColor Yellow
