// ─── CAMT.052 ─────────────────────────────────────────────────────────────────
// Der Kontobericht nach ISO 20022 — dieselbe Struktur bei jeder Bank, die ihn
// ausgibt. Er trägt mehr als jede CSV: eine echte Referenz der Bank je Buchung
// (`AcctSvcrRef`), die Gläubiger-ID der Lastschrift und einen Code, der sagt,
// *welche Art* von Zahlung das war.
//
// Zwei Stellen entscheiden über die Richtigkeit:
//
//   1. `<Sts>` — nur `BOOK` ist gebucht. CAMT.052 ist der laufende Bericht, kein
//      Tagesabschluss; er darf Vorgemerktes enthalten. Vorgemerktes ändert
//      seinen Betrag noch oder verschwindet wieder. Importiert wäre es eine
//      Buchung, die es nie gab.
//   2. Die Gegenseite hängt an der Richtung. Bei einer Abbuchung ist der andere
//      der Gläubiger, bei einer Gutschrift der Zahler. Wer immer denselben Pfad
//      liest, schreibt bei jeder Gutschrift den eigenen Namen als Händler.

import { parseXML, at, child, textAt, findAll } from './xml.js';
import { transferTextReason } from './internalTransfer.js';

const squash = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

// CAMT schreibt Beträge mit Punkt und ohne Tausendertrennung — hier wird nicht
// nach Gebietsschema geraten, das ist der Vorteil gegenüber der CSV.
const amountOf = (value) => {
  const parsed = Number(String(value ?? '').trim());
  return Number.isFinite(parsed) ? Math.round(Math.abs(parsed) * 100) / 100 : 0;
};

/** `<Dt>2025-07-28</Dt>` oder `<DtTm>2025-07-28T…</DtTm>`. */
const dateOf = (parent) => {
  if (!parent) return '';
  const plain = textAt(parent, 'Dt');
  if (plain) return plain.slice(0, 10);
  return textAt(parent, 'DtTm').slice(0, 10);
};

/** Mehrere `<Ustrd>` sind Fortsetzungszeilen eines Textes, nicht mehrere Texte. */
const remittance = (details) => {
  const info = at(details, 'RmtInf');
  if (!info) return '';
  return squash(findAll(info, 'Ustrd').map((line) => line.text).join(' '));
};

const partyName = (parties, role) => squash(textAt(at(parties, role), 'Pty/Nm'));

/**
 * Die SEPA-Gläubiger-ID. Sie steht je nach Bank unter `CdtrSchmeId` oder direkt
 * am Gläubiger — beide sind zulässig, also werden beide gelesen. Sie ist der
 * stabilste Bezug, den eine wiederkehrende Lastschrift hat: Name und Betrag
 * dürfen sich ändern, sie bleibt.
 */
const creditorId = (details) => {
  const direct = textAt(at(details, 'RltdPties/Cdtr/Pty/Id/PrvtId/Othr'), 'Id');
  if (direct) return squash(direct);

  const scheme = at(details, 'CdtrSchmeId/Id/PrvtId/Othr');
  return squash(textAt(scheme, 'Id'));
};

const familyCode = (entry, details) => {
  const source = at(details, 'BkTxCd/Domn') || at(entry, 'BkTxCd/Domn');
  if (!source) return '';
  const family = child(source, 'Fmly');
  if (!family) return '';
  return [textAt(family, 'Cd'), textAt(family, 'SubFmlyCd')].filter(Boolean).join('/');
};

const sameParty = (a, b) => {
  const normalize = (value) => squash(value).toLowerCase().replace(/[^a-z0-9]/g, '');
  return Boolean(a) && normalize(a) === normalize(b);
};

