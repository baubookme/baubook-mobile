param(
  [string]$ProjectRoot = (Get-Location).Path,
  [switch]$Strict
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host "[BauBook Safety Smoke] $Message"
}

function Import-DotEnv([string]$Path) {
  if (-not (Test-Path $Path)) {
    return
  }

  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
      return
    }

    $match = [regex]::Match($line, '^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$')
    if (-not $match.Success) {
      return
    }

    $name = $match.Groups[1].Value
    $value = $match.Groups[2].Value.Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    if (-not [Environment]::GetEnvironmentVariable($name, "Process")) {
      [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
  }
}

$root = Resolve-Path $ProjectRoot
Set-Location $root

$packagePath = Join-Path $root "package.json"
if (-not (Test-Path $packagePath)) {
  throw "package.json non trovato. Avvia lo script dalla root del repository BauBook."
}

$package = Get-Content $packagePath -Raw | ConvertFrom-Json
if (-not $package.dependencies."@supabase/supabase-js") {
  Write-Step "Nota: @supabase/supabase-js non risulta nelle dependencies. Lo smoke check usa REST diretto e prosegue."
}

Import-DotEnv (Join-Path $root ".env")

if (-not $env:EXPO_PUBLIC_SUPABASE_URL) {
  throw "EXPO_PUBLIC_SUPABASE_URL mancante. Controlla .env o variabili ambiente."
}

if (-not $env:EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  throw "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY mancante. Controlla .env o variabili ambiente."
}

$nodeVersion = & node --version 2>$null
if (-not $nodeVersion) {
  throw "Node non disponibile nel PATH."
}

Write-Step "Root: $root"
Write-Step "Node: $nodeVersion"
Write-Step "Supabase URL configurato: $($env:EXPO_PUBLIC_SUPABASE_URL)"
Write-Step "Client smoke: REST diretto Supabase, senza Realtime/WebSocket"

$tempDir = Join-Path $root ".tmp"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
$tempFile = Join-Path $tempDir ("baubook-safety-smoke-" + [Guid]::NewGuid().ToString("N") + ".mjs")
$strictJs = if ($Strict) { "true" } else { "false" }

$js = @"
const strict = $strictJs;
const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!baseUrl || !key) {
  console.error('FAIL Variabili Supabase mancanti nel processo Node');
  process.exit(1);
}

let failures = 0;
let warnings = 0;

const requiredReadableTables = new Set(['places', 'feature_flags', 'app_config']);
const tables = [
  'places',
  'feature_flags',
  'app_config',
  'walk_plans',
  'community_events',
  'presence_sessions',
  'lost_dog_alerts',
  'lost_dog_sightings',
  'danger_reports',
  'reports',
  'audit_logs',
];

function ok(message) {
  console.log('OK   ' + message);
}

function warn(message) {
  warnings += 1;
  console.warn('WARN ' + message);
}

function fail(message) {
  failures += 1;
  console.error('FAIL ' + message);
}

function buildRestUrl(tableName) {
  const root = baseUrl.replace(/\/$/, '');
  return root + '/rest/v1/' + encodeURIComponent(tableName) + '?select=*&limit=1';
}

async function checkTable(tableName) {
  let response;
  try {
    response = await fetch(buildRestUrl(tableName), {
      method: 'GET',
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + key,
        Prefer: 'count=exact',
      },
    });
  } catch (error) {
    const message = tableName + ': ' + (error && error.message ? error.message : String(error));
    if (requiredReadableTables.has(tableName) || strict) {
      fail(message);
    } else {
      warn(message + ' (errore rete o fetch)');
    }
    return;
  }

  if (!response.ok) {
    let details = '';
    try {
      const body = await response.text();
      details = body ? ' | ' + body.slice(0, 300) : '';
    } catch {
      details = '';
    }

    const message = tableName + ': HTTP ' + response.status + ' ' + response.statusText + details;
    if (requiredReadableTables.has(tableName) || strict) {
      fail(message);
    } else {
      warn(message + ' (possibile RLS corretta per dati sensibili)');
    }
    return;
  }

  const contentRange = response.headers.get('content-range');
  ok(tableName + ' raggiungibile' + (contentRange ? ' | content-range=' + contentRange : ''));
}

console.log('[BauBook Safety Smoke] Check tabelle Supabase');
for (const table of tables) {
  await checkTable(table);
}

console.log('[BauBook Safety Smoke] Riepilogo: ' + failures + ' fail, ' + warnings + ' warning');
if (failures > 0) {
  process.exit(1);
}
"@

Set-Content -Path $tempFile -Value $js -Encoding UTF8
try {
  & node $tempFile
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    throw "Safety smoke check fallito con exit code $exitCode."
  }
}
finally {
  Remove-Item $tempFile -ErrorAction SilentlyContinue
}

Write-Step "Completato. Per test mutanti safety usa UI app con utente autenticato, cane e luogo Supabase live."
