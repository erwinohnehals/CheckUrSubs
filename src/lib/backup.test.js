import test from 'node:test';
import assert from 'node:assert/strict';
import { createEntryStore } from './entryStore.js';
import {
  SETTINGS_KEYS, applySettings, readSettings, isBackup, backupFilename,
  bytesToBase64, base64ToBytes, encodeDocument, decodeDocument, restoreBackup,
} from './backup.js';

const createMemoryStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));

  return {
    getItem:    (key) => values.get(key) ?? null,
    setItem:    (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    size:       () => values.size,
  };
};

const createStore = (storage = createMemoryStorage()) => {
  let nextId = 0;
  return createEntryStore(storage, () => `local-${++nextId}`);
};

test('collects only the settings worth keeping', () => {
  const storage = createMemoryStorage({
    lang: 'de', currency: 'EUR', 'goldgeld.theme': 'dark', fxRates: '{}',
  });

  assert.deepEqual(readSettings(storage), {
    lang: 'de', currency: 'EUR', 'goldgeld.theme': 'dark',
  });
});

test('restoring settings drops what the backup does not carry', () => {
  const storage = createMemoryStorage({ lang: 'en', onboarded: '1' });

  const written = applySettings(storage, { lang: 'de' });

  assert.equal(written, 1);
  assert.equal(storage.getItem('lang'), 'de');
  assert.equal(storage.getItem('onboarded'), null);
});

test('settings keys cover every stored preference key', () => {
  assert.ok(SETTINGS_KEYS.includes('goldgeld.theme'));
  assert.ok(!SETTINGS_KEYS.includes('fxRates'));
});

test('recognizes its own files only', () => {
  assert.equal(isBackup({ format: 'goldgeld-backup' }), true);
  assert.equal(isBackup({ app: 'Gold&Geld', entries: [] }), false);
  assert.equal(isBackup([{ name: 'Netflix' }]), false);
  assert.equal(isBackup(null), false);
});

test('names the file after the day it was made', () => {
  assert.equal(
    backupFilename(new Date('2026-07-25T09:00:00Z')),
    'gold-und-geld-backup-2026-07-25.json',
  );
});

test('base64 survives bytes that are not text', () => {
  const bytes = Uint8Array.from({ length: 5000 }, (_, i) => i % 256);
  assert.deepEqual(base64ToBytes(bytesToBase64(bytes)), bytes);
});

test('a document keeps its bytes and metadata through a round trip', async () => {
  const bytes = Uint8Array.from([0, 127, 200, 255]);

  const encoded = await encodeDocument({
    id: 'doc-1', entryId: 'local-1', name: 'Vertrag.pdf',
    type: 'application/pdf', addedAt: '2026-01-02T00:00:00.000Z',
    blob: new Blob([bytes], { type: 'application/pdf' }),
  });

  assert.equal(encoded.size, 4);
  assert.equal(typeof encoded.data, 'string');

  const decoded = decodeDocument(encoded);

  assert.equal(decoded.id, 'doc-1');
  assert.equal(decoded.entryId, 'local-1');
  assert.equal(decoded.name, 'Vertrag.pdf');
  assert.equal(decoded.addedAt, '2026-01-02T00:00:00.000Z');
  assert.deepEqual(new Uint8Array(await decoded.blob.arrayBuffer()), bytes);
});

test('replaceAll drops everything the backup does not contain', () => {
  const store = createStore();
  store.create({ name: 'Alt', price: 5 });

  const entries = store.replaceAll([{ name: 'Neu', price: 9, period: 'yearly' }]);

  assert.equal(entries.length, 1);
  assert.deepEqual(store.list().map(e => e.name), ['Neu']);
  assert.equal(store.list()[0].period, 'yearly');
});

test('restores entries and settings from a backup file', async () => {
  const entryStorage = createMemoryStorage();
  const store = createStore(entryStorage);
  store.create({ name: 'Wird ersetzt', price: 42 });

  const settingsStorage = createMemoryStorage({ lang: 'en', currency: 'USD' });

  const result = await restoreBackup({
    format: 'goldgeld-backup',
    version: 1,
    settings: { lang: 'de', 'goldgeld.theme': 'dark' },
    entries: [{ name: 'Netflix', price: 12.99, category: 'entertainment' }],
    documents: [],
  }, { entryStore: store, storage: settingsStorage });

  assert.equal(result.entries, 1);
  assert.equal(result.documents, 0);
  assert.deepEqual(store.list().map(e => e.name), ['Netflix']);
  assert.equal(settingsStorage.getItem('lang'), 'de');
  assert.equal(settingsStorage.getItem('currency'), null);
});

test('refuses a file that is not a backup', async () => {
  await assert.rejects(
    () => restoreBackup({ entries: [] }, { entryStore: createStore(), storage: createMemoryStorage() }),
    /not-a-backup/,
  );
});
