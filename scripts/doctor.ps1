$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectRoot

function Section($Title) {
  Write-Host ""
  Write-Host "=== $Title ===" -ForegroundColor Cyan
}

function Status($Name, $Ok, $Detail) {
  $safeDetail = if ([string]::IsNullOrWhiteSpace([string]$Detail)) { "nessun output" } else { [string]$Detail }
  if ($Ok) {
    Write-Host "OK   $Name - $safeDetail" -ForegroundColor Green
  }
  else {
    Write-Host "WARN $Name - $safeDetail" -ForegroundColor Yellow
  }
}

function Quote-ProcessArgument {
  param([AllowNull()][string]$Value)
  if ($null -eq $Value) { return '""' }
  if ($Value -eq "") { return '""' }
  if ($Value -match '[\s"]') {
    return '"' + ($Value -replace '"', '\"') + '"'
  }
  return $Value
}

function Join-ProcessArguments {
  param([AllowNull()][string[]]$Arguments)
  if (-not $Arguments) { return "" }
  $quoted = @()
  foreach ($arg in $Arguments) {
    $quoted += (Quote-ProcessArgument $arg)
  }
  return ($quoted -join " ")
}

function Resolve-NativeCommand {
  param([Parameter(Mandatory=$true)][string]$CommandName)

  $candidates = @(
    "$CommandName.exe",
    "$CommandName.cmd",
    "$CommandName.bat",
    $CommandName
  ) | Select-Object -Unique

  foreach ($candidate in $candidates) {
    $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source) { return $cmd.Source }
  }

  return $null
}

function Invoke-NativeSafe {
  param(
    [Parameter(Mandatory=$true)][string]$FileName,
    [string[]]$Arguments = @(),
    [int]$TimeoutSeconds = 12
  )

  try {
    $psi = [System.Diagnostics.ProcessStartInfo]::new()
    $psi.FileName = $FileName
    $psi.Arguments = Join-ProcessArguments $Arguments
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.WorkingDirectory = $ProjectRoot

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $psi
    [void]$process.Start()

    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()

    if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
      try { $process.Kill() } catch {}
      return "TIMEOUT dopo $TimeoutSeconds secondi: $FileName $($Arguments -join ' ')"
    }

    $stdout = $stdoutTask.GetAwaiter().GetResult()
    $stderr = $stderrTask.GetAwaiter().GetResult()
    $parts = @()
    if (-not [string]::IsNullOrWhiteSpace($stdout)) { $parts += $stdout.Trim() }
    if (-not [string]::IsNullOrWhiteSpace($stderr)) { $parts += $stderr.Trim() }
    $combined = ($parts -join "`n")

    if (-not [string]::IsNullOrWhiteSpace($combined)) { return $combined }
    return "exit code $($process.ExitCode)"
  }
  catch {
    return "ERRORE: $($_.Exception.Message)"
  }
}

function Get-PackageVersion {
  param([Parameter(Mandatory=$true)][string]$PackageName)

  $pathParts = @("node_modules") + ($PackageName -split "/") + @("package.json")
  $packagePath = Join-Path $ProjectRoot ($pathParts -join [System.IO.Path]::DirectorySeparatorChar)

  if (-not (Test-Path $packagePath)) {
    return $null
  }

  try {
    $json = Get-Content $packagePath -Raw | ConvertFrom-Json
    return $json.version
  }
  catch {
    return "package.json non leggibile"
  }
}

function Get-JavaVersionOutput {
  $java = Resolve-NativeCommand "java"
  if (-not $java) { return $null }
  return Invoke-NativeSafe $java @("-version") 8
}

