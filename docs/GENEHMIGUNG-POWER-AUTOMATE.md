# Genehmigen / Ablehnen direkt aus der E-Mail (Power Automate)

Ziel: Entscheider **bestätigen oder lehnen direkt in Outlook ab** – ohne das Richtlinienportal zu
öffnen. Das leistet **Power Automate „Genehmigungen"**: Microsoft verschickt eine actionable E-Mail
mit **Genehmigen/Ablehnen**-Buttons, die **inline in Outlook** (Desktop, Web, Handy) funktionieren.
Kein eigener Server nötig, und nur der zugewiesene Genehmiger kann antworten (über sein
M365-Konto authentifiziert).

> Die App steuert alles über die Spalte **`Status`** der Liste „Richtlinien". Power Automate ändert
> genau diese Spalte – die App zeigt das Ergebnis sofort an (Freigaben-/Audit-Report). Der
> GitHub-Cron für Erinnerungen läuft unabhängig weiter.

Es gibt **zwei Ausbaustufen**. Empfohlen und am einfachsten:

* **A) Nur die Freigabe (Geschäftsleitung) über Power Automate** – Konformitätsprüfung und
  Mitbestimmung (Betriebsrat) bleiben wie gewohnt in der App, **nur der letzte Schritt** läuft per
  Outlook-Mail. → In der App: *Einstellungen → Genehmigung über Power Automate →* **„Nur Freigabe (GL)"**.
* **B) Prüfung **und** Freigabe über Power Automate** – auch die Konformitätsprüfung läuft per
  Outlook-Mail (Abschnitt „Variante B" unten). → In der App: **„Prüfung + Freigabe"**.

---

## 0. Einmalige Vorbereitung in SharePoint

Diese Spalten schreibt Power Automate in die Liste **„Richtlinien"** (Site der App-Listen,
`…/sites/IT`). Die meisten legt die App schon an – **neu hinzufügen** musst du nur `GenehmigungLaeuft`
(und optional `LetzteAnmerkung`):

| Spalte | Typ | Zweck | schon da? |
|---|---|---|---|
| `Status` | Auswahl **oder** Einzelne Textzeile | Steuert den Workflow | ✅ von der App |
| `VeroeffentlichtAm` | Datum und Uhrzeit | Veröffentlichungszeitpunkt | ✅ |
| `FreigegebenVon` | Einzelne Textzeile | Wer freigegeben hat (Name/Mail) | ✅ |
| `GenehmigungLaeuft` | **Ja/Nein** (Default Nein) | Sperre gegen Doppel-Genehmigungen | ➕ selbst anlegen |
| `LetzteAnmerkung` | Mehrere Zeilen Text | Kommentar bei „Ablehnen" (optional) | ➕ optional |

> **Wichtig – `Status` als Auswahl oder Text?** Ist `Status` eine **Auswahl**-Spalte, heißt das
> Trigger-Feld in den Ausdrücken `body/Status/Value`; ist es eine **Textspalte**, nur `body/Status`.
> Passe die Ausdrücke unten entsprechend an.

---

## Variante A – Nur die Freigabe (Geschäftsleitung)  ⭐ empfohlen

Der Flow feuert, sobald eine Richtlinie den Status **`Freigabe`** erreicht (das passiert in der App
**nach** bestandener Konformitätsprüfung und – falls betroffen – **nach** dokumentierter
Mitbestimmung). Power Automate holt die GL-Freigabe per Outlook-Mail und veröffentlicht.

### A1. Flow anlegen
Power Automate (make.powerautomate.com) → **Erstellen → Automatisierter Cloud-Flow** →
Trigger **„SharePoint – Wenn ein Element erstellt oder geändert wird"**.
- **Websiteadresse:** `…/sites/IT`  ·  **Listenname:** `Richtlinien`

