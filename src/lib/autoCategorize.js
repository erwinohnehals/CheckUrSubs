// ─── Kategorie vorschlagen ────────────────────────────────────────────────────
// Ein Kontoauszug bringt hunderte Zeilen mit. Sie alle von Hand einzusortieren
// tut niemand zweimal — also schlägt die App vor, und der Nutzer bestätigt oder
// widerspricht.
//
// Drei Stufen, in dieser Reihenfolge:
//
//   1. Gelernt — der Nutzer hat diesem Händler schon einmal eine Kategorie
//      gegeben. Das schlägt alles andere, auch eine gute Regel: wer „Loesch
//      Depot" zu Haushalt zählt, meint das so.
//   2. Buchungstext — „ENTGELTABSCHLUSS" ist immer eine Gebühr, unabhängig vom
//      Namen daneben. Das sagt die Bank, nicht die Vermutung.
//   3. Stichwort — der Händlername gegen eine Liste. Das ist die Vermutung, und
//      sie wird als solche angezeigt.
//
// Was keine Stufe trifft, bleibt beim Restposten und wird sichtbar als
// „ungeprüft" markiert. Stillschweigend `other` zu vergeben wäre schlimmer als
// nichts: es sieht aus wie eine Entscheidung.

import {
  DEFAULT_EXPENSE_CATEGORY, DEFAULT_INCOME_CATEGORY, migrateCategory, resolveCategory,
} from './expenseCategories.js';

export const CONFIDENCES = ['high', 'medium', 'low'];

/**
 * Der Schlüssel, unter dem gelernt wird. Filiale, Belegnummer und Ort fallen
 * weg — „LIDL Leipzig" und „LIDL Dresden" sind derselbe Händler.
 */
export const merchantKey = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9äöüß]+/g, ' ')
  .trim()
  .split(' ')
  .slice(0, 3)
  .join(' ');

// Kurze Namen wie „dm", „jet" oder „bar" dürfen nicht mitten in einem Wort
// treffen — sonst wird „Bardowick" zur Kneipe und „Jetzt Reisen" zur Tankstelle.
//
// Ein angehängtes s bleibt erlaubt: auf dem Auszug steht „McDonalds 01597", in
// der Liste steht „mcdonald". Ohne diese eine Ausnahme scheitert die Hälfte der
// Ketten an ihrem eigenen Plural.
const boundedPattern = (keyword) => {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![a-z0-9äöüß])${escaped}(?:'?s)?(?![a-z0-9äöüß])`, 'i');
};

// ─── Stufe 2: was die Bank selbst sagt ────────────────────────────────────────

const BOOKING_TEXT_RULES = [
  { match: /ENTGELTABSCHLUSS|^ABSCHLUSS$|KONTOFUEHRUNG|KONTOFÜHRUNG/i, category: 'fees' },
  { match: /BARGELDAUSZAHLUNG|BARAUSZAHL/i,                            category: 'other' },
];

// CAMT nennt die Art der Zahlung im Klartext-Code. `MDOP/CHRG` heißt: das Haus
// hat sich selbst bedient — eine Kontogebühr, ganz gleich, was daneben steht.
const FAMILY_RULES = {
  'MDOP/CHRG': 'fees',
  'MDOP/FEES': 'fees',
};

// ─── Stufe 3: Stichwörter ─────────────────────────────────────────────────────
// Bewusst deutsch und regional: die Ketten, die auf einem deutschen Auszug
// wirklich stehen. Eine Liste, die alles kann, kann nichts — sie wächst über
// das Gelernte, nicht über Vollständigkeit.

