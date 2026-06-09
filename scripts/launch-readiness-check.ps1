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

function Write-Section {
  param([string]$Message)
  Write-Host ""
  Write-Host "=== $Message ===" -ForegroundColor Cyan
}

function Write-Ok {
  param([string]$Message)
  Write-Host "OK $Message" -ForegroundColor Green
}

function Write-WarnLine {
  param([string]$Message)
  $script:Warnings++
  Write-Host "WARN $Message" -ForegroundColor Yellow
}

function Write-FailLine {
  param([string]$Message)
  $script:Failures++
  Write-Host "FAIL $Message" -ForegroundColor Red
}

function Assert-File {
  param([string]$Path, [switch]$Required)
  if (Test-Path $Path) {
    Write-Ok "$Path presente"
    return $true
  }
  if ($Required -or $Strict) {
    Write-FailLine "$Path mancante"
  } else {
    Write-WarnLine "$Path mancante"
  }
  return $false
}

function Read-JsonFile {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    Write-FailLine "$Path mancante"
    return $null
  }
  try {
    return Get-Content $Path -Raw | ConvertFrom-Json
  } catch {
    Write-FailLine "$Path non e' JSON valido: $($_.Exception.Message)"
    return $null
  }
}

function Get-EnvExampleValue {
  param([string]$Key)
  if (-not (Test-Path ".env.example")) {
    return $null
  }
  foreach ($line in Get-Content ".env.example") {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) {
      continue
    }
    $idx = $trimmed.IndexOf("=")
    if ($idx -lt 1) {
      continue
    }
    $name = $trimmed.Substring(0, $idx).Trim()
    if ($name -eq $Key) {
      return $trimmed.Substring($idx + 1).Trim().Trim('"').Trim("'")
    }
  }
  return $null
}

function Invoke-CheckedCommand {
  param(
    [string]$Label,
    [scriptblock]$Command,
    [switch]$Required
  )
  Write-Host "RUN $Label" -ForegroundColor DarkGray
  try {
    & $Command
    if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) {
      throw "$Label exit code $LASTEXITCODE"
    }
    Write-Ok "$Label completato"
  } catch {
    if ($Required -or $Strict) {
      Write-FailLine "$Label fallito: $($_.Exception.Message)"
    } else {
      Write-WarnLine "$Label non completato: $($_.Exception.Message)"
    }
  }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor DarkCyan
Write-Host " BauBook! :: launch readiness check" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor DarkCyan

Write-Section "Baseline remota attesa"
Write-Host "Base prevista: v0.2.7-launch-readiness-sponsored-lite / BauBook 1.9.7" -ForegroundColor Gray
Write-Host "Blocco corrente: 1.9.8 Store Launch Hardening" -ForegroundColor Gray

Write-Section "Versioni e metadata"
$package = Read-JsonFile "package.json"
$app = Read-JsonFile "app.json"
if ($package) {
  if ($package.version -eq "0.2.8") { Write-Ok "package.json version 0.2.8" } else { Write-FailLine "package.json version attesa 0.2.8, trovata '$($package.version)'" }
  if ($package.scripts."launch:check") { Write-Ok "script npm launch:check presente" } else { Write-FailLine "script npm launch:check mancante" }
  if ($package.scripts."safety:smoke") { Write-Ok "script npm safety:smoke presente" } else { Write-FailLine "script npm safety:smoke mancante" }
}
if ($app -and $app.expo) {
  if ($app.expo.version -eq "0.2.8") { Write-Ok "app.json expo.version 0.2.8" } else { Write-FailLine "app.json expo.version attesa 0.2.8, trovata '$($app.expo.version)'" }
  if ($app.expo.android.versionCode -ge 11) { Write-Ok "Android versionCode >= 11" } else { Write-FailLine "Android versionCode deve essere >= 11" }
  if ($app.expo.ios.buildNumber -eq "11") { Write-Ok "iOS buildNumber 11" } else { Write-FailLine "iOS buildNumber atteso 11" }
  if ($app.expo.extra.baseline -eq "1.9.8") { Write-Ok "extra.baseline 1.9.8" } else { Write-FailLine "extra.baseline atteso 1.9.8" }
  if ($app.expo.extra.sponsoredLiteDefault -eq $false) { Write-Ok "Sponsored Lite default spento in metadata" } else { Write-WarnLine "Sponsored Lite default non risulta false" }
}
if ($package -and $app -and $app.expo) {
  if ($package.version -eq $app.expo.version) { Write-Ok "package/app version allineate" } else { Write-FailLine "package/app version non allineate" }
}

