/**
 * Reiter „Governance-Struktur"
 * ============================
 * Das Konzernregelwerk als Matrix: <b>Kategorie</b> (Spalten des
 * Konzernregelwerk-Fundaments) × <b>Dokumentenart</b> (Verbindlichkeitsebene der
 * Regelwerkspyramide), dazu Verantwortung und Stand je Regelung.
 *
 * Die Daten sind ein Auszug aus der Zuständigkeiten-Mappe des Corporate-Governance-
 * Boards (CGB_Organisation_Zuständigkeiten_Nomenklatur.xlsx, Stand 12.08.2026).
 * Sie stehen bewusst hier im Code und nicht in SharePoint: Es ist eine
 * Momentaufnahme der Planung, kein Live-Bestand. Ändert sich die Mappe, erzeugt
 * `python scripts/govstruktur-import.py <mappe.xlsx>` diesen Block neu.
 */

/** Verbindlichkeitsebenen der Regelwerkspyramide – oben am verbindlichsten. */
const GOV_ARTEN = [
  { key: "Handbuch",                  erklaerung: "In sich abgeschlossenes Themengebiet (z. B. Code of Conduct)" },
  { key: "Policy",                    erklaerung: "Strategischer Rahmen: Was ist das Ziel, der Grundsatz?" },
  { key: "Konzernrichtlinie",         erklaerung: "Operativer Rahmen: Wie handeln wir?" },
  { key: "Konzernfachregelung",       erklaerung: "Fachgerechte Ausführung" },
  { key: "Arbeits-/Prozessanweisung", erklaerung: "Handlungsanleitung Schritt für Schritt" },
  { key: "Leitfaden",                 erklaerung: "Handlungsempfehlungen" },
  { key: "Weitere",                   erklaerung: "Vorlagen und Muster – außerhalb der Pyramide" },
];

/** Kategorien des Konzernregelwerk-Fundaments (Reihenfolge wie in der Übersicht). */
const GOV_KATEGORIEN = [
  "Allgemein",
  "Recht / Steuern / Datenschutz / Versicherungen",
  "Compliance",
  "Security / Cyber Security",
  "Finanzen / ReWe / Controlling / Einkauf",
  "Nachhaltigkeit / Arbeitssicherheit & Gesundheitsschutz",
  "HR / Corporate Transformation / IT",
];

/** Stand der zugrunde liegenden Mappe. */
const GOV_STAND = "12.08.2026";

/** Ein Eintrag: { kategorie, art, titel, owner, status, … }.
 *  status: 'gueltig' (final abgelegt) | 'arbeit' (in Erarbeitung/Prüfung) | 'offen' (noch nicht begonnen).
 *  Titel und Verantwortung stehen unverändert so in der Mappe. */