const KEYWORD_RULES = [
  // Zuerst die Frage, wem das Geld gehört. Erst wenn sie mit „mir" beantwortet
  // ist, lohnt die Frage, wofür es ausgegeben wurde: eine Mietkaution ist keine
  // Miete, und eine Auslage für jemand anderen ist kein Einkauf.
  { category: 'pass_through', keywords: [
    'kaution', 'mietkaution', 'kautionsrückzahlung', 'kautionsrueckzahlung',
    'auslage', 'auslagen', 'verauslagt', 'durchlaufend', 'treuhand',
  ] },
  // Vor den Lebensmitteln, und das ist kein Zufall: „ALDI TALK" trifft sonst auf
  // „aldi" und die Handykarte landet im Einkaufswagen. Der ganze Name muss die
  // Abkürzung schlagen.
  { category: 'connectivity', keywords: [
    'aldi talk', 'telekom', 'vodafone', 'o2', 'telefonica', 'telefónica', '1&1',
    'congstar', 'freenet', 'mobilcom', 'drillisch', 'winsim', 'blau.de', 'lycamobile',
    'pyur', 'unitymedia', 'kabel deutschland', 'm-net', 'netcologne', 'ewe tel',
    'mobilfunk', 'glasfaser',
  ] },
  { category: 'groceries', keywords: [
    'lidl', 'aldi', 'rewe', 'edeka', 'penny', 'netto', 'kaufland', 'konsum', 'norma',
    'denns', 'alnatura', 'bio company', 'marktkauf', 'globus', 'tegut', 'nahkauf',
    'famila', 'combi', 'trinkgut', 'getränkemarkt', 'getraenkemarkt', 'loesch',
    'bäckerei', 'baeckerei', 'backerei', 'baecker', 'bäcker', 'metzgerei', 'fleischerei',
    'biomare', 'biomarkt', 'wochenmarkt', 'hofladen', 'nourish',
  ] },
  { category: 'dining', keywords: [
    'mcdonald', 'burger king', 'kfc', 'subway', 'pizza', 'restaurant', 'cafe', 'café',
    'bistro', 'imbiss', 'döner', 'doener', 'kebab', 'sushi', 'lieferando', 'wolt',
    'uber eats', 'starbucks', 'vapiano', 'osteria', 'gaststätte', 'brauhaus', 'kneipe',
    'movenpick', 'mövenpick', 'zur ecke', 'fun tass', 'espresso', 'eisdiele', 'konditorei',
    'yormas', 'maza pita', 'ditsch', 'backwerk', 'nordsee', 'five guys', 'hans im glück',
  ] },
  { category: 'household', keywords: [
    'dm', 'rossmann', 'müller', 'ikea', 'obi', 'toom', 'bauhaus', 'hornbach', 'hagebau',
    'tedi', 'action', 'woolworth', 'kik', 'nanu', 'xxxlutz', 'poco', 'roller', 'möbel',
    'drogerie', 'baumarkt', 'reinigung', 'wäscherei',
    // Versand bleibt Haushalt: ein Paket ist keine Wohnkost.
    'deutsche post', 'dhl', 'hermes', 'dpd',
  ] },
  // Das Betriebliche steht vor dem Privaten. Die Wortgrenzen trennen ohnehin
  // „gewerbemiete" von „miete", aber so ist die Absicht der Liste lesbar.
  { category: 'commercial_rent', keywords: [
    'gewerbemiete', 'gewerbliche miete', 'gewerberaum', 'ladenmiete', 'büromiete',
    'bueromiete', 'praxismiete', 'werkstattmiete', 'lagermiete',
    // „atelier" allein ist mehrdeutig — es gibt Friseure, die so heißen. Es steht
    // trotzdem hier: ein Atelier ist ein Arbeitsraum, und wer eins mietet, zahlt
    // die Miete jeden Monat. Ein Friseurbesuch im Jahr wiegt das nicht auf, und
    // eine Korrektur wird ohnehin gelernt.
    'atelier',
  ] },
  // Wohnen und Versorgung: Miete, Nebenkosten, Strom, Wasser, Müll, Grundsteuer.
  // Auf der Vertragsseite stehen die Verträge, hier steht die einzelne Zahlung.
  { category: 'housing', keywords: [
    'miete', 'kaltmiete', 'warmmiete', 'nebenkosten', 'hausgeld', 'wohngeldabrechnung',
    'vermieter', 'wohnungsgenossenschaft', 'wohnungsbaugenossenschaft',
    'octopus energy', 'stadtwerke', 'vattenfall', 'e.on', 'eon', 'enbw', 'rwe',
    'lichtblick', 'naturstrom', 'zweckverband', 'abwasser', 'wasserwerke',
    'stadtverwaltung', 'kreisstadt', 'grundsteuer', 'rundfunk', 'ard, zdf',
    'mieterbund', 'hausverwaltung',
  ] },
  { category: 'garden', keywords: [
    'dehner', 'gartencenter', 'baumschule', 'blumen', 'pflanzen', 'floristik',
  ] },
  { category: 'clothing', keywords: [
    'h&m', 'zara', 'c&a', 'primark', 'tk maxx', 'zalando', 'deichmann', 'snipes',
    'uniqlo', 's.oliver', 'esprit', 'about you', 'mango', 'bershka', 'jack wolfskin',
    'schuhe', 'mode',
  ] },
  { category: 'health', keywords: [
    'apotheke', 'zahnarzt', 'arztpraxis', 'praxis', 'klinik', 'krankenhaus', 'physio',
    'optiker', 'fielmann', 'apollo optik', 'sanitätshaus', 'labor', 'hautarzt',
    'orthopäd', 'krankenkasse', 'aok', 'barmer', 'techniker krankenkasse',
  ] },
  { category: 'transport', keywords: [
    'lvb', 'verkehrsbetriebe', 'deutsche bahn', 'db vertrieb', 'db fernverkehr', 'bvg',
    'mvg', 'hvv', 'rmv', 'nextbike', 'tier', 'lime', 'bolt', 'freenow', 'taxi', 'uber',
    'aral', 'shell', 'esso', 'jet', 'total', 'tankstelle', 'parkautomat', 'parkhaus',
    'apcoa', 'contipark', 'flixbus', 'blablacar', 'adac', 'tüv', 'dekra', 'werkstatt',
    'autoteile', 'mobility', 'carsharing', 'teilauto', 'logpay', 'mobiliteit',
    'fahrschein', 'bvb', 'vvo', 'mdv',
  ] },
  { category: 'travel', keywords: [
    'booking.com', 'airbnb', 'hotel', 'hostel', 'ryanair', 'lufthansa', 'eurowings',
    'easyjet', 'wizz', 'expedia', 'opodo', 'ferienwohnung', 'camping', 'tui', 'condor',
    'reisebüro', 'pension',
  ] },
  { category: 'leisure', keywords: [
    'kino', 'cinestar', 'cineplex', 'uci', 'theater', 'museum', 'zoo', 'schwimmbad',
    'therme', 'fitness', 'mcfit', 'fitx', 'clever fit', 'urban sports', 'netflix',
    'spotify', 'disney', 'dazn', 'steam', 'playstation', 'nintendo', 'xbox', 'twitch',
    'patreon', 'eventim', 'ticketmaster', 'konzert', 'sportverein', 'bowling',
    'decathlon', 'intersport', 'sportscheck', 'kletterhalle', 'audible', 'kindle',
    'this american life',
  ] },
  // Amazon, eBay, Otto und AliExpress stehen in keiner Liste. Sie verkaufen alles,
  // also sagt der Name nichts: dieselbe Zeile ist mal ein Kabel, mal Katzenfutter,
  // mal ein Geschenk. Sie bleiben ungeprüft, und das erste Mal, das der Nutzer
  // einsortiert, wird gelernt — eine Vermutung wäre hier nur schneller falsch.
  { category: 'devices', keywords: [
    'mediamarkt', 'media markt', 'saturn', 'cyberport', 'notebooksbilliger', 'alternate',
    'conrad', 'reichelt', 'backmarket', 'back market', 'gravis', 'euronics', 'expert',
    'böttcher', 'boettcher',
  ] },
  { category: 'software', keywords: [
    'openai', 'anthropic', 'chatgpt', 'midjourney', 'elevenlabs', 'github', 'jetbrains',
    'adobe', 'figma', 'canva', 'notion', 'slack', 'zoom', 'dropbox', 'freepik', 'serif',
    // Server, Domains und Postfächer: gemietet wie ein Programm, nicht besessen
    'hetzner', 'netcup', 'ionos', 'strato', 'cloudflare', 'namecheap', 'mailbox.org',
    'proton', 'protonmail',
    // Auf dem Auszug stehen die drei fast immer für ein Abo — „APPLE.COM/BILL",
    // Google One, Microsoft 365. Das Gerät kommt vom Elektronikmarkt.
    'apple', 'google', 'microsoft',
  ] },
  { category: 'pets', keywords: [
    'fressnapf', 'futterhaus', 'zooplus', 'tierarzt', 'tierklinik', 'tierheim',
  ] },
  { category: 'education', keywords: [
    'udemy', 'coursera', 'duolingo', 'babbel', 'volkshochschule', 'buchhandlung',
    'thalia', 'hugendubel', 'osiander', 'universität', 'studentenwerk', 'sprachschule',
    'webid', 'scribd', 'kindergarten', 'kita', 'hort', 'schule', 'nachhilfe',
  ] },
  { category: 'fees', keywords: [
    'gebühr', 'jahresgebühr', 'kontoführung', 'mahngebühr', 'rücklastschrift',
    'zinsen', 'sparkasse', 'bankgebühr',
  ] },
];

