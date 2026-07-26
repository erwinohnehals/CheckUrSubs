import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanCounterparty, decodeBankFile, detectFormat, parseGermanDate, readBankFile,
} from './bankFormats.js';
import { readCamt052 } from './camt052.js';
import { parseXML, findAll, textAt } from './xml.js';

// ─── Datum ────────────────────────────────────────────────────────────────────

test('zweistellige Jahre landen in diesem Jahrhundert', () => {
  assert.equal(parseGermanDate('23.07.26'), '2026-07-23');
  assert.equal(parseGermanDate('04.01.2022'), '2022-01-04');
  assert.equal(parseGermanDate('01.01.99'), '1999-01-01');
});

test('ein unlesbares Datum ist leer, nicht heute', () => {
  assert.equal(parseGermanDate(''), '');
  assert.equal(parseGermanDate('irgendwas'), '');
  assert.equal(parseGermanDate('32.13.26'), '');
});

// ─── Händlernamen ─────────────────────────────────────────────────────────────

test('Filiale und Land fallen aus dem Händlernamen', () => {
  assert.equal(cleanCounterparty('LIDL SAGT DANKE//Leipzig/DE'), 'LIDL');
  assert.equal(cleanCounterparty('REWE SAGT DANKE. 42655685/Zschochers/Leipzig /DE'), 'REWE');
  assert.equal(cleanCounterparty('freenet DLS GmbH'), 'freenet DLS GmbH');
});

// ─── Kodierung ────────────────────────────────────────────────────────────────

test('Windows-1252 wird erkannt, wenn UTF-8 nicht passt', () => {
  // "Gebühr" in cp1252: das ü ist 0xFC und allein kein gültiges UTF-8
  const bytes = new Uint8Array([0x47, 0x65, 0x62, 0xfc, 0x68, 0x72]);
  assert.equal(decodeBankFile(bytes), 'Gebühr');
});

test('echtes UTF-8 bleibt UTF-8', () => {
  const bytes = new TextEncoder().encode('Gebühr');
  assert.equal(decodeBankFile(bytes), 'Gebühr');
});

// ─── CAMT V2 (Sparkasse Giro) ─────────────────────────────────────────────────

const CAMT_V2 = [
  '"Auftragskonto";"Buchungstag";"Valutadatum";"Buchungstext";"Verwendungszweck";"Glaeubiger ID";"Mandatsreferenz";"Kundenreferenz (End-to-End)";"Sammlerreferenz";"Lastschrift Ursprungsbetrag";"Auslagenersatz Ruecklastschrift";"Beguenstigter/Zahlungspflichtiger";"Kontonummer/IBAN";"BIC (SWIFT-Code)";"Betrag";"Waehrung";"Info"',
  '"DE66850503001226040116";"23.07.26";"23.07.26";"FOLGELASTSCHRIFT";"RG-Nr.M26047179100";"DE43ZZZ00000074855";"MC-1208906497";"1208906497";"";"";"";"freenet DLS GmbH";"DE08214400450844443200";"COBADEFF";"-26,96";"EUR";"Umsatz gebucht"',
  '"DE66850503001226040116";"22.07.26";"22.07.26";"KARTENZAHLUNG";"Einkauf";"";"";"";"";"";"";"LIDL SAGT DANKE//Leipzig/DE";"DE1234";"GENODEF1";"-12,34";"EUR";"Umsatz gebucht"',
].join('\n');

test('CAMT V2 wird erkannt und gelesen', () => {
  const { format, rows } = readBankFile(CAMT_V2);

  assert.equal(format, 'camt-v2');
  assert.equal(rows.length, 2);

  const [lastschrift, karte] = rows;
  assert.equal(lastschrift.date, '2026-07-23');
  assert.equal(lastschrift.direction, 'expense');
  assert.equal(lastschrift.amount, 26.96);
  assert.equal(lastschrift.creditor_id, 'DE43ZZZ00000074855');
  assert.equal(lastschrift.merchant, 'freenet DLS GmbH');
  assert.equal(karte.merchant, 'LIDL');
});

