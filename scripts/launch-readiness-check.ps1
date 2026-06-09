param(
  [switch]$Strict,
  [switch]$SkipTypecheck,
  [switch]$SkipSafetySmoke,
  [switch]$SkipExport
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectRoot

$script:Failures = 0
$script:Warnings = 0

function Write-Section { param([string]$Message) Write-Host ""; Write-Host "=== $Message ===" -ForegroundColor Cyan }
function Write-Ok { param([string]$Message) Write-Host "OK $Message" -ForegroundColor Green }
function Write-WarnLine { param([string]$Message) $script:Warnings++; Write-Host "WARN $Message" -ForegroundColor Yellow }
function Write-FailLine { param([string]$Message) $script:Failures++; Write-Host "FAIL $Message" -ForegroundColor Red }

function Assert-File {
  param([string]$Path, [switch]$Required)
  if (Test-Path $Path) { Write-Ok "$Path presente"; return $true }
  if ($Required -or $Strict) { Write-FailLine "$Path mancante" } else { Write-WarnLine "$Path mancante" }
  return $false
}

function Read-JsonFile {
  param([string]$Path)
  if (-not (Test-Path $Path)) { Write-FailLine "$Path mancante"; return $null }
  try { return Get-Content $Path -Raw | ConvertFrom-Json }
  catch { Write-FailLine "$Path non e' JSON valido: $($_.Exception.Message)"; return $null }
}

function Get-EnvExampleValue {
  param([string]$Key)
  if (-not (Test-Path ".env.example")) { return $null }
  foreach ($line in Get-Content ".env.example") {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
    $idx = $trimmed.IndexOf("=")
    if ($idx -lt 1) { continue }
    $name = $trimmed.Substring(0, $idx).Trim()
    if ($name -eq $Key) { return $trimmed.Substring($idx + 1).Trim().Trim('"').Trim("'") }
  }
  return $null
}

function Invoke-CheckedCommand {
  param([string]$Label, [scriptblock]$Command, [switch]$Required)
  Write-Host "RUN $Label" -ForegroundColor DarkGray
  try {
    & $Command
    if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) { throw "$Label exit code $LASTEXITCODE" }
    Write-Ok "$Label completato"
  } catch {
    if ($Required -or $Strict) { Write-FailLine "$Label fallito: $($_.Exception.Message)" }
    else { Write-WarnLine "$Label non completato: $($_.Exception.Message)" }
  }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor DarkCyan
Write-Host " BauBook! :: launch readiness check" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor DarkCyan

Write-Section "Versioni e metadata"
$package = Read-JsonFile "package.json"
$app = Read-JsonFile "app.json"

if ($package) {
  if ($package.version -eq "0.3.2") { Write-Ok "package.json version 0.3.2" } else { Write-FailLine "package.json version attesa 0.3.2, trovata '$($package.version)'" }
  foreach ($scriptName in @("launch:check", "launch:check:strict", "docs:check", "beta:check", "safety:smoke")) {
    if ($package.scripts.$scriptName) { Write-Ok "script npm $scriptName presente" } else { Write-FailLine "script npm $scriptName mancante" }
  }
}

if ($app -and $app.expo) {
  if ($app.expo.version -eq "0.3.2") { Write-Ok "app.json expo.version 0.3.2" } else { Write-FailLine "app.json expo.version attesa 0.3.2, trovata '$($app.expo.version)'" }
  if ($app.expo.android.versionCode -ge 15) { Write-Ok "Android versionCode >= 15" } else { Write-FailLine "Android versionCode deve essere >= 13" }
  if ($app.expo.ios.buildNumber -eq "15") { Write-Ok "iOS buildNumber 15" } else { Write-FailLine "iOS buildNumber atteso 15" }
  if ($app.expo.extra.baseline -eq "2.0.2") { Write-Ok "extra.baseline 2.0.2" } else { Write-FailLine "extra.baseline atteso 2.0.2" }
  if ($app.expo.extra.sponsoredLiteDefault -eq $false) { Write-Ok "Sponsored Lite default spento in metadata" } else { Write-WarnLine "Sponsored Lite default non risulta false" }
}

if ($package -and $app -and $app.expo) {
  if ($package.version -eq $app.expo.version) { Write-Ok "package/app version allineate" } else { Write-FailLine "package/app version non allineate" }
}

Write-Section "Documentazione compatta"
Assert-File "README.md" -Required | Out-Null
foreach ($doc in @("docs/DEVELOPMENT.md", "docs/SCHEMA_DB.md", "docs/README_VERSIONING.md")) { Assert-File $doc -Required | Out-Null }
foreach ($oldDoc in @("docs/SUPABASE_SETUP.md", "docs/SCHEMA_OVERVIEW.md", "docs/NEXT_STEPS.md", "docs/LAUNCH_READINESS.md")) {
  if (Test-Path $oldDoc) { Write-FailLine "$oldDoc dovrebbe essere stato compattato/rimosso" } else { Write-Ok "$oldDoc rimosso" }
}
$forbiddenDocs = Get-ChildItem "docs" -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^(HOTFIX|BASELINE)_.*\.md$' }
if ($forbiddenDocs.Count -eq 0) { Write-Ok "nessun HOTFIX_*.md o BASELINE_*.md in docs" } else { Write-FailLine "trovati file vietati in docs: $($forbiddenDocs.Name -join ', ')" }

Write-Section "Environment pubblico"
Assert-File ".env.example" -Required | Out-Null
$requiredEnvKeys = @(
  "EXPO_PUBLIC_APP_ENV",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY",
  "EXPO_PUBLIC_BAUBOOK_SPONSORED_LITE_ENABLED",
  "EXPO_PUBLIC_BAUBOOK_CONTACT_EMAIL",
  "EXPO_PUBLIC_BAUBOOK_PRIVACY_URL",
  "EXPO_PUBLIC_BAUBOOK_TERMS_URL",
  "EXPO_PUBLIC_BAUBOOK_DELETE_ACCOUNT_URL"
)
foreach ($key in $requiredEnvKeys) {
  if ($null -ne (Get-EnvExampleValue $key)) { Write-Ok "$key presente in .env.example" } else { Write-FailLine "$key mancante in .env.example" }
}
if ((Get-EnvExampleValue "EXPO_PUBLIC_BAUBOOK_SPONSORED_LITE_ENABLED") -eq "false") { Write-Ok "Sponsored Lite spento di default in .env.example" } else { Write-WarnLine "EXPO_PUBLIC_BAUBOOK_SPONSORED_LITE_ENABLED dovrebbe essere false di default" }

Write-Section "Asset, store e Supabase"
foreach ($path in @(
  "assets/icon.png",
  "assets/splash-icon.png",
  "assets/favicon.png",
  "assets/android-icon-foreground.png",
  "assets/android-icon-background.png",
  "assets/android-icon-monochrome.png",
  "store/metadata/it-IT/listing.md",
  "store/legal/privacy-policy-draft-it.md",
  "store/qa/release-candidate-checklist.md",
  "scripts/supabase-doctor.ps1",
  "scripts/safety-smoke-check.ps1",
  "scripts/docs-structure-check.ps1"
)) { Assert-File $path -Required | Out-Null }
foreach ($sql in @(
  "supabase/migrations/0001_initial_schema.sql",
  "supabase/migrations/0002_api_access_grants.sql",
  "supabase/migrations/0003_auth_profile_bootstrap.sql",
  "supabase/migrations/0004_walks_presence_bootstrap.sql",
  "supabase/migrations/0005_safety_alerts_bootstrap.sql",
  "supabase/migrations/0006_official_venice_dog_areas.sql",
  "supabase/migrations/0007_geocoded_dog_area_radius_search.sql",
  "supabase/migrations/0008_launch_readiness_native_sponsored_slots.sql",
  "supabase/seeds/venezia_mestre_demo.sql"
)) { Assert-File $sql -Required | Out-Null }

Write-Section "Comandi tecnici"
Invoke-CheckedCommand "npm run docs:check" { npm run docs:check } -Required
if (-not $SkipTypecheck) { Invoke-CheckedCommand "npm run typecheck" { npm run typecheck } -Required:$Strict } else { Write-WarnLine "typecheck saltato" }
if (-not $SkipSafetySmoke) {
  if (Test-Path ".env") { Invoke-CheckedCommand "npm run safety:smoke" { npm run safety:smoke } -Required:$Strict } else { Write-WarnLine ".env non presente: safety smoke live saltato" }
} else { Write-WarnLine "safety smoke saltato" }
if (-not $SkipExport -and $Strict) { Invoke-CheckedCommand "npm run export:web:prod" { npm run export:web:prod } -Required } elseif ($SkipExport) { Write-WarnLine "export web saltato" }

Write-Section "Risultato"
Write-Host "Warnings: $script:Warnings" -ForegroundColor Yellow
Write-Host "Failures: $script:Failures" -ForegroundColor $(if ($script:Failures -eq 0) { "Green" } else { "Red" })
if ($script:Failures -gt 0) { throw "Launch readiness check fallito con $script:Failures failure." }
Write-Host "BauBook launch readiness check completato." -ForegroundColor Green



