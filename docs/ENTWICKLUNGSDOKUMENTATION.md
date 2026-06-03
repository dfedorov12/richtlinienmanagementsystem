# DIHAG Richtlinienmanagementsystem (RMS)

Statisches Frontend (GitHub Pages, Vanilla JS) + **MSAL.js** → **Microsoft Graph** →
**SharePoint** als Datenbank. Mitarbeiter lesen veröffentlichte Richtlinien, bestätigen die
Kenntnisnahme und absolvieren einen Wissenstest. Admins verwalten Richtlinien & sehen den
Compliance-Status; Genehmiger geben Richtlinien frei.

Start-Inhalte: ISMS / ISO-27001-Richtlinien (Word/PDF bleiben in der ISMS-Bibliothek und
werden nur eingebettet/gelesen).

---

## 1. Architektur

| Datei | Inhalt |
|-------|--------|
| `index.html` | Boot-Screen, Sidebar + Topbar, alle Views (`data-view`) |
| `css/style.css` | Design-System (Inter, Primärblau `#1a56db`) |
| `js/auth.js` | MSAL 2.x Login (Single-Tenant), Token-Erwerb |
| `js/access.js` | Rollen Admin/Genehmiger/Mitarbeiter (`access-config.json`) |
| `js/sharepoint.js` | Graph-Datenschicht: Listen, ISMS-Dokumente, Vorschau, Mitarbeiter |
| `js/app.js` | App-Controller, gemeinsame Helfer, Mitarbeiter-Views |
| `js/quiz.js` | Wissenstest-Engine |
| `js/admin.js` | Verwaltung, Freigaben, Compliance, Einstellungen |

Globaler State, keine Build-Tools. Skripte werden klassisch geladen (Funktionen global).

---

## 2. Azure App-Registrierung

Client-ID `46c63ab1-1bd7-4774-b702-ed73a3f57072` · Tenant `fdb70646-023a-403b-a4b9-1f474a935123`.

