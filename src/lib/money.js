// ─── Geld ─────────────────────────────────────────────────────────────────────
// Beträge werden in ihrer Erfassungswährung gespeichert und in USD gerechnet —
// USD ist nur die gemeinsame Zwischengröße, angezeigt wird die Anzeigewährung.
// Fixkosten und Ausgaben teilen sich diese Rechnung, darum liegt sie hier und
// nicht in App.jsx.

import { isBilled } from './entryStore.js';

export const CURRENCIES = [
  { code: 'EUR', symbol: '€',   label: 'EUR (€)' },
  { code: 'CHF', symbol: 'CHF', label: 'CHF' },
  { code: 'USD', symbol: '$',   label: 'USD ($)' },
  { code: 'GBP', symbol: '£',   label: 'GBP (£)' },
];
export const DEFAULT_CURRENCY = 'EUR';
export const getCurrency   = (code) => CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
export const DEFAULT_RATES = { USD: 1, EUR: 0.92, CHF: 0.88, GBP: 0.79 };

const LOCALES  = { de: 'de-DE', en: 'en-US' };
const localeOf = (lang) => LOCALES[lang] || LOCALES.de;

export const fetchRates = async () => {
  try {
    const res  = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data.result !== 'success') return null;
    const { USD, EUR, CHF, GBP } = data.rates;
    const rates = { USD: 1, EUR, CHF, GBP };
    localStorage.setItem('fxRates',   JSON.stringify(rates));
    localStorage.setItem('fxRatesAt', Date.now().toString());
    return rates;
  } catch { return null; }
};

export const loadRates = () => {
  try {
    const raw = localStorage.getItem('fxRates');
    const at  = Number(localStorage.getItem('fxRatesAt') || 0);
    if (raw && Date.now() - at < 4 * 60 * 60 * 1000) return JSON.parse(raw);
  } catch { /* Cache unbrauchbar — Fallback-Kurse reichen */ }
  return null;
};

/**
 * Geldbetrag in der Anzeige-Währung, lokalisiert formatiert.
 *
 * Runde Beträge stehen ohne Nachkommastellen da. Gemessen wird der Abstand zur
 * nächsten ganzen Zahl, nicht der Rest: 400 € einmal durch die Rechengröße und
 * zurück ergibt 399,9999…, und `% 1` läge dort bei 0,9999 — die Grenze stünde
 * als „400,00 €“ neben einer anderen, die „400 €“ heißt.
 */
export const fmtMoney = (value, code, lang) => {
  const fraction = Math.abs(value - Math.round(value)) < 0.005 ? 0 : 2;
  try {
    return new Intl.NumberFormat(localeOf(lang), {
      style: 'currency',
      currency: code,
      minimumFractionDigits: fraction,
      maximumFractionDigits: fraction,
    }).format(value);
  } catch {
    return `${getCurrency(code).symbol}${value.toFixed(fraction)}`;
  }
};

/** Preis in Originalwährung → USD als gemeinsame Rechengröße */
export const toUSD = (price, currencyCode, rates) => {
  const rate = rates?.[currencyCode] ?? DEFAULT_RATES[currencyCode] ?? 1;
  return Number(price || 0) / rate;
};

export const monthlyUSD = (entry, rates) => {
  const p = toUSD(entry.price ?? 0, entry.currency_code || DEFAULT_CURRENCY, rates);
  return entry.period === 'yearly' ? p / 12 : p;
};

/**
 * Was die laufenden Verträge im Monat kosten.
 *
 * Pausiertes, Gekündigtes, Probephasen und Archiviertes zählen nicht — das
 * entscheidet isBilled. Die Ausgabenseite stellt diese Summe ihrer eigenen
 * gegenüber, deshalb steht sie hier und nicht im Rumpf von App.
 */
export const recurringMonthlyUSD = (entries, rates) =>
  entries.filter(isBilled).reduce((sum, entry) => sum + monthlyUSD(entry, rates), 0);
