// ─── Vollständige Sicherung ───────────────────────────────────────────────────
// Eine einzige Datei, die alles enthält, was auf dem Gerät liegt: Einträge,
// Einstellungen, Tresor-Metadaten und die Dokumente aus IndexedDB. Sie bleibt
// lesbares JSON — Dateien stecken als Base64 darin, was sie rund ein Drittel
// größer macht. Dafür genügt zum Wiederherstellen ein Dateidialog.
//
// Der Export aus dem Import/Export-Menü bleibt daneben bestehen: er ist zum
// Mitnehmen einzelner Einträge gedacht, diese Datei zum Zurückholen von allem.

// Die Endungen stehen bewusst dran: so lädt node --test dieses Modul unverändert.
import * as documentStore from './documentStore.js';
import * as vault from './vault.js';
import { newId } from './entryStore.js';

export const BACKUP_FORMAT  = 'goldgeld-backup';
// 3 nimmt die gelernten Importregeln mit auf. Ältere Sicherungen bleiben lesbar;
// sie bringen keine Regeln mit, und dann gibt es eben keine.
export const BACKUP_VERSION = 3;

const APP = 'Gold&Geld';

// Einstellungen, die eine Sicherung wert sind. Wechselkurse fehlen bewusst —
// sie sind ein Zwischenspeicher und werden nach dem Laden ohnehin erneuert.
// `goldgeld.theme` ist der Schlüssel aus theme.js; hier steht er als Text,
// damit dieses Modul ohne React auskommt und im Test läuft.
export const SETTINGS_KEYS = [
  'lang',
  'currency',
  'currencyManual',
  'onboarded',
  'swipeHinted',
  'goldgeld.theme',
];

const asRecord = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : null;

const asString = (value, fallback = '') =>
  typeof value === 'string' ? value : fallback;

// Felder, die beim Laden ohnehin neu berechnet werden und nicht in die Datei gehören
const RUNTIME_FIELDS = ['billingDay'];

const stripRuntime = (entry) => {
  const copy = { ...entry };
  for (const field of RUNTIME_FIELDS) delete copy[field];
  return copy;
};

// ─── Einstellungen ────────────────────────────────────────────────────────────
export const readSettings = (storage) => {
  const settings = {};

  for (const key of SETTINGS_KEYS) {
    const value = storage.getItem(key);
    if (value !== null && value !== undefined) settings[key] = String(value);
  }

  return settings;
};

// Was die Sicherung nicht kennt, wird gelöscht — wiederherstellen heißt, den
// Stand der Datei zu übernehmen, nicht ihn mit dem des Geräts zu vermischen.
export const applySettings = (storage, settings) => {
  const source = asRecord(settings) || {};
  let written = 0;

  for (const key of SETTINGS_KEYS) {
    const value = source[key];

    if (value === null || value === undefined) {
      storage.removeItem?.(key);
      continue;
    }

    storage.setItem(key, String(value));
    written += 1;
  }

  return written;
};

// ─── Dokumente ────────────────────────────────────────────────────────────────
// Base64 in Häppchen: String.fromCharCode(...bytes) sprengt bei großen Dateien
// den Aufrufstapel.
const CHUNK = 0x8000;

export const bytesToBase64 = (bytes) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};

export const base64ToBytes = (value) =>
  Uint8Array.from(atob(asString(value)), (char) => char.charCodeAt(0));

export const encodeDocument = async (record) => {
  const bytes = new Uint8Array(await record.blob.arrayBuffer());

  return {
    id:      asString(record.id) || newId(),
    entryId: asString(record.entryId),
    name:    asString(record.name, 'Dokument'),
    type:    asString(record.type, 'application/octet-stream'),
    size:    bytes.length,
    addedAt: asString(record.addedAt) || new Date().toISOString(),
    data:    bytesToBase64(bytes),
  };
};

export const decodeDocument = (row) => {
  const bytes = base64ToBytes(row?.data);
  const type  = asString(row?.type, 'application/octet-stream') || 'application/octet-stream';

  return {
    id:      asString(row?.id) || newId(),
    entryId: asString(row?.entryId),
    name:    asString(row?.name, 'Dokument') || 'Dokument',
    type,
    size:    bytes.length,
    addedAt: asString(row?.addedAt) || new Date().toISOString(),
    blob:    new Blob([bytes], { type }),
  };
};

