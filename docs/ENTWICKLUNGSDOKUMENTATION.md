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

**Nachtrag August 2026: „still" war es nicht.** Der Klick funktionierte, aber davor stand
die Anmeldung. Outlook öffnet einen **neuen Tab**, und der Konto-Cache lag in
`sessionStorage` – dort war kein Konto bekannt, also lief jede Entscheidung erst über
die Microsoft-Anmeldeseite, bei mehreren Sitzungen mit Kontoauswahl. Drei Änderungen:

1. **`cacheLocation: 'localStorage'`** (`js/auth.js`) – der Cache gilt für den Browser,
   nicht für einen Tab. Wer die App schon einmal offen hatte, landet ohne jeden Umweg
   direkt auf der Ergebnisseite. Preis: Die Anmeldung überlebt das Schließen des
   Browsers, an einem geteilten Rechner bleibt das Konto angemeldet – wie bei Outlook
   und Teams. Bewusste Abwägung, kein Versehen.
2. **Adressat im Link** (`&u=<upn>`, gelesen von `getLoginHint()`): MSAL bekommt ihn als
   `loginHint`, damit entfällt die Kontoauswahl; vorher wird `ssoSilent()` versucht.
   Der Zeichensatz ist bewusst enger als das, was als E-Mail zulässig wäre – der Wert
   landet in einem `onclick`-Attribut.
3. **Einzelversand** der Entscheidungs-Mails (`notifyPruefer`, `notifyGL`, Cron): Nur so
   trägt jeder Link die Adresse seines Empfängers. Die Eskalationsmail geht weiterhin
   raus, ohne persönlichen Link – sie entscheidet ja nicht.

Der Hinweis ist zugleich die **Sicherung**: Ein geteilter Konto-Cache kann mehrere Konten
enthalten. `einKlickAktion()` vergleicht den Adressaten mit dem angemeldeten Konto und
**bricht ab**, bevor irgendetwas gespeichert wird, wenn beide auseinanderfallen – mit dem
Angebot, das Konto zu wechseln, und dem Hinweis auf die Vertretung als richtigen Weg.
`authAnmeldenAls(upn)` erledigt den Wechsel.

Abgesichert in `tests/ein-klick-anmeldung.test.mjs`.

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

---

## Fehler: drei Erweiterungsfelder gingen beim Laden verloren (Stand 2026-08-21)

**Symptom.** Unter „Meine Regelwerke" erschien nie ein Lernvideo, und jeder Ein-Klick-Link
aus einer Freigabe-Mail endete mit „Dieser Link ist nicht mehr aktuell".

**Ursache.** `_mapPolicy()` (`js/sharepoint.js`) zählte die Erweiterungsfelder **namentlich**
auf – `typ`, `konzept`, `regelwerkTyp`, `geltungsbereich`, `historie`. `_readExtFields()`
lieferte aber alle sieben. `videos`, `aktionToken` und `bekanntgabeAm` wurden korrekt
geschrieben, korrekt gelesen und im selben Atemzug weggeworfen. Ohne Fehler, ohne Spur:
Beim Speichern war alles da, beim nächsten Laden nicht mehr.

Damit war der Sinn von `POLICY_EXT_FIELDS` – „ein neues Feld braucht keine neue Spalte und
keine weitere Codestelle" – an genau einer Stelle wieder aufgehoben. Jetzt steht dort
`...ext`, und die drei Felder kommen an.

**Was das erklärt:** Das Einmal-Token war nie gespeichert. Die Mail trug es (aus dem
Arbeitsspeicher), der Datensatz nicht – also schlug `aktionTokenGueltig()` bei *jedem* Klick
fehl. Mails, die vor dem Fix verschickt wurden, bleiben tot; ab der nächsten Runde greift es.

**Nachgezogen:** Ein unlesbares Sammelfeld schweigt nicht mehr. `spDatenJsonDefekt()` zählt
Datensätze, deren `DatenJson` sich nicht parsen ließ – typischerweise, weil die Spalte als
„Einzelne Textzeile" angelegt wurde und SharePoint bei 255 Zeichen abschneidet. Das
Regelwerk-Dashboard zeigt das als Banner samt Abhilfe, statt still dieselben drei Felder zu
verlieren.

Abgesichert in `tests/datenjson-sammelfeld.test.mjs` (Abschnitte 9 und 10) – datengetrieben
über `POLICY_EXT_FIELDS`, damit ein künftiges Feld automatisch mitgeprüft wird.

---

## Der Betriebsrat entscheidet aus der Mail (Stand 2026-08-21)

