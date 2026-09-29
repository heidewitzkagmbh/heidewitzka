# Activity Logger für das Agenturbüro

Das bestehende Google Sheet **Heidewitzka – Bot Activity Log** ist die gemeinsame Quelle für die Tageslage. Die Tabellenblätter heißen `Activity Log`, `Bot Registry` und `Brief History`. Im Cockpit unter **Ergebnisse** führt ein Link direkt zum Protokoll. Derzeit enthält `Activity Log` nur seine Kopfzeile; es gibt noch keine bestätigten Workflow-Einträge.

## n8n-Anschluss

Jeder aktive Bot-Workflow schreibt **genau einen Abschlussdatensatz je Ausführung** in `Activity Log`, auch wenn er keine neuen Ergebnisse fand. Dazu in n8n am Ende des erfolgreichen Pfads eine Google-Sheets-Append-Row-Operation auf dieses Tabellenblatt setzen. Den Fehlerpfad ebenfalls erfassen, mit `status=error`; ein Fehler im Logger darf den ursprünglichen Fehler nicht verschleiern. Google-Zugang und Berechtigungen bleiben in n8n, nicht im öffentlichen Website-Repository.

| Spalte | Wert |
| --- | --- |
| `timestamp` | Abschlusszeitpunkt als ISO-8601 mit Zeitzone |
| `date` | Kalendertag in `Europe/Berlin`, `YYYY-MM-DD` |
| `bot` | Name wie in `Bot Registry`, z. B. `Herr Hartmann` |
| `workflow` | Stabiler Name des n8n-Workflows |
| `run_id` | n8n-Execution-ID; zum Erkennen doppelter Einträge |
| `status` | `success`, `warning` oder `error` |
| `mode` | `scheduled` oder `manual` |
| `items_processed`, `items_created`, `items_updated`, `review_items` | Zahlen, wenn bekannt; sonst leer lassen |
| `needs_attention` | `JA` oder `NEIN` |
| `severity` | `info`, `warning` oder `error` |
| `summary` | Kurzer, lesbarer Befund ohne personenbezogene Lead-Daten |
| `technical_error` | Bereinigte Fehlermeldung; keine Zugangsdaten oder kompletten Eingabedaten |
| `cost_estimate_eur` | Nur ein tatsächlich ermittelter oder klar berechneter Betrag; sonst leer |
| `execution_url` | Link zur n8n-Ausführung, sofern intern erreichbar |

Die Workflows zuerst einzeln anschließen und je einen echten Erfolgs- und Fehlerfall prüfen. Danach kann Herr Richter die Tageslage aus `Activity Log` gegen die erwarteten Takte in `Bot Registry` bilden und in `Brief History` ablegen. Bis diese Verbindung existiert, zeigt das Cockpit keine erfundenen Laufzahlen oder Statusmeldungen.
