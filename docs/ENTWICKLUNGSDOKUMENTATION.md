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

### 7e. Ein-Klick-Entscheidung aus der Mail (eigener Weg)
Die Workflow-Mails tragen ein **Einmal-Token** der laufenden Runde
(`p.aktionToken = {wert, art, erstelltAm}` im Sammelfeld `DatenJson`, erzeugt bei jedem
Rundenwechsel: Einreichen zur Prüfung, Übergang zur Freigabe, nach der Mitbestimmung).
Der Link `?richtlinie=…&ansicht=freigaben&aktion=freigeben&t=…` landet in
`einKlickAktion()` (`js/freigaben.js`): Status passend? Berechtigung (inkl. Vertretung)?
Token gültig? Dann wird **ohne Rückfrage** ausgeführt und nur das Ergebnis gezeigt;
`freigabeZuruecknehmen()` nimmt einen Fehlklick protokolliert zurück. Fehlt das Token
oder passt es nicht, bleibt es beim gewohnten Weg mit Rückfrage – so bleiben alte Mails
harmlos, statt Fehler zu werfen.

**Warum nicht nur ein Link ohne Anmeldung:** Ein GET aus Outlook trägt keine Identität.
Ein Token beweist, dass der Klick zu *dieser Runde* gehört, nicht *wer* geklickt hat –
bei Weiterleitung oder Postfachvertretung fällt das auseinander. Die stille Anmeldung
(SSO) kostet praktisch nichts und macht aus dem Klick einen belastbaren Nachweis.
Der Erinnerungs-Cron hängt dasselbe Token an seine Links (`aktionToken(f, art)`).

### 7f. Bekanntgabe an die Zielgruppe
Bis August 2026 erfuhr die Zielgruppe von einer Veröffentlichung nur beim Öffnen der
App; die erste Mail war die Kenntnisnahme-Erinnerung nach sieben Tagen – gemahnt wurde
also, wer nie informiert worden war. Jetzt fragt `markFreigabe()` beim Veröffentlichen,
ob die Zielgruppe informiert werden soll, und `notifyZielgruppe()` schickt die Mitteilung.

**Über Verteiler, nicht über Einzeladressen.** `zielgruppenMails` in der access-config
bildet Rolle → Gruppenadresse ab (plus `ALLE`); `mailsFuerZielgruppen()` löst die
Zielgruppen eines Regelwerks darauf ab, meldet fehlende Zuordnungen und lässt „ALLE"
alles andere schlagen. Exchange übernimmt die Verteilung und kennt die Mitglieder –
die App muss keine Empfängerlisten aufbauen und pflegen. `zielgruppenDomains()` gibt die
Domains der hinterlegten Verteiler als `extraDomains` an `spSendMail()` weiter, damit auch
Gruppen der Gruppengesellschaften erreichbar sind (dieselbe Begründung wie bei den
BR-Adressen: admin-gepflegt).

Nachholen und Wiederholen über `zielgruppeInformieren(id)` („📣 Zielgruppe informieren"
im Audit Report). `zielgruppeBekanntgabeVermerken()` schreibt Zeitpunkt (`bekanntgabeAm`)
und Empfänger in die Historie – damit ist die Bekanntgabe nachweisbar (ISO 27001 A.6.3,
Klausel 7.3).

Abgesichert in `tests/bekanntgabe.test.mjs`.

### 7g. Vertretung (Urlaub, Krankheit)
`vertretungen: { "<upn>": { vertreter, von, bis } }` in der access-config, gepflegt in den
Einstellungen. `vertretungAktiv()` prüft den Zeitraum (beide Tage inklusive, leere Werte =
unbefristet bzw. einseitig offen). Die Rollenprüfungen laufen über `_hasOderVertritt()`,
Empfängerlisten über `mitVertretern()`, und `vertretungFuerAus()` liefert den Vermerk
`fuer` im Votum – Anzeige und Audit Report schreiben daraus „in Vertretung für …".
Der Cron kennt dieselbe Logik (`mitVertretern`, `abgestimmtVon`, `erledigt`): Hat die
Vertretung entschieden, ruht die Mahnung für die vertretene Person und umgekehrt.

