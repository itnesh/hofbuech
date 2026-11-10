hofbuech-Waechter
=================
waechter.py      meldet neue Events aus detections\cam*\approved\ als Meldung mit Video (komprimiert) + Vorschaubild an hofbuech + Push
                 raeumt stuendlich alte CowCatcher-Logs auf (aelter 3 Tage oder total > 200 MB)
waechter.json    optional: Einstellungen ueberschreiben, z.B. {"kameras":{"cam1":"Laufhof","cam2":"Stall"}, "video_max_kb":700}
gesendet.json    bereits gemeldete Events (nicht loeschen, sonst wird Bestand als erledigt neu markiert)
Install/Update   ..\RUN_install_hofbuech_waechter.bat (Admin)
Test             venv\Scripts\python.exe waechter.py --test
Log              ..\logs\hofbuech_waechter.log
Dienst           CowCatcherHofbuech (sc query CowCatcherHofbuech)
