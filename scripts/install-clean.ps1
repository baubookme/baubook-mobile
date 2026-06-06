$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectRoot

Write-Host "==> BauBook install pulito" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot"

if (Test-Path "package-lock.json") {
  $lock = Get-Content "package-lock.json" -Raw
  if ($lock -match "applied-caas|artifactory") {
    Write-Host "WARN package-lock.json contiene registry interno non pubblico. Lo elimino." -ForegroundColor Yellow
    Remove-Item "package-lock.json" -Force
  }
}

if (Test-Path "node_modules") {
  Write-Host "==> Rimuovo node_modules" -ForegroundColor Cyan
  Remove-Item "node_modules" -Recurse -Force
}

if (Test-Path ".expo") {
  Write-Host "==> Rimuovo .expo" -ForegroundColor Cyan
  Remove-Item ".expo" -Recurse -Force
}

if (Test-Path "dist") {
  Write-Host "==> Rimuovo dist" -ForegroundColor Cyan
  Remove-Item "dist" -Recurse -Force
}

Write-Host "==> Imposto registry pubblico npm" -ForegroundColor Cyan
npm config set registry https://registry.npmjs.org/

if (Test-Path "package-lock.json") {
  Write-Host "==> npm ci da package-lock pubblico" -ForegroundColor Cyan
  npm ci --no-audit --no-fund --registry=https://registry.npmjs.org/ --fetch-retries=5 --fetch-timeout=600000
}
else {
  Write-Host "==> package-lock assente: genero lock e installo da registry pubblico" -ForegroundColor Cyan
  npm install --no-audit --no-fund --registry=https://registry.npmjs.org/ --fetch-retries=5 --fetch-timeout=600000
}

Write-Host "==> Typecheck" -ForegroundColor Cyan
npm run typecheck

Write-Host "OK Installazione completata." -ForegroundColor Green
Write-Host "Prossimo comando consigliato: .\baubook.ps1 -Mode web" -ForegroundColor Green
