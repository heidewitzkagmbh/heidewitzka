# Persönliches Dashboard – erste Ausbaustufe

Die geschützte Route `/intern/persoenlich` ergänzt das vorhandene Agenturbüro. Der ursprüngliche Bereich `/intern` und die öffentliche Website bleiben erhalten. Die neue Ansicht startet leer: Beispiele aus dem Briefing werden nicht als echte Aufgaben angelegt.

## Nutzung auf diesem Mac

`Start.command` doppelklicken. Das lokale, zufällig erzeugte Passwort wird in die Zwischenablage kopiert. Im Browser auf `https://localhost:8766/intern/persoenlich` anmelden und das Passwort mit Cmd+V einfügen. Beim ersten Öffnen muss das selbst signierte lokale HTTPS-Zertifikat für **localhost** bestätigt werden. Das Zertifikat wird nicht systemweit installiert. Das Terminal bleibt geöffnet; Ctrl+C beendet den Server.

Alternativ Node 24 oder neuer verwenden und `npm run start:local` ausführen. Der Server nutzt ausschließlich `127.0.0.1`; er ist nicht aus dem LAN oder vom Handy erreichbar. „Mobil geprüft“ bedeutet eine getestete mobile Browseransicht bei 390 und 320 Pixel Breite, keine Freigabe im Netzwerk.

Aufgaben lassen sich erfassen, bearbeiten, abhaken und wieder öffnen. Eingang, Eingeordnet, Später vielleicht und Erledigt sind getrennte Status. Labels, Notiz, Dauer und Priorität sind optional. Geplanter Tag und echte Deadline sind getrennt; keines der Felder erzeugt einen Kalenderblock. Suche und Statusfilter wirken auf den zuletzt geladenen Datenstand. „Neu laden“ holt aktuelle Änderungen aus anderen Fenstern. „Sicherung“ exportiert alle Aufgaben als private JSON-Datei. Ein Sicherungsimport ist noch nicht implementiert.

## Speicher und Sicherheit

Die produktive Cloud-Funktion hat **keinen** lokalen Speicheradapter und liefert nach der Anmeldung 503, solange kein dauerhafter Online-Anbieter eingerichtet ist. Es gibt keinen stillen Wechsel auf Browser-Speicher, Vercel `/tmp` oder Beispieldaten.

Der lokale Server injiziert einen SQLite-Aufgabenspeicher in dieselbe Aufgaben-API. Die lokale private Ablage liegt standardmäßig unter `../../work/personal-dashboard-private`, relativ zum Repository. Für einen anderen Installationsort `PERSONAL_DATA_DIR` als absoluten Pfad außerhalb des Repository setzen. Dort liegen `tasks.sqlite3`, das lokale Passwort und das lokale Zertifikat mit beschränkten Dateirechten. Die Ablage wird nie als Webdatei ausgeliefert. Für ein Backup den Server stoppen und die ganze private Ablage verschlüsselt sichern. Die SQLite-Datei ist selbst nicht verschlüsselt; FileVault und verschlüsselte Backups sind weiterhin sinnvoll. Benutzerprozesse mit Zugriff auf diese Dateien können sie lesen.

Der vorhandene signierte Cookie mit HttpOnly, Secure und SameSite=Strict gilt auch für die neue Route. Jede Aufgabenanfrage prüft die Sitzung serverseitig. Schreibanfragen benötigen den passenden HTTPS-Ursprung und JSON. Der lokale Server beschränkt Loginversuche dauerhaft auf zehn je 15 Minuten und prüft Host und Anfragemenge. Daten und Secrets werden nicht protokolliert. Code liegt im öffentlichen Repository; keine Aufgaben, Bankdaten, Passwörter, Zertifikate oder Tokens dürfen eingecheckt werden. `.gitignore` und `.vercelignore` ergänzen den Ausschluss.

## Datenmodell und Erweiterung

`api/_personal/task-model.js` validiert Aufgabe und optionale Felder. Stabile UUID, Versionsnummer, Erstellungs-, Änderungs- und Erledigungszeitpunkt gehören zum Datensatz. Wiederholte Anlage derselben UUID und desselben Inhalts erzeugt kein Duplikat. Gleichzeitige Änderungen benötigen den aktuellen Versionsstand; andernfalls wird ein 409-Konflikt angezeigt, und die Eingabe bleibt erhalten. SQLite schreibt Änderung und Vorgeschichte innerhalb einer Transaktion. Bis zu 1000 frühere Änderungsstände bleiben lokal gespeichert.