test('das Vorzeichen bestimmt die Richtung, nicht der Buchungstext', () => {
  const income = CAMT_V2.replace('"-26,96"', '"1.234,50"');
  const [row] = readBankFile(income).rows;

  assert.equal(row.direction, 'income');
  assert.equal(row.amount, 1234.5);
});

test('zwei gleiche Buchungen am selben Tag bleiben zwei Zeilen', () => {
  const doubled = [CAMT_V2, CAMT_V2.split('\n')[2]].join('\n');
  const { rows } = readBankFile(doubled);

  assert.equal(rows.length, 3);
  assert.equal(new Set(rows.map((row) => row.ref)).size, 3,
    'gleiche Zeilen brauchen unterschiedliche Referenzen');
});

test('die Kreditkartenabrechnung ist eine Umbuchung, keine Ausgabe', () => {
  const settlement = CAMT_V2.replace('"FOLGELASTSCHRIFT"', '"EIGENE KREDITKARTENABRECHN."');
  const [row] = readBankFile(settlement).rows;

  assert.equal(row.internal, true);
  assert.equal(row.internal_reason, 'credit_card_settlement');
});

test('„Mein Geld" im Verwendungszweck ist eine Umbuchung, keine Einnahme', () => {
  // Die Überweisung vom Arbeits- auf das private Konto. Die Namen beider Seiten
  // helfen im CSV nicht weiter — nur der Verwendungszweck sagt, was das war.
  const transfer = CAMT_V2
    .replace('"RG-Nr.M26047179100"', '"Mein Geld"')
    .replace('"-26,96"', '"800,00"');
  const [row] = readBankFile(transfer).rows;

  assert.equal(row.direction, 'income');
  assert.equal(row.internal, true);
  assert.equal(row.internal_reason, 'own_transfer');
});

test('ein gewöhnlicher Einkauf bleibt eine Ausgabe', () => {
  const [, karte] = readBankFile(CAMT_V2).rows;

  assert.equal(karte.internal, false);
  assert.equal(karte.internal_reason, '');
});

// ─── Sparkasse Kreditkarte ────────────────────────────────────────────────────

const CREDIT = [
  '"Umsatz getätigt von";"Belegdatum";"Buchungsdatum";"Originalbetrag";"Originalwährung";"Umrechnungskurs";"Buchungsbetrag";"Buchungswährung";"Transaktionsbeschreibung";"Transaktionsbeschreibung Zusatz";"Buchungsreferenz";"Gebührenschlüssel";"Länderkennzeichen";"BAR-Entgelt+Buchungsreferenz";"AEE+Buchungsreferenz";"Abrechnungskennzeichen"',
  '"5490 **** **** 9881";"23.07.26";"23.07.26";"-9,99";"USD";"1,14";"-8,95";"EUR";"THIS AMERICAN LIFENEW YORK     US";"9,99 USD";"20262040071657540001";"5815";"";"";"";"20260818"',
].join('\n');

test('die Kreditkarte bucht in Euro, die Fremdwährung bleibt als Notiz', () => {
  const { format, rows } = readBankFile(CREDIT);

  assert.equal(format, 'sparkasse-credit');
  assert.equal(rows[0].amount, 8.95);
  assert.equal(rows[0].currency_code, 'EUR');
  assert.equal(rows[0].ref, 'card:20262040071657540001');
  assert.match(rows[0].note, /USD/);
  assert.equal(rows[0].merchant, 'THIS AMERICAN LIFENEW YORK');
});

// ─── PayPal ───────────────────────────────────────────────────────────────────

const PAYPAL_HEADER = '"Datum","Uhrzeit","Zeitzone","Name","Typ","Status","Währung","Brutto","Gebühr","Netto","Absender E-Mail-Adresse","Empfänger E-Mail-Adresse","Transaktionscode","Lieferadresse","Adress-Status","Artikelbezeichnung","Artikelnummer","Versand- und Bearbeitungsgebühr","Versicherungsbetrag","Umsatzsteuer","Option 1 Name","Option 1 Wert","Option 2 Name","Option 2 Wert","Zugehöriger Transaktionscode","Rechnungsnummer","Zollnummer","Anzahl","Empfangsnummer","Guthaben","Adresszeile 1","Adresszusatz","Ort","Bundesland","PLZ","Land","Telefon","Betreff","Hinweis","Ländervorwahl","Auswirkung auf Guthaben"';

