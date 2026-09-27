# Agenturbüro – erste Version

URL: `/intern`. Einstieg im Footer der Startseite.

## Stand
- Responsive Übersicht, Bot-Verzeichnis mit Suche und Bereichsfilter, Detaildialoge, Organigramm, Einrichtungsschritte, Ergebnisse und Kosten.
- Öffentliche Demo mit Rollenbeschreibungen, ohne Kunden-, Finanz- oder Workflowdaten. Häkchen sind nur temporär im Speicher des Browsers.
- Serverseitige Passwortprüfung über `/api/cockpit`, signierte achtstündige Sitzung im HttpOnly/Secure/SameSite-Cookie.
- Kein Zugriff auf n8n, keine Ausführung oder Pausierung von Workflows, keine laufenden Kosten durch automatische Hintergrundjobs.
- Die Seite und der Demo-Code sind öffentlich; vertrauliche Daten dürfen ausschließlich aus künftig authentifizierten Server-Endpunkten kommen. Das Verstecken von HTML ist kein Zugriffsschutz.

## Zugang aktivieren
Im Vercel-Projekt die sensible Umgebungsvariable `COCKPIT_PASSWORD` für Production hinterlegen: ein zufälliges Passwort mit mindestens 20 und höchstens 256 Zeichen. Anschließend neu deployen. Kein Passwort im Quellcode oder Browser hinterlegen. Ohne gültige Variable bleibt der Login gesperrt. Für Preview bei Bedarf ein separates Passwort hinterlegen.

Vor Anbindung vertraulicher Daten eine persistente Rate-Limit-Regel am Login-Endpunkt und einen verwalteten Identitätsdienst (mit MFA) ergänzen. Diese Version enthält bewusst noch keine vertraulichen Daten. Passwortwechsel invalidiert bestehende Sitzungen. Abmelden löscht das Sitzungscookie; individuelle serverseitige Sitzungswiderrufe sind noch nicht implementiert.

## Nächste Integration
Activity Logger an einen dauerhaften Datenspeicher anbinden. Alle lesenden und schreibenden Endpunkte müssen die Sitzung serverseitig prüfen. Felder: Bot-ID, Run-ID, Start/Ende, Status, Ergebnislink, Fehler, Kostenbetrag/Währung/Abdeckung. Unbekannte Werte bleiben unbekannt. n8n-Zugänge und Webhook-Secrets ausschließlich serverseitig speichern. Erst danach Start/Pause und Freigaben ergänzen.
