param(
  [ValidateSet("web", "android-build", "android-dev", "android-go", "doctor", "supabase-doctor", "install", "clean", "typecheck", "export-web", "stop-emulator")]
  [string]$Mode = "web",

  [ValidateSet("lan", "localhost")]
  [string]$HostMode = "lan",

  [string]$AvdName = "Pixel_8_Pro",
  [switch]$Clear,
  [switch]$CleanPrebuild,
  [switch]$SkipTypecheck,
  [switch]$NoInstall,
  [switch]$NoStartEmulator,

  [ValidateSet("swiftshader_indirect", "host", "angle_indirect", "auto")]
  [string]$EmulatorGpu = "swiftshader_indirect"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

function Write-Title {
  param([string]$Message)
  Write-Host ""
  Write-Host "============================================================" -ForegroundColor DarkCyan
  Write-Host " BauBook! :: $Message" -ForegroundColor Cyan
  Write-Host "============================================================" -ForegroundColor DarkCyan
}

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok {
  param([string]$Message)
  Write-Host "OK  $Message" -ForegroundColor Green
}

function Write-WarnLine {
  param([string]$Message)
  Write-Host "WARN $Message" -ForegroundColor Yellow
}

function Write-Run {
  param([string]$CommandLine)
  Write-Host "RUN $CommandLine" -ForegroundColor DarkGray
}

function Invoke-Logged {
  param([scriptblock]$Block, [string]$CommandLine)
  if ($CommandLine) { Write-Run $CommandLine }
  & $Block
}

function Assert-Command {
  param([string]$CommandName)
  $cmd = Get-Command $CommandName -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "Command not found: $CommandName. Install it or add it to PATH, then reopen WebStorm/PowerShell."
  }
  return $cmd.Source
}

function Find-AndroidTool {
  param([string]$ToolName, [string[]]$RelativeCandidates)

  $roots = @()
  if ($env:ANDROID_HOME) { $roots += $env:ANDROID_HOME }
  if ($env:ANDROID_SDK_ROOT) { $roots += $env:ANDROID_SDK_ROOT }
  if ($env:LOCALAPPDATA) { $roots += (Join-Path $env:LOCALAPPDATA "Android\Sdk") }
  $roots += "C:\AndroidSDK"

  foreach ($root in $roots | Select-Object -Unique) {
    foreach ($relative in $RelativeCandidates) {
      $candidate = Join-Path $root $relative
      if (Test-Path $candidate) { return $candidate }
    }
  }

  $fromPath = Get-Command $ToolName -ErrorAction SilentlyContinue
  if ($fromPath) { return $fromPath.Source }

  throw "Android tool not found: $ToolName. Check Android Studio SDK, ANDROID_HOME, ANDROID_SDK_ROOT or C:\AndroidSDK."
}

function Get-JavaVersionOutput {
  $java = Get-Command java -ErrorAction SilentlyContinue
  if (-not $java) { return $null }

  $psi = [System.Diagnostics.ProcessStartInfo]::new()
  $psi.FileName = $java.Source
  $psi.Arguments = "-version"
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true

  $process = [System.Diagnostics.Process]::new()
  $process.StartInfo = $psi
  [void]$process.Start()
  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  return ($stdout + "`n" + $stderr).Trim()
}

function Get-JavaMajorVersion {
  $output = Get-JavaVersionOutput
  if (-not $output) { return $null }

  if ($output -match 'version "(?<ver>\d+)(\.(?<minor>\d+))?') {
    $major = [int]$Matches['ver']
    if ($major -eq 1 -and $Matches['minor']) {
      return [int]$Matches['minor']
    }
    return $major
  }
  return $null
}
function Assert-Jdk17 {
  Write-Step "Controllo JDK per Gradle/Android"
  $major = Get-JavaMajorVersion
  if (-not $major) {
    throw "Java/JDK non trovato. Installa Temurin JDK 17: winget install EclipseAdoptium.Temurin.17.JDK, poi riapri WebStorm."
  }
  if ($major -lt 17) {
    throw "JDK troppo vecchio: trovato Java $major. Gradle richiede 17+. Installa Temurin JDK 17 o imposta JAVA_HOME su un JDK 17/21."
  }
  Write-Ok "Java major version: $major"
  if ($env:JAVA_HOME) { Write-Ok "JAVA_HOME: $env:JAVA_HOME" } else { Write-WarnLine "JAVA_HOME non impostato, ma java e' nel PATH." }
}