const paypalRow = (name, type, status, netto, code) =>
  `"03.01.2026","14:37:47","PST","${name}","${type}","${status}","EUR","${netto}","0,00","${netto}","a@b.de","c@d.de","${code}","","","Artikel","","","","0,00","","","","","","","","","","0,00","","","","","","","","","","","Soll"`;

test('PayPal übernimmt nur abgeschlossene Zeilen', () => {
  const file = [
    PAYPAL_HEADER,
    paypalRow('AliExpress', 'PayPal Express-Zahlung', 'Abgeschlossen', '-59,99', 'A1'),
    paypalRow('Shop', 'Website-Zahlung', 'Ausstehend', '-10,00', 'A2'),
    paypalRow('Shop', 'Website-Zahlung', 'Entfernt', '-10,00', 'A3'),
  ].join('\n');

  const { format, rows } = readBankFile(file);
  assert.equal(format, 'paypal');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].merchant, 'AliExpress');
  assert.equal(rows[0].ref, 'pp:A1');
});

test('Deckung und Autorisierung sind Umbuchungen — sonst zählt alles doppelt', () => {
  const file = [
    PAYPAL_HEADER,
    paypalRow('Shop', 'Website-Zahlung', 'Abgeschlossen', '-20,00', 'B1'),
    paypalRow('', 'Bankgutschrift auf PayPal-Konto ', 'Abgeschlossen', '20,00', 'B2'),
    paypalRow('Shop', 'Einbehaltung für offene Autorisierung', 'Abgeschlossen', '-20,00', 'B3'),
  ].join('\n');

  const { rows } = readBankFile(file);
  assert.equal(rows.length, 3);
  assert.equal(rows.filter((row) => !row.internal).length, 1);
  assert.equal(rows.find((row) => row.ref === 'pp:B2').internal_reason, 'funding');
});

// ─── CAMT.052 ─────────────────────────────────────────────────────────────────

const camt = (entries) => `<?xml version="1.0" encoding="ISO-8859-1" ?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.052.001.08"><BkToCstmrAcctRpt><Rpt>
<Acct><Id><IBAN>DE85500310001074130000</IBAN></Id><Ownr><Nm>A. und J.V. Muster</Nm></Ownr></Acct>
${entries}</Rpt></BkToCstmrAcctRpt></Document>`;

const ENTRY_BOOKED = `<Ntry><Amt Ccy="EUR">110.69</Amt><CdtDbtInd>DBIT</CdtDbtInd><Sts><Cd>BOOK</Cd></Sts>
<BookgDt><Dt>2025-07-28</Dt></BookgDt><ValDt><Dt>2025-07-29</Dt></ValDt>
<AcctSvcrRef>2025072814460288000</AcctSvcrRef>
<BkTxCd><Domn><Cd>PMNT</Cd><Fmly><Cd>RDDT</Cd><SubFmlyCd>ESDD</SubFmlyCd></Fmly></Domn></BkTxCd>
<NtryDtls><TxDtls><Refs><MndtId>M-1</MndtId></Refs>
<RltdPties><Dbtr><Pty><Nm>A. und J.V. Muster</Nm></Pty></Dbtr>
<Cdtr><Pty><Nm>REWE Markt</Nm><Id><PrvtId><Othr><Id>DE16RPA00000020245</Id></Othr></PrvtId></Id></Pty></Cdtr></RltdPties>
<RmtInf><Ustrd>REWE SAGT DANKE</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry>`;