Prüfer und Geschäftsleitung konnten längst per Klick aus Outlook entscheiden; der Betriebsrat
bekam nur eine Mitteilung. Sein Votum trug jemand aus dem Workflow-Kreis nach, sobald die
Rückmeldung auf anderem Weg eintraf. Jetzt stehen dieselben zwei Knöpfe – **✓ Konform** und
**✗ Nicht konform** – in seiner Mail (`_mitMailHtml`, `js/admin.js`), dazu `_wfApprovalsHtml(p)`:
wer dem Regelwerk bereits zugestimmt hat.

**Eigene Runde.** `markKonform()` erzeugt beim Übergang zur Mitbestimmung ein Token der Art
`mitbestimmung` (vorher gab es für diese Etappe gar keins). `_EK_ERWARTET` kennt
`mb_konform`/`mb_nicht_konform` nur im Status `Mitbestimmung`; `einKlickAktion()` leitet die Art
aus dem Präfix `mb_` ab und ruft `markMitbestimmung(id, true|false)`.

**Berechtigung ohne zweite Liste.** `darfMitbestimmung(p)` (`js/access.js`) lässt durch, wer den
Ablauf führt (Prüfer, Geschäftsleitung, Admin) – und wer zu dem Betriebsrat gehört, an den die
Mail ging: entweder ist es die eigene Adresse, oder man ist Mitglied der hinterlegten Verteiler-
bzw. Sicherheitsgruppe (`State.myGroups`). Die BR-Adressen stehen ohnehin in den Einstellungen;
eine separate Rolle wäre eine zweite Wahrheit.

**Kein Anmelde-Hinweis im Link.** Anders als bei Prüfung und Freigabe geht die Mail an ein
*Postfach*, nicht an ein Konto. Ein `&u=`-Hinweis würde die Adressaten-Prüfung in
`einKlickAktion()` gegen jedes persönliche Konto laufen lassen und alle aussperren. Der Kommentar
im Quelltext sagt das, damit es niemand „nachrüstet".

**Bis zur Entscheidung kommen.** `applyDeepLinkOrDefault()` ließ `ansicht=freigaben` nur für
Prüfer und Geschäftsleitung durch – der Betriebsrat ist beides nicht und wäre an der Schranke
hängen geblieben. Für die beiden `mb_`-Aktionen gilt jetzt `darfMitbestimmung()`; hinter dem
Ergebnis-Fenster steht für ihn „Meine Regelwerke" statt der Freigabe-Ansicht. Im Portal zeigt
`renderFreigaben()` ihm seinen Vorgang ebenfalls (`darfMb(p)` je Karte statt global).

**Begründungspflicht.** `markMitbestimmung(id, false)` greift ohne Eingabefeld auf `uiPrompt`
zurück und speichert ohne Begründung nicht – dieselbe Mechanik wie bei der Konformitätsprüfung.

**Cron.** Die Erinnerung für die Phase `Mitbestimmung` verlinkte bisher `konform`/`nicht_konform`,
also die Aktionen der Prüfer – im Status `Mitbestimmung` wäre daraus „Schon erledigt" geworden.
Jetzt `mb_konform`/`mb_nicht_konform` mit dem Token der richtigen Runde und ohne Empfänger im Link.

Abgesichert in `tests/mitbestimmung-mail.test.mjs`.

---

## Prozesslandkarte (Stand 2026-08-21)

Die Prozesslandschaft lag als Bild in einer Präsentation. Jetzt ist sie eine Ansicht:
`js/landkarte.js`, erreichbar als **🗺 Landkarte** im Reiter Prozesse (Umschalter
`prozessModusLeiste()`; die Karte ist die Startansicht, die Dateiliste der zweite Klick).

**Drei Entscheidungen halten den Aufwand klein:**

1. **Eine Datei statt einer Liste.** `prozesslandkarte.json` im Konfig-Ordner, geladen und
   gespeichert über `spLoadLandkarte` / `spSaveLandkarte` / `spLandkarteMeta` – dieselbe Mechanik
   wie die Governance-Struktur, inklusive Gleichzeitigkeits-Prüfung über den Zeitstempel und
   Versionsverlauf in der Datei. Keine neue SharePoint-Spalte, kein Administrationsaufwand.
2. **Die Verknüpfung Prozess → Regelwerk wird nicht dupliziert.** Sie steht seit jeher im BPMN-XML
   (`[[rms:policies=…]]`). Die Kachel merkt sich nur, welches Modell zu ihr gehört – `prozessId`
   mit `prozessName` als Rückfall, damit der Link eine neu angelegte Datei überlebt. Die Regelwerke
   selbst holt `_lkRegelwerkeLaden()` erst beim Öffnen einer Kachel; 17 Dateien beim Zeichnen zu
   lesen wäre Unsinn.
