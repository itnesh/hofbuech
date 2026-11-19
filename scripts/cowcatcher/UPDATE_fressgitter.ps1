# Update hofbuech-Waechter mit Fressgitter (Kamera 3). Als Administrator ausfuehren (UPDATE_fressgitter.bat).
$ErrorActionPreference = "Stop"
$p = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $p.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) { Write-Host "Als Administrator ausfuehren!" -ForegroundColor Red; Read-Host "Enter"; exit 1 }
$Src = $PSScriptRoot; $Dir = "C:\CowCatcher\hofbuech"; $Svc = "CowCatcherHofbuech"; $venvPy = "$Dir\venv\Scripts\python.exe"
if (-not (Test-Path $venvPy)) { Write-Host "$venvPy fehlt - zuerst Waechter installieren" -ForegroundColor Red; Read-Host "Enter"; exit 1 }
Write-Host ">> Dienst $Svc stoppen" -ForegroundColor Cyan
Stop-Service $Svc -Force -ErrorAction SilentlyContinue; Start-Sleep 3
Write-Host ">> Dateien kopieren nach $Dir" -ForegroundColor Cyan
New-Item -ItemType Directory -Force "$Dir\modelle" | Out-Null
foreach ($f in "waechter.py","fressgitter.py","FRESSGITTER_TEST.bat","FRESSGITTER_REF_ZU.bat","FRESSGITTER_REF_OFFEN.bat","README.txt","install_waechter.ps1") { Copy-Item "$Src\$f" "$Dir\$f" -Force }
if (Test-Path "$Src\modelle") { Copy-Item "$Src\modelle\*.onnx" "$Dir\modelle\" -Force }
Remove-Item "$Dir\fressgitter_stand.json" -ErrorAction SilentlyContinue   # Status neu bestimmen
Write-Host ">> Pakete (numpy, onnxruntime)" -ForegroundColor Cyan
& $venvPy -m pip install -q --disable-pip-version-check numpy onnxruntime
if ($LASTEXITCODE -ne 0) { Write-Host "pip fehlgeschlagen" -ForegroundColor Red; Start-Service $Svc; Read-Host "Enter"; exit 1 }
Write-Host ">> Fressgitter-Test (sendet nichts)" -ForegroundColor Cyan
Push-Location $Dir; & $venvPy waechter.py --fressgitter-test; Pop-Location
Write-Host ">> Dienst starten" -ForegroundColor Cyan
Start-Service $Svc; Start-Sleep 3
Get-Service $Svc | Format-Table Name, Status -AutoSize
Write-Host "Referenzen: bei TAG und in der NACHT je einmal: beide Gitter ZU -> FRESSGITTER_REF_ZU.bat, beide OFFEN -> FRESSGITTER_REF_OFFEN.bat (in $Dir). Rote Griffe duerfen nicht verdeckt sein." -ForegroundColor Yellow
if (Test-Path "$Dir\fressgitter_test.jpg") { Start-Process "$Dir\fressgitter_test.jpg" }
Read-Host "Enter zum Beenden"
