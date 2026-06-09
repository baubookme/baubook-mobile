param()

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectRoot

$expectedDocs = @(
  "DEVELOPMENT.md",
  "SCHEMA_DB.md",
  "README_VERSIONING.md"
)
$failures = 0

function Ok($Message) { Write-Host "OK $Message" -ForegroundColor Green }
function Fail($Message) { $script:failures++; Write-Host "FAIL $Message" -ForegroundColor Red }

if (-not (Test-Path "docs")) { throw "docs folder mancante" }

foreach ($doc in $expectedDocs) {
  if (Test-Path (Join-Path "docs" $doc)) { Ok "docs/$doc presente" } else { Fail "docs/$doc mancante" }
}

$allowed = @{}
foreach ($doc in $expectedDocs) { $allowed[$doc] = $true }

$markdownDocs = Get-ChildItem "docs" -File -Filter "*.md" -ErrorAction SilentlyContinue
foreach ($file in $markdownDocs) {
  if (-not $allowed.ContainsKey($file.Name)) { Fail "docs/$($file.Name) non fa parte della documentazione compatta" }
}

$forbidden = Get-ChildItem "docs" -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^(HOTFIX|BASELINE)_.*\.md$' }
if ($forbidden.Count -eq 0) { Ok "nessun HOTFIX_*.md o BASELINE_*.md" } else { Fail "file vietati: $($forbidden.Name -join ', ')" }

$dev = Get-Content "docs/DEVELOPMENT.md" -Raw
foreach ($needle in @("Supabase", ".env", "EXPO_PUBLIC", "Android", "launch:check", "Sponsored Places Lite")) {
  if ($dev -match [regex]::Escape($needle)) { Ok "DEVELOPMENT copre $needle" } else { Fail "DEVELOPMENT non copre $needle" }
}

$schema = Get-Content "docs/SCHEMA_DB.md" -Raw
foreach ($needle in @("0001_initial_schema.sql", "0008_launch_readiness_native_sponsored_slots.sql", "RLS", "RPC", "Safety", "Sponsored Lite")) {
  if ($schema -match [regex]::Escape($needle)) { Ok "SCHEMA_DB copre $needle" } else { Fail "SCHEMA_DB non copre $needle" }
}

$versioning = Get-Content "docs/README_VERSIONING.md" -Raw
foreach ($needle in @("v0.3.2-live-map-realtime-radar", "main", "package-lock.json", "HOTFIX", "BASELINE")) {
  if ($versioning -match [regex]::Escape($needle)) { Ok "README_VERSIONING copre $needle" } else { Fail "README_VERSIONING non copre $needle" }
}

if ($failures -gt 0) { throw "Docs structure check fallito con $failures failure." }
Write-Host "BauBook docs structure check completato." -ForegroundColor Green