const GOV_EINTRAEGE = [
  { kategorie: "Allgemein", art: "Handbuch", titel: "Corporate Governance Kodex (DCGK)", owner: "Gansow", status: "gueltig", statusRoh: "Final", dokument: "Deutscher_Corporate_Governance_ Kodex _2022", datum: "27.06.2022" },
  { kategorie: "Allgemein", art: "Konzernfachregelung", titel: "Konzernfachregelungen_ Erstellung, Freigabe, Aktualisierung Konzernregelungen", owner: "Gansow", status: "offen", dokument: "2026_ Konzernfachregelung_Erstellung_Freigabe_Aktualisierung", version: "V1", datum: "03.07.2026" },
  { kategorie: "Allgemein", art: "Weitere", titel: "Muster_Erstellung von Konzernregelungen", owner: "Gansow", status: "offen", dokument: "2026_ Muster_Erstellung von Konzernregelungen", version: "V1", datum: "09.07.2026" },
  { kategorie: "Recht / Steuern / Datenschutz / Versicherungen", art: "Konzernrichtlinie", titel: "Kartellrecht", owner: "Gansow", status: "arbeit", statusRoh: "In Prüfung", version: "V1.1", datum: "22.01.2026" },
  { kategorie: "Recht / Steuern / Datenschutz / Versicherungen", art: "Konzernrichtlinie", titel: "Rechte & Pflichten Prokura, Zeichnungsberechtigungen", owner: "Gansow", status: "arbeit", statusRoh: "In Erarbeitung" },
  { kategorie: "Recht / Steuern / Datenschutz / Versicherungen", art: "Konzernrichtlinie", titel: "Dokumentations- & Aufbewahrungspflichten", owner: "Gansow", status: "offen", statusRoh: "offen" },
  { kategorie: "Recht / Steuern / Datenschutz / Versicherungen", art: "Konzernrichtlinie", titel: "Vertragsmanagement & Vertragsprüfung", owner: "Gansow", status: "offen", statusRoh: "offen" },
  { kategorie: "Recht / Steuern / Datenschutz / Versicherungen", art: "Konzernrichtlinie", titel: "Umgang mit Interessenkonflikten", owner: "Gansow", status: "arbeit", statusRoh: "In Erarbeitung" },
  { kategorie: "Recht / Steuern / Datenschutz / Versicherungen", art: "Konzernrichtlinie", titel: "Konzernsteuerrahmen", owner: "Essberger", status: "offen", statusRoh: "offen" },
  { kategorie: "Recht / Steuern / Datenschutz / Versicherungen", art: "Konzernrichtlinie", titel: "Steuerbrechnung & Steuererklärung", owner: "Essberger", status: "offen", statusRoh: "offen" },
  { kategorie: "Recht / Steuern / Datenschutz / Versicherungen", art: "Konzernrichtlinie", titel: "Umsatzsteuer", owner: "Essberger", status: "offen", statusRoh: "offen" },
  { kategorie: "Recht / Steuern / Datenschutz / Versicherungen", art: "Konzernrichtlinie", titel: "Bewirtungskosten", owner: "Essberger", status: "arbeit", statusRoh: "zu prüfen" },
  { kategorie: "Recht / Steuern / Datenschutz / Versicherungen", art: "Konzernrichtlinie", titel: "Internationale Verrechnungspreise", owner: "Essberger", status: "arbeit", statusRoh: "zu prüfen" },
  { kategorie: "Recht / Steuern / Datenschutz / Versicherungen", art: "Konzernrichtlinie", titel: "Betriebsveranstaltungen und Geschenke an MA", owner: "Essberger", status: "arbeit", statusRoh: "zu prüfen" },
  { kategorie: "Recht / Steuern / Datenschutz / Versicherungen", art: "Konzernrichtlinie", titel: "Geschenke an Geschäftsfreunde", owner: "Essberger", status: "arbeit", statusRoh: "zu prüfen" },
  { kategorie: "Recht / Steuern / Datenschutz / Versicherungen", art: "Konzernrichtlinie", titel: "Datenschutz", owner: "Würz/Rieble/Gansow", status: "gueltig", statusRoh: "Final" },
  { kategorie: "Recht / Steuern / Datenschutz / Versicherungen", art: "Konzernrichtlinie", titel: "Datenschutz-Organisationsrichtlinie", owner: "Würz/Rieble/Gansow", status: "gueltig", statusRoh: "Final" },
  { kategorie: "Recht / Steuern / Datenschutz / Versicherungen", art: "Konzernrichtlinie", titel: "Informationssicherheit", owner: "Würz/Rieble/Fedorov", status: "gueltig", statusRoh: "Final" },
  { kategorie: "Recht / Steuern / Datenschutz / Versicherungen", art: "Konzernrichtlinie", titel: "KI", owner: "Würz/Rieble/Fedorov/Gansow", status: "gueltig", statusRoh: "Final" },
  { kategorie: "Recht / Steuern / Datenschutz / Versicherungen", art: "Konzernrichtlinie", titel: "Versicherungen", owner: "Schüller", status: "offen" },
  { kategorie: "Compliance", art: "Handbuch", titel: "Verhaltenskodex", owner: "Gansow", status: "gueltig", statusRoh: "Final", dokument: "260727_DIHAG-Verhaltenskodex", version: "Version 2.0", datum: "27.07.2026" },
  { kategorie: "Compliance", art: "Handbuch", titel: "Verhaltenskodex für Geschäftspartner", owner: "Rauch/Würz/Rieble", status: "arbeit", statusRoh: "zu prüfen", dokument: "2025Okt15_DIHAG Verhaltenkodex für Geschäftspartner", version: "Version 1.1", datum: "15.10.2025" },
  { kategorie: "Compliance", art: "Konzernrichtlinie", titel: "AntiKorruption", owner: "Rauch", status: "arbeit", statusRoh: "zu prüfen", dokument: "2026Feb06_DIHAG AntiKorruptions-Richtlinie_Version 1.1", version: "Version 1.1", datum: "06.02.2026" },
  { kategorie: "Compliance", art: "Konzernrichtlinie", titel: "Einladungen und Zuwendungen", owner: "Rauch/Würz/Rieble", status: "arbeit", statusRoh: "zu prüfen", dokument: "2026Jan22_DIHAG Richtlinie - Einladungen und Zuwendungen_Version 1.1", version: "Version 1.1", datum: "22.01.2026" },
  { kategorie: "Compliance", art: "Konzernrichtlinie", titel: "Spenden und Sponsoring", owner: "Rauch/Würz/Rieble", status: "arbeit", statusRoh: "zu prüfen", dokument: "2026Jan22_DIHAG Richtlinie Spenden und Sponsoring_Version 1.1", version: "Version 1.1", datum: "22.01.2026" },
  { kategorie: "Compliance", art: "Konzernrichtlinie", titel: "Geschäftspartnerprüfung", owner: "Neumnann/Orsowa/Rieble/Würz", status: "arbeit", statusRoh: "In Überarbeitung", dokument: "2026Feb11_DIHAG_Richtlinie Geschäftspartnerprüfung_Version 1.1", version: "Version 1.1", datum: "11.02.2026" },
  { kategorie: "Compliance", art: "Konzernrichtlinie", titel: "Exportkontrolle", owner: "Lehnert /Würz", status: "arbeit", statusRoh: "zu prüfen", dokument: "2026Feb11_DIHAG Richtlinie Exportkontrolle_Version 1.1", version: "Version 1.1", datum: "11.02.2026" },
  { kategorie: "Compliance", art: "Policy", titel: "Hinweisgebersystem", owner: "Rauch/Würz/Rieble", status: "arbeit", statusRoh: "zu prüfen", dokument: "2026Feb06_DIHAG Hinweisgebersystem_Version 1.2.", version: "Version 1.2", datum: "06.02.2026" },
  { kategorie: "Compliance", art: "Policy", titel: "Compliance-Organisation", owner: "Rauch/Würz/Rieble", status: "arbeit", statusRoh: "zu prüfen", dokument: "2026Jan12_DIHAG Organisations-Richtlinie_Version 1.1", version: "Version 1.1", datum: "12.01.2026" },
  { kategorie: "Security / Cyber Security", art: "Konzernrichtlinie", titel: "Konzernsecurityrahmen", owner: "tbd", status: "offen" },
  { kategorie: "Security / Cyber Security", art: "Konzernrichtlinie", titel: "Krisenmanagement und Krisenvorsorge", owner: "tbd", status: "offen" },
  { kategorie: "Security / Cyber Security", art: "Konzernrichtlinie", titel: "Business Continuity Managment (BCM)", owner: "tbd", status: "offen" },
  { kategorie: "Security / Cyber Security", art: "Konzernrichtlinie", titel: "Cyber Security Richtlinie", owner: "Fedorov", status: "offen" },
  { kategorie: "Security / Cyber Security", art: "Konzernfachregelung", titel: "Mindeststandards für MA", owner: "Fedorov", status: "offen" },
  { kategorie: "Security / Cyber Security", art: "Konzernfachregelung", titel: "Mindeststandards für IT", owner: "Fedorov", status: "offen" },
  { kategorie: "Security / Cyber Security", art: "Konzernfachregelung", titel: "Mindesstandards Risikoeigentümer, Vorgesetzte, HR, Procurement", owner: "Fedorov", status: "offen" },
  { kategorie: "Finanzen / ReWe / Controlling / Einkauf", art: "Konzernrichtlinie", titel: "Rahmenkonzernrichtlinie: Banken, Finanzierung, Crefo, Geldanalgen/Finanzgeschäfte, Sicherheiten, Cash, It-Systeme", owner: "Schüller", status: "offen", statusRoh: "offen" },
  { kategorie: "Finanzen / ReWe / Controlling / Einkauf", art: "Konzernfachregelung", titel: "Kreditrisikomanagement", owner: "Schüller", status: "offen", statusRoh: "offen" },
  { kategorie: "Finanzen / ReWe / Controlling / Einkauf", art: "Konzernrichtlinie", titel: "IKS", owner: "Schüller", status: "offen", statusRoh: "offen" },
  { kategorie: "Finanzen / ReWe / Controlling / Einkauf", art: "Konzernfachregelung", titel: "HGB", owner: "Schüller", status: "offen", statusRoh: "offen" },
  { kategorie: "Finanzen / ReWe / Controlling / Einkauf", art: "Konzernfachregelung", titel: "Außenwirtschaftsverordnung", owner: "Schüller", status: "offen", statusRoh: "offen" },
  { kategorie: "Finanzen / ReWe / Controlling / Einkauf", art: "Konzernfachregelung", titel: "Funktionstrennungsrisiken in SAP-Systemen (SOD)", owner: "Schüller", status: "offen", statusRoh: "offen" },
  { kategorie: "Finanzen / ReWe / Controlling / Einkauf", art: "Konzernfachregelung", titel: "Übertragung von Vermögenswerten bei Übergang von Pensionsverpflichtungen", owner: "Schüller", status: "offen", statusRoh: "offen" },
  { kategorie: "Finanzen / ReWe / Controlling / Einkauf", art: "Policy", titel: "Überwachung der Unabhängigkeit des Abschlussprüfers", owner: "Schüller", status: "offen", statusRoh: "offen" },
  { kategorie: "Finanzen / ReWe / Controlling / Einkauf", art: "Konzernrichtlinie", titel: "EMIR & SFTR", owner: "Wipper", status: "offen", statusRoh: "offen" },
  { kategorie: "Finanzen / ReWe / Controlling / Einkauf", art: "Konzernrichtlinie", titel: "Investitionen", owner: "Wipper", status: "offen", statusRoh: "offen" },
  { kategorie: "Finanzen / ReWe / Controlling / Einkauf", art: "Konzernrichtlinie", titel: "Risk- Management", owner: "Wipper", status: "offen", statusRoh: "offen" },
  { kategorie: "Finanzen / ReWe / Controlling / Einkauf", art: "Konzernrichtlinie", titel: "MiDID II", owner: "Wipper", status: "offen", statusRoh: "offen" },
  { kategorie: "Finanzen / ReWe / Controlling / Einkauf", art: "Konzernfachregelung", titel: "Commodity Risk Management", owner: "Wipper", status: "offen", statusRoh: "offen" },
  { kategorie: "Finanzen / ReWe / Controlling / Einkauf", art: "Konzernfachregelung", titel: "Wirtschaftlichkeitsrechnung", owner: "Wipper", status: "offen", statusRoh: "offen" },
  { kategorie: "Finanzen / ReWe / Controlling / Einkauf", art: "Konzernfachregelung", titel: "KontraG-Risk Management", owner: "Wipper", status: "offen", statusRoh: "offen" },
  { kategorie: "Finanzen / ReWe / Controlling / Einkauf", art: "Konzernrichtlinie", titel: "Einkaufskonzernrichtlinie", owner: "Neumann", status: "arbeit", statusRoh: "In Überarbeitung", version: "Version 2.0", datum: "01.01.2026" },
  { kategorie: "Finanzen / ReWe / Controlling / Einkauf", art: "Konzernrichtlinie", titel: "Forderungsmanagement", owner: "Schüller", status: "offen", statusRoh: "offen" },
  { kategorie: "Nachhaltigkeit / Arbeitssicherheit & Gesundheitsschutz", art: "Policy", titel: "Grundsatzerklärung über Menschenrechtsstrategie", owner: "Gansow", status: "offen", statusRoh: "offen" },
  { kategorie: "Nachhaltigkeit / Arbeitssicherheit & Gesundheitsschutz", art: "Konzernrichtlinie", titel: "Kreislaufwirtschaft intern", owner: "Gasse", status: "offen", statusRoh: "offen" },
  { kategorie: "Nachhaltigkeit / Arbeitssicherheit & Gesundheitsschutz", art: "Konzernrichtlinie", titel: "Umweltschutz", owner: "Gasse", status: "offen", statusRoh: "offen" },
  { kategorie: "Nachhaltigkeit / Arbeitssicherheit & Gesundheitsschutz", art: "Konzernrichtlinie", titel: "Human Rights Risk Management", owner: "Gasse/Gansow", status: "offen", statusRoh: "offen" },
  { kategorie: "Nachhaltigkeit / Arbeitssicherheit & Gesundheitsschutz", art: "Policy", titel: "Kreislaufwirtschaft extern", owner: "Gasse", status: "offen", statusRoh: "offen" },
  { kategorie: "Nachhaltigkeit / Arbeitssicherheit & Gesundheitsschutz", art: "Konzernrichtlinie", titel: "Sicherheit und Gesundheit am Arbeitsplatz (SGA)", owner: "Herzog", status: "offen", statusRoh: "offen" },
  { kategorie: "Nachhaltigkeit / Arbeitssicherheit & Gesundheitsschutz", art: "Konzernfachregelung", titel: "Arbeitsmedizinische Vorsorge", owner: "Herzog", status: "offen", statusRoh: "offen" },
  { kategorie: "HR / Corporate Transformation / IT", art: "Konzernrichtlinie", titel: "On- & Off- Boarding-Prozess von Mitarbeitern", owner: "Herzog", status: "offen", statusRoh: "Offen" },
  { kategorie: "HR / Corporate Transformation / IT", art: "Konzernrichtlinie", titel: "Dienstwagenrichtlinie", owner: "Herzog", status: "arbeit", statusRoh: "In Prüfung" },
  { kategorie: "HR / Corporate Transformation / IT", art: "Leitfaden", titel: "Dienstwagenberechtigungsstufen", owner: "Herzog", status: "arbeit", statusRoh: "In Prüfung" },
  { kategorie: "HR / Corporate Transformation / IT", art: "Konzernrichtlinie", titel: "Reisekostenabrechnung", owner: "Herzog", status: "arbeit", statusRoh: "In Prüfung" },
  { kategorie: "HR / Corporate Transformation / IT", art: "Konzernrichtlinie", titel: "Einsatz von Fremdpersonal (Dienst-& Werkleister, Selbständige, Arbeitnehmerüberlassung)", owner: "Gansow, Rauch, Herzog", status: "arbeit", statusRoh: "In Prüfung" },
  { kategorie: "HR / Corporate Transformation / IT", art: "Policy", titel: "Anti-Diskriminierung/AGG", owner: "Herzog", status: "offen", statusRoh: "Offen" },
  { kategorie: "HR / Corporate Transformation / IT", art: "Konzernrichtlinie", titel: "Veranstaltung u. Messen", owner: "Gaede", status: "offen", statusRoh: "offen" },
  { kategorie: "HR / Corporate Transformation / IT", art: "Konzernrichtlinie", titel: "Services", owner: "Friedland", status: "offen", statusRoh: "offen" },
  { kategorie: "HR / Corporate Transformation / IT", art: "Konzernrichtlinie", titel: "IT_Systeme Anwendungen", owner: "Kleinböhl", status: "offen", statusRoh: "offen" },
  { kategorie: "HR / Corporate Transformation / IT", art: "Konzernfachregelung", titel: "SAP Berechtigungskonzept", owner: "Kleinböhl", status: "gueltig", statusRoh: "Final", dokument: "Berechtigungskonzept_DIHAG_V1", version: "Version V1", datum: "01.01.2024" },
];

