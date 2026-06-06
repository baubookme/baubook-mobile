param([switch]$WithNative)

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectRoot

Write-Host "Pulizia progetto BauBook" -ForegroundColor Cyan
foreach ($path in @(".expo", "dist", "web-build")) {
  if (Test-Path $path) {
    Write-Host "Rimuovo $path"
    Remove-Item $path -Recurse -Force
  }
}
Get-ChildItem -Filter "*.tsbuildinfo" -Recurse | Remove-Item -Force

if ($WithNative) {
  foreach ($path in @("android", "ios")) {
    if (Test-Path $path) {
      Write-Host "Rimuovo $path"
      Remove-Item $path -Recurse -Force
    }
  }
}

Write-Host "Pulito. node_modules e package-lock sono stati lasciati intatti." -ForegroundColor Green