Abgesichert in `tests/vertretung.test.mjs`.

### 7h. Freigabe per Klick in Outlook über Power Automate
Der empfohlene Weg ist der **Approvals-Connector** von Power Automate: Der Klick hängt am
M365-Konto, Microsoft übernimmt Karte, Erinnerungen und Mobilgeräte. Schritt für Schritt in
**`docs/GENEHMIGUNG-POWER-AUTOMATE.md`** (dort auch der Vergleich mit einem eigenen HTTP-Trigger
und mit Actionable Messages).

App-Seite ist dafür fertig: Der Schalter `genehmigungPAScope` (`aus` | `gl` | `alle`) schaltet die
eigene Mail der betroffenen Etappe ab (`js/freigaben.js`), der Audit Report leitet aus
`FreigegebenVon` das Ereignis „Freigabe erteilt (Outlook / Power Automate)" ab, und
`historieMitOutlookFreigabe()` (`js/admin.js`) ergänzt denselben Eintrag in der Historie des
Regelwerks – rein anzeigend, geschrieben wird dabei nichts. Schreibt der Flow zusätzlich
`FreigabeJson` (Ausdruck in A6a der Anleitung), ist die Freigabe von einer im Portal erteilten
nicht mehr zu unterscheiden.

> **Alternative (ohne GitHub Actions):** derselbe Ablauf lässt sich als geplanter **Power-Automate**-
> Flow (Wiederkehrend täglich → access-config lesen → Richtlinien filtern → Mail) oder als
> **Azure Function/Logic App (Timer)** bauen. GitHub Actions wurde gewählt, weil das Repo ohnehin
> dort liegt und kein zusätzlicher Dienst nötig ist.

---

## KI-Dashboard-Integration unter `/ki/` (Stand 2026-06-11)

Das KI-Dashboard (KI-Antragsworkflow, Lizenzen, KI-Register) läuft als Unterseite
**https://rms.dihag.de/ki/** in diesem Repo (`ki/`).
Die alten Deployments (`ki-dashboard`/`ki-dashboard-test`, ki-dashboard.dihag-extern.com)
sind nur noch Weiterleitungsseiten (inkl. `?antrag=…`-Deep-Link-Übernahme) und archiviert.

**Architektur**
- `ki/index.html` nutzt die RMS-Shell (Sidebar/Topbar/Boot) aus `css/style.css`;
  `ki/style.css` enthält nur KI-Komponenten.
- Auth über `js/auth.js` (gleiche App-Registrierung `46c63ab1`, sessionStorage → SSO).
  Redirect-URI ist die App-Wurzel; `auth.js` leitet per MSAL-`state` zur Unterseite zurück.
- Scopes: `Sites.ReadWrite.All`, `Files.ReadWrite.All`, `User.Read.All`, `Mail.Send`
  (alle bereits konsentiert — kein zusätzlicher Azure-Consent nötig).

**Berechtigungen & Einstellungen (zentral in `access-config.json`)**
- `admins` → KI-Admin (Einstellungen-Tab) · `kiGenehmiger` → KI-Gremium
  (ist `kiGenehmiger` leer, gilt die allgemeine `genehmiger`-Liste).
  Pflege: RMS → Einstellungen → Karte „KI-Gremium".
- KI-Einstellungen ebenfalls zentral: `kiGenehmigungsmodus` (einstimmig/einer),
  `kiMailBeiEinreichung`, `kiMailBeiEntscheidung`, `kiMailDomains`
  (Empfänger-Whitelist, Default `dihag.com`). Speichern = read-modify-write,
  RMS-Felder bleiben erhalten (access.js schleift unbekannte Felder durch).

**Anhänge**: Graph-Dokumentbibliothek, Ordner `KI-Antraege-Anhaenge/{Antrag-ID}/`
(Upload-Session für Dateien >4 MB). **Alt-Anhänge** alter Anträge liegen als
SP-Listenanhänge und sind unter `/ki/` nur sichtbar, wenn der App-Registrierung
die delegierte SharePoint-Berechtigung (z. B. `AllSites.FullControl`) erteilt wird —
alternativ einmalig manuell in die neuen Ordner kopieren.

