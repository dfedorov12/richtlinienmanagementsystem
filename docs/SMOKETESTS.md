# Smoketests – RMS & KI-Dashboard

Diese App ist eine statische SPA (GitHub Pages) mit MSAL-Login gegen Microsoft
Graph/SharePoint. Echte End-to-End-Tests brauchen daher einen angemeldeten
Benutzer und Live-Daten und lassen sich nicht headless automatisieren. Wir
fahren deshalb zweigleisig:

1. **Statische Smoketests** (`scripts/smoketest.mjs`) – Code-Verdrahtung,
   bei jedem Push (CI) und lokal in Sekunden.
2. **Deployment-Smoke** (`scripts/deploy-smoke.mjs`) – das ausgelieferte
   Live-System per HTTP, täglich (CI) und lokal.
3. **E2E-Tests** (Playwright, `e2e/`) – authentifizierte, read-only Rendering-
   Checks; lokal mit einer selbst erzeugten Login-Session.
4. **Manuelle Smoke-Checkliste** – die Schreib-/Mail-Flows, die nicht
   automatisiert werden (kein echter Login durch Tooling, keine Produktivdaten).

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

Statische Codeprüfung sagt nichts über das ausgelieferte System oder die
Laufzeit aus. Dafür gibt es Abschnitt 2 (Deployment) und 3 (E2E).

---

## 2. Deployment-Smoke (Live, read-only)

Prüft das **ausgelieferte** System über HTTP – ohne Login, ohne Schreibzugriff
(reine GET-Requests, verändert nichts).

```bash
npm run smoke:deploy          # = node scripts/deploy-smoke.mjs
BASE=https://… npm run smoke:deploy   # andere Basis-URL
```

Fängt: kaputtes Deploy, **404-Assets** (z. B. falsches `?v=`), tote
Weiterleitung der alten KI-URL, fehlende Verdrahtung im HTML. Lädt jede Seite
(`/`, `/ki/`, alte KI-URL) **und** alle darin referenzierten Skripte/CSS und
prüft HTTP 200 + erwartete Marker. Läuft außerdem täglich über
`.github/workflows/deploy-smoke.yml`.

---

## 3. E2E-Tests (Playwright, authentifiziert & read-only)

Deckt die Login-abhängige Sicht ab, die fetch/Static nicht kann: lädt die App
mit echter Session und prüft das Rendering pro Rolle. **Bewusst nur lesend** –
keine Anträge, Entscheidungen oder Mails (läuft gegen Live; Schreib-Flows stehen
in der manuellen Checkliste, Abschnitt 4).

### Einrichten (einmalig)
```bash
npm install                   # zieht @playwright/test
npx playwright install chromium
npm run e2e:login             # öffnet sichtbaren Browser → manuell anmelden
```
`e2e:login` speichert die Session nach `e2e/.auth/state.json` (in `.gitignore`,
enthält Tokens – nie committen). Melde dich mit dem Konto an, dessen Rolle du
testen willst (Gremium/Admin zeigt mehr).

### Ausführen
```bash
npm run e2e                   # authentifiziert: Lese-Checks + Schreib-Validierung
npm run e2e:preauth           # alte-URL-Redirect, ohne Login
```

Geprüft wird u. a.: App-Shell lädt ohne Boot-Fehler, Benutzer geladen,
„Meine Richtlinien" ohne Rechte-/Ladefehler, `/ki/` unter derselben Session
(SSO), Gremium-Badge ⇒ Einstellungen-Tab, Demo-Modus zeigt die KI-Vorschläge.

**Schreib-Validierung (sicher).** `e2e/mutations.spec.js` Teil A klickt echte
Schreib-Buttons, die die App **blockiert** – Ablehnen/Rückfrage ohne Kommentar
(KI) und „nicht konform" ohne Begründung (RMS). Es wird **nichts gespeichert und
keine Mail ausgelöst**; genau diese Pflicht-Kommentar-Regeln werden so
abgesichert. Tests überspringen sich automatisch, wenn die Rolle/Datenlage
keinen passenden Datensatz hergibt.

**Echte Mutation (opt-in).** Teil B legt einen Antrag mit Präfix `[E2E-TEST]`
an. Nur mit gesetzter Umgebungsvariable:
```powershell
# PowerShell (Windows)
$env:E2E_WRITE = "1"; npm run e2e
```
```bash
# bash
E2E_WRITE=1 npm run e2e
```
> ⚠️ **Mailversand:** Das Einreichen löst – wie im echten Betrieb – Genehmiger-
> Mails an `@dihag.com` aus, sofern die E-Mail-Benachrichtigung in den
> KI-Einstellungen aktiv ist. Vor dem Lauf ggf. dort abschalten. Test-Anträge
> tragen das Präfix `[E2E-TEST]` und lassen sich in SharePoint gesammelt löschen
> (das Dashboard hat keine UI-Löschung für Anträge).

> Hinweis: Der MSAL-Login (inkl. MFA) ist interaktiv und kann nicht headless in
> CI laufen – diese Suite ist für den lokalen Lauf gedacht, nicht für den Push-CI.

---

## 4. Manuelle Smoke-Checkliste (nach größerem Deploy)

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
