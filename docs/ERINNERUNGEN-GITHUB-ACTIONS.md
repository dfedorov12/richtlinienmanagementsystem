# Zeitgesteuerte Erinnerungen & Eskalation – Einrichtung (GitHub Actions)

Die Browser-App kann **keine** zeitgesteuerten Erinnerungen senden (ihr Code läuft nur, wenn
jemand die Seite offen hat). Deshalb läuft die wiederkehrende Erinnerung + Eskalation als
**GitHub-Action-Cron**, der unbeaufsichtigt im Tenant Mails verschickt.

- Workflow: `.github/workflows/erinnerungen.yml` (täglich 06:00 UTC + manuell startbar)
- Skript: `scripts/erinnerungen.mjs` (Node 20, **keine** npm-Abhängigkeiten)

**Taktung:** Tag 7, 10, 13, 16, … (Woche 1 eine Erinnerung, ab Woche 2 alle 3 Tage; Tag 0 entfällt,
da beim Einreichen bereits die Erst-Benachrichtigung der App rausgeht).
**Eskalation:** ab 14 Tagen (anpassbar) zusätzlich an die Ersatz-Mail (`eskalationMail` aus den
Einstellungen). Empfänger werden **immer** auf die eigene Firmendomain beschränkt.

---

## Schritt 1 – Azure: Application-Rechte + Client-Secret

Im **Azure-Portal → App-Registrierungen → „DIHAG Cron-Job"** (`089bf9ad-2d9a-4cbc-b85d-88b4484af0bb`):

> Eigene, von der Web-App getrennte App-Registrierung für unbeaufsichtigte Cron-Jobs (für
> mehrere Themen wiederverwendbar). Sie braucht **Anwendungsberechtigungen** (nicht delegiert)
> und ein **Geheimnis**.

1. **API-Berechtigungen → Berechtigung hinzufügen → Microsoft Graph → _Anwendungsberechtigungen_:**
   - `Sites.Read.All`  (Liste „Richtlinien" + `access-config.json` lesen)
   - `Mail.Send`       (Erinnerungs-Mails senden)
   → danach **„Administratorzustimmung erteilen"** klicken (beide müssen „Erteilt" zeigen).
2. **Zertifikate & Geheimnisse → Neuer geheimer Clientschlüssel:** Beschreibung z. B.
   „RMS-Erinnerungen", Laufzeit wählen (z. B. 24 Monate) → **Wert sofort kopieren**
   (wird nur einmal angezeigt). Das ist dein `AZURE_CLIENT_SECRET`.
   - 🔔 **Ablauf vormerken!** Vor Ablauf neues Secret erzeugen und das GitHub-Secret aktualisieren,
     sonst stoppen die Erinnerungen.

## Schritt 2 – Mail.Send auf EIN Postfach einschränken (Sicherheit)

`Mail.Send` als Anwendung erlaubt sonst den Versand **als jedes Postfach** im Tenant. Mit einer
**Application Access Policy** wird die App auf genau ein Absender-Postfach begrenzt (empfohlen).

Lege ein Absender-Postfach fest (z. B. eine Funktions-/Shared-Mailbox `richtlinien@dihag.com`,
alternativ ein vorhandenes Postfach). Dann in **Exchange Online PowerShell**:

```powershell
Connect-ExchangeOnline

# (einmalig) eine Mail-aktivierte Sicherheitsgruppe mit dem erlaubten Absender-Postfach:
New-DistributionGroup -Name "RMS-Mailsender" -Type Security `
  -Members "richtlinien@dihag.com" -PrimarySmtpAddress "rms-mailsender@dihag.com"

# App auf diese Gruppe einschränken (AppId = Client-ID der App-Registrierung):
New-ApplicationAccessPolicy -AppId "089bf9ad-2d9a-4cbc-b85d-88b4484af0bb" `
  -PolicyScopeGroupId "rms-mailsender@dihag.com" -AccessRight RestrictAccess `
  -Description "RMS-Erinnerungen darf nur als richtlinien@dihag.com senden"

# Test:
Test-ApplicationAccessPolicy -Identity "richtlinien@dihag.com" `
  -AppId "089bf9ad-2d9a-4cbc-b85d-88b4484af0bb"   # → AccessCheckResult: Granted
```