// ─── Erzeugen ─────────────────────────────────────────────────────────────────
export const isBackup = (parsed) => asRecord(parsed)?.format === BACKUP_FORMAT;

/** Dateiname mit Datum, damit mehrere Sicherungen nebeneinander liegen können. */
export const backupFilename = (date = new Date()) =>
  `gold-und-geld-backup-${date.toISOString().slice(0, 10)}.json`;

export const createBackup = async ({
  entries = [],
  expenses = [],
  accounts = [],
  budgets = {},
  bankRules = { categories: {}, accounts: {} },
  storage = globalThis.localStorage,
} = {}) => {
  const records = documentStore.isAvailable() ? await documentStore.all() : [];
  const documents = [];

  // Nacheinander: bei vielen großen Dateien liegen sonst alle zugleich im Speicher
  for (const record of records) {
    if (record?.blob) documents.push(await encodeDocument(record));
  }

  return {
    app:         APP,
    format:      BACKUP_FORMAT,
    version:     BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    settings:    readSettings(storage),
    vault:       vault.readMeta(),
    entries:     entries.map(stripRuntime),
    expenses,
    accounts,
    budgets,
    // Was der Nutzer beim Einlesen von Kontoauszügen entschieden hat. Ohne diese
    // Zeile wäre nach einem Umzug jede Zuordnung wieder eine Vermutung.
    bankRules,
    documents,
  };
};

// ─── Zurückspielen ────────────────────────────────────────────────────────────
/**
 * Ersetzt den gesamten Gerätestand durch den der Sicherung.
 * Gibt zurück, wie viel angekommen ist.
 */
export const restoreBackup = async (parsed, {
  entryStore,
  expenseStore,
  accountStore,
  budgetStore,
  bankRuleStore,
  storage = globalThis.localStorage,
}) => {
  if (!isBackup(parsed)) throw new Error('not-a-backup');

  const rows       = Array.isArray(parsed.entries)  ? parsed.entries  : [];
  const expenses   = Array.isArray(parsed.expenses) ? parsed.expenses : [];
  const accounts   = Array.isArray(parsed.accounts) ? parsed.accounts : [];
  const budgets    = asRecord(parsed.budgets) || {};
  const documents = Array.isArray(parsed.documents) ? parsed.documents : [];
  // Binärdaten vollständig prüfen, bevor wir den bestehenden Stand verändern.
  // Eine beschädigte Sicherungsdatei darf nicht erst nach dem Löschen auffallen.
  const decodedDocuments = documents.map(decodeDocument);

  // Der Tresor zuerst: ohne die Metadaten der Sicherung bleiben deren
  // verschlüsselte Zugangsdaten auch mit dem richtigen Passwort unlesbar.
  // Fehlt in der Sicherung ein Tresor, bleibt der hiesige unangetastet —
  // ihn zu verwerfen wäre nicht rückgängig zu machen.
  const vaultMeta = asRecord(parsed.vault);
  if (vaultMeta?.salt && vaultMeta?.verifier && !vault.sameVault(vaultMeta)) {
    vault.reset();
    vault.writeMeta(vaultMeta);
  }

  const entries = entryStore.replaceAll(rows);
  const restoredExpenses = expenseStore?.replaceAll(expenses) || [];
  const restoredAccounts = accountStore?.replaceAll(accounts) || [];
  const restoredBudgets  = budgetStore?.replaceAll(budgets) || {};
  const restoredRules    = bankRuleStore?.replaceAll(asRecord(parsed.bankRules) || {});
  const settings = applySettings(storage, parsed.settings);

  let restoredDocuments = 0;
  if (documentStore.isAvailable()) {
    restoredDocuments = await documentStore.replaceAll(decodedDocuments);
  }

  return {
    entries: entries.length,
    expenses: restoredExpenses.length,
    accounts: restoredAccounts.length,
    budgets: Object.keys(restoredBudgets).length,
    bankRules: Object.keys(restoredRules?.categories || {}).length,
    documents: restoredDocuments,
    settings,
  };
};