const entryRows = (entry, { iban, owner }) => {
  // Vorgemerktes gehört nicht in die Bücher
  const status = textAt(child(entry, 'Sts'), 'Cd') || textAt(entry, 'Sts');
  if (status && status !== 'BOOK') return [];

  const direction = textAt(entry, 'CdtDbtInd') === 'CRDT' ? 'income' : 'expense';
  const date      = dateOf(child(entry, 'BookgDt'));
  const valueDate = dateOf(child(entry, 'ValDt')) || date;
  const entryRef  = squash(textAt(entry, 'AcctSvcrRef'));
  const addition  = squash(textAt(entry, 'AddtlNtryInf'));
  const entryAmt  = child(entry, 'Amt');

  // Eine Sammelbuchung trägt mehrere Einzelposten. Fehlen sie, ist die Buchung
  // selbst der Posten — dann steht sie als eine Zeile da.
  const details = findAll(child(entry, 'NtryDtls') || entry, 'TxDtls');
  const posts   = details.length ? details : [null];

  return posts.map((detail, index) => {
    const parties  = detail ? at(detail, 'RltdPties') : null;
    const other    = direction === 'income'
      ? partyName(parties, 'Dbtr') || partyName(parties, 'UltmtDbtr')
      : partyName(parties, 'Cdtr') || partyName(parties, 'UltmtCdtr');

    const otherIban = direction === 'income'
      ? squash(textAt(at(parties, 'DbtrAcct'), 'Id/IBAN'))
      : squash(textAt(at(parties, 'CdtrAcct'), 'Id/IBAN'));

    const own = direction === 'income'
      ? partyName(parties, 'Cdtr')
      : partyName(parties, 'Dbtr');

    const purpose = detail ? remittance(detail) : '';
    const family  = familyCode(entry, detail);
    const amount  = detail && child(detail, 'Amt')
      ? amountOf(child(detail, 'Amt').text)
      : amountOf(entryAmt?.text);

    // Umbuchung auf eigenen Namen: beide Seiten tragen den Kontoinhaber. Bei
    // einer Gebühr steht dort nur eine Seite — die bleibt eine Ausgabe.
    const ownTransfer = Boolean(other) && sameParty(other, owner) && sameParty(own, owner);
    const collection  = /paypal/i.test(other);
    // Was die Namen nicht verraten, verrät oft der Text: „Mein Geld" ist die
    // Überweisung zwischen zwei eigenen Konten, auch wenn nur eine Seite
    // namentlich dasteht.
    const byText = ownTransfer || collection ? '' : transferTextReason(purpose, addition);

    return {
      ref: `c52:${entryRef || `${date}:${amount}`}${posts.length > 1 ? `:${index + 1}` : ''}`,
      format: 'camt-052',
      date,
      value_date: valueDate,
      direction,
      amount,
      currency_code: (entryAmt?.attrs?.Ccy || child(detail, 'Amt')?.attrs?.Ccy || 'EUR').trim(),
      merchant: other,
      title: purpose || other || addition,
      purpose,
      booking_text: addition,
      family,
      counterparty_iban: otherIban,
      creditor_id: detail ? creditorId(detail) : '',
      mandate_ref: detail ? squash(textAt(at(detail, 'Refs'), 'MndtId')) : '',
      account_key: iban,
      internal: ownTransfer || collection || Boolean(byText),
      internal_reason: ownTransfer ? 'own_transfer' : (collection ? 'paypal_collection' : byText),
      note: '',
    };
  }).filter((row) => row.date);
};

/** Ist das eine CAMT.052-Datei? Geprüft wird die Wurzel, nicht der Dateiname. */
export const isCamt052 = (text) =>
  /<Document[^>]*camt\.052/i.test(text) || /<BkToCstmrAcctRpt[\s>]/i.test(text);

/**
 * Eine CAMT.052-Datei → Bankzeilen. Ein Export ist oft auf mehrere Dateien
 * verteilt; jede wird für sich gelesen und die Ergebnisse angehängt.
 */
export const readCamt052 = (text) => {
  const root    = parseXML(text);
  const reports = findAll(root, 'Rpt');
  const rows    = [];

  for (const report of reports) {
    const account = child(report, 'Acct');
    const iban    = squash(textAt(at(account, 'Id'), 'IBAN'));
    const owner   = squash(textAt(at(account, 'Ownr'), 'Nm'));

    for (const entry of findAll(report, 'Ntry')) {
      rows.push(...entryRows(entry, { iban, owner }));
    }
  }

  return rows;
};
