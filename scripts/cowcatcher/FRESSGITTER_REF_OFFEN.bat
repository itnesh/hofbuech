@echo off
REM Vorher BEIDE Fressgitter OFFEN stellen, Hebel nicht verdeckt. Speichert die aktuelle Hebelstellung als Referenz.
REM Am besten je einmal bei Tag und einmal in der Nacht (Infrarot) ausfuehren.
cd /d "%~dp0"
venv\Scripts\python.exe waechter.py --fressgitter-ref offen
pause
