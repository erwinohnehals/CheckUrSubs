// ─── Passwort-Tresor ──────────────────────────────────────────────────────────
// Zugangsdaten werden mit AES-GCM verschlüsselt, der Schlüssel wird per PBKDF2
// aus einem Master-Passwort abgeleitet. Der Schlüssel lebt nur im Speicher —
// nach dem Neuladen der Seite muss erneut entsperrt werden.
//
// In localStorage landen ausschließlich: Salt, Iterationszahl und ein
// verschlüsseltes Prüf-Token. Aus keinem davon lässt sich das Master-Passwort
// rekonstruieren. Geht es verloren, sind die Zugangsdaten unwiederbringlich weg.

const META_KEY   = 'goldgeld.vault';
const ITERATIONS = 250_000;
const VERIFIER   = 'goldgeld-vault-ok';

const subtle = () => globalThis.crypto?.subtle || null;

export const isAvailable = () => Boolean(subtle());

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));

const fromBase64 = (value) =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const randomBytes = (length) =>
  globalThis.crypto.getRandomValues(new Uint8Array(length));

// Nur im Speicher — bewusst nicht persistiert
let sessionKey = null;

export const readMeta = () => {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return null;
    const meta = JSON.parse(raw);
    return meta?.salt && meta?.verifier ? meta : null;
  } catch {
    return null;
  }
};

export const writeMeta = (meta) => {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
};

export const isConfigured = () => Boolean(readMeta());

export const isUnlocked = () => Boolean(sessionKey);

const deriveKey = async (passphrase, salt, iterations) => {
  const material = await subtle().importKey(
    'raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey'],
  );

  return subtle().deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

const encryptWith = async (key, plaintext) => {
  const iv = randomBytes(12);
  const ciphertext = await subtle().encrypt(
    { name: 'AES-GCM', iv }, key, encoder.encode(plaintext),
  );
  return `v1.${toBase64(iv)}.${toBase64(ciphertext)}`;
};

const decryptWith = async (key, envelope) => {
  const [version, iv, ciphertext] = String(envelope).split('.');
  if (version !== 'v1' || !iv || !ciphertext) throw new Error('bad envelope');

  const plaintext = await subtle().decrypt(
    { name: 'AES-GCM', iv: fromBase64(iv) }, key, fromBase64(ciphertext),
  );
  return decoder.decode(plaintext);
};

/** Legt den Tresor an. Überschreibt einen bestehenden Tresor nicht. */
export const setup = async (passphrase) => {
  if (!isAvailable()) throw new Error('unavailable');
  if (isConfigured()) throw new Error('already-configured');

  const salt = randomBytes(16);
  const key  = await deriveKey(passphrase, salt, ITERATIONS);

  writeMeta({
    v: 1,
    salt: toBase64(salt),
    iterations: ITERATIONS,
    verifier: await encryptWith(key, VERIFIER),
  });

  sessionKey = key;
  return true;
};

/** Entsperrt für die laufende Sitzung. Gibt false bei falschem Passwort. */
export const unlock = async (passphrase) => {
  if (!isAvailable()) throw new Error('unavailable');

  const meta = readMeta();
  if (!meta) throw new Error('not-configured');

  const key = await deriveKey(
    passphrase, fromBase64(meta.salt), meta.iterations || ITERATIONS,
  );

  try {
    if (await decryptWith(key, meta.verifier) !== VERIFIER) return false;
  } catch {
    return false;
  }

  sessionKey = key;
  return true;
};

export const lock = () => {
  sessionKey = null;
};

/** Verwirft Tresor und Schlüssel. Verschlüsselte Daten bleiben unlesbar zurück. */
export const reset = () => {
  sessionKey = null;
  localStorage.removeItem(META_KEY);
};

export const encrypt = async (plaintext) => {
  if (!sessionKey) throw new Error('locked');
  return encryptWith(sessionKey, plaintext);
};

export const decrypt = async (envelope) => {
  if (!sessionKey) throw new Error('locked');
  return decryptWith(sessionKey, envelope);
};

/** Für Export/Import: Tresor-Metadaten übernehmen, wenn noch keiner existiert. */
export const adoptMeta = (meta) => {
  if (!meta?.salt || !meta?.verifier || isConfigured()) return false;
  writeMeta(meta);
  return true;
};

export const sameVault = (meta) => {
  const local = readMeta();
  return Boolean(local && meta && local.salt === meta.salt);
};
