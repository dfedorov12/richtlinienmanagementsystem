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
