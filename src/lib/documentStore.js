// ─── Dokumentenablage ─────────────────────────────────────────────────────────
// Verträge, Policen und Rechnungen liegen als Blob in IndexedDB — localStorage
// wäre nach zwei PDFs voll. Die Dateien verlassen das Gerät nicht.

const DB_NAME    = 'goldgeld';
const DB_VERSION = 1;
const STORE      = 'documents';

export const MAX_FILE_BYTES = 20 * 1024 * 1024;

const newId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

let dbPromise = null;

const openDb = () => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('indexeddb-unavailable'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('entryId', 'entryId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror   = () => reject(request.error);
  });

  return dbPromise;
};

const withStore = async (mode, run) => {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = run(tx.objectStore(STORE));

    tx.oncomplete = () => resolve(request?.result);
    tx.onerror    = () => reject(tx.error);
    tx.onabort    = () => reject(tx.error);
  });
};

const stripBlob = (record) => {
  const meta = { ...record };
  delete meta.blob;
  return meta;
};

export const isAvailable = () => Boolean(globalThis.indexedDB);

/** Speichert eine Datei und gibt die Metadaten zurück. */
export const add = async (entryId, file) => {
  if (file.size > MAX_FILE_BYTES) throw new Error('too-large');

  const record = {
    id: newId(),
    entryId,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    addedAt: new Date().toISOString(),
    blob: file,
  };

  await withStore('readwrite', (store) => store.put(record));
  return stripBlob(record);
};

/** Metadaten aller Dokumente eines Eintrags, neueste zuerst. */
export const listFor = async (entryId) => {
  const records = await withStore('readonly', (store) =>
    store.index('entryId').getAll(entryId));

  return (records || [])
    .map(stripBlob)
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
};

/** Zählt Dokumente je Eintrag — für die Büroklammer in der Liste. */
export const countsByEntry = async () => {
  const records = await withStore('readonly', (store) => store.getAll());
  const counts = {};

  for (const record of records || []) {
    counts[record.entryId] = (counts[record.entryId] || 0) + 1;
  }

  return counts;
};

export const get = (id) => withStore('readonly', (store) => store.get(id));

export const remove = (id) => withStore('readwrite', (store) => store.delete(id));

export const removeAllFor = async (entryId) => {
  const documents = await listFor(entryId);
  await Promise.all(documents.map(({ id }) => remove(id)));
  return documents.length;
};

/** Öffnet eine Datei in einem neuen Tab bzw. lädt sie herunter. */
export const openDocument = async (id, { download = false } = {}) => {
  const record = await get(id);
  if (!record) return false;

  const url = URL.createObjectURL(record.blob);

  if (download) {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = record.name;
    anchor.click();
  } else {
    window.open(url, '_blank', 'noopener');
  }

  // Der Tab braucht die URL noch einen Moment
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
};

export const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