/** Regelungen außerhalb des Konzernregelwerks – gleiche Mappe, eigene Grobfunktion. */
const GOV_WEITERE = [
  { bereich: "Leitbild/Vision", titel: "Leitbild/Vision", owner: "Orsowa, Novy", status: "arbeit", statusRoh: "Im Prozess", dokument: "Unternehmensphilosophie und Werte der DIHAG" },
  { bereich: "Unternehmenspolitik", titel: "Unternehmenspolitik", owner: "Lohr", status: "arbeit", statusRoh: "in Überarbeitung", dokument: "Strategische Ausrichtung, Teil des IMS" },
  { bereich: "Kollektivrechtliche Regelungen", titel: "KBV_Compliance", owner: "Herzog", status: "offen" },
  { bereich: "Kollektivrechtliche Regelungen", titel: "KBV_Compliance_Anlagen_1-3", owner: "Herzog", status: "offen" },
  { bereich: "Kollektivrechtliche Regelungen", titel: "KBV_CRM", owner: "Herzog", status: "offen" },
  { bereich: "Kollektivrechtliche Regelungen", titel: "KBV_IT", owner: "Herzog", status: "offen" },
  { bereich: "Kollektivrechtliche Regelungen", titel: "KBV_ Konzerneinsatz", owner: "Herzog", status: "offen" },
  { bereich: "Kollektivrechtliche Regelungen", titel: "KBV_ Microsoft 365", owner: "Herzog", status: "offen" },
  { bereich: "Kollektivrechtliche Regelungen", titel: "TBD", owner: "Herzog", status: "offen" },
];

