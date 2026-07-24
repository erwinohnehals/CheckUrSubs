const STORAGE_KEY = 'checkursubs.subscriptions';
const STORAGE_VERSION = 1;

const newId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const asString = (value, fallback = '') =>
  typeof value === 'string' ? value : fallback;

const normalize = (input, createId = newId) => {
  const numericPrice = Number(input?.price);

  return {
    id: asString(input?.id) || createId(),
    name: asString(input?.name),
    price: Number.isFinite(numericPrice) ? numericPrice : 0,
    currency_code: asString(input?.currency_code, 'USD') || 'USD',
    date: asString(input?.date),
    period: asString(input?.period, 'monthly') || 'monthly',
    category: asString(input?.category, 'other') || 'other',
    logo: asString(input?.logo),
    status: asString(input?.status, 'active') || 'active',
    trial_end: asString(input?.trial_end) || null,
    created_at: asString(input?.created_at) || new Date().toISOString(),
  };
};

const duplicateKey = (subscription) =>
  `${subscription.name}|${subscription.price}|${subscription.period}`;

export const createSubscriptionStore = (storage, createId = newId) => {
  const write = (subscriptions) => {
    const normalized = subscriptions.map((subscription) =>
      normalize(subscription, createId));

    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: STORAGE_VERSION,
      subscriptions: normalized,
    }));

    return normalized;
  };

  const list = () => {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      const subscriptions = Array.isArray(parsed)
        ? parsed
        : parsed?.subscriptions;

      if (!Array.isArray(subscriptions)) return [];

      return subscriptions
        .map((subscription) => normalize(subscription, createId))
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
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
      const subscriptions = list().map((subscription) => {
        if (subscription.id !== id) return subscription;
        updated = normalize({ ...subscription, ...attributes, id }, createId);
        return updated;
      });

      if (!updated) return null;
      write(subscriptions);
      return updated;
    },

    remove(id) {
      const subscriptions = list();
      const removed = subscriptions.find((subscription) => subscription.id === id);
      if (!removed) return null;
      write(subscriptions.filter((subscription) => subscription.id !== id));
      return removed;
    },

    restore(subscription) {
      const restored = normalize(subscription, createId);
      const subscriptions = list().filter(({ id }) => id !== restored.id);
      write([...subscriptions, restored]);
      return restored;
    },

    importRows(rows) {
      const subscriptions = list();
      const existing = new Set(subscriptions.map(duplicateKey));
      const imported = [];

      for (const row of rows) {
        const subscription = normalize(row, createId);
        const key = duplicateKey(subscription);
        if (existing.has(key)) continue;
        existing.add(key);
        imported.push(subscription);
      }

      if (imported.length) write([...subscriptions, ...imported]);
      return imported;
    },
  });
};