3. **Der Geltungsbereich ist derselbe wie bei Regelwerken.** `renderGeltungsbereichSection(…, 'lgb')`
   – `_gbScope` in `js/admin.js` kennt jetzt einen dritten Bereich. Damit gilt dasselbe Vokabular
   (`STANDORTE`, `'ALLE'`), und die Frage „Was gilt in SHB?" bekommt für Prozesse und Regelwerke
   dieselbe Antwort. `lkGiltDort()` behandelt einen ungepflegten Geltungsbereich als konzernweit –
   lieber zu viel zeigen als etwas verschweigen.

**Darstellung.** Die Formen (Fünfeck-Kacheln, Pfeile) entstehen mit `clip-path`, nicht als Bild –
die Karte bleibt anklickbar, durchsuchbar und bei jeder Breite scharf. Die Bänder sind ein
**Raster** mit `grid-template-columns: repeat(n, minmax(0,1fr))`, n = Anzahl der Kacheln: ein Band,
eine Zeile, gleiche Breiten. Mit Flexbox blies die letzte Zeile auf, sobald ein Band umbrach (neun
Unterstützungsprozesse ergaben zwei Zeilen mit 163 px und 596 px). Lange Komposita bekommen
`hyphens: auto`; unter 780 px fallen die Formen weg.

**Ziehen und Ablegen** arbeitet mit Indizes in `lkKacheln()`: Ablegen auf einer Kachel übernimmt
deren Band, Ablegen auf ein leeres Band hängt ans Ende. Der Verlauf unterscheidet „verschoben nach
…" und „Reihenfolge geändert".

Abgesichert in `tests/prozesslandkarte.test.mjs` (Startbestand, Geltungsbereich, Modell-Auflösung,
Zeichnen, Ziehen, Gleichzeitigkeit, Kennungen, Einbau).

---

## Verknüpfungen als Mindmap · sichtbare Standortauswahl (Stand 2026-08-21)

**Fehler zuerst: der Geltungsbereich wirkte gesperrt.** `renderGeltungsbereichSection()` blendete
die Werke-Kästchen aus, solange „Alle Standorte" gesetzt war. Wer den Editor öffnete, sah ein
einziges Kästchen und schloss daraus, es gebe nichts zu wählen. Die Werke stehen jetzt **immer**
da – deaktiviert und blass, solange „Alle Standorte" gilt, mit dem Hinweis, wie man sie freigibt.
Eine Stelle, drei Editoren: Regelwerk, Konzept und Prozesskachel.

**Die Mindmap** (`js/verknuepfungen.js`, Ansicht **🕸 Verknüpfungen**) folgt dem Aufbau, den
Signavio, ADONIS und BIC „Beziehungsansicht" nennen: ein Objekt in der Mitte, die Beziehungen nach
Art gruppiert ringsum, Klick rückt einen Nachbarn in die Mitte, ein Verlauf führt zurück. Dazu eine
Direktauswahl aller Objekte, damit niemand sich durch Ebenen klicken muss.

`vkGraphBauen()` baut Knoten und Kanten aus drei vorhandenen Quellen – Landkarte (Kachel → Modell,
Kachel → Standorte), BPMN-XML (Modell → Regelwerke) und `State.policies` (Regelwerk → Standorte).
**Gespeichert wird nichts**; die BPMN-Verknüpfungen kommen aus `_procLinkCache`, den die Modell-Liste
ohnehin füllt.

**Lesbarkeit ist hier eine Anforderung, keine Kosmetik.** Neunzehn Kästen auf einer Ellipse
überlappten sich fünfmal – im Browser gemessen, nicht geschätzt. Zwei Ringe halfen nur halb (zwei
Überlappungen, einer ragte heraus). Die tragfähige Lösung: der Graph zeigt **höchstens zwölf**
Nachbarn, ausgewählt reihum aus jeder Beziehungsart, x-Position auf die Fläche geklemmt – und
**alle** Nachbarn stehen darunter als Chips. Ergebnis: null Überlappungen, nichts fehlt.

**Die Lücken** (`vkLuecken()`) sind der eigentliche Ertrag: Prozesse ohne Modell, Modelle ohne
Regelwerk, veröffentlichte Regelwerke ohne Prozess (Entwürfe zählen nicht – die sind in Arbeit),
Prozesse ohne Geltungsbereich. Jeder Eintrag verlinkt dorthin, wo sich die Lücke schließen lässt.