### A2. Nur bei Status „Freigabe" auslösen
Flow → **… → Einstellungen → Triggerbedingungen → hinzufügen**:
```
@equals(triggerOutputs()?['body/Status/Value'], 'Freigabe')
```
*(Textspalte statt Auswahl → `body/Status` ohne `/Value`.)*

### A3. Doppelstart verhindern
1. **Bedingung:** `GenehmigungLaeuft` **ist gleich** `true` → Ja-Zweig **„Beenden"** (Erfolgreich).
2. Nein-Zweig: **„Element aktualisieren"** → `GenehmigungLaeuft = Ja`.

### A4. (Empfohlen) GL-Adressen aus access-config.json lesen
Damit dieselben Freigeber wie in der App gelten:
- **„Dateiinhalt abrufen über Pfad"** (Bibliothek „Dokumente") → Pfad
  `Richtlinienmanagement/access-config.json`
- **„Variable initialisieren"** `cfg` (Objekt) = `@json(body('Dateiinhalt_abrufen_über_Pfad'))`
- GL-Adressen = `@join(variables('cfg')?['geschaeftsleitung'], ';')`

*(Einfacher Start: GL-Adressen direkt als Text mit `;` eintragen.)*

### A4b. Richtliniendokument holen (für den Anhang)
Damit die Genehmigungs-Mail die Richtlinie **als Anhang** enthält, vor der Genehmigung den
Dateiinhalt laden. Die Liste liefert dazu `DokumentUrl` (Klartext-URL zur Datei) und `DokumentName`.

**Aktion „Dateiinhalt mit Pfad abrufen" (SharePoint):**
- **Websiteadresse** (Site aus der URL ableiten):
  ```
  @{concat('https://dihag.sharepoint.com/sites/', split(uriPath(triggerOutputs()?['body/DokumentUrl']), '/')[2])}
  ```
- **Dateipfad** (serverrelativer Pfad, dekodiert):
  ```
  @{decodeUriComponent(replace(uriPath(triggerOutputs()?['body/DokumentUrl']), concat('/sites/', split(uriPath(triggerOutputs()?['body/DokumentUrl']), '/')[2]), ''))}
  ```

> Liegen **alle** Richtliniendokumente auf **einer** Site (z. B. `…/sites/ISMS`), kannst du die
> Websiteadresse einfach fest eintragen und beim Dateipfad nur den Teil nach `/sites/ISMS` verwenden.
> Alternative ohne URL-Zerlegung (benötigt ggf. Premium/HTTP): **Microsoft Graph**
> `GET https://graph.microsoft.com/v1.0/drives/@{triggerOutputs()?['body/DokumentDriveId']}/items/@{triggerOutputs()?['body/DokumentItemId']}/content`.