// ─── Einnahmen ────────────────────────────────────────────────────────────────
// Auf der Einnahmenseite ist die Liste kurz: was hereinkommt, ist meistens Lohn,
// eine Erstattung oder eine Überweisung von jemandem, den man kennt.

const INCOME_RULES = [
  // Auch hier zuerst: fremdes Geld sieht auf dem Auszug aus wie eigenes. Eine
  // erhaltene Kaution steht mit demselben Vorzeichen da wie ein Gehalt.
  { category: 'income_pass_through', keywords: [
    'kaution', 'mietkaution', 'auslage', 'auslagen', 'durchlaufend', 'treuhand',
  ] },
  { category: 'income_salary', keywords: ['lohn', 'gehalt', 'bezüge', 'besoldung', 'honorar', 'salary'] },
  // Staatliche Leistungen sind weder Lohn noch Erstattung. Sie landen beim
  // Restposten — aber als erkannter Restposten, nicht als ungeprüfte Zeile.
  { category: 'income_other', keywords: [
    'familienkasse', 'kindergeld', 'bundesagentur', 'elterngeld', 'wohngeld',
    'bundeskasse', 'jobcenter', 'rentenversicherung', 'deutsche rentenvers',
  ] },
  { category: 'income_refund', keywords: [
    'erstattung', 'rückerstattung', 'rueckerstattung', 'gutschrift', 'refund',
    'rückzahlung', 'rueckzahlung', 'storno', 'wiedergutschrift', 'finanzamt',
    'steuererstattung', 'nebenkostenabrechnung',
  ] },
  { category: 'income_sale',  keywords: ['verkauf', 'ebay', 'kleinanzeigen', 'vinted'] },
  { category: 'income_gift',  keywords: ['geschenk', 'geburtstag'] },
];