Write-Section "File e documentazione stabile"
Assert-File "README.md" -Required | Out-Null
Assert-File "docs/DEVELOPMENT.md" -Required | Out-Null
Assert-File "docs/SUPABASE_SETUP.md" -Required | Out-Null
Assert-File "docs/SCHEMA_OVERVIEW.md" -Required | Out-Null
Assert-File "docs/NEXT_STEPS.md" -Required | Out-Null
Assert-File "docs/LAUNCH_READINESS.md" -Required | Out-Null
Assert-File "store/metadata/it-IT/listing.md" -Required | Out-Null
Assert-File "store/legal/privacy-policy-draft-it.md" -Required | Out-Null
Assert-File "store/qa/release-candidate-checklist.md" -Required | Out-Null
$forbiddenDocs = Get-ChildItem "docs" -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^(HOTFIX|BASELINE)_.*\.md$' }
if ($forbiddenDocs.Count -eq 0) {
  Write-Ok "nessun HOTFIX_*.md o BASELINE_*.md in docs"
} else {
  Write-FailLine "trovati file vietati in docs: $($forbiddenDocs.Name -join ', ')"
}

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
  $value = Get-EnvExampleValue $key
  if ($null -ne $value) {
    Write-Ok "$key presente in .env.example"
  } else {
    Write-FailLine "$key mancante in .env.example"
  }
}
if ((Get-EnvExampleValue "EXPO_PUBLIC_BAUBOOK_SPONSORED_LITE_ENABLED") -eq "false") {
  Write-Ok "Sponsored Lite spento di default in .env.example"
} else {
  Write-WarnLine "EXPO_PUBLIC_BAUBOOK_SPONSORED_LITE_ENABLED dovrebbe essere false di default"
}

Write-Section "Asset store e app shell"
$assets = @(
  "assets/icon.png",
  "assets/splash-icon.png",
  "assets/favicon.png",
  "assets/android-icon-foreground.png",
  "assets/android-icon-background.png",
  "assets/android-icon-monochrome.png"
)
foreach ($asset in $assets) {
  Assert-File $asset -Required | Out-Null
}

Write-Section "Supabase, safety e sponsored lite"
$requiredSql = @(
  "supabase/migrations/0001_initial_schema.sql",
  "supabase/migrations/0002_api_access_grants.sql",
  "supabase/migrations/0003_auth_profile_bootstrap.sql",
  "supabase/migrations/0004_walks_presence_bootstrap.sql",
  "supabase/migrations/0005_safety_alerts_bootstrap.sql",
  "supabase/seeds/venezia_mestre_demo.sql"
)
foreach ($sql in $requiredSql) {
  Assert-File $sql -Required | Out-Null
}
Assert-File "scripts/supabase-doctor.ps1" -Required | Out-Null
Assert-File "scripts/safety-smoke-check.ps1" -Required | Out-Null

Write-Section "Privacy, account deletion e store gates"
$privacyDraft = if (Test-Path "store/legal/privacy-policy-draft-it.md") { Get-Content "store/legal/privacy-policy-draft-it.md" -Raw } else { "" }
foreach ($needle in @("Dati account", "Dati cane", "Passeggiate", "Safety", "Eliminazione account", "Sponsored")) {
  if ($privacyDraft -match [regex]::Escape($needle)) {
    Write-Ok "privacy draft copre: $needle"
  } else {
    Write-FailLine "privacy draft non copre: $needle"
  }
}
$listing = if (Test-Path "store/metadata/it-IT/listing.md") { Get-Content "store/metadata/it-IT/listing.md" -Raw } else { "" }
foreach ($needle in @("BauBook!", "Venezia-Mestre", "sicurezza", "community", "sponsorizzati")) {
  if ($listing -match [regex]::Escape($needle)) {
    Write-Ok "listing copre: $needle"
  } else {
    Write-FailLine "listing non copre: $needle"
  }
}

Write-Section "Comandi tecnici"
if (-not $SkipTypecheck) {
  Invoke-CheckedCommand "npm run typecheck" { npm run typecheck } -Required:$Strict
} else {
  Write-WarnLine "typecheck saltato"
}
if (-not $SkipSafetySmoke) {
  if (Test-Path ".env") {
    Invoke-CheckedCommand "npm run safety:smoke" { npm run safety:smoke } -Required:$Strict
  } else {
    Write-WarnLine ".env non presente: safety smoke live saltato"
  }
} else {
  Write-WarnLine "safety smoke saltato"
}
if (-not $SkipExport -and $Strict) {
  Invoke-CheckedCommand "npm run export:web:prod" { npm run export:web:prod } -Required
} elseif ($SkipExport) {
  Write-WarnLine "export web saltato"
}

Write-Section "Risultato"
Write-Host "Warnings: $script:Warnings" -ForegroundColor Yellow
Write-Host "Failures: $script:Failures" -ForegroundColor $(if ($script:Failures -eq 0) { "Green" } else { "Red" })
if ($script:Failures -gt 0) {
  throw "Launch readiness check fallito con $script:Failures failure."
}
Write-Host "BauBook launch readiness check completato." -ForegroundColor Green