Abgesichert in `tests/verknuepfungen.test.mjs`.

---

## Landkarte je Werk · Mindmap über alle Werke · Verknüpfen in der Mindmap (Stand 2026-08-21)

**Eine Landkarte reichte nicht.** Die abgestimmte Landschaft ist die von **HOL**, nicht die des
Konzerns – jedes Werk führt seine eigene. Das Datenmodell in `prozesslandkarte.json` hat deshalb
eine Werk-Ebene bekommen:

```
{ "version": 2, "karten": { "HOL": {baender, kacheln, ergebnisse}, "SHB": {…} }, "historie": [...] }
```

`lkDatenLaden()` **migriert** die Fassung 1 beim ersten Öffnen: Was dort auf oberster Ebene stand,
wird zur Karte von HOL. Niemand muss etwas neu erfassen. `LK_WERKE` ist `['KONZERN', …STANDORTE]` –
die Holding führt ihre eigene Ebene, weil sie eigene Prozesse steuert.

**Übernahme statt Handarbeit.** Zehn Landkarten von Hand zu bauen, würde niemand tun.
`lkUebernehmen()` kopiert Bänder, Kacheln und Modell-Verknüpfung eines anderen Werks und setzt den
Geltungsbereich auf das eigene; die Quelle bleibt unangetastet. Eine neue Kachel wird mit dem
eigenen Werk vorbelegt (auf Konzern-Ebene mit `ALLE`).

**Die Mindmap sieht jetzt alle Werke.** `lkAlleKacheln()` liefert `{werk, kachel}` über alle Karten;
Knoten-Kennungen tragen das Werk (`prozess:SHB:giesserei`, `band:HOL:kern`). Die Arten `standort`
und `werk` sind zu **einer** zusammengefallen: Ein Werk führt eine Landkarte *und* ist der Ort, für
den Prozesse und Regelwerke gelten – ein Knoten, zwei Rollen, und dadurch die Verbindung zwischen
beidem. Auch `vkLuecken()` rechnet über alle Werke; sonst bliebe die Lücke der anderen Karten blind.

**Verknüpfen in der Mindmap.** „Wer hängt woran" nützt erst, wenn man es dort auch ändern kann.
`_vkAktionenHtml()` blendet je nach Art des Knotens in der Mitte die passenden Knöpfe ein.
Prozess → Modell läuft über die Landkarte (dort liegt die Kachel, `vkZurKarte()` stellt das richtige
Werk ein). **Modell → Regelwerk** schreibt `vkXmlMitRegelwerken()` als Text in die BPMN-Datei: Der
Marker `[[rms:policies=…]]` steht in der Dokumentation des Prozesses – laut Schema deren erstes
Kindelement, genau dort legt ihn auch der Modeler ab. Gespeichert wird unter demselben Dateinamen,
SharePoint legt eine neue Version an.

Der Textweg ist die riskante Stelle, deshalb ausführlich geprüft: ohne vorhandene Dokumentation
(anlegen), mit vorhandenem Marker (ersetzen, nicht ergänzen), leere Auswahl (entfernen), Präfixe
`bpmn:` / `bpmn2:` / keines, eine Dokumentation an einer *Aufgabe* (bleibt erhalten), Sonderzeichen
im Titel (maskiert), und der Marker danach wieder auslesbar. Vom Regelwerk aus wird **ergänzt**,
nicht überschrieben – an einem Modell hängen oft mehrere Regelwerke.

Abgesichert in `tests/prozesslandkarte.test.mjs` und `tests/verknuepfungen.test.mjs`.

---

## Mehrere Modelle je Prozess · Regelwerke ohne Umweg · Suche (Stand 2026-08-21)

**Ein Prozess, mehrere Abläufe.** Die Kachel trug genau ein Modell (`prozessId`/`prozessName`).
Angebot, Auftrag und Reklamation gehören aber alle zum Vertrieb. Neu ist `prozesse: [{id, name}]`;
`lkModellVerweise()` liest die alten Felder weiter mit, `_lkVerweise()` stellt sie beim ersten
Schreiben um. `lkProzesseVon()` löst alle auf, `lkProzessVon()` bleibt als „das erste" für Anzeigen,
die nur eines brauchen.