function Get-JavaMajorVersion {
  $output = Get-JavaVersionOutput
  if ([string]::IsNullOrWhiteSpace($output)) { return $null }

  if ($output -match 'version "(?<ver>\d+)(\.(?<minor>\d+))?') {
    $major = [int]$Matches['ver']
    if ($major -eq 1 -and $Matches['minor']) {
      return [int]$Matches['minor']
    }
    return $major
  }
  return $null
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
  $fromPath = Resolve-NativeCommand $ToolName
  if ($fromPath) { return $fromPath }
  return $null
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor DarkCyan
Write-Host " BauBook! :: doctor" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor DarkCyan

if (Test-Path "node_modules") { Write-Host "OK  node_modules presenti" -ForegroundColor Green } else { Write-Host "WARN node_modules assente: esegui .\scripts\install-clean.ps1" -ForegroundColor Yellow }

Section "Node / npm"
$node = Resolve-NativeCommand "node"
$npm = Resolve-NativeCommand "npm"
Status "node" ($null -ne $node) ($(if ($node) { Invoke-NativeSafe $node @("--version") 8 } else { "non trovato" }))
Status "npm" ($null -ne $npm) ($(if ($npm) { Invoke-NativeSafe $npm @("--version") 8 } else { "non trovato" }))

Section "Registry npm"
if (Test-Path ".npmrc") {
  Get-Content ".npmrc"
}
else {
  Write-Host ".npmrc mancante: lo script install-clean lo puo' ricreare" -ForegroundColor Yellow
}
if (Test-Path "package-lock.json") {
  $lock = Get-Content "package-lock.json" -Raw
  Status "package-lock pubblico" (-not ($lock -match "applied-caas|artifactory")) "nessun registry interno rilevato"
}

Section "Java / Gradle"
$major = Get-JavaMajorVersion
if ($major) {
  Write-Host (Get-JavaVersionOutput)
  Status "JDK >= 17" ($major -ge 17) "major version $major"
  if ($env:JAVA_HOME) { Write-Host "JAVA_HOME=$env:JAVA_HOME" } else { Write-Host "JAVA_HOME non impostato" -ForegroundColor Yellow }
}
else {
  Write-Host "Java non trovato o versione non leggibile. Se android-build funziona, il JDK e' comunque OK; verifica con: java -version" -ForegroundColor Yellow
}

Section "Dipendenze Expo / React"
foreach ($pkg in @("expo", "react", "react-native", "react-dom", "react-native-web", "@expo/metro-runtime", "expo-dev-client")) {
  $version = Get-PackageVersion $pkg
  if ($version) {
    Write-Host "$pkg $version" -ForegroundColor Green
  }
  else {
    Write-Host "$pkg mancante" -ForegroundColor Yellow
  }
}

Section "Android SDK / ADB"
$adb = Find-AndroidTool "adb" @("platform-tools\adb.exe")
$emulator = Find-AndroidTool "emulator" @("emulator\emulator.exe")
Status "adb" ($null -ne $adb) $adb
Status "emulator" ($null -ne $emulator) $emulator
if ($adb) {
  Write-Host "adb start-server:" -ForegroundColor DarkGray
  Write-Host (Invoke-NativeSafe $adb @("start-server") 10)
  Write-Host "adb devices -l:" -ForegroundColor DarkGray
  Write-Host (Invoke-NativeSafe $adb @("devices", "-l") 10)
  Write-Host "adb reverse --list:" -ForegroundColor DarkGray
  Write-Host (Invoke-NativeSafe $adb @("reverse", "--list") 6)
}

Section "TypeScript"
if ($npm) {
  Write-Host (Invoke-NativeSafe $npm @("run", "typecheck") 60)
}
else {
  Write-Host "npm non disponibile: typecheck saltato" -ForegroundColor Yellow
}

Section "Expo dependency check"
Write-Host "Check non bloccante. Per controllo dettagliato esegui manualmente: npx expo install --check" -ForegroundColor Yellow

Section "Porte locali"
Write-Host "8081:" -ForegroundColor DarkGray
$netstat8081 = Invoke-NativeSafe "cmd.exe" @("/c", "netstat -ano | findstr :8081") 8
Write-Host $netstat8081
Write-Host "19000:" -ForegroundColor DarkGray
$netstat19000 = Invoke-NativeSafe "cmd.exe" @("/c", "netstat -ano | findstr :19000") 8
Write-Host $netstat19000

Section "Comandi consigliati"
Write-Host "Browser:              .\baubook.ps1 -Mode web" -ForegroundColor Green
Write-Host "Android build dev:    .\baubook.ps1 -Mode android-build" -ForegroundColor Green
Write-Host "Metro dev client:     .\baubook.ps1 -Mode android-dev" -ForegroundColor Green
Write-Host "Expo Go legacy:       .\baubook.ps1 -Mode android-go" -ForegroundColor DarkGray

Write-Host ""
Write-Host "Doctor completato." -ForegroundColor Green
