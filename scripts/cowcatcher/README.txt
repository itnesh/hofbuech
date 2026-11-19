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
fressgitter.py   Fressgitter Kamera 3: alle 5 Min. Gitter zu/offen (Kuehe links, Kaelber rechts) + Anzahl fressende Tiere -> hofbuech sensoren/fressgitter
                 Push, wenn ein Gitter > 2 h zu ist, danach alle 30 Min. (waechter.json: "fressgitter": {"alarm_h":2, "alarm_wdh_min":30, "rtsp":"...", "gitter":{...}})
modelle\         yolo11s.onnx (Tiere zaehlen, CPU)
fressgitter_ref\ Referenzbilder der Hebel (FRESSGITTER_REF_ZU.bat / FRESSGITTER_REF_OFFEN.bat, je Tag und Nacht)
Test Fressgitter FRESSGITTER_TEST.bat (sendet nichts, zeigt fressgitter_test.jpg mit Feldern und erkannten Tieren)
Update           UPDATE_fressgitter.bat (Admin, aus dem entpackten Ordner)
fressgitter_training\ stuendliches Bild (2560 px) + Modellboxen (.json); in Hofpuls Mehr > Fressgitter-Training beurteilen (fgtraining, Bild in fgbilder)