Zwei Fallen dabei: `spSaveProcess()` schreibt über den **Dateinamen** – ein zweites Modell mit
demselben Namen wäre dieselbe Datei und überschriebe das erste. `_lkFreierModellName()` hängt
deshalb „ 2", „ 3" an. Und der Verknüpfen-Dialog bietet nur noch an, was **nicht** schon hängt.

**Regelwerke ohne Umweg über ein Modell.** Bisher hing ein Regelwerk ausschließlich am BPMN-Marker.
Bei 70 geplanten Regelwerken und einer Handvoll Modelle bleibt die Mindmap damit auf Jahre leer.
`regelwerke: []` an der Kachel schließt die Lücke: In der Mindmap ist das die Beziehung
**„geregelt durch"** (Gegenrichtung „regelt"), klar unterscheidbar von „setzt um" über ein Modell.
Kein Widerspruch, sondern zwei verschiedene Aussagen – und der Weg, sofort loszulegen.

Entsprechend gibt es eine fünfte Lücke: **„Prozesse ohne jeden Bezug"** – weder Modell noch
Regelwerk. „Nur kein Modell" ist oft in Ordnung; gar nichts ist die eigentliche Baustelle.

**Suche über alle Landkarten.** Mit zehn Karten ist „wo steckt die Beschaffung?" sonst eine
Klickstrecke. `lkTreffer()` sucht in Name und Untertitel über alle Werke (ab zwei Zeichen, höchstens
zwölf Treffer), `lkSpringeZu()` wechselt die Karte und öffnet die Kachel.

**Tastatur.** Die Kacheln sind Schaltflächen, keine Bilder: `role="button"`, `tabindex="0"`,
Enter und Leertaste, dazu ein `aria-label` aus Name und Untertitel – derselbe Standard wie beim
Ordner-Baum der Governance-Ansicht.

Abgesichert in `tests/prozesslandkarte.test.mjs` und `tests/verknuepfungen.test.mjs`.

---

## Prozessmodelle liegen unter ihrem Werk (Stand 2026-08-25)

Seit jedes Werk eine eigene Landkarte führt, lagen die Modelle trotzdem alle flach im Ordner
`Prozesse`. Das war zwei Dinge zugleich: unübersichtlich und gefährlich. `spSaveProcess()` schreibt
über den **Dateinamen** – „Vertrieb" aus HOL und „Vertrieb" aus SHB wären dieselbe Datei gewesen,
das zweite Werk hätte das erste überschrieben. `_lkFreierModellName()` hat das bis dahin mit
„Vertrieb 2" abgefangen; ein Name, der niemandem etwas sagt.

**Ablage:** `Prozesse/<WERK>/<Name>.bpmn`. Neu in `js/sharepoint.js`:

* `_prozessOrdnerName(werk)` – lässt nur `[A-Za-z0-9_-]` durch; ein Ordnername kann nicht aus dem
  Ordner ausbrechen.
* `_prozessOrdnerSicherstellen(token, werk)` – legt `Prozesse` und den Werk-Ordner per POST an,
  `conflictBehavior: 'fail'`; **409 ist der Normalfall** und wird bewusst geschluckt.
* `spListProcesses()` – liest die Wurzel und zusätzlich jeden Unterordner (`Promise.all`). Jeder
  Prozess trägt jetzt `ordner` ('' = liegt direkt im Prozesse-Ordner). Ein gesperrter Ordner kostet
  nur seinen Inhalt, nicht die ganze Liste.
* `spSaveProcess(name, xml, werk)` – dritter Parameter; ohne ihn bleibt alles wie bisher, damit der
  Altbestand erreichbar bleibt.
* `spMoveProcess(itemId, werk, neuerName)` – PATCH auf `parentReference` (und optional `name`).
  **Die Kennung überlebt den Umzug** – Landkarte und Mindmap merken sich die Kennung, nicht den Pfad.

Alle Aufrufer mussten mitziehen: `vkRegelwerkeSpeichern()` und `vkRegelwerkAnModellSpeichern()`
speicherten über den Namen – ohne Ordner hätten sie eine **zweite** Datei in der Wurzel angelegt.

**Nebenbei einen Datenverlust beseitigt:** `saveProcess()` hat beim Umbenennen bisher unter dem
neuen Namen gespeichert und die alte Datei gelöscht. Das erzeugt eine neue Kennung – jede
Verknüpfung aus der Landkarte lief danach ins Leere. Jetzt wird zuerst verschoben/umbenannt
(`spMoveProcess`), dann der Inhalt in denselben Pfad geschrieben.