`api/personal-tasks.js` enthält die geschützte HTTP-Schnittstelle; `createHandler(store)` entkoppelt Anmeldung und Oberfläche vom Datenanbieter. Das Speicherinterface ist `list`, `create(task,id)` und `update(id,version,task)`. Projekt- und Zielbezüge sind optionale IDs; zusätzliche Module für Ziele, Projekte, Tagesnotizen, feste Zeitfenster und bewusst erfasste Erfolge können daneben entstehen. Kalender und Finanzdaten sind eigene Quellen und werden nicht ungeprüft in Aufgaben oder Notion kopiert.

## Notion, Kalender und Sprachzugriff

In dieser Sitzung gibt es keine callable Notion-Werkzeuge. Im geprüften Vercel-Projekt sind keine Notion-Zugangsdaten hinterlegt. Ein Notion-Workspace, eine Aufgaben-Datenbank sowie Lese-, Anlage- und Änderungsrechte konnten deshalb nicht getestet werden. Das ist kein Nachweis, dass der Nutzer grundsätzlich kein Notion-Konto besitzt.

Nächster Anschluss: eine gezielt freigegebene Notion-Aufgabendatenbank, ausschließlich serverseitige Zugangsdaten und ein API-Adapter mit expliziter Fehlerbehandlung und Konfliktstrategie. Separat davon benötigt ChatGPT einen verfügbaren Notion-Connector mit nachgewiesenem Lesen und Schreiben. Erst danach ist der Test „im Sprachgespräch anlegen → lesen → ändern → dieselbe Änderung im Dashboard sehen“ bestätigt. Die lokale Website beweist diesen Sprachzugriff nicht. Bis dahin sind Dashboard und JSON-Sicherung die verfügbare Zwischenlösung.

Google-Kalender-Werkzeuge sind in der Sitzung vorhanden; Konto, Kalenderauswahl und Schreibrechte wurden für diese erste Aufgabenstufe nicht getestet. Es gibt keine zugesicherte Kalender-, n8n- oder Morning-Call-Automation.

## Bestehender Bestand

Vercel-Projekt `heidewitzka`, Repository `heidewitzkagmbh/heidewitzka`, Produktionsbasis `4f04d558513e558b40ec8e20464f29008f9a1803` wurden abgeglichen. Der bestehende Produktionslogin besitzt das Secret `COCKPIT_PASSWORD`; nur Metadaten wurden geprüft, der Secretwert wurde nicht abgerufen. Der lokale Zugang besitzt ein eigenes Passwort. Im geprüften Projekt ist `heidewitzka.vercel.app` verifiziert; die Zuordnung von `heidewitzka.io` zu diesem Projekt ist nicht nachgewiesen.

Das vorhandene Finanzdashboard wurde über Quellcode und Dokumentation geprüft: lokaler Python-Server auf Port 8765, SQLite, getrennte Datenbereiche Privat/GmbH, kein eigener Login, Host-/Origin-Prüfung und Sitzungstoken für Änderungen. Zum Prüfzeitpunkt lief es nicht. Seine Dateien, Datenbank und Funktionen wurden nicht geändert. Vor einer Online-Integration muss es dieselbe serverseitige Anmeldung und Datenabschirmung bekommen; seine lokale Speicherung lässt sich nicht unverändert auf Vercel übertragen.

Vor echten privaten Cloud-Daten zusätzlich die im vorhandenen Agenturbüro dokumentierte persistente Login-Ratenbegrenzung bzw. verwaltete Identität mit MFA einrichten. Der lokale Schutz ersetzt keine Cloud-Ratenbegrenzung.

## Prüfung

`npm test`: fünf Tests für Persistenz nach Wiederöffnung, idempotente Anlage, Änderungs- und Wiederöffnungsvorgänge, Konflikte, Validierung, API-Anmeldung, Ursprungsschutz, fehlenden Cloud-Speicher und persistente lokale Loginbegrenzung.

`npm run test:browser`: benötigt Playwright und Chrome. Der Test verwendet temporäre isolierte Datenbanken und entfernt Testaufgaben anschließend. Desktop 1440 Pixel, mobil 390 und 320 Pixel; Anlage, Bearbeitung, Abhaken/Wiederöffnung, Neuladen, Filter, feste getrennte Daten, Suche, Export, Konflikt zwischen zwei Fenstern, Behandlung von HTML als Text, bestehendes Agenturbüro, Login/Logout und gesperrte API geprüft. Keine Browserfehler. Das ist keine Prüfung auf einem physischen Telefon und kein Live-Notion-Test.

Die Implementierung nutzt die integrierte Node-SQLite-Schnittstelle: https://nodejs.org/api/sqlite.html . Es werden keine Laufzeitpakete für die lokale Aufgabenstufe benötigt.