### A5. Freigabe holen
**Aktion „Genehmigung starten und darauf warten":**
- **Genehmigungstyp:** *Genehmigen/Ablehnen – Erste(r) reagiert* **(= Schwelle „eine GL-Person reicht")**
  oder *… – Alle müssen genehmigen* **(= „alle GL-Personen")** – passend zur App-Einstellung
  *Freigabe, wenn …*.
- **Titel:** `Freigabe zur Veröffentlichung: ` + *Title*
- **Zugewiesen an:** die GL-Adressen (aus A4 oder direkt)
- **Details:** Link auf das Dokument (*DokumentUrl*) + „Bitte um Freigabe zur Veröffentlichung."
- **Anlagen** (unter *Erweiterte Optionen anzeigen*): die Richtlinie anhängen –
  - **Anlagenname – 1:** `DokumentName` *(aus dem Trigger)*
  - **Anlageninhalt – 1:** *Dateiinhalt* aus Schritt **A4b** (`body('Dateiinhalt_mit_Pfad_abrufen')`).

### A6. Ergebnis zurückschreiben
**Bedingung:** `Ergebnis` **ist gleich** `Approve`
- **Ja (freigegeben):** „Element aktualisieren" →
  `Status = Veröffentlicht`, `VeroeffentlichtAm = @utcNow()`,
  `FreigegebenVon = ` *Antwortende(r) Anzeigename/Mail*, `GenehmigungLaeuft = Nein`.
- **Nein (abgelehnt):** „Element aktualisieren" →
  `Status = Konformitätsprüfung` (zurück in die Prüfung) **oder** `Freigabe` (bleibt),
  `LetzteAnmerkung = ` *Kommentare*, `GenehmigungLaeuft = Nein`. Optional Info-Mail an den Ersteller.

> Die Kommentare stehen unter **Antworten → Kommentare** der Genehmigungs-Aktion.
> `FreigegebenVon` erscheint anschließend im **Audit Report** als Ereignis
> „Freigabe erteilt (Outlook / Power Automate)" und in der „Veröffentlicht"-Zeile.

### A7. In der App scharf schalten
*Einstellungen → Genehmigungsverfahren → Genehmigung über Power Automate →*
**„Nur Freigabe (Geschäftsleitung) über Power Automate"** wählen und speichern. Dann verschickt die
App **keine eigene GL-Mail** mehr; die Prüfer-/Mitbestimmungs-Mails laufen weiter aus der App.

**Test:** Richtlinie bis zur Freigabe bringen → GL bekommt Outlook-Mail mit Genehmigen/Ablehnen →
klicken → App zeigt „Veröffentlicht" (bzw. Rücklauf) – **ohne** Portalbesuch.

---

## Variante B – Prüfung **und** Freigabe über Power Automate

Wie A, aber der Trigger feuert bei **`Konformitätsprüfung`**:
```
@equals(triggerOutputs()?['body/Status/Value'], 'Konformitätsprüfung')
```

1. **Konformitätsprüfung** (Prüfer-Adressen = `cfg.pruefer`): bei `Approve` →
   - Ist die **Mitbestimmung betroffen**? In der Liste steht das in `MitbestimmungJson`
     (`kbrBetroffen`/`werke`). Wenn ja und noch nicht bestätigt → `Status = Mitbestimmung` setzen und
     den Flow beenden (die Mitbestimmung wird in der App dokumentiert; danach setzt die App
     `Status = Freigabe` → dein **Variante-A-Flow** übernimmt die GL-Freigabe).
     *Wer die Mitbestimmung ganz weglässt, setzt direkt `Status = Freigabe`.*
   - Bei `Reject` → `Status = Konformitätsprüfung`/`Entwurf`, `LetzteAnmerkung = Kommentare`.
2. **Freigabe** wie in Variante A (entweder als zweite Genehmigung im selben Flow direkt anschließen,
   oder über den separaten Variante-A-Flow, der auf `Status = Freigabe` lauscht).

In der App: **„Prüfung + Freigabe über Power Automate"** wählen.

> **Empfehlung:** Für die meisten reicht **Variante A**. Die Konformitätsprüfung (fachliche Sichtung)
> und die Mitbestimmung sind oft dialoglastig und in der App besser aufgehoben; nur die formale
> **Freigabe** der Geschäftsleitung eignet sich ideal für den Ein-Klick in Outlook.

---

## Damit keine doppelten Mails kommen
Der App-Schalter bestimmt je Etappe, ob die App ihre eigene Hinweis-Mail verschickt oder Power
Automate übernimmt (siehe A7 / B). Für die per PA gesteuerte Etappe schweigt die App.

Den **GitHub-Cron für Erinnerungen** kannst du parallel weiterlaufen lassen (er erinnert nur an
offene Schritte) – oder abschalten, da Power-Automate-Genehmigungen eigene Erinnerungen/Eskalation
mitbringen.

> Lizenz: „Genehmigungen" sind in den meisten Microsoft-365-Plänen über die „seeded"-Nutzungsrechte
> im Kontext von SharePoint/Approvals enthalten. Falls der Flow Premium verlangt, prüfen.
