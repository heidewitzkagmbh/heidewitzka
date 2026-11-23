# Google Ads Audit online buchen

Die Produktseite unterstützt weiterhin Anfragen, solange die Buchungsdienste fehlen.
Freigegebene Direktbuchungen kosten 950 € netto und enthalten einen 30-minütigen Kick-off
sowie die Besprechung des Maßnahmenplans. Online-Checkout ist für Unternehmen mit
deutschem Sitz und deutscher Rechnungsadresse vorgesehen. Vorgesehen sind zwei
Kick-offs pro Woche, dienstags und donnerstags von 10 bis 12 und 14 bis 16 Uhr.

## Anbieter anbinden

1. In Supabase `setup/audit-bookings.sql` ausführen. Projekt-URL und Server-Schlüssel
   als `AUDIT_SUPABASE_URL` und `AUDIT_SUPABASE_SERVICE_KEY` in Vercel hinterlegen.
   Für Test und Produktion separate Datenbanken verwenden. Der Server-Schlüssel
   bleibt ausschließlich in Vercel.
2. In Stripe einen einmaligen EUR-Preis über 950 € und einen exklusiven deutschen
   Steuersatz über 19 % konfigurieren. Preis-ID und Steuersatz-ID als
   `AUDIT_STRIPE_PRICE` und `AUDIT_STRIPE_TAX_RATE` setzen.
   Stripe-Konto, Rechnungseinstellungen und Link zu den Buchungsbedingungen
   im Dashboard vervollständigen. Den Server-Schlüssel als `AUDIT_STRIPE_KEY`
   setzen. Der Endpunkt `/api/audit-stripe-webhook` empfängt
   `checkout.session.completed` und `checkout.session.expired`.
   Signaturgeheimnis als `AUDIT_STRIPE_WEBHOOK_SECRET` hinterlegen.
3. Google Calendar API aktivieren und OAuth für das Konto einrichten, das
   Einladungen verschickt. Der Token benötigt Zugriff auf FreeBusy und das Erstellen
   von Terminen im Zielkalender. In Vercel `AUDIT_GOOGLE_CLIENT_ID`,
   `AUDIT_GOOGLE_CLIENT_SECRET`, `AUDIT_GOOGLE_REFRESH_TOKEN` und
   `AUDIT_GOOGLE_CALENDAR_ID` setzen. Einen buchbaren Kalender mit Google Meet
   verwenden. Falls weitere Kalender blockieren sollen, ihre IDs als
   kommagetrennte Liste in `AUDIT_GOOGLE_BUSY_CALENDARS` setzen.
   Ganztägige Ausnahmen können zusätzlich in `AUDIT_BLOCKED_DATES` stehen
   (kommagetrennte Daten im Format JJJJ-MM-TT).
4. `AUDIT_ADS_ACCESS_EMAIL` ist die Adresse, die Kunden mit der Rolle „Nur lesen“
   in Google Ads einladen. Datenschutzseite, Buchungsbedingungen und Rechnung
   vor Freischaltung auf den tatsächlichen Anbieter- und Datenfluss abstimmen.
5. Mit `AUDIT_BOOKING_MODE=test` außerhalb der Produktion einen vollständigen
   Checkout mit Testzugängen durchspielen. Bei geschützter Vercel-Vorschau den
   Test-Webhook über Stripe CLI lokal weiterleiten oder den Webhook-Zugriff für
   Stripe gemäß der Vercel-Schutzkonfiguration erlauben. Dabei Erfolg, Abbruch,
   Ablauf einer Reservierung, parallele Terminwahl und doppelte Webhooks prüfen.
6. Für den Livebetrieb getrennte Livezugänge in Production eintragen,
   `AUDIT_BOOKING_MODE=live` setzen und neu deployen. Für das Abschalten den
   Modus entfernen und neu deployen. Bereits laufende Zahlungen und
   Termine vor einer Abschaltung anhand des Stripe-Dashboards abgleichen.

Bezahlstatus und Kalendereinladung werden serverseitig abgeglichen. Für eine
fehlgeschlagene Einladung erneut den Stripe-Webhook zustellen. Bereits angelegte
Kalenderevents verwenden dieselbe ID. Umbuchung, Storno und Erstattungen werden
persönlich bearbeitet. Dabei die Reservierung in der Buchungsdatenbank und den
Kalendereintrag abgleichen.
