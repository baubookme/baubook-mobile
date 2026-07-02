$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\baubook"
$AndroidDir = Join-Path $ProjectRoot "android"

$KeystorePath = Join-Path $AndroidDir "app\baubook-upload-key.jks"
$GradlePropertiesPath = Join-Path $AndroidDir "gradle.properties"

# Backup fuori dalla cartella android, così sopravvive anche a prebuild/clean.
$TmpDir = Join-Path $ProjectRoot ".tmp"
$BackupRoot = Join-Path $TmpDir "signing-backup"
$LatestBackupDir = Join-Path $BackupRoot "latest"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Message)
    Write-Host "OK  $Message" -ForegroundColor Green
}

function Ensure-Directory {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path | Out-Null
    }
}

function Restore-If-Missing {
    param(
        [string]$FilePath,
        [string]$BackupFileName,
        [string]$Label
    )

    if (Test-Path $FilePath) {
        Write-Ok "$Label presente: $FilePath"
        return
    }

    $backupPath = Join-Path $LatestBackupDir $BackupFileName

    if (-not (Test-Path $backupPath)) {
        throw "$Label mancante e backup non trovato: $backupPath"
    }

    Write-Step "$Label mancante: ripristino dal backup"
    Copy-Item $backupPath $FilePath -Force
    Write-Ok "$Label ripristinato: $FilePath"
}

function Backup-File {
    param(
        [string]$FilePath,
        [string]$BackupFileName,
        [string]$TimestampDir,
        [string]$Label
    )

    if (-not (Test-Path $FilePath)) {
        throw "$Label non trovato: $FilePath"
    }

    Copy-Item $FilePath (Join-Path $LatestBackupDir $BackupFileName) -Force
    Copy-Item $FilePath (Join-Path $TimestampDir $BackupFileName) -Force

    Write-Ok "$Label salvato in backup"
}

Write-Step "Preparo cartelle backup"
Ensure-Directory $BackupRoot
Ensure-Directory $LatestBackupDir

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$TimestampBackupDir = Join-Path $BackupRoot $timestamp
Ensure-Directory $TimestampBackupDir

Write-Step "Se mancano i file di firma, provo a ripristinarli dal backup"
Restore-If-Missing `
  -FilePath $KeystorePath `
  -BackupFileName "baubook-upload-key.jks" `
  -Label "Keystore upload"

Restore-If-Missing `
  -FilePath $GradlePropertiesPath `
  -BackupFileName "gradle.properties" `
  -Label "gradle.properties"

Write-Step "Backup preventivo dei file di firma"
Backup-File `
  -FilePath $KeystorePath `
  -BackupFileName "baubook-upload-key.jks" `
  -TimestampDir $TimestampBackupDir `
  -Label "Keystore upload"

Backup-File `
  -FilePath $GradlePropertiesPath `
  -BackupFileName "gradle.properties" `
  -TimestampDir $TimestampBackupDir `
  -Label "gradle.properties"

Write-Step "Creo AAB release"
Set-Location $AndroidDir

Write-Host "RUN cd C:\baubook\android" -ForegroundColor DarkGray
Write-Host "RUN .\gradlew :app:bundleRelease --no-daemon" -ForegroundColor DarkGray

.\gradlew :app:bundleRelease --no-daemon

$AabPath = Join-Path $AndroidDir "app\build\outputs\bundle\release\app-release.aab"

if (-not (Test-Path $AabPath)) {
    throw "AAB non trovato dopo la build: $AabPath"
}

Write-Step "AAB creato"
Write-Ok $AabPath

Write-Step "Backup usato"
Write-Ok "Latest: $LatestBackupDir"
Write-Ok "Snapshot: $TimestampBackupDir"