Das so gewählte Postfach ist `MAIL_SENDER` (Schritt 3). Die Firmendomain dieses Postfachs
bestimmt zugleich, an wen überhaupt gesendet werden darf.

## Schritt 3 – GitHub: Secrets hinterlegen

Repo **`dfedorov12/richtlinienmanagementsystem` → Settings → Secrets and variables → Actions →
New repository secret** – vier Stück:

| Secret | Wert |
|---|---|
| `AZURE_TENANT_ID` | `fdb70646-023a-403b-a4b9-1f474a935123` |
| `AZURE_CLIENT_ID` | `089bf9ad-2d9a-4cbc-b85d-88b4484af0bb` (App „DIHAG Cron-Job") |
| `AZURE_CLIENT_SECRET` | der in Schritt 1 kopierte Geheimnis-**Wert** (steht in keiner Datei!) |
| `MAIL_SENDER` | das Absender-Postfach, z. B. `richtlinien@dihag.com` |

> Secrets sind verschlüsselt und werden Fork-Pull-Requests **nicht** zugänglich gemacht. Der
> Workflow startet ohnehin nur per Zeitplan oder manuell – nie durch fremde PRs.

## Schritt 4 – Testlauf (ohne echte Mails)

Repo **→ Actions → „Richtlinien-Erinnerungen" → Run workflow** → `dry_run = true` → starten.
Im Log siehst du, welche Richtlinien fällig wären und an wen gesendet **würde**, ohne dass eine
Mail rausgeht. Für einen echten Sofort-Versand: `dry_run = false`.

Danach läuft der Cron automatisch täglich. Das Skript entscheidet selbst, ob „heute" ein
Erinnerungstag ist (Tag 7/10/13/…), und sendet nur dann.

---

## Voraussetzungen aus der App-Konfiguration

Das Skript liest dieselbe `access-config.json` wie die App. Damit Erinnerungen sinnvoll greifen:

- **Prüfer** und **Geschäftsleitung** in den App-**Einstellungen** pflegen.
- Optional **Ersatz-Empfänger** (`eskalationMail`) setzen (für die Eskalation ab 14 Tagen).
- Richtlinien müssen die Spalten `Status`, `PruefungSeit`, `KonformitaetJson`, `FreigabeJson`
  haben (siehe Hauptdoku Abschnitt 7b).

## Optionale Feineinstellungen (Workflow-`env`)

Im Skript per Umgebungsvariable überschreibbar (Defaults in Klammern):

| Variable | Default | Zweck |
|---|---|---|
| `ESKALATION_AB_TAGEN` | `14` | ab wann zusätzlich an `eskalationMail` |
| `SITE_HOST` | `dihag.sharepoint.com:/sites/IT` | SharePoint-Site der App-Listen |
| `POLICY_LIST` | `Richtlinien` | Listenname |
| `CONFIG_FOLDER` | `Richtlinienmanagement` | Ordner der `access-config.json` |
| `APP_URL` | `https://dfedorov12.github.io/richtlinienmanagementsystem/` | Link in der Mail |

Cron-Zeit ändern: in `erinnerungen.yml` den `cron`-Ausdruck anpassen (UTC!).

## Troubleshooting

- **„Token (401/invalid_client)"** → Client-Secret falsch/abgelaufen oder falsche `AZURE_CLIENT_ID`.
- **„GET … (403)"** → Application-Rechte fehlen oder kein Admin-Consent (Schritt 1).
- **sendMail 403 `ErrorAccessDenied`** → Application Access Policy greift nicht für `MAIL_SENDER`,
  oder `Mail.Send` fehlt/ohne Consent.
- **„keine gültigen Empfänger"** → Prüfer/GL-UPNs liegen außerhalb der `MAIL_SENDER`-Domain, oder
  Rollen in den Einstellungen leer.
- **Nichts passiert, kein Fehler** → heute ist kein Erinnerungstag (Tag 1–6/8/9/…), oder alle
  Empfänger haben bereits abgestimmt. Mit `dry_run=true` nachvollziehbar.