/* ═══════════════════════════════════════════════════
   Ansicht
   ═══════════════════════════════════════════════════
   Zwei Blickwinkel auf dieselben Daten: die Matrix beantwortet „was fehlt uns
   wo?", die Verantwortungssicht „wer hat wie viel offen?". Beides braucht das
   Board – deshalb ein Umschalter statt zweier Reiter. */

let _gsModus = 'matrix';   // 'matrix' | 'owner'
let _gsSuche = '';
let _gsStatus = '';        // '' | 'gueltig' | 'arbeit' | 'offen'
let _gsOwner = '';

const GOV_STATUS = {
  gueltig: { label: 'gültig',    farbe: '#166534', flaeche: '#dcfce7', rand: '#86efac' },
  arbeit:  { label: 'in Arbeit', farbe: '#92400e', flaeche: '#fef3c7', rand: '#fcd34d' },
  offen:   { label: 'offen',     farbe: '#475569', flaeche: '#f1f5f9', rand: '#cbd5e1' },
};

/** Mehrere Verantwortliche stehen in der Mappe als „Würz/Rieble/Fedorov" oder „A, B". */
function gsOwnerListe(owner) {
  return String(owner || '').split(/[\/,]/).map(x => x.trim()).filter(Boolean);
}

/** Alle Verantwortlichen, alphabetisch – für den Filter. */
function gsAlleOwner() {
  const set = new Set();
  GOV_EINTRAEGE.forEach(e => gsOwnerListe(e.owner).forEach(o => set.add(o)));
  return [...set].sort((a, b) => a.localeCompare(b, 'de'));
}

