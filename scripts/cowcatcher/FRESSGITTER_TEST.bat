@echo off
REM Fressgitter einmal pruefen (nichts senden). Ergebnis im Fenster, Bild fressgitter_test.jpg
cd /d "%~dp0"
venv\Scripts\python.exe waechter.py --fressgitter-test
if exist fressgitter_test.jpg start "" fressgitter_test.jpg
pause