**Demo-Modus**: `…/ki/?demo=1` blendet die KI-Vorschläge-Sidebar ein (vorbefüllte Beispiele).

**CI/Workflows**
- `cache-bust.yml`: ersetzt `?v=…` nach jedem Push durch den Commit-SHA
  ([skip ci]-Loop-Schutz) — manuelles Hochzählen entfällt.
- `syntax-check.yml`: `node --check` über alle JS-Dateien bei jedem Push.

**Offene manuelle Punkte (M365-Admin)**
1. *Application Access Policy* für die Cron-App `089bf9ad` (Mail.Send einschränken):
   ```powershell
   Connect-ExchangeOnline
   New-ApplicationAccessPolicy -AppId 089bf9ad-2d9a-4cbc-b85d-88b4484af0bb `
     -PolicyScopeGroupId absender-postfach@dihag.com -AccessRight RestrictAccess `
     -Description "Cron darf nur als dieses Postfach senden"
   Test-ApplicationAccessPolicy -AppId 089bf9ad-2d9a-4cbc-b85d-88b4484af0bb -Identity absender-postfach@dihag.com
   ```
2. Spalten/Status-Choices der Liste „Richtlinien" (siehe Banner in „Richtlinien verwalten").
3. Optional: SharePoint-Delegated-Consent für Alt-Anhänge (siehe oben).

---

## Reiter „ISMS-Dokumente" (Admin, Stand 2026-06-15)