**Auflösung über den Namen** (`lkModellZu(verweis, werk)`) bevorzugt seither den Ordner des eigenen
Werks; die Kennung schlägt weiterhin alles. `_lkFreierModellName(basis, werk)` zählt nur innerhalb
eines Ordners – „Vertrieb" bleibt in jedem Werk „Vertrieb".

**Übernahme einer fremden Landkarte** kopiert die Modellverweise nur noch auf ausdrücklichen Wunsch
(Haken im Dialog). Sonst zeigten zwei Werke auf dieselbe Datei, was der Ordnertrennung genau
zuwiderläuft.

**Aufräumen:** `prozessAblageAufraeumen()` in `js/prozesse.js` sortiert die flach liegenden Modelle
ein. Welches Werk gemeint ist, sagt die Landkarte (Verweis über Kennung **oder** Name). Zeigen
Kacheln aus zwei Werken darauf, bleibt die Datei liegen – diese Entscheidung kann die App nicht
treffen.

Abgesichert in `tests/prozess-ablage.test.mjs` (40 Prüfungen: Pfadbau, Auflisten über Unterordner,
Ordneranlage mit 409, Verschieben mit Kennungserhalt, Gruppierung, Aufräum-Regeln).

---

## Verantwortliche, Matrix, Bild, Link, Abgleich (Stand 2026-08-25)

Sechs Punkte aus einer Verbesserungsrunde – zusammengefasst, weil sie dieselbe Stelle betreffen.

**1 · Prozessverantwortliche.** Die Kachel trug Name, Band, Geltungsbereich, Modelle und Regelwerke –
aber niemanden. Neu: `verantwortlich` und `vertretung` (Mailadressen, Auswahl über `spGetMembers()`
wie bei Risiken). `lkPersonName()` löst die Adresse gegen die Mitarbeiterliste auf; solange die noch
lädt, steht die Adresse selbst da. Neue Lücke in der Mindmap: `ohneVerantwortlich`.

**2 · Matrix (`js/prozessmatrix.js`).** Prozesse als Zeilen, Werke als Spalten, zwei Blätter
(Zuständigkeiten / Abdeckung). Der Zeilenschlüssel ist der **normalisierte Name**, nicht die
Kennung: Zwei Werke führen denselben Prozess oft mit verschiedenen Kacheln, gehören für den
Vergleich aber in eine Zeile. Wichtig und getestet: „—" (niemand zuständig) und „·" (Werk führt den
Prozess nicht) sind zwei verschiedene Aussagen und sehen verschieden aus – auch im CSV.
Die Ansicht **schreibt nichts**; ein Test verbietet Schreibaufrufe in dieser Datei.

**3 · Bild-Export.** `downloadProcessSvg()` über `saveSVG()` von bpmn-js. Mit einer .bpmn-Datei kann
außerhalb des Modelers niemand etwas anfangen – für Regelwerke, Schulungen und Folien braucht es
ein Bild.

**4 · Deep-Link `?prozess=WERK:KACHEL`.** `lkLinkFuer()` / `lkLinkKopieren()` erzeugen ihn,
`lkDeepLink()` löst ihn ein (lädt die Landkarten, setzt das Werk, öffnet die Kachel). In
`js/app.js` steht die Auswertung vor dem Richtlinien-Deeplink, mit derselben Leserechtsprüfung.

**5 · Abgleich Kachel ↔ Modell.** Seit Regelwerke sowohl an der Kachel als auch im BPMN-Marker
hängen können, kann beides auseinanderlaufen. `vkAbgleich()` findet, was nur an der Kachel steht,
obwohl es ein Modell gibt; `vkAbgleichUebernehmen()` schreibt es hinein. Kacheln ohne Modell
erzeugen bewusst **keinen** Widerspruch – dort gibt es nichts abzugleichen.

**6 · Ladezeit der Mindmap.** `vkGraphBauen()` las die BPMN-Dateien in einer verschachtelten
Schleife nacheinander – bei vierzig Modellen vierzig Anfragen in Reihe. Jetzt werden alle
gebrauchten Modelle vorab dedupliziert und **parallel** gelesen (`Promise.all`); der Rest der
Funktion trifft danach nur noch den Cache. Der Cache selbst überlebt neuerdings die Sitzung:
`procLinksLaden()` / `procLinksMerken()` legen ihn im `localStorage` ab, Schlüssel ist
`itemId|modified` – eine geänderte Datei fällt damit automatisch heraus.

Abgesichert in `tests/prozessmatrix.test.mjs` (32) und den erweiterten Suiten
`verknuepfungen` und `prozesslandkarte`.

---

## Mindmap als Baum (Stand 2026-08-25)