test('CAMT.052 liest Betrag, Richtung, Referenz und Gläubiger-ID', () => {
  const [row] = readCamt052(camt(ENTRY_BOOKED));

  assert.equal(row.date, '2025-07-28');
  assert.equal(row.value_date, '2025-07-29');
  assert.equal(row.direction, 'expense');
  assert.equal(row.amount, 110.69);
  assert.equal(row.currency_code, 'EUR');
  assert.equal(row.merchant, 'REWE Markt');
  assert.equal(row.creditor_id, 'DE16RPA00000020245');
  assert.equal(row.mandate_ref, 'M-1');
  assert.equal(row.family, 'RDDT/ESDD');
  assert.equal(row.ref, 'c52:2025072814460288000');
  assert.equal(row.account_key, 'DE85500310001074130000');
});

test('Vorgemerktes wird nicht importiert', () => {
  const pending = ENTRY_BOOKED.replace('<Cd>BOOK</Cd>', '<Cd>PDNG</Cd>');
  assert.equal(readCamt052(camt(pending)).length, 0);
  assert.equal(readCamt052(camt(ENTRY_BOOKED)).length, 1);
});

test('bei einer Gutschrift ist der Zahler die Gegenseite', () => {
  const credit = ENTRY_BOOKED.replace('<CdtDbtInd>DBIT', '<CdtDbtInd>CRDT');
  const [row] = readCamt052(camt(credit));

  assert.equal(row.direction, 'income');
  // Dbtr trägt hier den Kontoinhaber — bei CRDT ist genau der die Gegenseite
  assert.equal(row.merchant, 'A. und J.V. Muster');
});

test('eine Umbuchung auf den eigenen Namen zählt nicht als Ausgabe', () => {
  const own = ENTRY_BOOKED.replace('<Nm>REWE Markt</Nm>', '<Nm>A. und J.V. Muster</Nm>');
  const [row] = readCamt052(camt(own));

  assert.equal(row.internal, true);
  assert.equal(row.internal_reason, 'own_transfer');
});

test('eine Sammelbuchung zerfällt in ihre Posten mit eigenen Referenzen', () => {
  const batch = ENTRY_BOOKED.replace(
    '</TxDtls></NtryDtls>',
    `</TxDtls><TxDtls><Amt Ccy="EUR">10.00</Amt>
     <RltdPties><Cdtr><Pty><Nm>Zweiter Posten</Nm></Pty></Cdtr></RltdPties></TxDtls></NtryDtls>`);

  const rows = readCamt052(camt(batch));
  assert.equal(rows.length, 2);
  assert.equal(rows[1].amount, 10);
  assert.equal(rows[1].merchant, 'Zweiter Posten');
  assert.equal(new Set(rows.map((row) => row.ref)).size, 2);
});

test('mehrere Berichte in einer Datei werden angehängt', () => {
  const twice = camt(ENTRY_BOOKED).replace('</Rpt>', '</Rpt><Rpt><Acct><Id><IBAN>DE99</IBAN></Id></Acct>' + ENTRY_BOOKED + '</Rpt>');
  assert.equal(readCamt052(twice).length, 2);
});

test('readBankFile erkennt CAMT am Wurzelelement', () => {
  const { format, rows } = readBankFile(camt(ENTRY_BOOKED));
  assert.equal(format, 'camt-052');
  assert.equal(rows.length, 1);
});

// ─── XML-Leser ────────────────────────────────────────────────────────────────

test('der XML-Leser versteht Attribute, Entities und leere Elemente', () => {
  const root = parseXML('<a><b x="1">A &amp; B</b><c/><b x="2">zwei</b></a>');
  const bs = findAll(root, 'b');

  assert.equal(bs.length, 2);
  assert.equal(bs[0].attrs.x, '1');
  assert.equal(bs[0].text, 'A & B');
  assert.equal(textAt(root, 'a/b'), 'A & B');
});

test('unbekanntes Format ist eine Antwort, kein Fehler', () => {
  assert.equal(detectFormat('nur;irgendein;text'), null);
  assert.deepEqual(readBankFile('nur;irgendein;text'), { format: null, rows: [] });
  assert.deepEqual(readBankFile(''), { format: null, rows: [] });
});