function gsGefiltert() {
  const q = _gsSuche.toLowerCase().trim();
  return GOV_EINTRAEGE.filter(e => {
    if (_gsStatus && e.status !== _gsStatus) return false;
    if (_gsOwner && !gsOwnerListe(e.owner).some(o => o === _gsOwner)) return false;
    if (q && !(`${e.titel} ${e.owner} ${e.kategorie} ${e.art} ${e.dokument || ''}`).toLowerCase().includes(q)) return false;
    return true;
  });
}

/** Gibt es zu dieser Regelung schon ein Regelwerk im RMS? (Titelvergleich, tolerant) */
function gsPolicyTreffer(titel) {
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-zà-ÿ0-9]/g, '');
  const t = norm(titel);
  if (t.length < 5) return null;
  return ((typeof State !== 'undefined' && State.policies) || [])
    .find(p => { const n = norm(p.title); return n === t || n.includes(t) || t.includes(n); }) || null;
}

function gsModus(m) { _gsModus = m; renderGovStruktur(); }
function gsSuche(v) { _gsSuche = v || ''; renderGovStruktur(); }
function gsStatusFilter(v) { _gsStatus = v || ''; renderGovStruktur(); }
function gsOwnerFilter(v) { _gsOwner = v || ''; renderGovStruktur(); }