Die radiale Fokus-Ansicht beantwortet „was hängt an diesem einen Objekt?" – gut zum Erkunden,
schlecht zum Überblicken. Für den Überblick will man das, was jedes Mindmap-Werkzeug zeigt: eine
Wurzel links, farbige Äste nach rechts, aufklappbare Zweige. Das ist `js/mindmapbaum.js`
(Präfix `vb`), gezeichnet aus **demselben** Graphen `_vkGraph`.

**Nur Hierarchie.** `VB_TYPEN` lässt genau die hierarchischen Beziehungen zu. `gilt für` verbindet
quer und bliebe im Baum als Schleife stehen – dafür ist weiterhin die Nahsicht da
(`_vkAnsicht = 'baum' | 'fokus'`).

**Zustand am Pfad, nicht an der Kennung.** Ein Regelwerk hängt an mehreren Prozessen und steht
deshalb mehrfach im Baum. Auf-/Zugeklappt wird über den **Pfad** (`a|b|c`) verwaltet, sonst klappten
alle Vorkommen gemeinsam auf. `_vbAst()` führt eine Ahnenmenge mit: derselbe Knoten darf nie
unterhalb seiner selbst erscheinen.

**Layout.** `vbLayout()` ist ein einfacher Reingold-Tilford: Blätter der Reihe nach (`VB_ZEILE`),
Eltern mittig zu ihren Kindern, x aus der Summe der Spaltenbreiten. Ein Test prüft je Spalte, dass
sich keine zwei Knoten überlappen. Gezeichnet wird als **HTML-Knoten über einem SVG** – die Boxen
bekommen dadurch echten Textumbruch, Fokusrahmen und Tastaturbedienung, das SVG nur die
Bézier-Verbindungen.

**Zoom.** Skaliert wird `.vb-buehne` per `transform`; die Fläche darunter trägt die *skalierte*
Größe – sonst bliebe beim Verkleinern der alte Platzbedarf im Scrollbereich stehen.

**Hinzufügen.** `vbPlus()` öffnet, was an der Stelle Sinn ergibt (Band → `lkKachelNeu(band)`,
Prozess → Auswahl, Modell → `vkRegelwerkeDialog`). Damit das aus der Mindmap heraus funktioniert:
`lkWerkSetzenStill()` wechselt das Werk ohne Ansichtswechsel, und `lkSpeichern()` kehrt über
`_lkNachSpeichern()` in die Ansicht zurück, aus der gespeichert wurde – vorher landete man immer in
der Landkarte.

Abgesichert in `tests/mindmapbaum.test.mjs` (31). Layout im Browser gemessen: keine Überlappungen,
auch vollständig aufgeklappt; die Seite scrollt nie quer, der Baum scrollt in seinem Rahmen.

---

## Konzern-Landkarte und beliebig viele Bereiche (Stand 2026-08-25)

**Die Ansicht kannte nur drei Bänder.** `renderLandkarte()` rief fest verdrahtet
`_lkBandHtml('fuehrung')`, `_lkKernHtml()`, `_lkBandHtml('unterstuetzung')` auf – die Datei führte
die Bänder längst als Liste. Eine Landkarte mit sechs Bereichen wäre stumm geblieben: Kacheln in
unbekannten Bändern wurden schlicht nicht gezeichnet. Jetzt erzeugt `_lkKarteHtml()` je Band eine
Zeile (`_lkZeileHtml`), das Band `kern` behält seine Pfeilform samt Ergebnisspalte. Ohne Kernband
bekommen die Ergebnisse eine eigene Zeile am Fuß.

**Vorlagen.** `LK_KONZERN` ist die Landschaft einer Führungsholding: sechs Bereiche à drei
Hauptaufgaben. Sie ist bewusst **kein Werk in klein** – eine Holding steuert, finanziert, sichert ab,
bündelt, kommuniziert, verändert. `LK_VORLAGEN` stellt sie neben die Werkslandschaft (`LK_START`);
`lkVorlageDialog()` / `lkVorlageAnwenden()` setzen eine davon ein, mit Geltungsbereich nach Ebene und
ohne Modell-/Regelwerksverweise.

⚠️ **Reihenfolge im globalen Scope:** `LK_VORLAGEN` verweist auf `LK_START` und muss deshalb **nach**
dessen `const` stehen. Zuerst stand es davor – die temporale Todeszone warf beim Laden, was die
gesamte App lahmlegte (alle Skripte teilen einen Scope). Aufgefallen ist es in der Browser-Konsole,
und die vm-Tests laufen in dieselbe Falle: `tests/prozesslandkarte.test.mjs` lädt die Datei komplett.

