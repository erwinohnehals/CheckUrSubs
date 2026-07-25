const STORAGE_KEY     = 'goldgeld.entries';
const LEGACY_KEY      = 'checkursubs.subscriptions';
const STORAGE_VERSION = 2;

// Kategorien, die es unter altem Namen gab
const CATEGORY_ALIASES = { telecom: 'mobile' };

export const newId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const asString = (value, fallback = '') =>
  typeof value === 'string' ? value : fallback;

const asNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// Vorlagenfelder: flaches { feldId: wert } mit ausschließlich String-Werten
const normalizeFields = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};

  const fields = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined || value === '') continue;
    fields[key] = String(value);
  }
  return fields;
};

// Eigene Felder des Nutzers: [{ id, label, value, type }]
const normalizeCustom = (input, createId) => {
  if (!Array.isArray(input)) return [];

  return input
    .filter((field) => asString(field?.label).trim())
    .map((field) => ({
      id:    asString(field?.id) || createId(),
      label: asString(field?.label).trim(),
      value: field?.value === null || field?.value === undefined
        ? ''
        : String(field.value),
      type:  asString(field?.type, 'text') || 'text',
    }));
};

const normalize = (input, createId = newId) => {
  const numericPrice = Number(input?.price);
  const category = asString(input?.category, 'other') || 'other';

  return {
    id: asString(input?.id) || createId(),
    name: asString(input?.name),
    provider: asString(input?.provider),
    price: Number.isFinite(numericPrice) ? numericPrice : 0,
    currency_code: asString(input?.currency_code, 'EUR') || 'EUR',
    date: asString(input?.date),
    period: asString(input?.period, 'monthly') || 'monthly',
    category: CATEGORY_ALIASES[category] || category,
    logo: asString(input?.logo),
    status: asString(input?.status, 'active') || 'active',
    trial_end: asString(input?.trial_end) || null,

    // Vertragslaufzeit — Grundlage für die Kündigungsfrist
    contract_start: asString(input?.contract_start) || null,
    contract_end: asString(input?.contract_end) || null,
    notice_period_months: asNumberOrNull(input?.notice_period_months),
    auto_renew: input?.auto_renew !== false,

    // Zugang
    url: asString(input?.url),
    login_username: asString(input?.login_username),
    login_secret: asString(input?.login_secret),
    login_note: asString(input?.login_note),

    fields: normalizeFields(input?.fields),
    custom: normalizeCustom(input?.custom, createId),
    notes: asString(input?.notes),

    created_at: asString(input?.created_at) || new Date().toISOString(),
  };
};

const duplicateKey = (entry) =>
  `${entry.name}|${entry.price}|${entry.period}`;

export const createEntryStore = (storage, createId = newId) => {
  const write = (entries) => {
    const normalized = entries.map((entry) => normalize(entry, createId));

    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: STORAGE_VERSION,
      entries: normalized,
    }));

    return normalized;
  };

  const readRaw = () => {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) return { raw, legacy: false };

    const legacyRaw = storage.getItem(LEGACY_KEY);
    return legacyRaw ? { raw: legacyRaw, legacy: true } : { raw: null, legacy: false };
  };

  const list = () => {
    try {
      const { raw, legacy } = readRaw();
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      const rows = Array.isArray(parsed)
        ? parsed
        : parsed?.entries ?? parsed?.subscriptions;

      if (!Array.isArray(rows)) return [];

      const entries = rows
        .map((row) => normalize(row, createId))
        .sort((a, b) => a.created_at.localeCompare(b.created_at));

      // Altbestand aus CheckUrSubs einmalig übernehmen
      if (legacy && entries.length) write(entries);

      return entries;
    } catch {
      return [];
    }
  };

  return Object.freeze({
    list,

    create(attributes) {
      const created = normalize(attributes, createId);
      write([...list(), created]);
      return created;
    },

    update(id, attributes) {
      let updated = null;
      const entries = list().map((entry) => {
        if (entry.id !== id) return entry;
        updated = normalize({ ...entry, ...attributes, id }, createId);
        return updated;
      });

      if (!updated) return null;
      write(entries);
      return updated;
    },

    remove(id) {
      const entries = list();
      const removed = entries.find((entry) => entry.id === id);
      if (!removed) return null;
      write(entries.filter((entry) => entry.id !== id));
      return removed;
    },

    restore(entry) {
      const restored = normalize(entry, createId);
      const entries = list().filter(({ id }) => id !== restored.id);
      write([...entries, restored]);
      return restored;
    },

    importRows(rows) {
      const entries = list();
      const existing = new Set(entries.map(duplicateKey));
      const imported = [];

      for (const row of rows) {
        const entry = normalize(row, createId);
        const key = duplicateKey(entry);
        if (existing.has(key)) continue;
        existing.add(key);
        imported.push(entry);
      }

      if (imported.length) write([...entries, ...imported]);
      return imported;
    },
  });
};