Eigener Sidebar-Reiter (admin-only) der **alle Dateien der ISMS-Bibliothek**
(`sites/ISMS` → „ISMS Dokumente") anzeigt und bearbeitbar macht.

**Dateien:** `js/ismsdocs.js` (View/Editor), Datenschicht in `js/sharepoint.js`,
View `#view-ismsdocs` + Nav `#nav-ismsdocs` in `index.html`, Dispatch in
`app.js` (`switchView`/`PAGE_TITLES`) und `access.js` (`initRoleNav`).

**Datenschicht (sharepoint.js):**
- `spGetIsmsDocs()` – alle Dateien via `/drives/{id}/list/items?expand=fields,driveItem`
  (Metadaten + Datei-Infos, mit Paging); Ordner werden übersprungen.
- `spGetIsmsColumns()` – bearbeitbare Bibliotheks-Spalten dynamisch (ReadOnly/Hidden/
  System raus); Person/Lookup werden nur angezeigt.
- `spSaveIsmsItemFields(itemId, fields)` – Metadaten-PATCH auf das Listenelement.
- `spIsmsUploadVersion(driveItemId, bytes, type)` – Datei-Inhalt ersetzen = neue Version.
- Vorschau/Versionen über bestehende `spGetPreviewUrl` / `spGetDocVersions`.

**Funktionen im UI:** Tabelle (Name, Ordner, Version, Größe, geändert von/am) mit
Suche + Ordnerfilter; Editor-Modal mit dynamischem Metadaten-Formular, Datei-Aktionen
(in SharePoint öffnen, Vorschau, neue Version, Versionsverlauf) und
„Als Richtlinie übernehmen" (legt eine neue Richtlinie mit vorverknüpftem Dokument an).

**Voraussetzung Schreiben:** Das Bearbeiten von Metadaten/Datei läuft im delegierten
Flow – das angemeldete Konto braucht **Schreibrechte auf `sites/ISMS`**. Ohne sie
funktioniert die Anzeige, das Speichern scheitert mit klarer Fehlermeldung.

### ISMS-Reiter: ISO-Fokus, Versionierung, Änderungsvorschläge (2026-06)

- **ISO-27001-Fokus:** Ordnerfilter steht standardmäßig auf dem obersten
  `ISO27001`-Ordner (Präfix-Match inkl. Unterordner; umschaltbar auf „Alle Ordner").
- **Performance:** Liste lädt schlank (`$select` nur Title/_UIVersionString +
  nötige driveItem-Felder, `$top=500`, Fallback ohne select); volle Metadaten lazy
  beim Öffnen (`spGetIsmsItemFields`).
- **Versionierung mit Pflicht-Notiz:** „⬆ Neue Version" → Modal mit Datei +
  Pflicht-Änderungsnotiz. `spIsmsUploadVersion` nutzt Check-out → Upload →
  Check-in(comment) (Notiz als SP-Versionskommentar), mit `finally`-Wieder-Einchecken
  gegen hängende Auscheckung; Bibliotheken ohne Check-out fallen auf einfachen
  Upload zurück. Hinweis: Graph liefert Versionskommentare nicht zurück → der
  Versions-Dialog verlinkt auf den SharePoint-Versionsverlauf.
- **Änderungsvorschläge per Mail:** „✏️ Änderung vorschlagen" für JEDEN
  angemeldeten Mitarbeiter im Detail-Reader (`proposePolicyChange`) und für Admins
  im ISMS-Editor (`proposeIsmsChange`). Modal → `spSendMail` an Dokument-
  Verantwortliche (Metadaten-Spalte /verantwort|owner|ansprech/) + ISMS-
  Verantwortliche (Einstellungen, Feld `ismsVerantwortlich`) + Admin-Fallback.
  Versand respektiert die interne Domain-Whitelist von spSendMail.

---

## Ladezeit: Start und Dokument-Reiter (Stand 2026-08-18)

Die App ist statisch – gefühlte Geschwindigkeit entsteht fast nur daraus, wie
viele Graph-Anfragen **nacheinander** laufen müssen. Deshalb:

**Start (`bootApp` → `spInit`)**
- `spInit()` läuft genau **einmal**: alle Aufrufer teilen sich `_spInitLaeuft`.
  Vorher riefen `spGetPolicies()` und `spGetAcknowledgements()` (parallel gestartet)
  beide die volle Ermittlung auf, bevor `_sp.ready` stand – alles doppelt.
- Site → dann **gemeinsam** beide Listen-IDs und die Dokumentbibliothek
  (`Promise.all`), statt drei Anfragen hintereinander.
- Die **Spalten** beider Listen (`_spSpaltenLaden`) laufen nebenher und halten den
  Start nicht auf. Schreibpfade warten über `_spSpalten()` darauf, weil nur
  vorhandene Felder gesendet werden dürfen; die „fehlende Spalten"-Warnung
  schweigt, solange sie nichts weiß, und meldet sich per Event
  `rms-spalten-geladen` nach (siehe `admin.js`).
- Die ermittelten IDs liegen im `localStorage` (`rms_sp_ids_v1`, 7 Tage, an
  `SP.appSiteHost` gebunden). Ein warmer Start spart die komplette Suche.
  Wird eine Liste neu angelegt, antwortet Graph mit 404 → `_spNeuErmitteln()`
  verwirft den Cache und versucht **einmal** neu.
- Regelwerke, Bestätigungen und die eigene Abteilung hängen weder an
  `access-config.json` noch an den Rollen → sie laden parallel dazu
  (`reloadData({ rendern: false })`). Gerendert wird erst, wenn die Rollen da
  sind – sonst zeigte „Meine Regelwerke" kurz zu wenig.

**Dokument-Reiter (IMS, Governance-Board)**
- Ordner werden mit `_parallel(..., 4)` gleichzeitig eingesammelt statt einer nach
  dem anderen; vier ist die Grenze, ab der Graph mit 429 drosselt. Das Ergebnis
  wird danach nach Ordner/Name sortiert, damit die Reihenfolge stabil bleibt.
- Zwischenstände werden **gebündelt** gezeichnet (max. alle 250 ms). Jede geladene
  Seite die ganze Tabelle samt Ordnerbaum neu aufzubauen kostete bei vielen
  Ordnern mehr Zeit als das Laden selbst.

Abgesichert in `tests/tempo.test.mjs`.


---

## Reiter-Berechtigungen: eigener Bereich und Sicherheitsgruppen (Stand 2026-08-19)

**Oberfläche** (`js/einstellungen.js`): Die Einstellungen haben zwei Bereiche
(`_cfgBereich`: `rollen` | `reiter`), umschaltbar über eine Segmentleiste. Der
Entwurf `_cfgEdit` überlebt den Wechsel – ungespeicherte Änderungen bleiben.
Der Rechte-Bereich ist breiter (1100 statt 680 px), weil er eine Matrix trägt:
Zeile = Träger, Spalte = Reiter (`GOVERNABLE_TABS[].kurz`), Zelle = `–` / `L` /
`S`. `rrCycle()` schaltet eine Zelle weiter, `rrToggleOffen()` klappt die Zeile
mit der ausführlichen Ansicht auf. `_rrEintraege()`, `_rrStufe()` und
`_rrGefiltert()` rechnen ohne DOM und sind einzeln getestet.

**Träger** sind Personen (E-Mail, wie bisher), Rollennamen (Altbestand) – und
**Gruppen**: Sicherheits-, Verteiler- und Microsoft-365-Gruppen. Für die
Auswertung sind sie gleichwertig; entscheidend ist allein die Mitgliedschaft.
Sie stehen als `gruppe:<Objekt-ID>` in denselben Listen
(`reiterRechte[view].lesen/schreiben`); Anzeigename und Art liegen getrennt unter
`gruppenNamen` / `gruppenTypen` (`sicherheit` | `verteiler` | `m365`) und werden
beim Speichern auf die tatsächlich berechtigten Gruppen eingedampft. Gespeichert
wird die ID, nicht der Name: Eine umbenannte Gruppe verlöre sonst still ihre
Rechte. `gruppenArtVon()` (sharepoint.js) leitet die Art aus `groupTypes` /
`securityEnabled` / `mailEnabled` ab; gesucht wird über `displayName` **und**
`mail`, weil Verteiler meist unter ihrer Adresse bekannt sind. Nicht möglich sind
**dynamische** Verteilerlisten: Die leben nur in Exchange, nicht im Verzeichnis.

**Auswertung** (`js/access.js`): `_matchesUserOrRole()` prüft Gruppen-Einträge
gegen `State.myGroups` – die Gruppen des angemeldeten Kontos, in `bootApp`
parallel zum übrigen Laden geholt (`spGetMyGroups()`), fertig bevor
`initRoleNav()` die Reiter berechnet. Die Auflösung passiert erst, wenn wirklich
eine Gruppe in der Liste steht.

**Berechtigungen:** `spGetMyGroups()` liest `/me/transitiveMemberOf` (Rückfall
`/me/memberOf`) mit den bereits erteilten Scopes – **keine neue
Zustimmungsabfrage** beim Anmelden. Klappt es doch nicht, merkt sich
`spGruppenLesbar()` das, die Einstellungen zeigen einen Hinweis, und
personenbezogene Freigaben arbeiten unverändert weiter. Die **Suche** im
Verzeichnis (`spSearchGroups()`) braucht mehr Rechte; scheitert sie, bietet die
Oberfläche die eigenen Gruppen des Admins an und sonst die Eingabe der
Objekt-ID (GUID-geprüft).

Abgesichert in `tests/reiter-berechtigungen.test.mjs`.


---

## Lernvideos, Kenntnisnahme-Erinnerungen, Pflicht-Dokumentenart (Stand 2026-08-19)

**Lernvideos.** `videoEinbettung()` in `js/util.js` deutet die Eingabe: ein ganzes
`<iframe>`-Schnipsel (so kopiert man es aus Stream/SharePoint), eine embed.aspx-Adresse,
YouTube oder Vimeo → `{art:'einbetten'}`; alles andere → `{art:'link'}`. Eingebettet wird
nur, was sich nachweislich einbetten lässt – ein leerer Rahmen durch `X-Frame-Options`
wäre schlechter als ein ehrlicher Link. Gespeichert werden die Videos als
`videos: [{titel,url}]` im **Sammelfeld `DatenJson`** (`POLICY_EXT_FIELDS`), also **ohne
neue SharePoint-Spalte**. Editor: `renderVideoEditorSection()` in `js/admin.js`, Anzeige:
`renderLernvideos()` in `js/app.js` (unter der Dokumentvorschau, damit das Lese-Gate am
Dokument hängt), Layout in `css/style.css` (`.lernvideo-*`, 16:9 über padding-top).

**Kenntnisnahme-Erinnerungen** (`scripts/erinnerungen.mjs`). Neuer Block nach der
Workflow-Schleife: veröffentlichte Pflicht-Regelwerke → Zielgruppe auflösen → offene
Bestätigungen finden → **eine** Mail je Person über alle ihre offenen Regelwerke.
Reine Helfer, einzeln testbar: `zielgruppeTrifft()`, `rollenVon()`, `kenntnisOffen()`
(berücksichtigt Wiederholungspflicht wie `isExpired()` in der App). Taktung aus der
Konfiguration: `kenntnisErinnerungAktiv`, `kenntnisErsteNachTagen` (7),
`kenntnisDannAlleTage` (7), `kenntnisEskalationAbTagen` (21), `kenntnisEskalationMail`
(leer = `eskalationMail`). Die Eskalation ist eine Sammelmeldung an eine Stelle, nicht an
Vorgesetzte.

Der Teil braucht zusätzlich das **Anwendungsrecht `User.Read.All`** (Zielgruppen über
`department` auflösen). Fehlt es, wird nur dieser Block übersprungen und die Ursache ins
Protokoll geschrieben – der übrige Lauf bleibt unberührt.

**Dokumentenart ist Pflicht.** `savePolicy()` prüft `regelwerkTyp` direkt nach dem Titel;
im Editor mit `*` gekennzeichnet. Vorher bewusst optional (Migration von Altbestand) –
eingeführt war zu dem Zeitpunkt noch nichts, also fällt die Ausnahme weg.

Abgesichert in `tests/lernvideos.test.mjs` und `tests/kenntnis-erinnerung.test.mjs`.


---

## Reiter „Governance-Struktur" (Stand 2026-08-20)

Matrix **Kategorie × Dokumentenart** über das Konzernregelwerk, in der Gruppe
*Corporate Governance* direkt unter dem Governance-Board – und zugleich die
Arbeitsfläche des Boards: vollständig bearbeitbar.

**Startbestand** (`js/govstruktur.js`, oberer Teil): `GOV_ARTEN` (die sieben Ebenen der
Regelwerkspyramide plus „Weitere" für Muster/Vorlagen), `GOV_KATEGORIEN`,
`GOV_EINTRAEGE` (je Regelung: Kategorie, Art, Titel, Verantwortung, Stand, dazu
Dokumentname/Version/Datum, soweit gepflegt) und `GOV_WEITERE` (Leitbild,
Unternehmenspolitik, KBV – gleiche Mappe, außerhalb der Pyramide). Erzeugt aus der
Excel-Mappe:

```
python scripts/govstruktur-import.py "…/CGB_Organisation_Zuständigkeiten_Nomenklatur.xlsx"
```

Das Skript ersetzt nur den Kopf der Datei bis zur Marke „Ansicht". Zwei Fallstricke der
Mappe sind darin abgebildet: Zeilen ohne Eintrag in *Verantwortung* sind
Zwischenüberschriften (werden übersprungen), und die Art ergibt sich aus dem **Titel**,
nicht aus der Überschrift – unter „…_Konzernrichtlinien und Policy" stehen beide Arten
gemischt. Der Stand kommt aus dem Änderungsdatum der Mappe.

**Arbeitsstand und Speicherung.** Zur Laufzeit hält `_gsDaten` den bearbeiteten Stand.
Beim Öffnen lädt `spLoadGovStruktur()` die Datei `governance-struktur.json` aus dem
Konfigurationsordner (neben `access-config.json`); fehlt sie, gilt eine tiefe Kopie des
Startbestands – die Konstanten selbst werden nie verändert. Jede Änderung speichert
sofort (`gsSpeichern()` → `spSaveGovStruktur()`), es gibt keinen Sammel-Speichern-Knopf.
Gegen gegenseitiges Überschreiben vergleicht `gsSpeichern()` vorher den
Änderungszeitstempel (`spGovStrukturMeta()`) mit dem beim Laden gemerkten und fragt bei
Abweichung nach.

**Versionsverlauf.** Jede Änderung schreibt über `gsSpeichern(meldung, was)` einen Eintrag in
`_gsDaten.historie` (`{am, upn, name, was}`, neueste zuerst, gekappt bei `GS_VERLAUF_MAX` = 100).
Über der Matrix steht die jüngste Änderung mit Urheber und Zeitpunkt, `gsVerlaufZeigen()` listet
alle. Ältere Fassungen der Datei selbst bewahrt SharePoint als Dokumentversionen auf – ein
Wiederherstellen des Startbestands aus dem Code gibt es bewusst nicht mehr: Es hätte die
gepflegte Fassung überschrieben.

**Verschieben.** Kacheln sind `draggable`; Zellen nehmen sie über
`gsZiehUeber`/`gsZiehAblegen(ev, td, kategorieIndex, artIndex)` entgegen und setzen Kategorie und
Art des Eintrags neu. Die Zellen bekommen **Indizes** statt Namen übergeben – ein Apostroph im
Namen würde sonst das Inline-Attribut zerlegen (`_gsKatName`/`_gsArtName` lösen beides auf).
Der gezogene Index liegt in `_gsZieht`, zusätzlich in `dataTransfer` (Firefox verlangt Nutzlast).

**Bearbeiten.** `gsBearbeiten(i)` öffnet eine Kachel im Dialog (Titel, Kategorie als
Datalist – neue Kategorien werden zu neuen Zeilen –, Dokumentenart, Verantwortung, Stand,
Dokument/Version/Datum), `gsNeu(kategorie, art)` legt aus dem `+` einer Zelle direkt dort
an, `gsLoeschen(i)` entfernt nach Rückfrage. Dieselbe Mechanik für die Einträge außerhalb
der Pyramide (`gsWeitere*`). Ohne Schreibrecht (`canWriteTab('govstruktur')`) rendert die
Ansicht ohne Bedienelemente, und die Funktionen brechen zusätzlich selbst ab.

**Zeilen und Spalten** sind ebenfalls gepflegte Daten (`_gsDaten.arten` als
`[{key, erklaerung}]`, `_gsDaten.kategorien` als Namensliste) und stehen mit in der JSON.
`gsArten()` / `gsKategorien()` liefern sie und ergänzen defensiv, was in Einträgen
vorkommt, aber in keinem Kopf steht – sonst wären solche Regelungen unsichtbar. Ältere
gespeicherte Fassungen ohne Köpfe fallen auf den Startbestand zurück. Umbenennen zieht
alle betroffenen Einträge mit (`gsEbeneUebernehmen` / `gsKategorieUebernehmen`);
Löschen einer belegten Zeile/Spalte führt über `gsUmziehenDialog()` zu einer Zielauswahl,
statt Regelungen still mitzunehmen. Die letzte Zeile bzw. Spalte lässt sich nicht
entfernen.

**Zwei Rechte.** `gsDarfSchreiben()` (Schreibrecht auf den Reiter) erlaubt das Pflegen von
Regelungen. Den **Aufbau** ändert nur, wer zusätzlich `darfGovStrukturKoepfe()` erfüllt –
Admins oder die Liste `govStrukturKoepfe` aus der access-config, gepflegt in den
Einstellungen über `roleCard`. Die Ansicht blendet die Kopf-Bedienelemente sonst aus, und
jede Struktur-Funktion prüft zusätzlich selbst.

**Anzeige.** `gsMatrixHtml()`: Zeile = Kategorie, Spalte = Art. Beim Bearbeiten werden
**alle** Ebenen gezeigt (sonst käme man in eine leere Ebene nie hinein), beim reinen Lesen
nur die belegten. Filter über `gsGefiltert()` (Suche, Stand, Verantwortung), Kennzahlen mit
Fortschrittsbalken, aufklappbare Legende. `gsPolicyTreffer()` verbindet die Planung mit dem
Bestand: Trägt `State.policies` ein Regelwerk mit passendem Titel, führt „→ im RMS" dorthin
(normalisierter Vergleich, Titel unter fünf Zeichen werden nicht verglichen).

Eine zweite Sicht „nach Verantwortung" gab es kurz; sie zeigte dieselben Daten noch einmal
und ist wieder entfernt. Wer nach einer Person sucht, filtert die Matrix.

Abgesichert in `tests/govstruktur.test.mjs` (Datenintegrität, Stichproben gegen die Mappe,
Filter, Anlegen/Ändern/Löschen samt Speichern, Umbenennen mit Mitziehen der Einträge,
Umzug beim Löschen belegter Köpfe, Gleichzeitigkeit, Nur-Lese-Zugriff und das eigene
Struktur-Recht).

---

## Kategorien aus der Governance-Struktur · Geltungsbereich in den Mails (Stand 2026-08-21)

**Eine Systematik statt zweier Listen.** Die Kategorien im Regelwerk- und im Konzept-Editor
kamen aus einer festen Liste im Code (`'ISO 27001', 'NIS2', 'ISMS allgemein', …`) – parallel
zur Systematik des Konzernregelwerks, die in der Governance-Struktur gepflegt wird.
`regelwerkKategorien(aktuell)` (`js/govstruktur.js`) liefert jetzt die Zeilen der Matrix und
hängt einen bisherigen Wert an, wenn er dort fehlt; sonst spränge die Kategorie beim
Speichern still um. `gsDatenLaden()` lädt die Struktur ohne zu zeichnen – der Editor stößt
es an, wenn der Reiter in dieser Sitzung noch nicht offen war, und zeichnet sich nach.

Mitumgestellt: Der **Normbezug** erschien nur bei Kategorie „ISO 27001"/„NIS2" und wäre
sonst nie wieder aufgetaucht. Er ist jetzt immer verfügbar (eingeklappt) – inhaltlich
richtiger, denn auch ein Regelwerk der Kategorie „Compliance" kann ISO-Bezug haben.

**Geltungsbereich in allen Mails.** Für welche Standorte ein Regelwerk gilt, stand nur in
der App. Ergänzt in: Prüf-/Freigabe-Mail (`_wfMailHtml`, dazu die Zielgruppe, wenn sie nicht
„alle" ist), Bekanntgabe (`_zielgruppeMailHtml`), Mitbestimmung (`_mitMailHtml`, dort
zusätzlich die betroffenen Werke), Erinnerung an Mitarbeitende (`reminderHtml`),
Konzept-Mail (`_konzeptMailHtml`) und im Cron (`geltungsbereich(f)` liest das Sammelfeld
`DatenJson`, mit Rückfall auf die Altbestand-Spalte `GeltungsbereichJson`).

**Nachtrag: auch die Dokumentenart.** „Die Kategorien sind oben" – gemeint waren die
**Spaltenköpfe** der Matrix, nicht die Zeilen: die Verbindlichkeitsebenen der Pyramide.
Die standen als `REGELWERK_TYPEN` fest im Code und wichen ab („Richtlinie" statt „Policy",
„Weitere" fehlte ganz). `regelwerkArten(aktuell)` und `regelwerkArtHinweis(key)`
(`js/govstruktur.js`) liefern jetzt die Spalten samt Erklärung; `regelwerkTypen()`
(`js/admin.js`) ist der Wrapper mit Rückfall, `konzeptArten()` das Gegenstück in
`js/konzepte.js`. Beide Editoren zeigen die Erklärung der gewählten Ebene unter dem Feld.

Zwei Feinheiten: Ein bisheriger Wert bleibt wählbar (sonst spränge er beim Speichern still
um), und der **Typ-Filter** im Dashboard hängt eine Art, die es nur noch im Altbestand gibt,
hinten an – sonst wären genau die Regelwerke mit „Richtlinie" nicht mehr filterbar.

Abgesichert in `tests/kategorien-geltung.test.mjs`, `tests/regelwerk-typ.test.mjs`.
