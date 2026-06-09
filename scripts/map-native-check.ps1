$ErrorActionPreference = "Stop"

$script:Failures = 0

function Ok($Message) {
  Write-Host ("OK   " + $Message) -ForegroundColor Green
}

function Fail($Message) {
  Write-Host ("FAIL " + $Message) -ForegroundColor Red
  $script:Failures++
}

function HasText($Path, $Pattern) {
  if (!(Test-Path $Path)) {
    return $false
  }

  return [bool](Select-String -Path $Path -SimpleMatch $Pattern -Quiet)
}

Write-Host ""
Write-Host "============================================================"
Write-Host " BauBook! :: native map check"
Write-Host "============================================================"

$pkg = Get-Content package.json -Raw | ConvertFrom-Json
$app = Get-Content app.json -Raw | ConvertFrom-Json

if ($pkg.version -eq "0.3.3") { Ok "package.json version 0.3.3" } else { Fail "package.json version attesa 0.3.3, trovata $($pkg.version)" }
if ($app.expo.version -eq "0.3.3") { Ok "app.json expo.version 0.3.3" } else { Fail "app.json expo.version attesa 0.3.3, trovata $($app.expo.version)" }
if ($app.expo.extra.baseline -eq "2.0.3") { Ok "extra.baseline 2.0.3" } else { Fail "extra.baseline atteso 2.0.3, trovato $($app.expo.extra.baseline)" }
if ([int]$app.expo.android.versionCode -ge 16) { Ok "Android versionCode >= 16" } else { Fail "Android versionCode atteso >= 16" }
if ([string]$app.expo.ios.buildNumber -eq "16") { Ok "iOS buildNumber 16" } else { Fail "iOS buildNumber atteso 16, trovato $($app.expo.ios.buildNumber)" }

$hasMaps = $false
if ($pkg.dependencies.'react-native-maps') {
  $hasMaps = $true
}
if ($hasMaps) { Ok "react-native-maps presente in dependencies ($($pkg.dependencies.'react-native-maps'))" } else { Fail "react-native-maps assente dalle dependencies" }

$nativeMap = "src\features\map\NativePlacesMap.tsx"
$mapScreen = "src\features\map\MapScreen.tsx"

if (Test-Path $nativeMap) { Ok "NativePlacesMap.tsx presente" } else { Fail "NativePlacesMap.tsx assente" }

if (HasText $nativeMap "react-native-maps") { Ok "NativePlacesMap importa react-native-maps" } else { Fail "NativePlacesMap non importa react-native-maps" }
if (HasText $nativeMap "MapView") { Ok "NativePlacesMap renderizza MapView" } else { Fail "MapView non trovato" }
if (HasText $nativeMap "Marker") { Ok "NativePlacesMap renderizza Marker" } else { Fail "Marker non trovato" }
if (HasText $nativeMap "Callout") { Ok "NativePlacesMap renderizza Callout" } else { Fail "Callout non trovato" }
if (HasText $nativeMap "coordinate valide") { Ok "fallback marker/coordinate presente" } else { Fail "fallback marker/coordinate non trovato" }
if (HasText $nativeMap "onRefresh?:") { Ok "NativePlacesMap accetta onRefresh" } else { Fail "NativePlacesMap non accetta onRefresh" }

if (HasText $mapScreen "NativePlacesMap") { Ok "MapScreen integra NativePlacesMap" } else { Fail "MapScreen non integra NativePlacesMap" }
if (HasText $mapScreen "realtimeStatus") { Ok "MapScreen conserva realtimeStatus" } else { Fail "MapScreen non passa realtimeStatus" }

if ($script:Failures -gt 0) {
  throw "Native map check fallito con $script:Failures failure."
}

Ok "BauBook native map check completato"
