param(
  [switch]$Strict
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectRoot

function Write-Section { param([string]$Message) Write-Host ""; Write-Host "=== $Message ===" -ForegroundColor Cyan }
function Write-Ok { param([string]$Message) Write-Host "OK   $Message" -ForegroundColor Green }
function Write-WarnLine { param([string]$Message) Write-Host "WARN $Message" -ForegroundColor Yellow }
function Write-Bad { param([string]$Message) Write-Host "MISS $Message" -ForegroundColor Red }
function Mask-Secret { param([string]$Value) if ([string]::IsNullOrWhiteSpace($Value)) { return "" } if ($Value.Length -le 12) { return "***" } return ($Value.Substring(0,6) + "..." + $Value.Substring($Value.Length-4)) }

function Read-DotEnv {
  $result = @{}
  if (-not (Test-Path ".env")) { return $result }

  foreach ($line in Get-Content ".env") {
    $trimmed = $line.Trim()
    if ($trimmed.Length -eq 0) { continue }
    if ($trimmed.StartsWith("#")) { continue }
    $idx = $trimmed.IndexOf("=")
    if ($idx -lt 1) { continue }
    $key = $trimmed.Substring(0, $idx).Trim()
    $value = $trimmed.Substring($idx + 1).Trim().Trim('"').Trim("'")
    $result[$key] = $value
  }

  return $result
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor DarkCyan
Write-Host " BauBook! :: Supabase doctor" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor DarkCyan

$errors = 0

Write-Section "File progetto"
if (Test-Path ".env.example") { Write-Ok ".env.example presente" } else { Write-Bad ".env.example mancante"; $errors++ }
if (Test-Path ".env") { Write-Ok ".env presente" } else { Write-WarnLine ".env non presente: copia .env.example in .env quando avrai URL e key Supabase" }
if (Test-Path "supabase/migrations/0001_initial_schema.sql") { Write-Ok "Migration 0001 schema presente" } else { Write-Bad "Migration 0001 schema mancante"; $errors++ }
if (Test-Path "supabase/migrations/0002_api_access_grants.sql") { Write-Ok "Migration 0002 API grants presente" } else { Write-Bad "Migration 0002 API grants mancante"; $errors++ }
if (Test-Path "supabase/migrations/0003_auth_profile_bootstrap.sql") { Write-Ok "Migration 0003 Auth presente" } else { Write-Bad "Migration 0003 Auth mancante"; $errors++ }
if (Test-Path "supabase/migrations/0004_walks_presence_bootstrap.sql") { Write-Ok "Migration 0004 Walks/Presence presente" } else { Write-Bad "Migration 0004 Walks/Presence mancante"; $errors++ }
if (Test-Path "supabase/migrations/0005_safety_alerts_bootstrap.sql") { Write-Ok "Migration 0005 Safety presente" } else { Write-Bad "Migration 0005 Safety mancante"; $errors++ }
if (Test-Path "supabase/seeds/venezia_mestre_demo.sql") { Write-Ok "Seed Venezia-Mestre presente" } else { Write-WarnLine "Seed demo non trovato" }

Write-Section "Variabili Supabase"
$envFile = Read-DotEnv
$url = $env:EXPO_PUBLIC_SUPABASE_URL
if (-not $url -and $envFile.ContainsKey("EXPO_PUBLIC_SUPABASE_URL")) { $url = $envFile["EXPO_PUBLIC_SUPABASE_URL"] }
$key = $env:EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
if (-not $key -and $envFile.ContainsKey("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY")) { $key = $envFile["EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] }
$legacyKey = $env:EXPO_PUBLIC_SUPABASE_ANON_KEY
if (-not $legacyKey -and $envFile.ContainsKey("EXPO_PUBLIC_SUPABASE_ANON_KEY")) { $legacyKey = $envFile["EXPO_PUBLIC_SUPABASE_ANON_KEY"] }
if (-not $key -and $legacyKey) { $key = $legacyKey }

if ($url) { Write-Ok "EXPO_PUBLIC_SUPABASE_URL = $url" } else { Write-WarnLine "EXPO_PUBLIC_SUPABASE_URL non configurato" }
if ($key) { Write-Ok "Supabase client key = $(Mask-Secret $key)" } else { Write-WarnLine "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY / ANON_KEY non configurata" }

Write-Section "Supabase CLI"
$supabase = Get-Command supabase -ErrorAction SilentlyContinue
if ($supabase) {
  Write-Ok "supabase CLI - $($supabase.Source)"
  try { & $supabase.Source --version } catch { Write-WarnLine "Impossibile leggere versione supabase CLI: $($_.Exception.Message)" }
} else {
  Write-WarnLine "supabase CLI non installata. Non serve per il primo setup via Dashboard, ma servira' quando useremo migrazioni push/link." 
}

Write-Section "Dipendenze app"
$deps = @(
  "@supabase/supabase-js",
  "@react-native-async-storage/async-storage",
  "react-native-url-polyfill"
)
foreach ($dep in $deps) {
  $packageJson = Join-Path "node_modules" (Join-Path $dep "package.json")
  if (Test-Path $packageJson) {
    try {
      $pkg = Get-Content $packageJson -Raw | ConvertFrom-Json
      Write-Ok "$dep $($pkg.version)"
    } catch {
      Write-Ok "$dep presente"
    }
  } else {
    Write-WarnLine "$dep non installato. Lo installeremo quando collegheremo Auth/DB dall'app."
  }
}

Write-Section "Prossimi passi"
Write-Host "1. Crea progetto Supabase: baubook-beta" -ForegroundColor Gray
Write-Host "2. Copia .env.example in .env e inserisci URL + publishable/anon key" -ForegroundColor Gray
Write-Host "3. Esegui SQL schema-ready: supabase/migrations/0001_initial_schema.sql nel SQL Editor" -ForegroundColor Gray
Write-Host "4. Esegui seed demo: supabase/seeds/venezia_mestre_demo.sql" -ForegroundColor Gray
Write-Host "5. Esegui API grants: supabase/migrations/0002_api_access_grants.sql" -ForegroundColor Gray
Write-Host "6. Esegui Auth bootstrap: supabase/migrations/0003_auth_profile_bootstrap.sql" -ForegroundColor Gray
Write-Host "7. Esegui Walks/Presence: supabase/migrations/0004_walks_presence_bootstrap.sql" -ForegroundColor Gray
Write-Host "8. Esegui Safety: supabase/migrations/0005_safety_alerts_bootstrap.sql" -ForegroundColor Gray
Write-Host "9. Apri app: Mappa, Setup, Passeggio e Aiuto devono leggere/scrivere dati live" -ForegroundColor Gray

if ($Strict -and $errors -gt 0) {
  throw "Supabase doctor ha rilevato $errors errore/i bloccante/i."
}

Write-Host ""
Write-Host "Supabase doctor completato." -ForegroundColor Green
