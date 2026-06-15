# Smoketests – RMS & KI-Dashboard

Diese App ist eine statische SPA (GitHub Pages) mit MSAL-Login gegen Microsoft
Graph/SharePoint. Echte End-to-End-Tests brauchen daher einen angemeldeten
Benutzer und Live-Daten und lassen sich nicht headless automatisieren. Wir
fahren deshalb zweigleisig:

1. **Automatische statische Smoketests** (`scripts/smoketest.mjs`) – laufen bei
   jedem Push über GitHub Actions und lokal in Sekunden.
2. **Manuelle Smoke-Checkliste** – die wenigen Auth-/SharePoint-abhängigen
   Flows, einmal nach jedem größeren Deploy durchklicken.

---

## 1. Automatische Smoketests

### Ausführen

```bash
node scripts/smoketest.mjs        # Exit 0 = grün, 1 = Fehler
```

Keine Dependencies, Node 20+. Läuft außerdem automatisch über
`.github/workflows/smoketest.yml` bei jedem Push und Pull-Request.

### Was geprüft wird

| # | Prüfung | Fängt … |
|---|---------|---------|
| 1 | **Syntax** – `node --check` über alle `js/`, `ki/`, `scripts/`-Dateien | Tippfehler/Parse-Fehler, bevor sie live gehen |
| 2 | **Bundle-Integrität** – jede in `index.html` und `ki/index.html` referenzierte Skript-/CSS-Datei existiert | falsch geschriebene/verschobene/gelöschte Includes |
| 3 | **Inline-Handler** – jeder `onclick`/`oninput`/`onchange`/… ruft eine real definierte Funktion auf | tote Referenzen nach Umbenennen/Entfernen einer Funktion (der häufigste Fehler bei Inline-Handlern) |
| 4 | **access-config-Konsistenz** – die `ki*`-Felder, die das KI-Dashboard liest, werden im RMS-Admin gepflegt und umgekehrt | auseinanderlaufende Konfig-Schlüssel zwischen RMS und `/ki/` |

Prüfung 3 sammelt alle global definierten Funktionen je Bundle
(`index.html` → `js/*.js`, `ki/index.html` → `js/auth.js` + `ki/app.js`) und
gleicht sie gegen die in den Handlern aufgerufenen Funktionen ab. Methoden­aufrufe
(`this.focus()`), `${…}`-Interpolationen und JS-Built-ins werden korrekt
ignoriert.

### Was NICHT geprüft wird

Alles, was einen echten Login + SharePoint braucht: Anmeldung/SSO, Graph-Reads,
Speichern, Mailversand, Datei-Upload. → Manuelle Checkliste unten.

---

## 2. Manuelle Smoke-Checkliste (nach größerem Deploy)

Kurz durchklicken; ~5 Minuten. Voraussetzung: angemeldet als Admin **und**
einmal als normaler Mitarbeiter (oder zweites Konto).

### Richtlinienmanagement – <https://richtlinienmanagement.dihag-extern.com/>
- [ ] Login per Microsoft-Konto, App lädt ohne Boot-Fehler
- [ ] „Meine Richtlinien“ zeigt Karten; Reiterwechsel lädt zügig (Cache greift)
- [ ] „Aktualisieren“ erzwingt Neuladen
- [ ] Richtlinie öffnen → Dokument-Vorschau lädt → Kenntnisnahme + ggf. Wissenstest
- [ ] **Freigaben** (als Prüfer): „Nicht konform“ **ohne** Kommentar → wird
      blockiert (rotes Feld); mit Kommentar → gespeichert, Anmerkung im Verlauf
- [ ] **Freigaben** (als GL): „Freigeben“ (optional Kommentar) → Status wandert
- [ ] Karten per Tastatur erreichbar (Tab → Enter öffnet)

### KI-Dashboard – <https://richtlinienmanagement.dihag-extern.com/ki/>
- [ ] Aus dem RMS via Sidebar „KI-Dashboard“ erreichbar, **ohne** erneuten Login (SSO)
- [ ] Als Gremiumsmitglied: „Gremium“-Badge + Einstellungen-Tab sichtbar
- [ ] Antrag öffnen → **Ablehnen ohne Kommentar** wird blockiert; mit Kommentar
      gespeichert, Kommentar steht im Verlauf
- [ ] Genehmigen mit/ohne Kommentar funktioniert
- [ ] Datei-Anhang hochladen und wieder löschen (läuft über Graph-Bibliothek)
- [ ] Einstellungen → Mail-Domains/Genehmigungsmodus speichern → nach Reload erhalten
- [ ] `…/ki/?demo=1` zeigt die KI-Vorschläge-Sidebar
- [ ] Genehmiger-Position (Legal/Datenschutz/Compliance/IT) erscheint als Badge

### Umzug der alten URLs
- [ ] <https://ki-dashboard.dihag-extern.com/> leitet auf `…/ki/` weiter
- [ ] Deep-Link `?antrag=<id>` der alten URL landet am neuen Ort

---

## Hinweise

- Die alten Repos `ki-dashboard` / `ki-dashboard-test` sind archiviert und
  liefern nur noch die Weiterleitungsseite – nicht mehr Teil der Smoketests.
- Schlägt der automatische Smoketest fehl, blockiert das den Merge/Deploy nicht
  hart (GitHub Pages deployt unabhängig), ist aber das klare Signal, vor dem
  Weiterarbeiten zu prüfen.
