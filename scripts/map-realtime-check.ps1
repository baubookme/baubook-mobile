$ErrorActionPreference = "Stop"

function Pass($Message) { Write-Host ("OK   " + $Message) -ForegroundColor Green }
function Fail($Message) { Write-Host ("FAIL " + $Message) -ForegroundColor Red; $script:Failures++ }
function Warn($Message) { Write-Host ("WARN " + $Message) -ForegroundColor Yellow; $script:Warnings++ }

$script:Failures = 0
$script:Warnings = 0
$Root = (Get-Location).Path

Write-Host ""
Write-Host "============================================================"
Write-Host " BauBook! :: map realtime check"
Write-Host "============================================================"

$Snapshot = node -e "const fs=require('fs'); function read(f){return JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));} const pkg=read('package.json'); const app=read('app.json'); console.log(JSON.stringify({pkgVersion:pkg.version, expoVersion:app.expo.version, baseline:app.expo.extra&&app.expo.extra.baseline, androidVersionCode:app.expo.android&&app.expo.android.versionCode, iosBuildNumber:app.expo.ios&&app.expo.ios.buildNumber, hasScript: !!(pkg.scripts&&pkg.scripts['map:realtime:check'])}));"
$Info = $Snapshot | ConvertFrom-Json

if ($Info.pkgVersion -eq "0.3.2") { Pass "package.json version 0.3.2" } else { Fail ("package.json version attesa 0.3.2, trovata " + $Info.pkgVersion) }
if ($Info.expoVersion -eq "0.3.2") { Pass "app.json expo.version 0.3.2" } else { Fail ("app.json expo.version attesa 0.3.2, trovata " + $Info.expoVersion) }
if ($Info.baseline -eq "2.0.2") { Pass "extra.baseline 2.0.2" } else { Fail ("extra.baseline atteso 2.0.2, trovato " + $Info.baseline) }
if ([int]$Info.androidVersionCode -ge 15) { Pass "Android versionCode >= 15" } else { Fail ("Android versionCode atteso >= 15, trovato " + $Info.androidVersionCode) }
if ([string]$Info.iosBuildNumber -eq "15") { Pass "iOS buildNumber 15" } else { Fail ("iOS buildNumber atteso 15, trovato " + $Info.iosBuildNumber) }
if ($Info.hasScript) { Pass "script npm map:realtime:check presente" } else { Fail "script npm map:realtime:check mancante" }

$Hook = "src\shared\hooks\useSupabasePublicData.ts"
$Map = "src\features\map\MapScreen.tsx"
$Migration = "supabase\migrations\0009_map_realtime_publication.sql"

if (Test-Path $Hook) {
  $HookText = Get-Content -Path $Hook -Raw
  if ($HookText -match "channel\(" -and $HookText -match "postgres_changes" -and $HookText -match "MAP_REALTIME_TABLES") { Pass "useSupabasePlaces contiene subscription realtime" } else { Fail "useSupabasePlaces non contiene subscription realtime completa" }
  if ($HookText -match "setInterval" -and $HookText -match "polling") { Pass "fallback polling presente" } else { Fail "fallback polling mancante" }
} else {
  Fail "useSupabasePublicData.ts non trovato"
}

if (Test-Path $Map) {
  $MapText = Get-Content -Path $Map -Raw
  if ($MapText -match "realtimeStatus" -and $MapText -match "Mappa") { Pass "MapScreen espone stato realtime/polling" } else { Fail "MapScreen non espone stato realtime/polling" }
} else {
  Fail "MapScreen.tsx non trovato"
}

if (Test-Path $Migration) {
  $Sql = Get-Content -Path $Migration -Raw
  if ($Sql -match "supabase_realtime" -and $Sql -match "public\.places" -and $Sql -match "presence_sessions" -and $Sql -match "danger_reports") { Pass "migration realtime 0009 presente" } else { Fail "migration realtime 0009 incompleta" }
} else {
  Fail "migration 0009_map_realtime_publication.sql mancante"
}

if ($script:Warnings -gt 0) { Write-Host ("Warnings: " + $script:Warnings) -ForegroundColor Yellow }
if ($script:Failures -gt 0) { throw ("Map realtime check fallito con " + $script:Failures + " failure.") }

Pass "BauBook map realtime check completato"