function renderGovStruktur() {
  const mount = document.getElementById('govstruktur-mount');
  if (!mount) return;
  ['matrix', 'owner'].forEach(m => {
    const b = document.getElementById('gs-modus-' + m);
    if (b) b.classList.toggle('an', _gsModus === m);
  });
  const rows = gsGefiltert();
  const zahl = (st) => GOV_EINTRAEGE.filter(e => e.status === st).length;
  const gesamt = GOV_EINTRAEGE.length;
  const anteil = (n) => Math.round(n / Math.max(1, gesamt) * 100);

  const balken = ['gueltig', 'arbeit', 'offen'].map(st =>
    `<div title="${zahl(st)} ${GOV_STATUS[st].label}" style="width:${anteil(zahl(st))}%;background:${GOV_STATUS[st].rand}"></div>`).join('');

  const kopf = `
    <div class="view-desc" style="margin:0 0 12px">
      Das <b>Konzernregelwerk</b> als Matrix: <b>Kategorie</b> (Fundament) × <b>Dokumentenart</b>
      (Verbindlichkeitsebene). Quelle ist die Zuständigkeiten-Mappe des Corporate-Governance-Boards,
      <b>Stand ${esc(GOV_STAND)}</b> – eine Momentaufnahme der Planung, kein Live-Bestand.
    </div>
    <div class="gs-kennzahlen">
      <div class="gs-kz"><span class="n">${gesamt}</span><span class="l">Regelungen</span></div>
      ${['gueltig', 'arbeit', 'offen'].map(st => `
        <div class="gs-kz" style="cursor:pointer" onclick="gsStatusFilter('${_gsStatus === st ? '' : st}')"
          title="Nach diesem Stand filtern">
          <span class="n" style="color:${GOV_STATUS[st].farbe}">${zahl(st)}</span>
          <span class="l">${GOV_STATUS[st].label}${_gsStatus === st ? ' ✓' : ''}</span></div>`).join('')}
      <div class="gs-balken">${balken}</div>
    </div>`;

  const trefferHinweis = rows.length !== gesamt
    ? `<div class="field-hint" style="margin-bottom:10px"><b>${rows.length}</b> von ${gesamt} passen zum Filter
       · <button class="btn btn-ghost btn-sm" onclick="gsFilterZuruecksetzen()">Filter zurücksetzen</button></div>`
    : '';

  mount.innerHTML = kopf + trefferHinweis
    + (_gsModus === 'owner' ? gsOwnerHtml(rows) : gsMatrixHtml(rows))
    + gsLegendeHtml() + gsWeitereHtml();
}

