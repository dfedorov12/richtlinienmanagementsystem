# DIHAG Richtlinienmanagement – Kurzanleitung & Schulung

Diese Anleitung erklärt in wenigen Minuten, wie das **Richtlinienmanagement** und das
integrierte **KI-Dashboard** genutzt werden. Sie ist nach Rollen gegliedert – such dir den
Abschnitt, der zu dir passt.

**Aufruf:** <https://richtlinienmanagement.dihag-extern.com/>
**Anmeldung:** mit dem normalen DIHAG-Microsoft-Konto (einmal anmelden – das KI-Dashboard
nutzt dieselbe Anmeldung). Bei Problemen: „Erneut versuchen" klicken oder Seite neu laden.

> Welche Bereiche du siehst, hängt von deiner Rolle ab. Normale Mitarbeitende sehen
> „Meine Richtlinien" und „Kurse"; Gremium/Genehmiger zusätzlich „Freigaben"; Admins die
> Verwaltung.

---

## 1. Für alle Mitarbeitenden

### Richtlinien lesen und bestätigen
1. Reiter **„Meine Richtlinien"** öffnen. Oben siehst du deine Quote: zugewiesen / offen /
   abgeschlossen.
2. Eine Richtlinie anklicken → das Dokument wird angezeigt.
3. **Kenntnisnahme:** Das Dokument kurz lesen (das Häkchen wird erst nach kurzer Lesezeit oder
   nach „In SharePoint öffnen" aktiv). Dann „Ich habe gelesen und verstanden" ankreuzen und
   **„Kenntnisnahme bestätigen"**.
4. **Wissenstest** (falls erforderlich): „Wissenstest starten" → Fragen beantworten → bestanden
   ab der angegebenen Prozentzahl. Bei Nichtbestehen einfach erneut versuchen.
5. Ist alles erledigt, kannst du dir einen **Teilnahmenachweis per Mail** an dich selbst senden.

> **Wiederholung:** Manche Richtlinien müssen regelmäßig erneut bestätigt werden – sie tauchen
> dann automatisch wieder als „offen" auf.

### Eine Änderung vorschlagen
Du hast einen Fehler oder eine Verbesserung entdeckt? In der geöffneten Richtlinie oben rechts
auf **„✏️ Änderung vorschlagen"** klicken, kurz beschreiben **was** geändert werden soll und
**warum**, und absenden. Der Vorschlag enthält einen **Direktlink zum Dokument**, geht per Mail an
die Verantwortlichen (du erhältst eine **Kopie**) und landet im Reiter **„Vorschläge"** zur
Nachverfolgung.

### Kurse (Beta)
Unter **„Kurse"** sind mehrere Richtlinien zu Lernpaketen gebündelt. Optional.

---

## 2. KI-Dashboard – KI-Systeme beantragen

Über **„KI-Dashboard"** (linke Leiste) gelangst du zum KI-Governance-Bereich. Jeder kann hier
einen Antrag stellen, wenn ein neues KI-System eingesetzt werden soll.

1. **„Neuer Antrag"** → Formular gemäß KI-Richtlinie (CO-10-01) ausfüllen. KI-Richtlinie und
   Verhaltenskodex sind oben direkt verlinkt.
2. Absenden → das KI-Koordinierungsgremium wird automatisch informiert.
3. Den Status deines Antrags siehst du jederzeit unter **„Anträge"**. Bei einer Rückfrage des
   Gremiums kannst du dort direkt antworten.

---

## 3. Für Gremium / Genehmiger

### KI-Anträge entscheiden (KI-Dashboard)
- Unter **„Anträge"** einen Antrag öffnen.
- **Genehmigen**, **Ablehnen** oder **Rückfrage** stellen.
- **Wichtig:** Bei *Ablehnung* und *Rückfrage* ist ein **Kommentar Pflicht** (Begründung).
- Der Antragsteller wird über die Entscheidung automatisch per Mail informiert.

### Richtlinien freigeben (Reiter „Freigaben")
Der Freigabe-Ablauf einer Richtlinie ist mehrstufig:
**Entwurf → Konformitätsprüfung → Freigabe → Veröffentlicht.**
- **Prüfer:** „Konform" oder „Nicht konform" markieren. Bei *„nicht konform" ist eine
  Begründung Pflicht*.
- **Geschäftsleitung:** „Freigeben" (optional mit Kommentar) → die Richtlinie wird veröffentlicht.
- Kommentare erscheinen im Verlauf der Karte.

---

## 4. Für Administratoren

### Richtlinien verwalten
- Reiter **„Richtlinien verwalten"** → „+ Neue Richtlinie" oder bestehende anklicken.
- Titel, Beschreibung, Kategorie, Zielgruppe (wer sie sehen muss), Pflicht/optional, Wissenstest
  und das zugehörige **Dokument** festlegen.
- „Zur Konformitätsprüfung" startet den Freigabe-Workflow (siehe Abschnitt 3).
- **Compliance** zeigt, wer welche Pflicht-Richtlinie erledigt hat (inkl. CSV-Export).

### ISMS-Dokumente (ISO 27001)
Reiter **„ISMS-Dokumente"** zeigt die ISO-27001-Dokumente direkt aus SharePoint:
- **Spalten** Bearbeitungsstand, Vertraulichkeit, Auf Konformität geprüft von,
  Freigabe Geschäftsleitung, Zuletzt angefasst. **Vertraulichkeit** ist direkt in der Liste umstellbar;
  oben nach **Bearbeitungsstand filtern**.
- **Status & Freigabe (nur Anzeige):** Bearbeitungsstand, Auf Konformität geprüft von und
  Freigabe Geschäftsleitung werden hier **nicht** gesetzt – das Panel zeigt nur den aktuellen Stand und
  was noch offen ist. Der Ablauf läuft über den Freigabeprozess: Dokument per
  **„＋ Als Richtlinie übernehmen"** einbinden und im Reiter **„Freigaben"** prüfen/freigeben; die Felder
  werden danach automatisch ans ISMS-Dokument zurückgeschrieben.
- **Zeile anklicken** öffnet die Detailansicht: oben der **Status (Anzeige)**, darunter die übrigen
  Metadaten (inkl. **Owner**) bearbeiten. **„👁 Vorschau"** zeigt das Dokument **direkt in der App**
  (eingebettet), dazu Versionsverlauf.
- **Dokument anpassen / neue Version:**
  - **„✏️ In Office bearbeiten"** (Desktop-Office) oder **„🌐 Im Browser bearbeiten"** (Office für
    das Web, auch ohne installiertes Office) – beim Speichern entsteht automatisch eine neue Version.
  - oder **„⬆ Neue Version"** → geänderte Datei hochladen, mit Pflicht-**Änderungsnotiz**.
- **„＋ Als Richtlinie übernehmen"** macht aus einem ISMS-Dokument eine Richtlinie im
  Schulungs-/Freigabe-Workflow.

### Vorschläge bearbeiten
Reiter **„Vorschläge"** sammelt alle eingereichten Änderungsvorschläge (gespeichert in der
SharePoint-Liste *Aenderungsvorschlaege*, die beim ersten Vorschlag automatisch angelegt wird).
Eine Zeile anklicken öffnet ein **Seitenpanel rechts**: Vorschlag + Dokument-Link lesen, **Status**
setzen (Offen / In Bearbeitung / Erledigt / Abgelehnt) und einen **Bearbeiter-Kommentar** hinterlegen.
Sichtbar für **Admins, ISMS-Verantwortliche und Vorschlags-Empfänger**.

### Einstellungen
Rollen pflegen: **Admins, Genehmiger, Prüfer, Geschäftsleitung, KI-Gremium** (mit Position
Legal/Datenschutz/Compliance/IT), **ISMS-Verantwortliche** und **Vorschlags-Empfänger** – beide
erhalten die Änderungsvorschläge. Außerdem Genehmigungs-Schwellen und die automatischen
**Review-Erinnerungen**.

---

## 5. Gut zu wissen

- **„↻ Aktualisieren"** (oben rechts) lädt frische Daten, falls etwas nicht aktuell wirkt.
- **Mobil:** Über das Menü-Symbol oben links die Navigation ein-/ausblenden.
- **Schreibrechte:** Das Bearbeiten von ISMS-Dokumenten/Metadaten setzt SharePoint-Schreibrechte
  auf der ISMS-Site voraus – fehlen sie, erscheint eine klare Meldung (Anzeige geht trotzdem).
- **Hilfe:** Bei Fehlern Seite neu laden; bleibt es bestehen, an die IT/Compliance wenden.

*Stand: 2026 · DIHAG Richtlinienmanagement*
