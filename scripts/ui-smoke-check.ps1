$ErrorActionPreference = "Stop"

function Pass($Message) { Write-Host "OK $Message" }
function Fail($Message) { throw $Message }
function Assert-File($Path, $Label) {
  if (-not (Test-Path $Path)) { Fail "$Label mancante: $Path" }
  Pass "$Label presente"
}
function Assert-Contains($Path, $Pattern, $Label) {
  $text = Get-Content $Path -Raw
  if (-not $text.Contains($Pattern)) { Fail "$Label non contiene '$Pattern': $Path" }
  Pass $Label
}

Write-Host ""
Write-Host "============================================================"
Write-Host " BauBook! :: UI beta experience check"
Write-Host "============================================================"

Assert-File "src/shared/components/CartoonTabIcon.tsx" "CartoonTabIcon"
Assert-File "src/root/BauBookApp.tsx" "BauBookApp"
Assert-Contains "src/root/BauBookApp.tsx" "CartoonTabIcon" "toolbar usa CartoonTabIcon"
Assert-Contains "src/root/BauBookApp.tsx" "tone: 'teal'" "toolbar ha tone cartoon"
Assert-Contains "src/root/BauBookApp.tsx" "baubookImages.tabHome" "Home badge resta riferimento visuale"
Assert-Contains "src/shared/components/CartoonTabIcon.tsx" "colors.tealSoft" "CartoonTabIcon usa palette cartoon"
Assert-Contains "src/shared/components/CartoonTabIcon.tsx" "styles.cheek" "CartoonTabIcon ha dettaglio cartoon"
Assert-Contains "src/shared/components/CartoonTabIcon.tsx" "styles.spark" "CartoonTabIcon ha sparkle"
Assert-Contains "package.json" '"version": "0.3.0"' "package.json versione 0.3.0"
Assert-Contains "app.json" '"version": "0.3.0"' "app.json versione 0.3.0"
Assert-Contains "app.json" '"baseline": "2.0.0"' "app.json baseline 2.0.0"

Write-Host "BauBook UI beta experience check completato."