function gsFilterZuruecksetzen() {
  _gsSuche = ''; _gsStatus = ''; _gsOwner = '';
  const s = document.getElementById('search-govstruktur'); if (s) s.value = '';
  const o = document.getElementById('filter-gs-owner'); if (o) o.value = '';
  renderGovStruktur();
}

/** Ein Eintrag als Kachel – Titel, Verantwortung, Stand. */
function gsKachel(e) {
  const st = GOV_STATUS[e.status] || GOV_STATUS.offen;
  const treffer = gsPolicyTreffer(e.titel);
  const stand = [e.version, e.datum].filter(Boolean).join(' · ');
  return `<div class="gs-kachel" style="background:${st.flaeche};border-color:${st.rand}"
      title="${esc(e.statusRoh || st.label)}${stand ? ' · ' + esc(stand) : ''}${e.dokument ? '\n' + esc(e.dokument) : ''}">
      <div class="t">${esc(e.titel)}</div>
      <div class="m">
        <span class="o">${esc(e.owner || 'offen')}</span>
        <span class="s" style="color:${st.farbe}">${esc(st.label)}</span>
      </div>
      ${treffer ? `<button class="gs-link" onclick="openDetail('${esc(treffer.id)}')" title="Dieses Regelwerk liegt bereits im RMS">→ im RMS</button>` : ''}
    </div>`;
}

function gsMatrixHtml(rows) {
  // Spalten: nur Arten, die überhaupt vorkommen – sonst stünden leere Spalten herum.
  const arten = GOV_ARTEN.filter(a => GOV_EINTRAEGE.some(e => e.art === a.key));
  const kopf = `<tr>
      <th class="gs-ecke">Kategorie</th>
      ${arten.map(a => `<th title="${esc(a.erklaerung)}">${esc(a.key)}
        <span class="gs-n">${rows.filter(e => e.art === a.key).length}</span></th>`).join('')}
    </tr>`;
  const koerper = GOV_KATEGORIEN.map(k => {
    const inZeile = rows.filter(e => e.kategorie === k);
    return `<tr>
      <th class="gs-kat">${esc(k)}<span class="gs-n">${inZeile.length}</span></th>
      ${arten.map(a => {
        const zellen = inZeile.filter(e => e.art === a.key);
        return `<td>${zellen.length ? zellen.map(gsKachel).join('') : '<span class="gs-leer">–</span>'}</td>`;
      }).join('')}
    </tr>`;
  }).join('');
  return `<div class="gs-tabelle-wrap"><table class="gs-tabelle"><thead>${kopf}</thead><tbody>${koerper}</tbody></table></div>`;
}