function Assert-PublicNpmRegistry {
  if (Test-Path "package-lock.json") {
    $lock = Get-Content "package-lock.json" -Raw
    if ($lock -match "applied-caas|artifactory") {
      throw "package-lock.json punta a un registry interno non pubblico. Esegui: .\scripts\install-clean.ps1"
    }
  }
  if (Test-Path ".npmrc") {
    $npmrc = Get-Content ".npmrc" -Raw
    if ($npmrc -notmatch "registry=https://registry.npmjs.org/") {
      Write-WarnLine ".npmrc non forza il registry pubblico npm. Lo script install-clean lo sistemera'."
    }
  }
}

function Ensure-Dependencies {
  Assert-Command "node" | Out-Null
  Assert-Command "npm" | Out-Null
  Assert-PublicNpmRegistry

  if ($NoInstall) {
    Write-WarnLine "Installazione dipendenze saltata per -NoInstall."
    return
  }

  if (-not (Test-Path "node_modules")) {
    Write-Step "node_modules non presente: eseguo install pulito"
    .\scripts\install-clean.ps1
  }
  elseif (-not (Test-Path "node_modules\expo\package.json")) {
    Write-Step "node_modules incompleto: eseguo install pulito"
    .\scripts\install-clean.ps1
  }
  else {
    Write-Ok "node_modules presenti"
  }
}

function Clear-LocalCache {
  Write-Step "Pulizia cache locali Expo/Metro"
  if (Test-Path ".expo") { Remove-Item ".expo" -Recurse -Force }
  if (Test-Path "dist") { Remove-Item "dist" -Recurse -Force }
  Get-ChildItem -Filter "*.tsbuildinfo" -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
  Write-Ok "Cache locali pulite"
}

function Run-Typecheck {
  if ($SkipTypecheck) {
    Write-WarnLine "Typecheck saltato per richiesta esplicita."
    return
  }

  Write-Step "Typecheck TypeScript"
  Invoke-Logged { npm run typecheck } "npm run typecheck"
}

function Get-AdbPath {
  return Find-AndroidTool "adb" @("platform-tools\adb.exe")
}

function Get-EmulatorPath {
  return Find-AndroidTool "emulator" @("emulator\emulator.exe")
}


function Get-ReadyAdbDeviceSerial {
  param([string]$AdbPath)

  $devices = & $AdbPath devices 2>$null
  foreach ($line in $devices) {
    if ($line -match "^(?<serial>\S+)\s+device(\s|$)" -and $line -notmatch "List of devices") {
      return $Matches['serial']
    }
  }

  return $null
}

function Test-AndroidPackageManagerReady {
  param([string]$AdbPath, [string]$Serial)

  if (-not $Serial) { return $false }

  $boot = (& $AdbPath -s $Serial shell getprop sys.boot_completed 2>$null | Out-String).Trim()
  if ($boot -ne "1") { return $false }

  $packageProbe = (& $AdbPath -s $Serial shell pm path android 2>$null | Out-String).Trim()
  if ($LASTEXITCODE -ne 0) { return $false }
  if ([string]::IsNullOrWhiteSpace($packageProbe)) { return $false }

  return $true
}