### 2a. Plattform: Single-Page Application (SPA)
Redirect-URI: `https://dfedorov12.github.io/richtlinienmanagementsystem/`
(Custom Domain später als zweite SPA-Redirect-URI ergänzen.)
> Muss **SPA** sein (nicht „Web"), sonst scheitert der PKCE-Flow im Browser.
> Zum lokalen Testen zusätzlich `http://localhost:5500/` o. ä. als SPA-Redirect hinterlegen.

### 2b. Microsoft-Graph-Berechtigungen (Typ: **Delegiert**)

| Berechtigung | Zweck | Admin-Consent |
|--------------|-------|:-------------:|
| `User.Read` | Login + Profil | nein |
| `Sites.ReadWrite.All` | Listen lesen/schreiben | **ja** |
| `Files.ReadWrite.All` | ISMS-Dokumente lesen/einbetten + `access-config.json` | **ja** |
| `User.Read.All` | Mitarbeiterliste fürs Compliance-Dashboard | **ja** |
| `Mail.Send` | Zertifikat-/Erinnerungs-Mails (#8, #4) — Versand nur an eigene Firmendomain | **ja** |

Anschließend **„Admin-Consent erteilen"** klicken.

---

## 3. SharePoint einrichten

App-Daten liegen standardmäßig auf **`sites/IT`** (Konstante `SP.appSiteHost` in
`js/sharepoint.js` — bei anderer Site dort anpassen). Die Richtliniendokumente liegen auf
**`sites/ISMS`** (`SP.ismsSiteHost`).

### 3a. Liste „Richtlinien"
Interne Spaltennamen müssen **exakt** so heißen (beim Anlegen ohne Leerzeichen/Umlaute tippen):

| Spalte | SP-Typ | Hinweise |
|--------|--------|----------|
| `Title` | (vorhanden) | Name der Richtlinie |
| `Beschreibung` | Mehrere Zeilen Text (Nur-Text) | |
| `Kategorie` | Auswahl | z. B. ISO 27001, Datenschutz … |
| `DokumentUrl` | **Mehrere Zeilen Text (Nur-Text)** | webUrl (kein Hyperlink-Typ!) |
| `DokumentName` | Einzelne Textzeile | |
| `DokumentDriveId` | Einzelne Textzeile | Graph driveId |
| `DokumentItemId` | Einzelne Textzeile | Graph itemId |
| `Version1` | Einzelne Textzeile | z. B. „1.0" — **Achtung:** „Version" ist in SharePoint reserviert, daher Spaltenname `Version1` |
| `Status` | Auswahl | Werte **exakt**: `Entwurf`, `InReview`, `Veröffentlicht`, `Archiviert` |
| `Pflicht` | Ja/Nein | |
| `QuizErforderlich` | Ja/Nein | |
| `QuizBestehenProzent` | Zahl | Default 80 |
| `QuizJson` | Mehrere Zeilen Text (Nur-Text) | Fragen als JSON |
| `VeroeffentlichtAm` | Datum und Uhrzeit | |
| `FreigegebenVon` | Einzelne Textzeile | UPN des Genehmigers |
| `Zielgruppen` | Mehrere Zeilen Text (Nur-Text) | JSON-Array von Rollen; leer/`[]` = für alle |
| `WiederholungMonate` | Zahl | 0 = keine; sonst erneute Pflicht nach X Monaten |
| `NaechsteReview` | Datum und Uhrzeit | interner Review-Termin der Richtlinie |

### 3b. Liste „Bestaetigungen"

| Spalte | SP-Typ |
|--------|--------|
| `Title` | (vorhanden) — Schlüssel `UPN\|RichtlinieId\|Version` |
| `RichtlinieId` | Einzelne Textzeile |
| `RichtlinienVersion` | Einzelne Textzeile |
| `BenutzerUPN` | Einzelne Textzeile |
| `BenutzerName` | Einzelne Textzeile |
| `GelesenAm` | Datum und Uhrzeit |
| `QuizBestanden` | Ja/Nein |
| `QuizScore` | Zahl |
| `QuizVersuche` | Zahl |
| `AbgeschlossenAm` | Datum und Uhrzeit |

> Die App schreibt nur Spalten, die in der Richtlinien-Liste tatsächlich existieren
> (verhindert 400-Fehler bei fehlenden Spalten). Leere Datumsfelder werden weggelassen.

### 3b-2. Liste „Kurse" (optional, Beta für #10)
Nur nötig, wenn der Kurse-Reiter genutzt werden soll. Fehlt die Liste, zeigt der Reiter
einen Setup-Hinweis (kein Fehler).

| Spalte | SP-Typ |
|--------|--------|
| `Title` | (vorhanden) — Kursname |
| `Beschreibung` | Mehrere Zeilen Text |
| `RichtlinienIds` | Mehrere Zeilen Text (JSON-Array der Richtlinien-IDs) |
| `Status` | Auswahl (`Entwurf` / `Veröffentlicht`) |

### 3c. Rollen-Datei
Wird beim ersten Speichern über **Einstellungen** automatisch angelegt:
`Dokumente/Richtlinienmanagement/access-config.json`
```json
{
  "admins":     ["administrator@dihag.com"],
  "genehmiger": ["administrator@dihag.com"],
  "roles":      ["Geschäftsführung", "IT", "Produktion", "Qualitätsmanagement"],
  "userRoles":  { "max.muster@dihag.com": ["IT", "Qualitätsmanagement"] }
}
```
Bis die Datei existiert, gilt der Default aus `js/access.js` (`administrator@dihag.com` +
`fedorov@dihag.com` als Admin & Genehmiger; gängige Rollen vordefiniert).

### 3d. Rollen & Zielgruppen (zielgruppenspezifische Richtlinien)
- **Unternehmensrollen/Abteilungen** werden in den *Einstellungen* gepflegt (`roles`).
- Die **effektive Rolle** eines Mitarbeiters = seine **Azure-AD-Abteilung** (`department`,
  via Graph `/me`) **+** optionale **manuelle Zuordnung** (`userRoles`).
- Jede **Richtlinie** hat eine **Zielgruppe**: *Alle* (Default) oder bestimmte Rollen.
- Unter *Meine Richtlinien* sieht ein Mitarbeiter Richtlinien für **Alle** sowie alle, deren
  Zielgruppe eine seiner Rollen enthält. Das **Compliance-Soll** je Richtlinie zählt nur die
  Mitarbeiter der jeweiligen Zielgruppe.
> Tipp: Rollen-Namen am besten exakt wie die AD-Abteilungen benennen, dann greift die
> automatische Zuordnung ohne manuelle Pflege.

---

## 4. Datenfluss & Workflow

1. **Admin** legt Richtlinie an, ordnet ein ISMS-Dokument zu (Dokumentwähler durchsucht die
   ISMS-Bibliothek), pflegt optional einen Wissenstest, speichert → Status `Entwurf`.
2. „Speichern & zur Prüfung" → `InReview`.
3. **Genehmiger** prüft unter *Freigaben* und veröffentlicht → `Veröffentlicht`
   (setzt `VeroeffentlichtAm` + `FreigegebenVon`).
4. **Mitarbeiter** sieht die Richtlinie unter *Meine Richtlinien*: Dokument-Vorschau
   (Graph `preview`-Endpoint, Fallback „In SharePoint öffnen") → Kenntnisnahme → ggf. Wissenstest.
   Ergebnis landet in „Bestaetigungen".
5. **Compliance** vergleicht Soll (aktive Mitarbeiter aus Graph) mit Ist (Bestätigungen);
   CSV-Export möglich.
6. **Versionswechsel:** neue `Version` ⇒ alte Bestätigungen greifen nicht mehr ⇒ Status springt
   für alle zurück auf „Offen".

`QuizJson`-Format:
```json
[{ "frage": "…", "optionen": ["A","B","C"], "richtig": 1 }]
```

---

## 5. v1-Scope / später

**Enthalten:** Richtlinien-CRUD, Dokumenteinbettung, Kenntnisnahme, Wissenstest mit
Bestehensgrenze & Versuchen, Genehmiger-Workflow, Compliance-Dashboard + CSV, Rollenpflege.

**Bewusst später:** Kurs-Bündelung & Zertifikate, jährliche Wiederholungs-Automatik mit
Fristen/Erinnerungen, Zielgruppen je Richtlinie über M365-Gruppen.

---

## 6. Lokale Entwicklung

Reiner Static-Host genügt (z. B. VS Code „Live Server"). MSAL-Login erfordert eine in Azure
registrierte SPA-Redirect-URI — daher entweder direkt über GitHub Pages testen oder
`localhost` als zusätzliche Redirect-URI hinterlegen.

---

## 7. Genehmigungsverfahren & Power Automate

### 7a. Workflow
**Entwurf → Konformitätsprüfung → Freigabe → Veröffentlicht.**
- „Zur Konformitätsprüfung" setzt Status, `PruefungSeit` und sendet eine Mail an die Prüfer.
- Prüfer markieren **konform / nicht konform** (mit Anmerkung). Bei Konformität gemäß
  Schwelle (`alle` / `einer`) → Status **Freigabe** + Mail an die Geschäftsleitung.
- GL gibt frei (Schwelle `alle` / `einer`) → Status **Veröffentlicht**.
- „Nicht konform" → bleibt in Konformitätsprüfung (Votes/Anmerkungen sichtbar).

### 7b. SharePoint-Vorbereitung
- **Status-Auswahl** um die Werte **`Konformitätsprüfung`** und **`Freigabe`** erweitern.
- Neue Spalten: `KonformitaetJson` (Mehrere Zeilen Text), `FreigabeJson` (Mehrere Zeilen Text),
  `PruefungSeit` (Datum und Uhrzeit).
- Importierte Dokumente landen in der App-Bibliothek im Ordner `Richtlinien-Import/`.

### 7c. Rollen (Einstellungen → `access-config.json`)
`pruefer` + `geschaeftsleitung` (UPN-Listen), `konformSchwelle`/`freigabeSchwelle`
(`alle`|`einer`), `eskalationMail`.

### 7d. Zeitgesteuerte Erinnerungen & Eskalation (GitHub Actions, gewählter Weg)
Die App sendet nur die **Erst-Benachrichtigung** (beim Einreichen). Die wiederkehrenden
Erinnerungen + Eskalation laufen **serverseitig unbeaufsichtigt** – die Browser-App kann das
nicht, weil ihr Code nur läuft, solange jemand die Seite offen hat. Umgesetzt als
**GitHub-Action-Cron** + App-only-Skript: **`.github/workflows/erinnerungen.yml`** ruft täglich
**`scripts/erinnerungen.mjs`** auf (abhängigkeitsfreies Node 20). Vollständige Einrichtung:
**`docs/ERINNERUNGEN-GITHUB-ACTIONS.md`**.

Ablauf des Skripts:
1. **App-only-Token** (Client-Credentials) holen.
2. **access-config.json** + Liste **„Richtlinien"** über Graph lesen.
3. Pro Richtlinie mit Status `Konformitätsprüfung`/`InReview` (→ `pruefer`) bzw.
   `Freigabe` (→ `geschaeftsleitung`):
   - `tage = differenceInDays(PruefungSeit, now)`
   - **Erinnerung fällig?** `(tage < 7 && tage%7==0) || (tage >= 7 && (tage-7)%3==0)`
     → Tag 7, 10, 13, … (Woche 1 eine Erinnerung, ab Woche 2 alle 3 Tage; Tag 0 entfällt).
   - **Offene Empfänger:** Rolle minus die, die in `KonformitaetJson` / `FreigabeJson` schon abgestimmt haben.
   - Wenn fällig & offen → Mail an die offenen Empfänger (nur eigene Firmendomain).
   - **Eskalation:** `tage >= ESKALATION_AB_TAGEN` (Default 14) → zusätzlich `eskalationMail`.

**Benötigt** (siehe Detail-Doku): Graph-**APPLICATION**-Rechte `Sites.Read.All` + `Mail.Send`
(Admin-Consent) und ein **Client-Secret** an derselben App-Registrierung; GitHub-Secrets
`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `MAIL_SENDER`. **Sicherheit:**
`Mail.Send` als App darf als *jedes* Postfach senden → per **Application Access Policy** auf ein
einziges Absender-Postfach einschränken (PowerShell in der Detail-Doku). Workflow läuft nur per
`schedule`/`workflow_dispatch`, nie bei Fork-PRs → Secrets bleiben geschützt.

> `KonformitaetJson`-Format: `[{ "upn": "...", "name": "...", "entscheidung": "konform|nicht_konform", "anmerkung": "...", "datum": "ISO" }]`
> `FreigabeJson`-Format: `[{ "upn": "...", "name": "...", "datum": "ISO" }]`

> **Alternative (ohne GitHub Actions):** derselbe Ablauf lässt sich als geplanter **Power-Automate**-
> Flow (Wiederkehrend täglich → access-config lesen → Richtlinien filtern → Mail) oder als
> **Azure Function/Logic App (Timer)** bauen. GitHub Actions wurde gewählt, weil das Repo ohnehin
> dort liegt und kein zusätzlicher Dienst nötig ist.