const firstKeywordHit = (rules, haystack) => {
  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      if (boundedPattern(keyword).test(haystack)) {
        return { category: rule.category, keyword };
      }
    }
  }
  return null;
};

const suggestion = (category, confidence, reason) => ({ category, confidence, reason });

/**
 * Der Vorschlag für eine Bankzeile.
 *
 * `learned` bildet Händlerschlüssel auf Kategorien ab — das Gedächtnis aus
 * früheren Bestätigungen. Richtung und Kategorie müssen zusammenpassen, sonst
 * hinge eine Einnahme unter „Lebensmittel"; darum läuft alles durch
 * resolveCategory.
 */
export const suggestCategory = (row, learned = {}) => {
  const direction = row?.direction === 'income' ? 'income' : 'expense';
  const fallback  = direction === 'income' ? DEFAULT_INCOME_CATEGORY : DEFAULT_EXPENSE_CATEGORY;

  // Umbuchungen sind keine Ausgabe — sie bekommen keine Kategorie zugelost
  if (row?.internal) return suggestion(fallback, 'high', 'internal');

  // 1 — Gelerntes
  const key    = merchantKey(row?.merchant);
  const stored = key ? learned[key] : null;
  if (stored) {
    const resolved = resolveCategory(stored, direction);
    // Verglichen wird gegen die heutige ID: wer „Cyberport" einmal auf `tech`
    // gesetzt hat, hat eine Entscheidung getroffen, und die überlebt die
    // Umbenennung. Nur was gar nicht zur Richtung passt, fällt durch.
    if (resolved === migrateCategory(stored)) return suggestion(resolved, 'high', 'learned');
  }

  // 2 — was die Bank über die Art der Zahlung sagt
  const family = FAMILY_RULES[String(row?.family ?? '')];
  if (family) {
    const resolved = resolveCategory(family, direction);
    if (resolved === family) return suggestion(resolved, 'high', 'payment_type');
  }

  const bookingText = String(row?.booking_text ?? '');
  for (const rule of BOOKING_TEXT_RULES) {
    if (rule.match.test(bookingText)) {
      const resolved = resolveCategory(rule.category, direction);
      if (resolved === rule.category) return suggestion(resolved, 'high', 'booking_text');
    }
  }

  // 3 — Stichwörter über Händler, Titel und Verwendungszweck
  const haystack = [row?.merchant, row?.title, row?.purpose].filter(Boolean).join(' ').toLowerCase();
  const hit = firstKeywordHit(direction === 'income' ? INCOME_RULES : KEYWORD_RULES, haystack);
  if (hit) {
    const resolved = resolveCategory(hit.category, direction);
    if (resolved === hit.category) return suggestion(resolved, 'medium', `keyword:${hit.keyword}`);
  }

  return suggestion(fallback, 'low', 'default');
};

/** Vorschläge für viele Zeilen — die Reihenfolge bleibt erhalten. */
export const suggestAll = (rows = [], learned = {}) =>
  rows.map((row) => ({ ...row, suggestion: suggestCategory(row, learned) }));

/**
 * Was aus einer Bestätigung zu lernen ist.
 *
 * Gelernt wird nur, was der Nutzer selbst gesetzt hat — nicht der eigene
 * Vorschlag. Sonst zementiert die App ihre erste Vermutung: sie schlägt vor,
 * lernt aus dem Vorschlag und hält ihn danach für bestätigtes Wissen.
 */
export const rulesFromDecisions = (decisions = []) => {
  const learned = {};

  for (const { merchant, category, overridden } of decisions) {
    if (!overridden || !category) continue;
    const key = merchantKey(merchant);
    if (key) learned[key] = category;
  }

  return learned;
};