function Wait-AndroidBootReady {
  param([int]$TimeoutSeconds = 180)

  $adb = Get-AdbPath
  Write-Step "Attendo boot Android completo e package manager pronto"

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $lastSerial = $null

  while ((Get-Date) -lt $deadline) {
    $serial = Get-ReadyAdbDeviceSerial $adb
    if ($serial) {
      $lastSerial = $serial
      if (Test-AndroidPackageManagerReady $adb $serial) {
        Write-Host "" 
        Write-Ok "Android pronto: $serial"
        Start-Sleep -Seconds 2
        return $serial
      }
    }

    Write-Host "." -NoNewline -ForegroundColor DarkGray
    Start-Sleep -Seconds 2
  }

  Write-Host ""
  if ($lastSerial) {
    throw "Timeout: ADB vede $lastSerial, ma Android non ha reso disponibile il package manager. Attendi la home dell'emulatore o prova un Cold Boot/Wipe Data da Android Studio."
  }

  throw "Timeout: nessun device ADB pronto. Controlla l'emulatore e rilancia .\\baubook.ps1 -Mode doctor."
}

function Test-DevClientInstalled {
  param([string]$PackageName = "me.baubook.app")

  $adb = Get-AdbPath
  $serial = Wait-AndroidBootReady 120
  $packages = (& $adb -s $serial shell pm list packages $PackageName 2>$null | Out-String).Trim()
  return ($packages -match [regex]::Escape($PackageName))
}

function Show-AdbDevices {
  $adb = Get-AdbPath
  Write-Step "ADB devices"
  & $adb devices -l
}

function Ensure-AndroidDevice {
  param([switch]$AllowStartEmulator)

  $adb = Get-AdbPath
  $emulator = Get-EmulatorPath

  Write-Ok "ADB: $adb"
  Write-Ok "Emulator: $emulator"

  Write-Step "Avvio ADB server"
  & $adb start-server | Out-Null

  $devices = & $adb devices
  $hasDevice = $false
  foreach ($line in $devices) {
    if ($line -match "\sdevice(\s|$)" -and $line -notmatch "List of devices") {
      $hasDevice = $true
    }
  }

  if (-not $hasDevice) {
    if (-not $AllowStartEmulator) {
      throw "Nessun device ADB rilevato. Avvia l'emulatore con: .\baubook.ps1 -Mode android-dev oppure usa -NoStartEmulator se vuoi gestirlo manualmente."
    }

    Write-Step "Nessun device ADB: avvio emulatore $AvdName da CLI"
    Write-WarnLine "Non serve tenere aperto Android Studio. L'emulatore viene avviato con emulator.exe."
    Write-WarnLine "Le eventuali finestre qemu/crashpad sono processi dell'emulatore Android, non dell'app BauBook."

    $emulatorArgs = @(
      "-avd", $AvdName,
      "-no-snapshot-load",
      "-no-snapshot-save",
      "-no-boot-anim",
      "-netdelay", "none",
      "-netspeed", "full"
    )

    if ($EmulatorGpu -and $EmulatorGpu -ne "auto") {
      $emulatorArgs += @("-gpu", $EmulatorGpu)
    }

    Write-Run ("{0} {1}" -f $emulator, ($emulatorArgs -join " "))
    Start-Process -FilePath $emulator -ArgumentList $emulatorArgs -WindowStyle Minimized
    Write-Step "Attendo device ADB"
    & $adb wait-for-device
  }
  else {
    Write-Ok "Emulatore/device gia' disponibile"
  }

  Show-AdbDevices
  [void](Wait-AndroidBootReady 240)
}

function Ensure-DevClientPackage {
  if (Test-Path "node_modules\expo-dev-client\package.json") {
    Write-Ok "expo-dev-client presente"
    return
  }

  Write-Step "Installo expo-dev-client per Development Build"
  Write-WarnLine "Questo aggiorna package.json e package-lock.json localmente usando la versione compatibile con l'SDK Expo."
  Invoke-Logged { npx expo install expo-dev-client } "npx expo install expo-dev-client"
}

