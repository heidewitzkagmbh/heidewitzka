# Agenturbüro – Zugang

URL: `/intern`. Die öffentliche Website verlinkt den Bereich nicht.

Die Route `/intern` wird serverseitig über `/api/internal` ausgeliefert. Ohne gültige Sitzung enthält die Antwort nur das Loginformular und erhält Status 401. Auch direkte Aufrufe von `/api/internal` prüfen die Sitzung. Das Cockpit und sein JavaScript liegen nicht mehr in öffentlich ausgelieferten statischen Dateien. Andere Pfade unter `/intern/` liefern 404, bis dafür jeweils ein geschützter Server-Endpunkt entsteht.

## Zugang aktivieren

Im Vercel-Projekt `heidewitzka` die sensible Umgebungsvariable `COCKPIT_PASSWORD` für **Production** hinterlegen: ein zufälliges Passwort mit mindestens 20 und höchstens 256 Zeichen. Anschließend neu deployen. Ohne die Variable bleibt der Zugang gesperrt. Für Preview-Deployments bei Bedarf ein eigenes Passwort hinterlegen.

Die Prüfung erfolgt über `/api/cockpit`; die Sitzung wird für acht Stunden mit einem signierten `HttpOnly`, `Secure`, `SameSite=Strict` Cookie gespeichert. Passwortwechsel invalidiert alle Sitzungen. Der Server sendet `no-store` und eine restriktive Content Security Policy.

Der Login-Endpunkt benötigt vor dem Anschluss echter Kunden- und Finanzdaten eine persistente Rate-Limit-Regel und vorzugsweise eine verwaltete Identität mit MFA. Jede künftige Daten- und Aktions-API muss serverseitig die Sitzung prüfen. Rollen und Beispieltexte stehen weiterhin im öffentlichen GitHub-Repository; dort gehören keine vertraulichen Daten oder Zugangsdaten hinein.

## Stand

Übersicht, Bot-Verzeichnis, Organigramm, Aufgaben, Ergebnisse und Kosten sind ein Entwurf ohne Live-Anbindung. Es werden weder n8n-Workflows gesteuert noch Kundendaten abgerufen. Aufgabenhäkchen gelten nur für die aktuelle Browseransicht.
