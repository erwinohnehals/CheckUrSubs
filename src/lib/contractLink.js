// ─── Ausgabe und Vertrag ───────────────────────────────────────────────────────
// „freenet DLS GmbH, 37,99 €" ist ein Händler auf dem Kontoauszug und zugleich
// der Internet-Vertrag auf der Vertragsseite — zwei Ansichten auf dieselbe
// Zahlung, die bisher nichts voneinander wussten. Dieses Modul stellt die
// Verbindung her, in beide Richtungen:
//
//   • suggestEntryLink schlägt beim Import vor, zu welchem Vertrag eine Zeile
//     gehört — zuerst aus dem Gelernten, sonst aus einem eindeutigen Treffer
//     auf Anbietername. Zweideutiges bleibt unverknüpft, nicht falsch verknüpft.
//   • lastLinkedCharge und chargeDrift beantworten von der Vertragsseite aus die
//     Frage, ob zuletzt tatsächlich abgebucht wurde, was dort steht — eine
//     stille Preiserhöhung zeigt sich hier, nicht erst auf dem Kontoauszug.

import { merchantKey } from './autoCategorize.js';
import { entryLinkKey } from './bankRules.js';
import { countsAsMoney } from './expenseStore.js';

/**
 * Vorschlag für den Vertrag, zu dem eine Bankzeile gehört.
 *
 * `learned` bildet Zahlungskennungen (siehe entryLinkKey) auf Vertrags-IDs ab.
 * Ein gelernter Verweis gilt nur, solange der Vertrag noch existiert — gelöschte
 * Einträge hinterlassen keinen Geisterbezug.
 *
 * Ohne Gelerntes zählt ein Namenstreffer: stimmt der Händler mit dem Anbieter
 * genau eines Vertrags überein, ist das die Vermutung. Träfe er auf mehrere —
 * zwei Vodafone-Verträge im selben Haushalt —, wäre ein Rateergebnis falscher
 * als keins, also bleibt die Zeile unverknüpft.
 */
export const suggestEntryLink = (row, entries = [], learned = {}) => {
  const key = entryLinkKey(row);
  const learnedId = key ? learned[key] : null;
  if (learnedId && entries.some((entry) => entry.id === learnedId)) {
    return { entryId: learnedId, confidence: 'high', reason: 'learned' };
  }

  const rowKey = merchantKey(row?.merchant);
  if (!rowKey) return null;

  const candidates = entries.filter((entry) => !entry.archived_at);
  const byProvider = candidates.filter((entry) => merchantKey(entry.provider) === rowKey);
  if (byProvider.length === 1) return { entryId: byProvider[0].id, confidence: 'medium', reason: 'provider' };
  if (byProvider.length > 1) return null;

  // Ohne Anbieterfeld bleibt der eigene Name des Vertrags der einzige Anhalt
  const byName = candidates.filter((entry) => merchantKey(entry.name) === rowKey);
  if (byName.length === 1) return { entryId: byName[0].id, confidence: 'medium', reason: 'name' };

  return null;
};

/** Die jüngste gezählte Ausgabe, die auf diesen Vertrag zeigt — oder null. */
export const lastLinkedCharge = (entryId, transactions = []) => {
  if (!entryId) return null;

  const matches = transactions.filter((transaction) =>
    transaction.entry_id === entryId && countsAsMoney(transaction));
  if (!matches.length) return null;

  return matches.reduce((latest, transaction) =>
    (transaction.date > latest.date ? transaction : latest));
};

/**
 * Weicht die jüngste Abbuchung vom hinterlegten Vertragspreis ab?
 *
 * Verglichen wird nur innerhalb derselben Währung — ein Vertrag in Franken
 * gegen eine Abbuchung in Euro zu vergleichen bräuchte einen Wechselkurs, den
 * dieses Modul nicht kennt und nicht raten soll.
 */
export const chargeDrift = (entry, charge) => {
  if (!entry || !charge) return null;
  if ((entry.currency_code || 'EUR') !== (charge.currency_code || 'EUR')) return null;

  const diff = Math.round((Number(charge.amount) - Number(entry.price)) * 100) / 100;
  return diff !== 0 ? diff : null;
};