**Optik.** Kacheln sind helle Karten mit farbiger Oberkante statt gefüllter Fünfecke; die Farbe
kommt über `--lk-c` aus der Bandzeile (`LK_FARBEN`, DIHAG-CD). Höchstens fünf Kacheln nebeneinander –
neun in einer Zeile wären Streifen. Auf der Kachel steht zusätzlich der Vorname der verantwortlichen
Person.

Im Browser gemessen (1440 px): Konzernkarte 6 Zeilen à 3 Kacheln (387 px, alle gleich hoch, kein
Textüberlauf, Gesamthöhe 674 px); Werkskarte 3 Zeilen, Unterstützung bricht auf zwei Reihen um; bei
774 px stapeln beide sauber und die Seite scrollt nicht quer.

---

## Die Vorführung ist das Lernvideo (Stand 2026-08-25)

Die geführte Vorführung (`js/tour.js`) hatte die bedienende Person angesprochen: „Klick den Reiter
an", „Wechsle kurz ins Postfach". Aufgenommen als Lernvideo liest sich das falsch – die Zuschauer
klicken ja nichts.

Deshalb die Rollenteilung im Sprechblasen-Aufbau, den es ohnehin schon gab:

* **`text`** – **ein Satz**, der den Schritt benennt. Bewusst knapp: Erklärt wird gesprochen; ein
  Absatz auf dem Bildschirm führt nur dazu, dass mitgelesen statt zugehört wird.
* **`hinweis`** – die Regieanweisung („Zum Mitmachen: Reiter Verwaltung anklicken") sowie
  Betriebswissen. Steht klein darunter und stört beim Zuschauen nicht.

Dazu ein Rahmen: Schritt 1 heißt jetzt **„Herzlich willkommen"** und sagt, was gleich passiert;
der Schlussschritt heißt **„Was das für Sie heißt"** und nennt die drei Handgriffe
(nachsehen, bestätigen, mitreden) statt nur „Durchlauf abgeschlossen".

Logik, Ziele und `erfuellt`-Bedingungen sind unverändert – nur Beschriftungen. `tests/probelauf.test.mjs`
prüft weiterhin Reihenfolge und Abdeckung der Schritte, `tests/anrede.test.mjs` die Sie-Form.

**Die Ergebnisspalte der Landkarte** („Aufträge · Produkte · Einnahmen") ist entfallen – samt
`lkErgebnisse()`, dem Feld in den Vorlagen und der Spalte in der Kernzeile.

---

## Ein Klick heißt ein Klick (Stand 2026-08-25)

Der Ein-Klick-Weg aus der Mail führte in eine zweite Nachfrage: „Konzept annehmen?" mit
Bestätigungsdialog, ebenso „als konform markieren?" und „freigeben und veröffentlichen?". Wer in der
Mail auf „Annehmen" klickt, hat aber bereits entschieden – die Nachfrage fragte nichts, was nicht
schon beantwortet war.

Entfernt sind daher die reinen Sicherheitsabfragen:

* `handleKonzeptMailAction()` ruft `konzeptDecide(id, decision, { ohneRueckfrage: true })`
* `handleMailAction()` führt `markKonform(id, true)` und `markFreigabe(id)` direkt aus
* die **optionale** Notiz beim Zurückstellen entfällt auf diesem Weg

**Bewusst geblieben** sind alle Prompts, die eine *Angabe* verlangen statt einer Bestätigung: die
Pflichtbegründung bei „nicht konform", bei der Mitbestimmung und bei der Ablehnung eines Konzepts.
Sie sind keine Rückfrage, sondern der fehlende Teil der Entscheidung – ohne sie wäre die Historie
wertlos.

Ebenfalls geblieben ist die **Weiche** nach dem Annehmen („Wie soll es weitergehen?"). Sie fragt
nicht „sind Sie sicher?", sondern nach dem nächsten Schritt. Dafür trennt `konzeptDecide()` jetzt
zwei Schalter: `ohneRueckfrage` (keine Bestätigung) und `ohneWeiche` (keine Folgefrage) – der
Selbsttest setzt beide, der Mail-Weg nur den ersten.

Die Absicherung liegt weiterhin bei der Rolle: `isCurrentUserPrueferForPolicy()`,
`isCurrentUserGeschaeftsleitung()` bzw. `darfMitbestimmung()` prüfen vor jeder Aktion, und jede
Entscheidung landet mit Person und Zeitstempel in der Änderungshistorie.
