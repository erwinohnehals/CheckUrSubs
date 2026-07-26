// ─── Umbuchungen erkennen ─────────────────────────────────────────────────────
// Geld zwischen eigenen Töpfen ist kein Verdienst und kein Verbrauch: es war
// schon da. Zählt es mit, sieht ein Monat, in dem 800 € vom Sparkonto kamen, aus
// wie ein Monat mit 800 € mehr Einkommen — und die einzige Frage, die diese Seite
// beantworten soll („was verdiene ich, was gebe ich aus"), wäre verstellt.
//
// Zwei Wege führen zu dieser Erkenntnis. Den einen kennt nur das Format: bei
// CAMT.052 tragen beide Seiten der Buchung den Kontoinhaber, bei PayPal steht die
// Deckung als eigene Zeile neben der Zahlung. Den anderen kennt nur der Text —
// „Mein Geld" im Verwendungszweck, „UMBUCHUNG" im Buchungstext der Bank. Der
// steht hier, weil ihn jedes Format gleich liest.
//
// Erkannt heißt nicht entschieden: der Import wählt solche Zeilen ab und zeigt
// sie trotzdem. Wer eine davon einschließt, bekommt sie als Umbuchung in die
// Bücher — sichtbar in der Liste, in keiner Summe.

// Lookarounds statt \b: hinter „ü" sieht JavaScript kein Wortende, weil Umlaute
// keine Wortzeichen sind. Ohne die Grenzen würde „Saldenübertrag" mittreffen.
const EDGE = '(?<![a-z0-9äöüß])';
const END  = '(?![a-z0-9äöüß])';

const word = (pattern) => new RegExp(`${EDGE}(?:${pattern})${END}`);

const RULES = [
  { match: word('mein(?:es)? geld'),  reason: 'own_transfer' },
  { match: word('umbuchung'),         reason: 'own_transfer' },
  { match: word('(?:ü|ue)bertrag'),   reason: 'own_transfer' },
  // Die Kreditkartenabrechnung ist die Summe der Zeilen, die in der Kartendatei
  // einzeln stehen — der wichtigste Fall doppelter Zählung überhaupt.
  { match: /eigene kreditkartenabrechn/, reason: 'credit_card_settlement' },
];

/**
 * Der Grund, aus dem diese Texte eine Umbuchung beschreiben — oder ''.
 *
 * Geprüft werden Verwendungszweck und Buchungstext zusammen: die Bank schreibt
 * das Wort mal in das eine, mal in das andere Feld, und welches es diesmal war,
 * ist keine Auskunft über die Buchung.
 */
export const transferTextReason = (...texts) => {
  const haystack = texts.filter(Boolean).join(' ').toLowerCase();
  if (!haystack) return '';

  for (const { match, reason } of RULES) {
    if (match.test(haystack)) return reason;
  }
  return '';
};