function Ensure-AndroidProject {
  if ($CleanPrebuild -or -not (Test-Path "android")) {
    Write-Step "Genero progetto native Android con Expo prebuild"
    if ($CleanPrebuild) {
      Invoke-Logged { npx expo prebuild --platform android --clean } "npx expo prebuild --platform android --clean"
    }
    else {
      Invoke-Logged { npx expo prebuild --platform android } "npx expo prebuild --platform android"
    }
  }
  else {
    Write-Ok "Cartella android presente: prebuild non necessario"
  }
}

function Start-Web {
  Run-Typecheck
  Write-Step "Avvio BauBook nel browser"
  if ($Clear) {
    Invoke-Logged { npx expo start --web --clear } "npx expo start --web --clear"
  }
  else {
    Invoke-Logged { npx expo start --web } "npx expo start --web"
  }
}

function Build-AndroidDevClient {
  Run-Typecheck
  Assert-Jdk17
  Ensure-AndroidDevice -AllowStartEmulator:(!$NoStartEmulator)
  Ensure-DevClientPackage
  Ensure-AndroidProject
  Write-Step "Build/install Development Build Android"
  Write-WarnLine "Da ora si usa l'app BauBook installata sull'emulatore, non Expo Go."
  Invoke-Logged { npx expo run:android } "npx expo run:android"
}

function Start-AndroidDevClient {
  Run-Typecheck
  Ensure-AndroidDevice -AllowStartEmulator:(!$NoStartEmulator)

  if (-not (Test-DevClientInstalled "me.baubook.app")) {
    throw "Development Build BauBook non installata sull'emulatore. Esegui prima: .\\baubook.ps1 -Mode android-build"
  }

  Write-Step "Avvio Metro per Development Build Android"
  Write-WarnLine "Se Metro parte ma l'app non si apre automaticamente, apri manualmente l'icona BauBook sull'emulatore."
  if ($HostMode -eq "localhost") {
    if ($Clear) {
      Invoke-Logged { npx expo start --dev-client --android --localhost --clear } "npx expo start --dev-client --android --localhost --clear"
    }
    else {
      Invoke-Logged { npx expo start --dev-client --android --localhost } "npx expo start --dev-client --android --localhost"
    }
  }
  else {
    if ($Clear) {
      Invoke-Logged { npx expo start --dev-client --android --host lan --clear } "npx expo start --dev-client --android --host lan --clear"
    }
    else {
      Invoke-Logged { npx expo start --dev-client --android --host lan } "npx expo start --dev-client --android --host lan"
    }
  }
}

function Start-ExpoGoLegacy {
  Run-Typecheck
  Ensure-AndroidDevice -AllowStartEmulator:(!$NoStartEmulator)
  Write-Step "Avvio Android con Expo Go legacy"
  Write-WarnLine "Sul tuo ambiente Expo Go ha dato problemi. Usa questa modalita' solo per verifica rapida."
  if ($Clear) {
    Invoke-Logged { npx expo start --android --host lan --clear } "npx expo start --android --host lan --clear"
  }
  else {
    Invoke-Logged { npx expo start --android --host lan } "npx expo start --android --host lan"
  }
}

Write-Title $Mode
Ensure-Dependencies

if ($Clear) { Clear-LocalCache }

switch ($Mode) {
  "web" { Start-Web }
  "android-build" { Build-AndroidDevClient }
  "android-dev" { Start-AndroidDevClient }
  "android-go" { Start-ExpoGoLegacy }
  "doctor" { .\scripts\doctor.ps1 }
  "supabase-doctor" { .\scripts\supabase-doctor.ps1 }
  "install" { .\scripts\install-clean.ps1 }
  "clean" { Clear-LocalCache }
  "typecheck" { Run-Typecheck }
  "export-web" { Run-Typecheck; Invoke-Logged { npm run export:web } "npm run export:web" }
  "stop-emulator" { .\stop_emu.ps1 }
}