function gsOwnerHtml(rows) {
  const jeOwner = new Map();
  for (const e of rows) {
    for (const o of (gsOwnerListe(e.owner).length ? gsOwnerListe(e.owner) : ['(noch offen)'])) {
      if (!jeOwner.has(o)) jeOwner.set(o, []);
      jeOwner.get(o).push(e);
    }
  }
  if (!jeOwner.size) return emptyState('Keine Treffer für die aktuelle Suche/Filterung.', '🔍');
  const karten = [...jeOwner.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'de'))
    .map(([owner, liste]) => {
      const zaehl = (st) => liste.filter(e => e.status === st).length;
      return `<div class="gs-owner-karte">
        <div class="gs-owner-kopf">
          <b>${esc(owner)}</b>
          <span class="gs-n">${liste.length}</span>
          ${['gueltig', 'arbeit', 'offen'].filter(st => zaehl(st)).map(st =>
            `<span class="gs-pill" style="background:${GOV_STATUS[st].flaeche};color:${GOV_STATUS[st].farbe}">${zaehl(st)} ${GOV_STATUS[st].label}</span>`).join('')}
        </div>
        <div class="gs-owner-liste">${liste.map(e => `
          <div class="gs-zeile">
            <span class="gs-punkt" style="background:${GOV_STATUS[e.status].rand}"></span>
            <span class="gs-zeile-t">${esc(e.titel)}</span>
            <span class="gs-zeile-m">${esc(e.art)} · ${esc(e.kategorie)}</span>
          </div>`).join('')}</div>
      </div>`;
    }).join('');
  return `<div class="gs-owner-grid">${karten}</div>`;
}

function gsLegendeHtml() {
  return `<details class="gs-legende">
    <summary>Was bedeuten die Dokumentenarten?</summary>
    <table class="gs-legende-tbl"><tbody>${GOV_ARTEN.map(a =>
      `<tr><td><b>${esc(a.key)}</b></td><td>${esc(a.erklaerung)}</td></tr>`).join('')}</tbody></table>
    <div class="field-hint" style="margin-top:8px">Von oben nach unten nimmt die Verbindlichkeit ab:
      Ein Handbuch fasst ein Themengebiet abschließend, ein Leitfaden empfiehlt.</div>
  </details>`;
}

function gsWeitereHtml() {
  if (typeof GOV_WEITERE === 'undefined' || !GOV_WEITERE.length) return '';
  const bereiche = [...new Set(GOV_WEITERE.map(e => e.bereich))];
  return `<details class="gs-legende">
    <summary>Weitere Regelungsebenen (${GOV_WEITERE.length}) – außerhalb der Regelwerkspyramide</summary>
    ${bereiche.map(b => `<div style="margin-top:8px"><b>${esc(b)}</b>
      <div class="gs-owner-liste">${GOV_WEITERE.filter(e => e.bereich === b).map(e => `
        <div class="gs-zeile">
          <span class="gs-punkt" style="background:${GOV_STATUS[e.status].rand}"></span>
          <span class="gs-zeile-t">${esc(e.titel)}</span>
          <span class="gs-zeile-m">${esc(e.owner || '–')}</span>
        </div>`).join('')}</div></div>`).join('')}
    <div class="field-hint" style="margin-top:8px">Leitbild, Unternehmenspolitik und kollektivrechtliche
      Regelungen (KBV/BV) stehen in derselben Mappe, gehören aber nicht in die Pyramide des Konzernregelwerks.</div>
  </details>`;
}

/** Owner-Filter befüllen (einmal beim Öffnen des Reiters). */
function initGovStruktur() {
  const sel = document.getElementById('filter-gs-owner');
  if (sel && sel.options.length <= 1) {
    sel.innerHTML = '<option value="">Alle Verantwortlichen</option>'
      + gsAlleOwner().map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
  }
  renderGovStruktur();
}
