# Installiert den hofbuech-Waechter als Windows-Dienst (NSSM) und testet ihn.
# Setzt zusaetzlich die Log-Rotation fuer CowCatcherAI.
$ErrorActionPreference = "Stop"
$p = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $p.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) { Write-Host "Als Administrator ausfuehren!" -ForegroundColor Red; Read-Host "Enter"; exit 1 }

$Root = "C:\CowCatcher"; $Dir = "$Root\hofbuech"; $nssm = "$Root\nssm\nssm.exe"; $Svc = "CowCatcherHofbuech"; $Logs = "$Root\logs"
$venvPy = "$Dir\venv\Scripts\python.exe"

# 1. Python finden + venv
if (-not (Test-Path $venvPy)) {
    $base = $null
    try { $base = (& py -3 -c "import sys;print(sys.executable)" 2>$null) } catch {}
    if (-not $base) { try { $base = (& python -c "import sys;print(sys.executable)" 2>$null) } catch {} }
    if (-not $base) { Write-Host "Python 3 nicht gefunden." -ForegroundColor Red; Read-Host "Enter"; exit 1 }
    Write-Host ">> venv mit $base" -ForegroundColor Cyan
    & $base -m venv "$Dir\venv"
}
Write-Host ">> Pakete (google-auth, requests, pillow, imageio-ffmpeg)" -ForegroundColor Cyan
& $venvPy -m pip install -q --disable-pip-version-check google-auth requests pillow imageio-ffmpeg
if ($LASTEXITCODE -ne 0) { Write-Host "pip fehlgeschlagen" -ForegroundColor Red; Read-Host "Enter"; exit 1 }

# 2. Live-Test: neuestes approved-Event als TEST an hofbuech
Write-Host ">> Test-Meldung an hofbuech" -ForegroundColor Cyan
& $venvPy "$Dir\waechter.py" --test
if ($LASTEXITCODE -ne 0) { Write-Host "TEST FEHLGESCHLAGEN - Dienst wird nicht installiert. Log: $Logs\hofbuech_waechter.log" -ForegroundColor Red; Read-Host "Enter"; exit 1 }

# 3. Dienst
$ErrorActionPreference = "SilentlyContinue"
if (Get-Service $Svc) { Stop-Service $Svc -Force; & $nssm remove $Svc confirm | Out-Null; Start-Sleep 2 }
$ErrorActionPreference = "Stop"
Write-Host ">> Dienst $Svc" -ForegroundColor Cyan
& $nssm install $Svc $venvPy "`"$Dir\waechter.py`""
& $nssm set $Svc AppDirectory $Dir
& $nssm set $Svc DisplayName "CowCatcher -> hofbuech Waechter"
& $nssm set $Svc Description "Meldet neue approved-Events von CowCatcher mit Standbild an hofbuech; raeumt alte Logs auf"
& $nssm set $Svc Start SERVICE_DELAYED_AUTO_START
& $nssm set $Svc AppStdout "$Logs\hofbuech_dienst.log"
& $nssm set $Svc AppStderr "$Logs\hofbuech_dienst.log"
& $nssm set $Svc AppRotateFiles 1
& $nssm set $Svc AppRotateOnline 1
& $nssm set $Svc AppRotateBytes 1048576
& $nssm set $Svc AppExit Default Restart
& $nssm set $Svc AppRestartDelay 10000
& $nssm set $Svc AppEnvironmentExtra PYTHONUNBUFFERED=1 PYTHONIOENCODING=utf-8
Start-Service $Svc

# 4. Log-Rotation CowCatcherAI (10 MB je Datei, auch im laufenden Betrieb)
if (Get-Service CowCatcherAI -ErrorAction SilentlyContinue) {
    Write-Host ">> Log-Rotation CowCatcherAI" -ForegroundColor Cyan
    & $nssm set CowCatcherAI AppRotateFiles 1
    & $nssm set CowCatcherAI AppRotateOnline 1
    & $nssm set CowCatcherAI AppRotateBytes 10485760
    if ((Get-Service CowCatcherAI).Status -ne 'Running') { Write-Host "   CowCatcherAI lief nicht - starte" -ForegroundColor Yellow; Start-Service CowCatcherAI }
}

Start-Sleep 5
Write-Host ""
Get-Service CowCatcherAI, $Svc | Format-Table Name, Status, StartType -AutoSize
Write-Host "Letzte Waechter-Zeilen:"; Get-Content "$Logs\hofbuech_waechter.log" -Tail 6
Read-Host "Enter zum Beenden"
