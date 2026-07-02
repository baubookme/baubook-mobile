param(
    [switch]$Clean,
    [string]$Ip,
    [string]$Port
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$AndroidDir = Join-Path $ProjectRoot "android"
$ApkPath = Join-Path $AndroidDir "app\build\outputs\apk\release\app-release.apk"
$PackageName = "me.baubook.app"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Message)
    Write-Host "OK  $Message" -ForegroundColor Green
}

function Find-Adb {
    $fromPath = Get-Command adb -ErrorAction SilentlyContinue
    if ($fromPath) {
        return $fromPath.Source
    }

    $candidate = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
    if (Test-Path $candidate) {
        return $candidate
    }

    throw "adb non trovato. Aggiungi Android SDK platform-tools al PATH o verifica Android Studio."
}

function Assert-AndroidProject {
    if (-not (Test-Path $AndroidDir)) {
        throw "Cartella android non trovata: $AndroidDir"
    }

    $gradlew = Join-Path $AndroidDir "gradlew.bat"
    if (-not (Test-Path $gradlew)) {
        throw "gradlew.bat non trovato in android. Apri il progetto corretto o rigenera android prima."
    }

    return $gradlew
}

function Get-Target {
    if ([string]::IsNullOrWhiteSpace($Ip)) {
        $Ip = Read-Host "IP del Moto"
    }

    if ([string]::IsNullOrWhiteSpace($Port)) {
        $Port = Read-Host "Porta debug Wi-Fi"
    }

    if ([string]::IsNullOrWhiteSpace($Ip) -or [string]::IsNullOrWhiteSpace($Port)) {
        throw "IP e porta sono obbligatori."
    }

    return "$Ip`:$Port"
}

function Show-AdbDevices {
    param([string]$Adb)

    Write-Step "ADB devices"
    & $Adb devices
}

$adb = Find-Adb
$gradlew = Assert-AndroidProject
$target = Get-Target

Write-Step "ADB trovato"
Write-Ok $adb

Write-Step "Build APK release con Gradle"
Push-Location $AndroidDir

if ($Clean) {
    Write-Host "RUN .\gradlew clean" -ForegroundColor DarkGray
    & $gradlew clean
}

Write-Host "RUN .\gradlew assembleRelease" -ForegroundColor DarkGray
& $gradlew assembleRelease

Pop-Location

if (-not (Test-Path $ApkPath)) {
    throw "APK release non trovato: $ApkPath"
}

Write-Ok "APK creato: $ApkPath"

Write-Step "Pulizia connessioni ADB Wi-Fi duplicate"
& $adb disconnect | Out-Null

Write-Step "Connessione al Moto"
Write-Host "RUN adb connect $target" -ForegroundColor DarkGray
$connectOutput = & $adb connect $target
$connectOutput | ForEach-Object { Write-Host $_ }

Show-AdbDevices $adb

$devices = & $adb devices
$deviceReady = $false

foreach ($line in $devices) {
    if ($line -match "^$([regex]::Escape($target))\s+device\s*$") {
        $deviceReady = $true
        break
    }
}

if (-not $deviceReady) {
    throw "Device $target non risulta pronto in adb devices. Controlla Debug wireless sul Moto e riprova."
}

Write-Ok "Device pronto: $target"

Write-Step "Install APK sul Moto"
Write-Host "RUN adb -s $target install -r `"$ApkPath`"" -ForegroundColor DarkGray

$installOutput = & $adb -s $target install -r $ApkPath 2>&1
$installText = $installOutput | Out-String

Write-Host $installText

if ($LASTEXITCODE -ne 0) {
    if ($installText -match "INSTALL_FAILED_UPDATE_INCOMPATIBLE|signatures do not match|different signature") {
        Write-Host ""
        Write-Host "Firma diversa rilevata. Disinstallo $PackageName e reinstallo..." -ForegroundColor Yellow

        & $adb -s $target uninstall $PackageName
        & $adb -s $target install $ApkPath

        if ($LASTEXITCODE -ne 0) {
            throw "Install fallita anche dopo uninstall."
        }

        Write-Ok "Install completata dopo uninstall/reinstall."
        exit 0
    }

    throw "Install fallita."
}

Write-Ok "Install completata."