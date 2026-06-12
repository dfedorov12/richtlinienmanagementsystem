# Genehmigen / Ablehnen direkt aus der E-Mail (Power Automate)

Ziel: Prüfer und Geschäftsleitung **bestätigen oder lehnen direkt in Outlook ab** – ohne das
Richtlinienportal zu öffnen. Das leistet **Power Automate „Genehmigungen"**: Microsoft verschickt
eine actionable E-Mail mit **Genehmigen/Ablehnen**-Buttons, die **inline in Outlook** (Desktop,
Web, Handy) funktionieren. Kein eigener Server nötig, und nur der zugewiesene Genehmiger kann
antworten (über sein M365-Konto authentifiziert).

> Die App bleibt unverändert nutzbar: Sie steuert alles über die Spalte **`Status`** der Liste
> „Richtlinien". Power Automate ändert genau diese Spalte – die App zeigt das Ergebnis sofort an.
> Der GitHub-Cron für Erinnerungen läuft unabhängig weiter.

---

## 0. Einmalige Vorbereitung in SharePoint
Lege in der Liste **„Richtlinien"** eine Hilfsspalte an (verhindert doppelte Genehmigungen):

| Spalte | Typ | Zweck |
|---|---|---|
| `GenehmigungLaeuft` | Ja/Nein (Default Nein) | Sperre, solange eine Genehmigung aussteht |

Optionale Spalten für die Nachvollziehbarkeit (empfohlen):
| `LetzteAnmerkung` | Mehrere Zeilen Text | Kommentar bei „Ablehnen" |
| `GenehmigtVon` | Einzelne Textzeile | wer zuletzt entschieden hat |

---

## 1. Flow anlegen
Power Automate (make.powerautomate.com) → **Erstellen → Automatisierter Cloud-Flow** →
Trigger **„SharePoint – Wenn ein Element erstellt oder geändert wird"**.
- **Websiteadresse:** die Site der App-Listen (`…/sites/IT`)
- **Listenname:** `Richtlinien`

### 1a. Nur bei Konformitätsprüfung auslösen
Flow → **… → Einstellungen → Triggerbedingungen → hinzufügen**:
```
@equals(triggerOutputs()?['body/Status/Value'], 'Konformitätsprüfung')
```
(So feuert der Flow nur, wenn `Status = Konformitätsprüfung`. Nach der Entscheidung wechselt der
Status – dadurch entsteht **keine** Endlosschleife.)

### 1b. Doppelstart verhindern
1. **Bedingung:** `GenehmigungLaeuft` **ist gleich** `true` → im Ja-Zweig **„Beenden"** (Status: Erfolgreich).
2. Im Nein-Zweig: **„Element aktualisieren"** → `GenehmigungLaeuft = Ja`.

### 1c. (Empfohlen) Prüfer/GL aus access-config.json lesen
Damit dieselben Rollen wie in der App gelten:
- **„Dateiinhalt abrufen über Pfad"** (Bibliothek „Dokumente") → Pfad
  `Richtlinienmanagement/access-config.json`
- **„Variable initialisieren"** `cfg` (Typ Objekt) = `@json(body('Dateiinhalt_abrufen_über_Pfad'))`
- Prüfer-Adressen = `@join(variables('cfg')?['pruefer'], ';')`
- GL-Adressen = `@join(variables('cfg')?['geschaeftsleitung'], ';')`

*(Einfacher Start ohne Datei: Prüfer/GL direkt als Text mit `;` eintragen.)*

---

## 2. Schritt 1 – Konformitätsprüfung (Genehmigen/Ablehnen)
**Aktion „Genehmigung starten und darauf warten":**
- **Genehmigungstyp:** *Genehmigen/Ablehnen – Erste(r) reagiert* (= „einer reicht") **oder**
  *… – Alle müssen genehmigen* (= „alle"), passend zu eurer Schwelle.
- **Titel:** `Konformitätsprüfung: ` + *Title*
- **Zugewiesen an:** die Prüfer-Adressen (aus 1c oder direkt)
- **Details:** Beschreibung + Link aufs Dokument (*DokumentUrl*) + Hinweis „Bitte um Sichtung und ggf. Anmerkung".
- **Elementlink:** *Link to item* (optional)

**Danach Bedingung:** `Ergebnis` **ist gleich** `Approve`
- **Ja (konform):** „Element aktualisieren" → `Status = Freigabe`, `GenehmigtVon = …Antwortende…`, `GenehmigungLaeuft = Nein`.
  → weiter zu **Schritt 2**.
- **Nein (nicht konform):** „Element aktualisieren" → `Status = Konformitätsprüfung` (bleibt) oder `Entwurf`,
  `LetzteAnmerkung = …Kommentare…`, `GenehmigungLaeuft = Nein`. Optional E-Mail an den Ersteller.
  → Flow endet.

> Die Kommentare der Antwort stehen unter `Antworten → Kommentare` der Genehmigungs-Aktion.

---

## 3. Schritt 2 – Freigabe durch die Geschäftsleitung
Direkt im selben Flow (im „Ja/konform"-Zweig) eine **zweite** „Genehmigung starten und darauf warten":
- **Titel:** `Freigabe zur Veröffentlichung: ` + *Title*
- **Zugewiesen an:** GL-Adressen
- **Bedingung `Ergebnis = Approve`:**
  - **Ja:** „Element aktualisieren" → `Status = Veröffentlicht`, `VeroeffentlichtAm = @utcNow()`, `FreigegebenVon = …Antwortende…`.
  - **Nein:** `Status = Konformitätsprüfung` (zurück), `LetzteAnmerkung = …Kommentare…`.

Fertig: Die Entscheidung wird komplett **in Outlook** getroffen; die App zeigt den neuen Status
automatisch (Freigaben-/Compliance-Reiter).

---

## 4. Damit keine doppelten Mails kommen
Die App verschickt beim Einreichen sonst **selbst** eine Hinweis-Mail an die Prüfer/GL
(`notifyPruefer`/`notifyGL`). Der Schalter dafür existiert bereits:
**Einstellungen → „Genehmigungsverfahren – Schwellen" → Genehmigungs-Mails →
„Über Power Automate (App-Mails aus)"** wählen und speichern — dann verschickt die App keine
eigenen Prüf-/Freigabe-Mails mehr und Power Automate übernimmt vollständig.

Den **GitHub-Cron für Erinnerungen** kannst du parallel weiterlaufen lassen (er erinnert nur an
offene Schritte) – oder abschalten, da Power-Automate-Genehmigungen eigene Erinnerungen/Eskalation
mitbringen. Deine Wahl.

---

## 5. Test
1. In der App eine Richtlinie auf **„Zur Konformitätsprüfung"** setzen.
2. Der zugewiesene Prüfer bekommt eine **Outlook-Mail mit Genehmigen/Ablehnen** → **direkt klicken**.
3. Bei „Genehmigen" geht die Freigabe-Mail an die GL → klicken → **Veröffentlicht**.
4. In der App prüfen: Status ist korrekt weitergewandert – **ohne** dass jemand das Portal geöffnet hat.

> Lizenz: Genehmigungen sind in den meisten Microsoft-365-Plänen über die „seeded"-Nutzungsrechte
> im Kontext von SharePoint/Approvals enthalten. Falls der Flow Premium verlangt, prüfen.
