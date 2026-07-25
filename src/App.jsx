import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import {
  Home, List, BarChart2, Plus, Pencil, Trash2, CreditCard,
  CalendarDays, ChevronDown, Check, ArrowUpDown, Search, X,
  RefreshCw, Gamepad2, Briefcase, Music, BookOpen, Zap,
  Shield, Heart, Sparkles, Wifi, Server, Tv, Package,
  Wallet, Download, Upload, Smartphone, Droplets, Car, Radio, Dumbbell,
  Users, Lock, Eye, EyeOff, Copy, ExternalLink, Paperclip, FileText,
  AlertTriangle, KeyRound, Flame, Plug, Trash, HeartPulse, ClipboardList,
  Sun, Moon, MapPin, Layers, Archive
} from 'lucide-react';
import { createEntryStore, newId, kindForCategory, isBilled } from './lib/entryStore';
import { LangContext, useLang, useT, APP_NAME } from './lib/i18n';
import {
  templateFor, COMMON_FIELDS, label as fieldLabel, optionLabel, CUSTOM_FIELD_TYPES,
  findFieldDef,
} from './lib/fieldTemplates';
import * as vault from './lib/vault';
import * as documentStore from './lib/documentStore';
import * as backup from './lib/backup';
import { toCSV, parseCSV } from './lib/csv';
import {
  MONTHS_SHORT, extractBillingDay, extractBillingMonth,
  daysInMonth, clampDay, billingDateIn, startOfToday,
  isDueWithinDays, wasActiveIn,
} from './lib/billing';
import { useTheme } from './lib/theme';
import {
  STANDARD_EASE, POWER1_IN, POWER1_OUT, EXPO_OUT, DURATION,
  reducedMotion, restartAnimation, staggerIn, usePresence, usePopAnimation,
  useSlidingPill, useButtonPress,
} from './lib/motion';

const entryStore = createEntryStore(window.localStorage);

// ─── Kategorien ────────────────────────────────────────────────────────────────
// Unterschieden wird über das Symbol, nicht über die Farbe: die Oberfläche
// bleibt monochrom, Farbe ist dem Status vorbehalten.
const CATEGORIES = [
  { id: 'insurance',     labelKey: 'cat_insurance',     icon: Shield     },
  { id: 'health',        labelKey: 'cat_health',        icon: HeartPulse },
  { id: 'energy',        labelKey: 'cat_energy',        icon: Plug       },
  { id: 'water',         labelKey: 'cat_water',         icon: Droplets   },
  { id: 'housing',       labelKey: 'cat_housing',       icon: Home       },
  { id: 'internet',      labelKey: 'cat_internet',      icon: Wifi       },
  { id: 'mobile',        labelKey: 'cat_mobile',        icon: Smartphone },
  { id: 'transport',     labelKey: 'cat_transport',     icon: Car        },
  { id: 'broadcast',     labelKey: 'cat_broadcast',     icon: Radio      },
  { id: 'banking',       labelKey: 'cat_banking',       icon: Wallet     },
  { id: 'fitness',       labelKey: 'cat_fitness',       icon: Dumbbell   },
  { id: 'membership',    labelKey: 'cat_membership',    icon: Users      },
  { id: 'entertainment', labelKey: 'cat_entertainment', icon: Music      },
  { id: 'work',          labelKey: 'cat_work',          icon: Briefcase  },
  { id: 'ai',            labelKey: 'cat_ai',            icon: Sparkles   },
  { id: 'games',         labelKey: 'cat_games',         icon: Gamepad2   },
  { id: 'education',     labelKey: 'cat_education',     icon: BookOpen   },
  { id: 'vpn',           labelKey: 'cat_vpn',           icon: Lock       },
  { id: 'other',         labelKey: 'cat_other',         icon: Package    },
];
const getCat = (id) => CATEGORIES.find(c => c.id === id) || null;

// ─── Art des Eintrags ──────────────────────────────────────────────────────────
// Zwei Töpfe, quer zu den Kategorien: was man kündigen könnte (Abos) und was
// zum Haushalt gehört (Strom, Miete, Versicherung). Die Kategorie schlägt vor,
// entschieden wird im Formular.
const KINDS = [
  { id: 'abo',   labelKey: 'kind_abo',   oneKey: 'kind_abo_one',   icon: RefreshCw },
  { id: 'fixed', labelKey: 'kind_fixed', oneKey: 'kind_fixed_one', icon: Home      },
];
const getKind      = (id) => KINDS.find(k => k.id === id) || null;
const kindOf       = (entry) => entry.kind || kindForCategory(entry.category);
const locationOf   = (entry) => (entry.location || '').trim();

// Sortierung von Adressen — leere ans Ende, sonst alphabetisch
const byLocation = (a, b) => {
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
};

// Anteile in einer Liste werden über die Deckkraft einer einzigen Tintenfläche
// unterschieden — kein Farbkreis, aber jede Zeile bleibt auseinanderzuhalten.
const RANK_OPACITY = [1, 0.82, 0.66, 0.54, 0.44, 0.36, 0.3, 0.25];
const rankOpacity = (i) => RANK_OPACITY[Math.min(i, RANK_OPACITY.length - 1)];

// ─── Währungen ─────────────────────────────────────────────────────────────────
const CURRENCIES = [
  { code: 'EUR', symbol: '€',   label: 'EUR (€)' },
  { code: 'CHF', symbol: 'CHF', label: 'CHF' },
  { code: 'USD', symbol: '$',   label: 'USD ($)' },
  { code: 'GBP', symbol: '£',   label: 'GBP (£)' },
];
const DEFAULT_CURRENCY = 'EUR';
const getCurrency   = (code) => CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
const DEFAULT_RATES = { USD: 1, EUR: 0.92, CHF: 0.88, GBP: 0.79 };

const fetchRates = async () => {
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

const loadRates = () => {
  try {
    const raw = localStorage.getItem('fxRates');
    const at  = Number(localStorage.getItem('fxRatesAt') || 0);
    if (raw && Date.now() - at < 4 * 60 * 60 * 1000) return JSON.parse(raw);
  } catch { /* Cache unbrauchbar — Fallback-Kurse reichen */ }
  return null;
};

// ─── Konstanten ───────────────────────────────────────────────────────────────
// MONTHS_SHORT und alles rund um Abbuchungstermine stehen in lib/billing.js
const TABS         = ['home', 'calendar', 'analytics'];
const LOCALES      = { de: 'de-DE', en: 'en-US' };
const localeOf     = (lang) => LOCALES[lang] || LOCALES.de;

// ISO-Datum → "14. Mär" (de) bzw. "14 Mar" (en)
const fmtDateFromISO = (isoStr, lang, months) => {
  const d = new Date(isoStr);
  if (isNaN(d)) return '';
  const short = months?.[d.getMonth()] ?? MONTHS_SHORT[d.getMonth()];
  return lang === 'de' ? `${d.getDate()}. ${short}` : `${d.getDate()} ${short}`;
};

// Wie fmtDateFromISO, zusätzlich mit Jahr → "14. Mär 2026" bzw. "14 Mar 2026".
// Für Vertragsdaten, die auch Jahre in der Zukunft/Vergangenheit liegen können.
const fmtDateFromISOWithYear = (isoStr, lang, months) => {
  const base = fmtDateFromISO(isoStr, lang, months);
  return base ? `${base} ${new Date(isoStr).getFullYear()}` : '';
};

// Gespeichertes Abbuchungsdatum ("24" oder "8 Mar") übersetzt anzeigen
const fmtBillingDate = (raw, t, lang) => {
  if (!raw || raw === '—') return null;

  const [day, month] = String(raw).trim().split(/\s+/);
  const suffix = lang === 'de' ? '.' : '';
  const index = month ? MONTHS_SHORT.indexOf(month) : -1;

  return index >= 0 ? `${day}${suffix} ${t.months_short[index]}` : `${day}${suffix}`;
};

// Geldbetrag in der Anzeige-Währung, lokalisiert formatiert
const fmtMoney = (value, code, lang) => {
  const fraction = Math.abs(value % 1) < 0.005 ? 0 : 2;
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

// ─── Anbieterkatalog (Autovervollständigung) ──────────────────────────────────
const SERVICE_CATALOG = [
  // ── Strom, Gas & Wasser ──
  { name: 'E.ON',             aliases: ['eon'],                    domain: 'eon.de',            category: 'energy' },
  { name: 'Vattenfall',       aliases: [],                         domain: 'vattenfall.de',     category: 'energy' },
  { name: 'EnBW',             aliases: ['enbw'],                   domain: 'enbw.com',          category: 'energy' },
  { name: 'Yello Strom',      aliases: ['yello'],                  domain: 'yello.de',          category: 'energy' },
  { name: 'LichtBlick',       aliases: ['lichtblick'],             domain: 'lichtblick.de',     category: 'energy' },
  { name: 'Octopus Energy',   aliases: ['octopus'],                domain: 'octopusenergy.de',  category: 'energy' },
  { name: 'Rheinenergie',     aliases: ['rheinenergie'],           domain: 'rheinenergie.com',  category: 'energy' },
  { name: 'Stadtwerke',       aliases: ['stadtwerk'],              lucideIcon: Plug,            category: 'energy' },
  { name: 'Strom',            aliases: ['electricity'],            lucideIcon: Zap,             category: 'energy' },
  { name: 'Gas',              aliases: ['erdgas'],                 lucideIcon: Flame,           category: 'energy' },
  { name: 'Wasser',           aliases: ['water', 'wasserwerke'],   lucideIcon: Droplets,        category: 'water'  },
  { name: 'Abfallentsorgung', aliases: ['müll', 'muell', 'abfall'], lucideIcon: Trash,          category: 'water'  },

  // ── Internet & Mobilfunk ──
  { name: 'Telekom',          aliases: ['deutsche telekom', 'magenta'], domain: 'telekom.de',   category: 'internet' },
  { name: 'Vodafone',         aliases: [],                         domain: 'vodafone.de',       category: 'internet' },
  { name: 'O₂',               aliases: ['o2', 'telefonica'],       domain: 'o2online.de',       category: 'mobile'   },
  { name: '1&1',              aliases: ['1und1', 'einsundeins'],   domain: '1und1.de',          category: 'internet' },
  { name: 'congstar',         aliases: ['congstar'],               domain: 'congstar.de',       category: 'mobile'   },
  { name: 'ALDI TALK',        aliases: ['alditalk', 'aldi'],       domain: 'alditalk.de',       category: 'mobile'   },
  { name: 'PYUR',             aliases: ['pyur'],                   domain: 'pyur.com',          category: 'internet' },
  { name: 'Internet',         aliases: ['provider', 'dsl', 'glasfaser'], lucideIcon: Wifi,      category: 'internet' },
  { name: 'Mobilfunk',        aliases: ['handy', 'mobile', 'sim'], lucideIcon: Smartphone,      category: 'mobile'   },
  { name: 'Server / Hosting', aliases: ['server', 'hosting', 'vps'], lucideIcon: Server,        category: 'work'     },

  // ── Versicherungen ──
  { name: 'HUK-COBURG',       aliases: ['huk'],                    domain: 'huk.de',            category: 'insurance' },
  { name: 'Allianz',          aliases: [],                         domain: 'allianz.de',        category: 'insurance' },
  { name: 'AXA',              aliases: [],                         domain: 'axa.de',            category: 'insurance' },
  { name: 'ERGO',             aliases: [],                         domain: 'ergo.de',           category: 'insurance' },
  { name: 'Debeka',           aliases: [],                         domain: 'debeka.de',         category: 'insurance' },
  { name: 'CosmosDirekt',     aliases: ['cosmos'],                 domain: 'cosmosdirekt.de',   category: 'insurance' },
  { name: 'HanseMerkur',      aliases: ['hanse merkur'],           domain: 'hansemerkur.de',    category: 'insurance' },
  { name: 'R+V Versicherung', aliases: ['r+v', 'ruv'],             domain: 'ruv.de',            category: 'insurance' },
  { name: 'SIGNAL IDUNA',     aliases: ['signal iduna'],           domain: 'signal-iduna.de',   category: 'insurance' },
  { name: 'Getsafe',          aliases: ['getsafe'],                domain: 'hellogetsafe.com',  category: 'insurance' },
  { name: 'CHECK24',          aliases: ['check24'],                domain: 'check24.de',        category: 'insurance' },
  { name: 'Versicherung',     aliases: ['haftpflicht', 'hausrat', 'insurance'], lucideIcon: Shield, category: 'insurance' },

  // ── Krankenkassen ──
  { name: 'Techniker Krankenkasse', aliases: ['tk', 'techniker'],  domain: 'tk.de',             category: 'health' },
  { name: 'AOK',              aliases: ['aok'],                    domain: 'aok.de',            category: 'health' },
  { name: 'Barmer',           aliases: ['barmer'],                 domain: 'barmer.de',         category: 'health' },
  { name: 'DAK-Gesundheit',   aliases: ['dak'],                    domain: 'dak.de',            category: 'health' },
  { name: 'IKK classic',      aliases: ['ikk'],                    domain: 'ikk-classic.de',    category: 'health' },
  { name: 'Krankenkasse',     aliases: ['krankenversicherung'],    lucideIcon: HeartPulse,      category: 'health' },

  // ── Wohnen & Rundfunk ──
  { name: 'Miete',            aliases: ['wohnung', 'rent'],        lucideIcon: Home,            category: 'housing' },
  { name: 'Vonovia',          aliases: ['vonovia'],                domain: 'vonovia.de',        category: 'housing' },
  { name: 'Rundfunkbeitrag',  aliases: ['gez', 'ard zdf'],         domain: 'rundfunkbeitrag.de', category: 'broadcast' },

  // ── Mobilität ──
  { name: 'Deutschlandticket', aliases: ['49 euro ticket', 'dticket'], domain: 'bahn.de',       category: 'transport' },
  { name: 'Deutsche Bahn',    aliases: ['db', 'bahncard'],         domain: 'bahn.de',           category: 'transport' },
  { name: 'ADAC',             aliases: ['adac'],                   domain: 'adac.de',           category: 'transport' },

  // ── Bank & Finanzen ──
  { name: 'Sparkasse',        aliases: ['sparkasse'],              domain: 'sparkasse.de',      category: 'banking' },
  { name: 'DKB',              aliases: ['dkb'],                    domain: 'dkb.de',            category: 'banking' },
  { name: 'ING',              aliases: ['ing diba'],               domain: 'ing.de',            category: 'banking' },
  { name: 'N26',              aliases: ['n26'],                    domain: 'n26.com',           category: 'banking' },
  { name: 'Commerzbank',      aliases: [],                         domain: 'commerzbank.de',    category: 'banking' },
  { name: 'comdirect',        aliases: ['comdirect'],              domain: 'comdirect.de',      category: 'banking' },
  { name: 'Trade Republic',   aliases: ['traderepublic'],          domain: 'traderepublic.com', category: 'banking' },

  // ── Fitness & Mitgliedschaften ──
  { name: 'McFIT',            aliases: ['mcfit'],                  domain: 'mcfit.com',         category: 'fitness' },
  { name: 'FitX',             aliases: ['fitx'],                   domain: 'fitx.de',           category: 'fitness' },
  { name: 'Urban Sports Club', aliases: ['urban sports'],          domain: 'urbansportsclub.com', category: 'fitness' },
  { name: 'clever fit',       aliases: ['cleverfit'],              domain: 'clever-fit.com',    category: 'fitness' },
  { name: 'Mitgliedschaft',   aliases: ['verein', 'membership'],   lucideIcon: Users,           category: 'membership' },

  // ── Streaming & Unterhaltung ──
  { name: 'Spotify',          aliases: ['spotify'],                domain: 'spotify.com',       category: 'entertainment',
    cancelUrl: 'https://www.spotify.com/account/subscription/', cancelSteps: ['Konto → Abo', 'Plan ändern oder kündigen', 'Premium kündigen'] },
  { name: 'Netflix',          aliases: [],                         domain: 'netflix.com',       category: 'entertainment',
    cancelUrl: 'https://www.netflix.com/cancelplan', cancelSteps: ['Konto → Mitgliedschaft', 'Mitgliedschaft kündigen', 'Kündigung bestätigen'] },
  { name: 'YouTube Premium',  aliases: ['youtube'],                domain: 'youtube.com',       category: 'entertainment',
    cancelUrl: 'https://www.youtube.com/paid_memberships', cancelSteps: ['Mitgliedschaft verwalten', 'Kündigen', 'Bestätigen'] },
  { name: 'Disney+',          aliases: ['disney'],                 domain: 'disneyplus.com',    category: 'entertainment',
    cancelUrl: 'https://www.disneyplus.com/account', cancelSteps: ['Konto → Abo', 'Abo kündigen', 'Bestätigen'] },
  { name: 'Amazon Prime',     aliases: ['amazon', 'prime'],        domain: 'amazon.de',         category: 'entertainment',
    cancelUrl: 'https://www.amazon.de/mc/pipelines/cancellation', cancelSteps: ['Konto → Prime-Mitgliedschaft', 'Mitgliedschaft beenden', 'Bestätigen'] },
  { name: 'Sky',              aliases: ['sky'],                    domain: 'sky.de',            category: 'entertainment' },
  { name: 'WOW',              aliases: ['wow tv'],                 domain: 'wowtv.de',          category: 'entertainment' },
  { name: 'DAZN',             aliases: ['dazn'],                   domain: 'dazn.com',          category: 'entertainment' },
  { name: 'RTL+',             aliases: ['rtl plus', 'tvnow'],      domain: 'rtlplus.de',        category: 'entertainment' },
  { name: 'Joyn',             aliases: ['joyn'],                   domain: 'joyn.de',           category: 'entertainment' },
  { name: 'Apple Music',      aliases: ['apple music'],            domain: 'apple.com',         category: 'entertainment',
    cancelUrl: 'https://music.apple.com/account/subscriptions', cancelSteps: ['Einstellungen → Apple-ID → Abos', 'Apple Music', 'Abo kündigen'] },
  { name: 'Apple TV+',        aliases: ['apple tv'],               domain: 'apple.com',         category: 'entertainment' },
  { name: 'Twitch',           aliases: [],                         domain: 'twitch.tv',         category: 'entertainment' },
  { name: 'Discord Nitro',    aliases: ['discord'],                domain: 'discord.com',       category: 'entertainment',
    cancelUrl: 'https://discord.com/settings/subscriptions', cancelSteps: ['Einstellungen → Abos', 'Nitro kündigen', 'Bestätigen'] },
  { name: 'Telegram Premium', aliases: ['telegram'],               domain: 'telegram.org',      category: 'other' },
  { name: 'TV / Kabel',       aliases: ['kabel', 'fernsehen'],     lucideIcon: Tv,              category: 'entertainment' },

  // ── Arbeit, Software & KI ──
  { name: 'Claude Pro',       aliases: ['claude', 'anthropic'],    domain: 'anthropic.com',     category: 'ai',
    cancelUrl: 'https://claude.ai/settings', cancelSteps: ['Settings → Billing', 'Plan kündigen', 'Bestätigen'] },
  { name: 'ChatGPT Plus',     aliases: ['chatgpt', 'openai'],      domain: 'openai.com',        category: 'ai',
    cancelUrl: 'https://chat.openai.com/settings', cancelSteps: ['Settings → Subscription', 'Manage subscription', 'Plan kündigen'] },
  { name: 'Perplexity',       aliases: ['perplexity'],             domain: 'perplexity.ai',     category: 'ai' },
  { name: 'Cursor',           aliases: ['cursor'],                 domain: 'cursor.com',        category: 'ai' },
  { name: 'Notion',           aliases: ['notion'],                 domain: 'notion.so',         category: 'work' },
  { name: 'Figma',            aliases: ['figma'],                  domain: 'figma.com',         category: 'work' },
  { name: 'Slack',            aliases: ['slack'],                  domain: 'slack.com',         category: 'work' },
  { name: 'Zoom',             aliases: ['zoom'],                   domain: 'zoom.us',           category: 'work' },
  { name: 'Adobe Creative Cloud', aliases: ['adobe'],              domain: 'adobe.com',         category: 'work',
    cancelUrl: 'https://account.adobe.com/plans', cancelSteps: ['Abos → Abo verwalten', 'Abo kündigen', 'Bestätigen — auf Kündigungsgebühr achten'] },
  { name: 'Canva',            aliases: ['canva'],                  domain: 'canva.com',         category: 'work' },
  { name: 'GitHub',           aliases: ['github', 'copilot'],      domain: 'github.com',        category: 'work' },
  { name: 'Vercel',           aliases: ['vercel'],                 domain: 'vercel.com',        category: 'work' },
  { name: 'Google One',       aliases: ['google'],                 domain: 'google.com',        category: 'work' },
  { name: 'iCloud+',          aliases: ['icloud'],                 domain: 'apple.com',         category: 'work' },
  { name: 'Dropbox',          aliases: ['dropbox'],                domain: 'dropbox.com',       category: 'work' },
  { name: '1Password',        aliases: ['1password'],              domain: '1password.com',     category: 'work' },

  // ── Spiele & Bildung ──
  { name: 'Xbox Game Pass',   aliases: ['xbox', 'gamepass'],       domain: 'xbox.com',          category: 'games' },
  { name: 'PlayStation Plus', aliases: ['playstation', 'ps plus'], domain: 'playstation.com',   category: 'games' },
  { name: 'Nintendo Switch Online', aliases: ['nintendo'],         domain: 'nintendo.de',       category: 'games' },
  { name: 'Steam',            aliases: ['steam'],                  domain: 'steampowered.com',  category: 'games' },
  { name: 'Duolingo',         aliases: ['duolingo'],               domain: 'duolingo.com',      category: 'education' },
  { name: 'Coursera',         aliases: ['coursera'],               domain: 'coursera.org',      category: 'education' },
  { name: 'Babbel',           aliases: ['babbel'],                 domain: 'babbel.com',        category: 'education' },
  { name: 'Udemy',            aliases: ['udemy'],                  domain: 'udemy.com',         category: 'education' },

  // ── VPN ──
  { name: 'NordVPN',          aliases: ['nord vpn'],               domain: 'nordvpn.com',       category: 'vpn' },
  { name: 'Proton VPN',       aliases: ['proton'],                 domain: 'protonvpn.com',     category: 'vpn' },
  { name: 'Abo',              aliases: ['subscription', 'sonstiges'], lucideIcon: Package,      category: 'other' },
];

// Sucht einen Katalogeintrag über Name oder Alias
const getCatalogEntry = (name) => {
  const q = (name || '').toLowerCase().trim();
  if (!q) return null;
  return SERVICE_CATALOG.find(s =>
    s.name.toLowerCase() === q ||
    (s.aliases || []).some(a => a.toLowerCase() === q)
  ) || null;
};

const faviconUrl = (domain, size = 64) =>
  `https://www.google.com/s2/favicons?sz=${size}&domain=${domain}`;

const getLogoUrl = (entry) => {
  if (entry.logo) return entry.logo;

  const catalogEntry = getCatalogEntry(entry.name) || getCatalogEntry(entry.provider);
  if (catalogEntry?.lucideIcon) return null; // Lucide-Icon statt Favicon
  if (catalogEntry?.domain) return faviconUrl(catalogEntry.domain);

  // Fallback — Domain aus dem hinterlegten Portal-Link oder dem Namen raten
  if (entry.url) {
    try { return faviconUrl(new URL(entry.url).hostname); } catch { /* kein gültiger Link */ }
  }

  const first = (entry.name || '').toLowerCase().trim().split(/\s+/)[0].replace(/[^a-z0-9]/g, '');
  return first ? faviconUrl(`${first}.de`) : null;
};

const getLucideIcon = (entry) => {
  const catalogEntry = getCatalogEntry(entry.name) || getCatalogEntry(entry.provider);
  if (catalogEntry?.lucideIcon) return catalogEntry.lucideIcon;
  return catalogEntry ? null : getCat(entry.category)?.icon || null;
};

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────
const daysUntil = (isoDate) => {
  if (!isoDate) return null;
  const target = new Date(isoDate);
  if (isNaN(target)) return null;
  const day = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((day - startOfToday()) / 86400000);
};

// Vertragsende minus Kündigungsfrist — bis dahin muss die Kündigung raus sein.
// Bei automatischer Verlängerung rollt die Frist auf das nächste Vertragsjahr.
const cancelByDate = (entry) => {
  if (!entry?.contract_end || !entry.notice_period_months) return null;

  const end = new Date(entry.contract_end);
  if (isNaN(end)) return null;

  const today = startOfToday();
  const deadline = new Date(end);
  deadline.setMonth(deadline.getMonth() - entry.notice_period_months);

  if (deadline >= today || !entry.auto_renew) {
    return deadline.toISOString().split('T')[0];
  }

  // Verlängerter Vertrag: nächstes Ende suchen, das noch vor uns liegt
  const rolled = new Date(deadline);
  while (rolled < today) rolled.setFullYear(rolled.getFullYear() + 1);
  return rolled.toISOString().split('T')[0];
};

// Preis in Originalwährung → USD als gemeinsame Rechengröße
const toUSD = (price, currencyCode, rates) => {
  const rate = rates?.[currencyCode] ?? DEFAULT_RATES[currencyCode] ?? 1;
  return Number(price || 0) / rate;
};

const monthlyUSD = (entry, rates) => {
  const p = toUSD(entry.price ?? 0, entry.currency_code || DEFAULT_CURRENCY, rates);
  return entry.period === 'yearly' ? p / 12 : p;
};

// ─── Хук drag-scroll (горизонталь) ────────────────────────────────────────────
// ─── Хук drag-scroll (горизонталь, без конфликта с вертикалью) ────────────────
const useDragScroll = () => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Mouse
    let down = false, startX = 0, sl = 0;
    const onDown = (e) => { if (e.pointerType !== 'mouse') return; down = true; startX = e.clientX; sl = el.scrollLeft; el.setPointerCapture?.(e.pointerId); el.style.cursor = 'grabbing'; };
    const onMove = (e) => { if (!down) return; el.scrollLeft = sl - (e.clientX - startX); };
    const onUp   = (e) => { if (!down) return; down = false; el.releasePointerCapture?.(e.pointerId); el.style.cursor = ''; };
    // Touch — определяем ось по первым пикселям, не блокируем вертикаль
    let tx = 0, ty = 0, tsl = 0, axis = null;
    const onTouchStart = (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; tsl = el.scrollLeft; axis = null; };
    const onTouchMove  = (e) => {
      const dx = e.touches[0].clientX - tx;
      const dy = e.touches[0].clientY - ty;
      if (!axis) {
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      if (axis === 'x') { e.preventDefault(); e.stopPropagation(); el.scrollLeft = tsl - dx; }
    };
    el.addEventListener('pointerdown',  onDown);
    el.addEventListener('pointermove',  onMove);
    el.addEventListener('pointerup',    onUp);
    el.addEventListener('pointerleave', onUp);
    el.addEventListener('touchstart',   onTouchStart, { passive: true });
    el.addEventListener('touchmove',    onTouchMove,  { passive: false });
    return () => {
      el.removeEventListener('pointerdown',  onDown);
      el.removeEventListener('pointermove',  onMove);
      el.removeEventListener('pointerup',    onUp);
      el.removeEventListener('pointerleave', onUp);
      el.removeEventListener('touchstart',   onTouchStart);
      el.removeEventListener('touchmove',    onTouchMove);
    };
  }, []);
  return ref;
};

// ─── Хук свайп между вкладками ────────────────────────────────────────────────
const useTabSwipe = (activeTab, setActiveTab, enabled = true) => {
  const ref    = useRef(null);
  const state  = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const onStart = (e) => {
      const t = e.touches?.[0];
      if (!t) return;
      // Игнорируем если начали на горизонтальном скроллере или на строке подписки
      const target = e.target.closest('[data-no-tab-swipe]');
      if (target) return;
      state.current = { x: t.clientX, y: t.clientY, active: true };
    };

    const onEnd = (e) => {
      if (!state.current.active) return;
      state.current.active = false;
      const t  = e.changedTouches?.[0];
      if (!t) return;
      const dx = t.clientX - state.current.x;
      const dy = t.clientY - state.current.y;
      // Высокий порог (120px) + строго горизонтально (угол < 30°)
      if (Math.abs(dx) < 120) return;
      if (Math.abs(dy) > Math.abs(dx) * 0.58) return;
      const idx = TABS.indexOf(activeTab);
      if (dx < 0 && idx < TABS.length - 1) setActiveTab(TABS[idx + 1]);
      if (dx > 0 && idx > 0)               setActiveTab(TABS[idx - 1]);
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend',   onEnd,   { passive: true });
    return () => { el.removeEventListener('touchstart', onStart); el.removeEventListener('touchend', onEnd); };
  }, [activeTab, setActiveTab, enabled]);

  return ref;
};

// ─── Хук: десктопный брейкпоинт (совпадает с tailwind lg) ─────────────────────
const DESKTOP_QUERY = '(min-width: 1024px)';

const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
};

// ─── Hook: Zustand des Passwort-Tresors ───────────────────────────────────────
const useVault = () => {
  const [configured, setConfigured] = useState(() => vault.isConfigured());
  const [unlocked,   setUnlocked]   = useState(() => vault.isUnlocked());

  return {
    available: vault.isAvailable(),
    configured,
    unlocked,
    async create(passphrase) {
      await vault.setup(passphrase);
      setConfigured(true);
      setUnlocked(true);
    },
    async unlock(passphrase) {
      const ok = await vault.unlock(passphrase);
      setUnlocked(ok);
      return ok;
    },
    lock() {
      vault.lock();
      setUnlocked(false);
    },
    reset() {
      vault.reset();
      setConfigured(false);
      setUnlocked(false);
    },
    sync() {
      setConfigured(vault.isConfigured());
      setUnlocked(vault.isUnlocked());
    },
    encrypt: vault.encrypt,
    decrypt: vault.decrypt,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// BAUSTEINE — Rezepte aus design-language.html §5 und §6
// ═══════════════════════════════════════════════════════════════════════════════

// Radien-Leiter: 8px Bedienelemente · 12px Karten · 16px Modale · voll für Pillen
const CARD       = 'bg-surface-2 border border-border rounded-xl';
const PANEL      = 'bg-surface-2 border border-border-strong rounded-xl shadow-xl';
const INPUT_CLASS = 'w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-border-strong transition';

const BTN_VARIANT = {
  // Primär ist massive Tinte — bewusst nicht der Akzent
  primary:   'bg-ink text-surface hover:bg-ink-2 disabled:hover:bg-ink',
  secondary: 'bg-surface-2 text-ink border border-border hover:bg-surface-3',
  ghost:     'text-ink-2 hover:bg-surface-3 hover:text-ink',
  danger:    'bg-error text-white hover:opacity-90',
};
const BTN_SIZE = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};
const btn = (variant = 'primary', size = 'md', extra = '') =>
  `inline-flex items-center justify-center gap-2 rounded-lg font-medium
   disabled:opacity-50 disabled:cursor-not-allowed
   ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${extra}`;

// ─── Segmented Control mit gleitender Markierung (§4.4) ───────────────────────
// Eine einzige Pille wandert zwischen den Einträgen — keine Hintergründe, die
// an- und ausgehen. Die Beschriftungen blenden nur ihre Farbe über.
const Segmented = ({
  items, value, onChange,
  className = '', trackClass = '', itemClass = '', pillClass = '', vertical = false,
  layout, renderItem,
}) => {
  const { trackRef, pillRef, setItem } = useSlidingPill(value);

  return (
    <div ref={trackRef}
      className={`relative ${layout || (vertical ? 'flex flex-col' : 'inline-flex')} gap-0.5 p-1 ${trackClass} ${className}`}>
      <span ref={pillRef} aria-hidden="true" className={`seg-pill rounded-lg ${pillClass}`} />
      {items.map(item => {
        const active = item.id === value;
        return (
          <button key={item.id} type="button" ref={setItem(item.id)} data-no-press
            onClick={() => onChange(item.id)}
            aria-current={active ? 'page' : undefined}
            className={`relative z-10 rounded-lg font-medium
              transition-colors duration-300 ${active ? 'text-ink' : 'text-ink-2 hover:text-ink'} ${itemClass}`}>
            {renderItem ? renderItem(item, active) : item.label}
          </button>
        );
      })}
    </div>
  );
};

// ─── Dropdown 'pop' (§4.3) ────────────────────────────────────────────────────
// Bleibt bis zum Ende der Ausblendung montiert; Zeilen kaskadieren hinein.
const PopMenu = ({ open, children, className = '', origin = 'top left', width = 'w-[240px]' }) => {
  const rendered = usePresence(open, DURATION.ddOut);
  const panelRef = useRef(null);
  usePopAnimation(open, panelRef, { origin });

  if (!rendered) return null;
  return (
    <div ref={panelRef} role="menu"
      className={`absolute z-50 ${width} ${PANEL} overflow-hidden p-1 ${className}`}>
      {children}
    </div>
  );
};

const MenuHeader = ({ title, hint }) => (
  <div className="px-3 pt-2 pb-2.5 mb-1 border-b border-border">
    <p className="text-sm font-medium text-ink">{title}</p>
    {hint && <p className="text-xs text-ink-3 mt-0.5">{hint}</p>}
  </div>
);

const MenuItem = ({ icon: Icon, children, className = '', ...props }) => (
  <button type="button" data-menu-item
    className={`w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg text-sm
      text-ink-2 hover:bg-surface-3 hover:text-ink transition ${className}`}
    {...props}>
    {Icon && <Icon className="w-4 h-4 shrink-0" />}
    {children}
  </button>
);

// Schließt Menüs bei Klick daneben und mit Escape
const useDismiss = (open, onClose) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  return ref;
};

// ─── Modal (§4.3) ─────────────────────────────────────────────────────────────
// Am Desktop steigt das Panel auf und skaliert, am Telefon fährt ein Blatt hoch.
// Der Austritt läuft schneller als der Eintritt.
const Overlay = ({ open, onClose, children, panelClass = '', sheet = false, labelledBy }) => {
  const rendered = usePresence(open, DURATION.modalOut);
  const backdropRef = useRef(null);
  const panelRef    = useRef(null);

  useLayoutEffect(() => {
    if (!rendered || reducedMotion()) return;
    const enter = open;
    restartAnimation(backdropRef.current,
      enter ? `modal-backdrop-in ${DURATION.backdropIn}ms ${STANDARD_EASE}`
            : `modal-backdrop-out ${DURATION.modalOut}ms ${STANDARD_EASE} forwards`);
    const keyframe = sheet ? 'sheet' : 'modal-panel';
    restartAnimation(panelRef.current,
      enter ? `${keyframe}-in ${DURATION.modalIn}ms ${STANDARD_EASE}`
            : `${keyframe}-out ${DURATION.modalOut}ms ${STANDARD_EASE} forwards`);
  }, [open, rendered, sheet]);

  // Escape schließt — aber erst, wenn kein Menü mehr offen ist. Ein offenes
  // PopMenu fängt die Taste selbst ab und darf das Modal nicht mitreißen.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[role="menu"]')) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!rendered) return null;
  return (
    <>
      <div ref={backdropRef} onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={labelledBy}
        onClick={e => e.stopPropagation()}
        className={`fixed z-50 ${panelClass}`}>
        {children}
      </div>
    </>
  );
};

// ─── Kleinteile ───────────────────────────────────────────────────────────────
// Status ist der einzige Ort, an dem Farbe getragen wird
const TONE = {
  success: 'text-success bg-success/10 border-success/25',
  warning: 'text-warning bg-warning/10 border-warning/25',
  error:   'text-error   bg-error/10   border-error/25',
  muted:   'text-ink-3   bg-surface-3  border-border',
};
const DOT = { success: 'bg-success', warning: 'bg-warning', error: 'bg-error', muted: 'bg-ink-3' };

const StatusPill = ({ tone = 'muted', label, pulse = false }) => (
  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${TONE[tone]}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${DOT[tone]} ${pulse ? 'animate-pulse' : ''}`} />
    {label}
  </span>
);

const Badge = ({ tone = 'muted', icon: Icon, children, title }) => (
  <span title={title}
    className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md border shrink-0 ${TONE[tone]}`}>
    {Icon && <Icon className="w-3 h-3" />}{children}
  </span>
);

// Kopfzeile am Telefon — links ausgerichtet wie am Desktop, kein zentriertes Symbol
const MobilePageHeader = ({ icon: Icon, title, children }) => (
  <header className="flex items-center justify-between gap-3 px-1 pt-1 pb-1 lg:hidden">
    <div className="flex items-center gap-2.5 min-w-0">
      <Icon className="w-5 h-5 text-ink-3 shrink-0" strokeWidth={2} />
      <h2 className="text-lg font-semibold tracking-tight truncate">{title}</h2>
    </div>
    {children}
  </header>
);

// ─── Balken ───────────────────────────────────────────────────────────────────
// Anteile werden über die Deckkraft einer Tintenfläche unterschieden.
const MeterRow = ({ leading, title, subtitle, value, meta, share, rank = 0, index = 0 }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        {leading}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          {subtitle && <p className="text-xs text-ink-3 truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold">{value}</p>
        {meta && <p className="text-xs text-ink-3">{meta}</p>}
      </div>
    </div>
    <div className="w-full h-1.5 bg-surface-3 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-ink origin-left"
        style={{
          width: `${Math.max(2, Math.min(100, share))}%`,
          opacity: rankOpacity(rank),
          animation: `bar-fill 600ms ${EXPO_OUT} ${index * 40}ms backwards`,
        }} />
    </div>
  </div>
);

const TrendBars = ({ totals, maxVal, months, labels, fmt, isDesktop, range }) => (
  <div className="flex items-end gap-1.5 lg:gap-2">
    {totals.map((val, i) => {
      const isCurrent = i === range - 1;
      const heightPct = maxVal > 0 ? Math.max(4, (val / maxVal) * 100) : 4;
      return (
        <div key={i} className="group flex-1 flex flex-col items-center gap-1.5 max-w-[72px]">
          <span className="hidden lg:block text-[11px] font-medium text-ink-2 opacity-0 group-hover:opacity-100 transition">
            {fmt(val)}
          </span>
          <div className="w-full flex items-end h-20 lg:h-36">
            <div
              className={`w-full rounded-md origin-bottom transition-colors
                ${isCurrent ? 'bg-ink' : val > 0 ? 'bg-ink/35 lg:group-hover:bg-ink/60' : 'bg-surface-3'}`}
              style={{
                height: `${heightPct}%`, minHeight: '3px',
                animation: `bar-grow 500ms ${EXPO_OUT} ${i * 30}ms backwards`,
              }} />
          </div>
          {(range <= 6 || i % 2 === 0 || isDesktop) && (
            <span className={`text-[10px] leading-none lg:text-[11px] ${isCurrent ? 'text-ink font-medium' : 'text-ink-3'}`}>
              {labels[months[i].month]}
            </span>
          )}
        </div>
      );
    })}
  </div>
);

// ─── Kosten als Ringdiagramm ──────────────────────────────────────────────────
// Kleine Gruppen werden zusammengefasst, damit Segmente und Legende auch auf
// dem Telefon lesbar bleiben. Die detaillierten Listen darunter bleiben vollständig.
const CHART_COLORS = Array.from({ length: 6 }, (_, i) => `var(--chart-${i + 1})`);

const pointOnCircle = (cx, cy, radius, angle) => {
  const radians = (angle - 90) * Math.PI / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
};

const donutSlicePath = (cx, cy, outerRadius, innerRadius, startAngle, endAngle) => {
  const outerStart = pointOnCircle(cx, cy, outerRadius, startAngle);
  const outerEnd   = pointOnCircle(cx, cy, outerRadius, endAngle);
  const innerEnd   = pointOnCircle(cx, cy, innerRadius, endAngle);
  const innerStart = pointOnCircle(cx, cy, innerRadius, startAngle);
  const largeArc   = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
};

const AnalyticsPieChart = ({ datasets, fmt, active }) => {
  const t = useT();
  const [hovered, setHovered] = useState(null);
  const [view, setView] = useState('category');
  const rows = datasets[view] || [];
  const sorted = [...rows].filter(row => row.total > 0).sort((a, b) => b.total - a.total);

  if (sorted.length === 0) return null;

  const viewOptions = [
    { id: 'category', label: t.chart_category },
    { id: 'kind',     label: t.chart_kind },
    { id: 'location', label: t.chart_location },
    { id: 'entry',    label: t.chart_entries },
  ];

  const visibleRows = sorted.length > 6
    ? [
        ...sorted.slice(0, 5),
        {
          id: '__other',
          label: t.chart_other,
          total: sorted.slice(5).reduce((sum, row) => sum + row.total, 0),
          entries: sorted.slice(5).flatMap(row => row.entries),
        },
      ]
    : sorted;

  const total = visibleRows.reduce((sum, row) => sum + row.total, 0);
  const normalizedRows = visibleRows.map(row => ({ ...row, share: row.total / total }));
  const slices = normalizedRows.map((row, index) => {
    const angle = normalizedRows
      .slice(0, index)
      .reduce((sum, previous) => sum + previous.share * 360, 0);
    const share = row.share;
    const sweep = share * 360;
    const gap   = Math.min(1.8, sweep * 0.18);
    const start = angle + gap / 2;
    const end   = angle + sweep - gap / 2;

    return {
      ...row,
      index,
      label: row.label || t[row.labelKey],
      share,
      path: donutSlicePath(120, 120, 92, 57, start, end),
      color: CHART_COLORS[index],
    };
  });

  const focus = hovered === null ? null : slices[hovered];

  return (
    <section data-group className={`${CARD} p-5 lg:col-span-2 lg:p-6`}>
      <div className="flex flex-col items-start gap-3 mb-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-ink-3 uppercase tracking-[0.16em]">
          {t.category_breakdown}
        </p>
        <Segmented
          items={viewOptions}
          value={view}
          onChange={(nextView) => {
            setHovered(null);
            setView(nextView);
          }}
          trackClass="bg-surface border border-border rounded-lg"
          itemClass="px-2.5 py-1 text-[11px]" />
      </div>
      <div className="grid items-center gap-6 sm:grid-cols-[minmax(210px,0.8fr)_minmax(0,1.2fr)] lg:gap-10">
        <div className="relative mx-auto w-full max-w-[270px]">
          <svg viewBox="0 0 240 240" role="img"
            aria-label={`${t.category_breakdown}: ${viewOptions.find(option => option.id === view)?.label}`}
            className="block w-full overflow-visible"
            onPointerLeave={() => setHovered(null)}>
            <circle cx="120" cy="120" r="74.5" fill="none"
              stroke="rgb(var(--surface-3))" strokeWidth="35" />
            {slices.map((slice, index) => {
              const highlighted = hovered === index;
              const dimmed = hovered !== null && !highlighted;
              const percentage = `${(slice.share * 100).toFixed(1)}%`;
              return (
                <path key={`${view}-${slice.id}`} d={slice.path} fill={slice.color}
                  className="pie-slice outline-none"
                  tabIndex="0"
                  aria-label={`${slice.label}: ${fmt(slice.total)}, ${percentage}`}
                  onPointerEnter={() => setHovered(index)}
                  onFocus={() => setHovered(index)}
                  onBlur={() => setHovered(null)}
                  style={{
                    opacity: dimmed ? 0.42 : 1,
                    transform: highlighted ? 'scale(1.045)' : 'scale(1)',
                    animation: active
                      ? `pie-slice-in 700ms ${EXPO_OUT} ${140 + index * 90}ms backwards`
                      : 'none',
                  }}>
                  <title>{`${slice.label}: ${fmt(slice.total)} · ${percentage}`}</title>
                </path>
              );
            })}
            <circle cx="120" cy="120" r="53" fill="rgb(var(--surface-2))" />
            <text x="120" y="112" textAnchor="middle"
              fill="rgb(var(--ink-3))" fontSize="10" fontWeight="500">
              {focus ? focus.label : t.per_month}
            </text>
            <text x="120" y="135" textAnchor="middle"
              fill="rgb(var(--ink))" fontSize="16" fontWeight="650">
              {fmt(focus ? focus.total : total)}
            </text>
          </svg>
        </div>

        <ul className="grid gap-1.5">
          {slices.map((slice, index) => {
            const highlighted = hovered === index;
            return (
              <li key={slice.id}
                onPointerEnter={() => setHovered(index)}
                onPointerLeave={() => setHovered(null)}
                className={`flex items-center gap-3 rounded-lg px-2.5 py-2 transition
                  ${highlighted ? 'bg-surface-3' : ''}`}>
                <span className="size-2.5 rounded-full shrink-0" style={{ background: slice.color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{slice.label}</p>
                  <p className="text-[11px] text-ink-3">{t.entries_count(slice.entries.length)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{fmt(slice.total)}</p>
                  <p className="text-[11px] text-ink-3">{(slice.share * 100).toFixed(0)}%</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

// ─── Filter- und Gruppenleiste ────────────────────────────────────────────────
// Zwei Achsen liegen quer zur Kategorie: die Art (Abo oder Fixkosten) und die
// Adresse. Beide filtern, beide gruppieren — die Leiste hält sie beieinander.
const FilterBar = ({ kind, onKind, place, onPlace, group, onGroup, locations, hasUnplaced, summary, onReset }) => {
  const t = useT();
  const placeOptions = [
    { value: 'all', label: t.filter_all },
    ...locations.map(name => ({ value: name, label: name })),
    ...(hasUnplaced ? [{ value: '', label: t.location_none }] : []),
  ];

  const groupOptions = [
    { value: 'none',     label: t.group_none },
    ...(locations.length > 0 ? [{ value: 'location', label: t.group_location }] : []),
    { value: 'kind',     label: t.group_kind },
    { value: 'category', label: t.group_category },
  ];

  const placeLabel = place === 'all' ? t.filter_address : place === '' ? t.location_none : place;

  return (
    <div className="px-1 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          items={[
            { id: 'all',   label: t.filter_all },
            ...KINDS.map(k => ({ id: k.id, label: t[k.labelKey], icon: k.icon })),
          ]}
          value={kind} onChange={onKind}
          trackClass="h-10 bg-surface border border-border rounded-lg"
          itemClass="flex items-center gap-1.5 px-3 text-xs"
          renderItem={(item) => (
            <>
              {item.icon && <item.icon className="w-3.5 h-3.5 shrink-0" />}
              {item.label}
            </>
          )} />

        {(locations.length > 0 || hasUnplaced) && (
          <FilterSelect icon={MapPin} label={placeLabel} active={place !== 'all'}
            value={place} options={placeOptions} onChange={onPlace} />
        )}

        <FilterSelect icon={Layers} label={t[`group_${group === 'none' ? 'by' : group}`]}
          active={group !== 'none'} value={group} options={groupOptions} onChange={onGroup} />

        {onReset && (
          <button type="button" onClick={onReset} title={t.filter_reset}
            className="inline-flex h-10 items-center gap-1.5 px-2.5 rounded-lg text-xs text-ink-3
              hover:text-ink hover:bg-surface-3 transition">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {summary && <p className="text-[11px] text-ink-3 px-1">{summary}</p>}
    </div>
  );
};

// Knopf mit Auswahlliste — dieselbe Mechanik wie die Währungswahl
const FilterSelect = ({ icon: Icon, label, active, value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`inline-flex h-10 items-center gap-1.5 max-w-[190px] border rounded-lg px-3 text-xs font-medium transition
          ${active
            ? 'bg-ink text-surface border-ink'
            : 'bg-surface border-border text-ink-2 hover:bg-surface-3 hover:text-ink'}`}>
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <PopMenu open={open} className="top-9 left-0" width="w-[240px] max-w-[calc(100vw-2.5rem)]">
        {options.map(option => (
          <MenuItem key={option.value || '__none'}
            onClick={() => { onChange(option.value); setOpen(false); }}
            className={value === option.value ? 'text-ink' : ''}>
            <span className="flex-1 truncate">{option.label}</span>
            {value === option.value && <Check className="w-4 h-4 shrink-0" />}
          </MenuItem>
        ))}
      </PopMenu>
    </div>
  );
};

// ─── Liste der Einträge ───────────────────────────────────────────────────────
// Die Zeilen kaskadieren herein: 250ms, 50ms Versatz, 20px Aufstieg (§4.3)
const EntryList = ({ groups, count, docCounts, searchQuery, menuKey, fmt, fmtOriginal, monthly,
  grouped, filtered, hint, onOpen, onEdit, onDelete }) => {
  const t = useT();
  const listRef = useRef(null);

  useLayoutEffect(() => {
    if (listRef.current) staggerIn(listRef.current.querySelectorAll('[data-row]'));
  }, [searchQuery, grouped, menuKey]);

  return (
    <div ref={listRef} className={`${CARD} overflow-hidden`}>
      {hint && count > 0 && (
        <div className="px-4 py-2 text-[11px] text-ink-3 text-center border-b border-border lg:hidden">{hint}</div>
      )}
      {groups.map((group, i) => (
        <section key={group.id}>
          {grouped && (
            <header className={`flex items-center justify-between gap-3 px-4 py-2 bg-surface-3
              border-b border-border ${i > 0 ? 'border-t' : ''}`}>
              <span className="flex items-center gap-2 min-w-0">
                {group.icon && <group.icon className="w-3.5 h-3.5 text-ink-3 shrink-0" />}
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-2 truncate">
                  {group.label}
                </span>
              </span>
              <span className="text-[11px] text-ink-3 shrink-0">
                {t.entries_count(group.entries.length)} · {fmt(group.total)}
              </span>
            </header>
          )}
          <div className="divide-y divide-border">
            {group.entries.map(entry => (
              <EntryRow key={entry.id} entry={entry} fmt={fmt} fmtOriginal={fmtOriginal} monthly={monthly}
                docCount={docCounts[entry.id] || 0}
                onOpen={() => onOpen(entry)} onEdit={() => onEdit(entry)} onDelete={() => onDelete(entry)} />
            ))}
          </div>
        </section>
      ))}
      {count === 0 && (searchQuery || filtered) && (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
          <Search className="w-5 h-5 text-ink-3" />
          <p className="text-sm text-ink-3">
            {searchQuery ? t.nothing_found(searchQuery) : t.filter_empty}
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Sprache und Farbschema ───────────────────────────────────────────────────
// Beide Kürzel teilen sich die Spur zu gleichen Teilen — so bleibt die Pille
// auch dann bündig, wenn die Spur breiter als ihr Inhalt gezogen wird.
const LangToggle = ({ lang, toggleLang, className = '' }) => (
  <Segmented
    items={[{ id: 'de', label: 'DE' }, { id: 'en', label: 'EN' }]}
    value={lang}
    onChange={next => { if (next !== lang) toggleLang(); }}
    trackClass={`h-10 bg-surface border border-border rounded-lg ${className}`}
    itemClass="flex-1 basis-0 px-3 text-xs font-semibold tracking-wide"
    pillClass="shadow-sm"
  />
);

const ThemeToggle = ({ theme, onToggle, label }) => (
  <button type="button" onClick={onToggle} title={label} aria-label={label}
    className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg border border-border
      bg-surface-2 text-ink-2 hover:text-ink hover:bg-surface-3 transition">
    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
  </button>
);

// ═══════════════════════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════════════════════
const App = ({ toggleLang, lang, theme, toggleTheme }) => {
  const t = useT();
  const isDesktop = useIsDesktop();

  const [entries, setSubscriptions] = useState(() =>
    entryStore.list().map((entry) => ({
      ...entry,
      billingDay: extractBillingDay(entry.date),
    })));

  const [currency,     setCurrency]     = useState(() =>
    localStorage.getItem('currency') || DEFAULT_CURRENCY);
  const [rates,        setRates]        = useState(() => loadRates() || DEFAULT_RATES);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [activeTab,    setActiveTab]    = useState('home');
  const [isModalOpen,  setIsModalOpen]  = useState(false);
  const [editingEntry,   setEditingEntry]   = useState(null);
  // Die ID überlebt das Schließen — so bleibt der Eintrag während der
  // Ausblendung sichtbar. Sichtbar ist die Ansicht nur über detailOpen.
  const [detailId,     setDetailId]     = useState(null);
  const [detailOpen,   setDetailOpen]   = useState(false);
  const [docCounts,    setDocCounts]    = useState({});
  const vaultState = useVault();
  const [toast,        setToast]        = useState(null);
  const [confirmEntry,   setConfirmEntry]   = useState(null);
  const [sortBy,       setSortBy]       = useState('name');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [kindFilter,   setKindFilter]   = useState('all');   // all | abo | fixed
  const [placeFilter,  setPlaceFilter]  = useState('all');   // all | '' (ohne) | Adresse
  const [groupBy,      setGroupBy]      = useState('none');  // none | location | kind | category
  const [swipeHinted,  setSwipeHinted]  = useState(() => localStorage.getItem('swipeHinted') === '1');
  const [calMonth,     setCalMonth]     = useState(() => new Date().getMonth());
  const [calYear,      setCalYear]      = useState(() => new Date().getFullYear());
  const [trendRange,   setTrendRange]   = useState(6); // 3 | 6 | 12

  const rate = rates[currency] ?? DEFAULT_RATES[currency] ?? 1;
  const fmt  = (usd) => fmtMoney(usd * rate, currency, lang);

  // Bequeme Hülle mit den aktuellen Kursen
  const monthly = (entry) => monthlyUSD(entry, rates);

  // Tatsächliche Abbuchung: jährlich der volle Betrag, monatlich der Monatsbetrag
  const realUSD = (entry) =>
    toUSD(entry.price ?? 0, entry.currency_code || DEFAULT_CURRENCY, rates);
  const fmtReal = (entry) => fmt(entry.period === 'yearly' ? realUSD(entry) : monthly(entry));

  // Originalbetrag — immer in der Währung, in der er erfasst wurde
  const fmtOriginal = (entry) =>
    fmtMoney(Number(entry.price ?? 0), entry.currency_code || DEFAULT_CURRENCY, lang);

  const tabRefs = { home: useRef(null), calendar: useRef(null), analytics: useRef(null) };

  // Die abtretende Ansicht bleibt sichtbar, bis ihre Animation durch ist
  const [exitingTab, setExitingTab] = useState(null);

  const switchTab = useCallback((tab) => {
    if (tab === activeTab) return;
    setExitingTab(activeTab);
    setActiveTab(tab);
    setSearchQuery('');
    setSearchOpen(false);
  }, [activeTab]);

  // Ansichtswechsel: alte Ansicht zieht nach links ab, neue kommt von rechts —
  // mit Überlappung, der Eintritt startet 100ms vor Ende des Austritts.
  useLayoutEffect(() => {
    const pane = tabRefs[activeTab]?.current;
    if (!pane) return;
    pane.scrollTop = 0;
    if (exitingTab === null) return;
    if (reducedMotion()) { setExitingTab(null); return; }

    const leaving = tabRefs[exitingTab]?.current;
    if (leaving) restartAnimation(leaving, `view-out ${DURATION.viewOut}ms ${POWER1_IN} forwards`);
    restartAnimation(pane, `view-in ${DURATION.viewIn}ms ${POWER1_OUT} ${DURATION.viewOverlap}ms backwards`);
    staggerIn(pane.querySelectorAll('[data-group]'),
      { duration: 350, step: 80, rise: 16, base: DURATION.viewOverlap });

    const id = window.setTimeout(() => setExitingTab(null), DURATION.viewOut + 60);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, exitingTab]);

  // Erster Anstrich: die Gruppen der Startansicht kaskadieren herein
  useEffect(() => {
    const pane = tabRefs.home.current;
    if (pane) staggerIn(pane.querySelectorAll('[data-group]'), { duration: 350, step: 80, rise: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const swipeRef = useTabSwipe(activeTab, switchTab, !isModalOpen && !detailOpen && !isDesktop);

  // ── Anzahl hinterlegter Dokumente je Eintrag ───────────────────────────────
  const refreshDocCounts = useCallback(() => {
    if (!documentStore.isAvailable()) return;
    documentStore.countsByEntry().then(setDocCounts).catch(() => {});
  }, []);

  useEffect(() => { refreshDocCounts(); }, [refreshDocCounts]);

  // ── Клавиатура (десктоп) ───────────────────────────────────────────────────
  const searchRef = useRef(null);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const searchWrapRef = useDismiss(searchOpen, closeSearch);
  useEffect(() => {
    if (!isDesktop) return;
    const onKey = (e) => {
      const typing = ['INPUT', 'TEXTAREA'].includes(e.target?.tagName) || e.target?.isContentEditable;
      if (e.key === 'Escape') {
        if (isModalOpen) { setIsModalOpen(false); setEditingEntry(null); }
        else if (confirmEntry) setConfirmEntry(null);
        else if (detailOpen) setDetailOpen(false);
        else if (typing) e.target.blur();
        return;
      }
      if (isModalOpen || confirmEntry || detailOpen || typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'n' || e.key === 'т') { e.preventDefault(); setEditingEntry(null); setIsModalOpen(true); }
      if (e.key === '/') {
        e.preventDefault();
        switchTab('home');
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 0);
      }
      if (e.key === '1') switchTab('home');
      if (e.key === '2') switchTab('calendar');
      if (e.key === '3') switchTab('analytics');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDesktop, isModalOpen, confirmEntry, detailOpen, switchTab]);

  // ── Курсы валют ────────────────────────────────────────────────────────────
  useEffect(() => {
    const cached = loadRates();
    if (!cached) { setRatesLoading(true); fetchRates().then(r => { if (r) setRates(r); setRatesLoading(false); }); }
  }, []);

  useEffect(() => {
    if (localStorage.getItem('currencyManual')) {
      localStorage.setItem('currency', currency);
    }
  }, [currency]);

  useEffect(() => {
    if (!swipeHinted && entries.length > 0) {
      const t = setTimeout(() => { setSwipeHinted(true); localStorage.setItem('swipeHinted', '1'); }, 3000);
      return () => clearTimeout(t);
    }
  }, [entries.length, swipeHinted]);

  // Авто-активация пробных у которых trial_end прошёл
  const activatingRef = useRef(new Set());
  useEffect(() => {
    if (entries.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    const toActivate = entries.filter(s =>
      s.status === 'trial' && s.trial_end && s.trial_end <= today && !activatingRef.current.has(s.id)
    );
    if (toActivate.length === 0) return;
    toActivate.forEach((s) => {
      activatingRef.current.add(s.id);
      const endDate = new Date(s.trial_end);
      const newDate = `${endDate.getDate()} ${MONTHS_SHORT[endDate.getMonth()]}`;
      const updated = entryStore.update(s.id, {
        status: 'active',
        trial_end: null,
        date: newDate,
      });
      if (updated) {
        setSubscriptions(prev => prev.map(p =>
          p.id === s.id
            ? { ...updated, billingDay: endDate.getDate() }
            : p
        ));
      }
    });
  }, [entries]);

  // Только активные считаются в суммах (пробные и паузные = 0)
  const activeEntries  = entries.filter(isBilled);
  const totalMonthlyUSD = activeEntries.reduce((a, s) => a + monthly(s), 0);
  const totalYearlyUSD  = totalMonthlyUSD * 12;

  // Die Detailansicht hängt an der ID, nicht am Objekt — nach dem Speichern
  // zeigt sie damit sofort die neuen Werte.
  const detailEntry = detailId ? entries.find(s => s.id === detailId) || null : null;

  const openAdd     = () => { setEditingEntry(null); setIsModalOpen(true); };
  const openEdit    = (s) => { setEditingEntry(s);   setIsModalOpen(true); };
  const openDetail  = (s) => { setDetailId(s.id);    setDetailOpen(true); };
  const closeDetail = () => setDetailOpen(false);

  // Beim Bearbeiten tritt die Detailansicht zurück und kommt danach wieder
  const closeModal = () => { setIsModalOpen(false); setEditingEntry(null); };

  // ── Lokale Ablage ──────────────────────────────────────────────────────────
  const handleSave = (payload) => {
    const { id, ...row } = payload;

    if (editingEntry) {
      const updated = entryStore.update(editingEntry.id, row);
      if (updated) {
        setSubscriptions(prev => prev.map(s =>
          s.id === editingEntry.id
            ? { ...updated, billingDay: extractBillingDay(updated.date) }
            : s
        ));
      }
    } else {
      const created = entryStore.create({ ...row, id });
      setSubscriptions(prev => [
        ...prev,
        { ...created, billingDay: extractBillingDay(created.date) },
      ]);
    }
    refreshDocCounts();
    setIsModalOpen(false); setEditingEntry(null);
  };

  const triggerDelete = (entry) => {
    // Hing noch ein Toast — den einfach schließen
    if (toast?.timeoutId) {
      clearTimeout(toast.timeoutId);
      setToast(null);
    }

    if (detailId === entry.id) setDetailOpen(false);

    // Sofort aus der Liste nehmen
    setSubscriptions(prev => prev.filter(s => s.id !== entry.id));
    entryStore.remove(entry.id);

    // Dokumente erst löschen, wenn das Rückgängig-Fenster zu ist
    const timeoutId = window.setTimeout(() => {
      setToast(null);
      documentStore.removeAllFor(entry.id)
        .then(refreshDocCounts)
        .catch(() => {});
    }, 5000);

    setToast({ entry, timeoutId });
  };

  const undoDelete = () => {
    if (!toast) return;
  
    clearTimeout(toast.timeoutId);
    const entry = toast.entry;
    const restored = entryStore.restore(entry);
  
    setSubscriptions(prev => {
      const exists = prev.some(s => s.id === restored.id);
      if (exists) return prev;
      return [...prev, {
        ...restored,
        billingDay: extractBillingDay(restored.date),
      }];
    });
  
    setToast(null);
  };

  const soonEntries = activeEntries
    .filter(s => isDueWithinDays(s, 7))
    .sort((a, b) => (a.billingDay || 99) - (b.billingDay || 99));

  // Kündigungsfristen der nächsten 90 Tage — inklusive bereits verstrichener.
  // Was pausiert oder schon gekündigt ist, drängt zu keiner Frist mehr.
  const deadlineEntries = entries
    .filter(s => s.status !== 'paused' && s.status !== 'canceled')
    .map(s => ({ entry: s, date: cancelByDate(s) }))
    .filter(({ date }) => date !== null)
    .map(item => ({ ...item, days: daysUntil(item.date) }))
    .filter(({ days }) => days !== null && days <= 90)
    .sort((a, b) => a.days - b.days);

  const matchesSearch = (entry, query) => {
    if (!query) return true;
    const haystack = [
      entry.name, entry.provider, entry.notes, entry.location,
      ...Object.values(entry.fields || {}),
      ...(entry.custom || []).flatMap(field => [field.label, field.value]),
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(query);
  };

  // Alle erfassten Adressen — Grundlage für Filter und Vorschläge im Formular
  const locations = [...new Set(entries.map(locationOf).filter(Boolean))].sort(byLocation);
  const hasUnplaced = entries.some(s => !locationOf(s));

  // Eine Adresse, die es nicht mehr gibt, darf den Filter nicht blockieren
  const activePlace = placeFilter !== 'all' && placeFilter !== '' && !locations.includes(placeFilter)
    ? 'all' : placeFilter;

  const matchesFilters = (entry) =>
    (kindFilter  === 'all' || kindOf(entry) === kindFilter) &&
    (activePlace === 'all' || locationOf(entry) === activePlace);

  const filtersActive = kindFilter !== 'all' || activePlace !== 'all';

  const sortedEntries = [...entries]
    .filter(s => matchesSearch(s, searchQuery.trim().toLowerCase()))
    .filter(matchesFilters)
    .sort((a, b) => {
      if (sortBy === 'price') return monthly(b) - monthly(a);
      if (sortBy === 'date')  return (a.billingDay || 99) - (b.billingDay || 99);
      return a.name.localeCompare(b.name);
    });

  // Summe der gefilterten Auswahl — nur Aktive zählen, wie überall sonst
  const shownMonthlyUSD = sortedEntries
    .filter(isBilled)
    .reduce((a, s) => a + monthly(s), 0);

  // Gruppen für die Liste: Beschriftung, Symbol, Einträge, Monatssumme
  const groupedEntries = (() => {
    if (groupBy === 'none') return [{ id: 'all', entries: sortedEntries }];

    const keyOf = {
      location: (entry) => locationOf(entry),
      kind:     (entry) => kindOf(entry),
      category: (entry) => entry.category || 'other',
    }[groupBy];

    const buckets = new Map();
    for (const entry of sortedEntries) {
      const key = keyOf(entry);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(entry);
    }

    const meta = (key) => {
      if (groupBy === 'location') return { label: key || t.location_none, icon: MapPin };
      if (groupBy === 'kind')     return { label: t[getKind(key)?.labelKey] || key, icon: getKind(key)?.icon };
      const cat = getCat(key);
      return { label: cat ? t[cat.labelKey] : key, icon: cat?.icon };
    };

    const order = groupBy === 'location'
      ? [...buckets.keys()].sort(byLocation)
      : groupBy === 'kind'
        ? KINDS.map(k => k.id).filter(id => buckets.has(id))
        : CATEGORIES.map(c => c.id).filter(id => buckets.has(id));

    return order.map(key => ({
      id: key || '__none',
      ...meta(key),
      entries: buckets.get(key),
      total: buckets.get(key)
        .filter(isBilled)
        .reduce((a, s) => a + monthly(s), 0),
    }));
  })();

  const sortLabel   = sortBy === 'name' ? t.sort_az : sortBy === 'price' ? t.sort_price : t.sort_date;
  const cycleSortBy = () => setSortBy(p => p === 'name' ? 'price' : p === 'price' ? 'date' : 'name');

  const byCategory = CATEGORIES.map(cat => ({
    ...cat,
    entries:  activeEntries.filter(s => s.category === cat.id),
    total: activeEntries.filter(s => s.category === cat.id).reduce((a, s) => a + monthly(s), 0),
  })).filter(c => c.entries.length > 0);

  // Auswertung: Kosten je Adresse, größte zuerst — Unverortetes ans Ende
  const byLocationTotals = [...locations, ...(hasUnplaced ? [''] : [])]
    .map(place => {
      const rows = activeEntries.filter(s => locationOf(s) === place);
      return {
        id: place || '__none',
        label: place || t.location_none,
        entries: rows,
        total: rows.reduce((a, s) => a + monthly(s), 0),
      };
    })
    .filter(row => row.entries.length > 0)
    .sort((a, b) => b.total - a.total);

  const byKindTotals = KINDS
    .map(kind => {
      const rows = activeEntries.filter(s => kindOf(s) === kind.id);
      return { ...kind, entries: rows, total: rows.reduce((a, s) => a + monthly(s), 0) };
    })
    .filter(row => row.entries.length > 0)
    .sort((a, b) => b.total - a.total);

  const byEntryTotals = activeEntries.map(entry => ({
    id: entry.id,
    label: entry.name,
    entries: [entry],
    total: monthly(entry),
  }));

  const handleImport = (rows) => {
    const imported = entryStore.importRows(rows);
    if (!imported.length) return;
    setSubscriptions(prev => [
      ...prev,
      ...imported.map(entry => ({
        ...entry,
        billingDay: extractBillingDay(entry.date),
      })),
    ]);
  };

  return (
    <div className="min-h-screen bg-surface text-ink flex justify-center select-none lg:justify-start lg:select-text">
      {/* ── Боковая навигация (десктоп) ── */}
      <DesktopSidebar
        activeTab={activeTab} onSwitch={switchTab} onAdd={openAdd}
        lang={lang} toggleLang={toggleLang} theme={theme} toggleTheme={toggleTheme}
        count={activeEntries.length} total={fmt(totalMonthlyUSD)}
      />

      <div className="w-full max-w-[450px] min-h-screen border-x border-border bg-surface flex flex-col relative overflow-hidden
        lg:max-w-none lg:flex-1 lg:border-x-0 lg:h-screen">

        {/* Контент со свайпом между вкладками */}
        <div ref={el => { swipeRef.current = el; }} className="flex-1 relative overflow-hidden">

          {/* ════ HOME ════ */}
          <div ref={tabRefs.home} className={`absolute inset-0 overflow-y-auto desktop-scroll pb-32 lg:pb-12 safe-top ${activeTab === 'home' || exitingTab === 'home' ? 'block' : 'hidden'}`}>
            <div className="p-4 space-y-5 lg:p-8 lg:pt-7 lg:space-y-7 lg:max-w-[1180px]">
              {/* Заголовок — десктоп */}
              <PageHeader title={t.nav_home} subtitle={t.home_subtitle} />

              <header className="relative flex items-center justify-between gap-2 px-1 pt-2 lg:hidden">
                <SupportMenu />
                <h1 className="text-base font-semibold tracking-tight whitespace-nowrap">{APP_NAME}</h1>
                <div className="flex items-center gap-2">
                  <ThemeToggle theme={theme} onToggle={toggleTheme} label={t.theme_toggle} />
                  <LangToggle lang={lang} toggleLang={toggleLang} />
                </div>
              </header>

            {/* Сетка дашборда: на мобиле — колонка, на десктопе — 3 колонки */}
            <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">

              <section data-group className={`${CARD} p-6 lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:flex lg:items-center lg:gap-10 lg:p-8`}>
              <div className="lg:flex-1 lg:min-w-0">
                <p className="text-ink-3 uppercase text-[11px] tracking-[0.18em] font-medium mb-2">{t.per_month}</p>
                <h2 className="text-5xl font-semibold tracking-tight mb-4 lg:text-6xl">{fmt(totalMonthlyUSD)}</h2>
                <div className="flex items-center gap-2">
                  <CurrencySelector value={currency} onChange={(c) => { setCurrency(c); localStorage.setItem('currencyManual', '1'); }} />
                  <button onClick={() => { setRatesLoading(true); fetchRates().then(r => { if (r) setRates(r); setRatesLoading(false); }); }}
                    title={t.rates_refresh}
                    className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-ink-3 hover:text-ink hover:bg-surface-3 transition">
                    <RefreshCw className={`w-3.5 h-3.5 ${ratesLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="flex items-center flex-wrap gap-2 mt-4">
                  {(() => {
                    const active   = entries.filter(isBilled).length;
                    const paused   = entries.filter(s => s.status === 'paused').length;
                    const trial    = entries.filter(s => s.status === 'trial').length;
                    const canceled = entries.filter(s => s.status === 'canceled').length;
                    return <>
                      <StatusPill tone="success" label={t.active_count(active)} pulse />
                      {paused > 0 && <StatusPill tone="error"   label={t.paused_count(paused)} />}
                      {trial  > 0 && <StatusPill tone="warning" label={t.trial_count(trial)} pulse />}
                      {canceled > 0 && <StatusPill label={t.canceled_count(canceled)} />}
                    </>;
                  })()}
                </div>
              </div>
                <div className="grid grid-cols-2 mt-6 text-left border-t border-border pt-5
                  lg:grid-cols-1 lg:gap-6 lg:mt-0 lg:pt-0 lg:border-t-0 lg:border-l lg:pl-10 lg:w-[190px] lg:shrink-0">
                  <div>
                    <p className="text-xl font-semibold tracking-tight lg:text-2xl">{fmt(totalYearlyUSD)}</p>
                    <p className="text-ink-3 text-[11px] uppercase tracking-[0.12em] mt-1">{t.per_year}</p>
                  </div>
                  <div className="text-right lg:text-left">
                    <p className="text-xl font-semibold tracking-tight lg:text-2xl">{fmt(totalMonthlyUSD / 30)}</p>
                    <p className="text-ink-3 text-[11px] uppercase tracking-[0.12em] mt-1">{t.per_day}</p>
                  </div>
                </div>
              </section>

              {/* Кнопка добавить — на десктопе живёт в боковой навигации */}
              <div data-group className="lg:hidden">
                <button onClick={openAdd} className={btn('primary', 'md', 'w-full py-3')}>
                  <Plus className="w-4 h-4" />
                  {t.add_sub}
                </button>
              </div>

              <div data-group className="space-y-5 lg:col-start-3 lg:row-start-1 lg:row-span-2 lg:self-start lg:space-y-6">
                <SoonSection soonEntries={soonEntries} fmt={fmt} fmtOriginal={fmtOriginal} monthly={monthly} />
                {(deadlineEntries.length > 0 || entries.length > 0) && (
                  <DeadlinesSection deadlines={deadlineEntries} onOpen={openDetail} />
                )}
              </div>

              {entries.length === 0 ? (
                /* ── Leerer Zustand — bleibt leise: gedämpfte Schrift, keine Farbe ── */
                <div data-group
                  className={`flex flex-col items-center text-center px-6 py-12 space-y-5
                    lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:py-16 ${CARD}`}>
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-surface border border-border flex items-center justify-center">
                      <CreditCard className="w-8 h-8 text-ink-3" strokeWidth={1.5} />
                    </div>
                    <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center">
                      <Plus className="w-4 h-4 text-ink-3" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold tracking-tight">{t.empty_title}</p>
                    <p className="text-sm text-ink-3 leading-relaxed max-w-[280px]">
                      {t.empty_subtitle}
                    </p>
                  </div>
                  <button onClick={openAdd} className={btn('primary', 'lg')}>
                    <Plus className="w-4 h-4" />
                    {t.add_first_sub}
                  </button>
                </div>
              ) : (
                <section data-group className="space-y-3 lg:col-span-2 lg:col-start-1 lg:row-start-2">
                  <div className="flex items-center justify-between px-1 gap-3">
                    <SectionTitle icon={List} label={t.all_subs} />
                    <div ref={searchWrapRef} className="relative ml-auto">
                      <button type="button"
                        onClick={() => {
                          const nextOpen = !searchOpen;
                          setSearchOpen(nextOpen);
                          if (nextOpen) setTimeout(() => searchRef.current?.focus(), 0);
                        }}
                        aria-label={t.search_placeholder}
                        aria-expanded={searchOpen}
                        title={t.search_placeholder}
                        className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg border transition
                          ${searchOpen || searchQuery
                            ? 'bg-surface-sunken border-border-strong text-ink'
                            : 'bg-surface-2 border-border text-ink-2 hover:bg-surface-3 hover:text-ink'}`}>
                        <Search className="w-4 h-4" />
                      </button>
                      {searchOpen && (
                        <div className={`absolute z-30 top-11 right-0 w-[280px] max-w-[calc(100vw-2.5rem)] p-2 ${PANEL}`}>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
                            <input ref={searchRef} value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              placeholder={t.search_placeholder}
                              className={`${INPUT_CLASS} bg-surface-2 pl-9 pr-9 py-2`} />
                            {searchQuery && (
                              <button type="button" onClick={() => {
                                setSearchQuery('');
                                searchRef.current?.focus();
                              }}
                                aria-label={t.filter_reset}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <button onClick={cycleSortBy} className={btn('secondary', 'sm', 'shrink-0 lg:self-stretch text-xs')}>
                      <ArrowUpDown className="w-3.5 h-3.5" />{sortLabel}
                    </button>
                  </div>
                  <FilterBar
                    kind={kindFilter} onKind={setKindFilter}
                    place={activePlace} onPlace={setPlaceFilter}
                    group={groupBy} onGroup={setGroupBy}
                    locations={locations} hasUnplaced={hasUnplaced}
                    summary={filtersActive || groupBy !== 'none'
                      ? t.filter_summary(t.entries_count(sortedEntries.length), fmt(shownMonthlyUSD))
                      : null}
                    onReset={filtersActive ? () => { setKindFilter('all'); setPlaceFilter('all'); } : null} />
                  <EntryList
                    groups={groupedEntries} count={sortedEntries.length}
                    docCounts={docCounts} searchQuery={searchQuery} menuKey={kindFilter}
                    fmt={fmt} fmtOriginal={fmtOriginal} monthly={monthly}
                    grouped={groupBy !== 'none'} filtered={filtersActive}
                    hint={!swipeHinted ? t.swipe_hint : null}
                    onOpen={openDetail} onEdit={openEdit} onDelete={setConfirmEntry} />
                </section>
              )}
            </div>
            </div>
          </div>

          {/* ════ CALENDAR ════ */}
          <div ref={tabRefs.calendar} className={`absolute inset-0 overflow-y-auto desktop-scroll pb-32 lg:pb-12 safe-top ${activeTab === 'calendar' || exitingTab === 'calendar' ? 'block' : 'hidden'}`}>
            <div className="p-4 pt-6 space-y-5 lg:p-8 lg:pt-7 lg:space-y-7 lg:max-w-[1180px]">
              <PageHeader title={t.calendar_title} subtitle={t.calendar_subtitle} />
              <MobilePageHeader icon={CalendarDays} title={t.calendar_title} />
              {(() => {
                const now    = new Date();
                const isPast = calYear < now.getFullYear() || (calYear === now.getFullYear() && calMonth < now.getMonth());
                const calEntries = entries.filter(entry => entry.status !== 'paused' && entry.status !== 'canceled');
                const activeCalEntries = calEntries.filter(isBilled);
                const calTotal = activeCalEntries.reduce((a, s) => {
                  if (s.period === 'yearly') {
                    const billingMonth = extractBillingMonth(s.date);
                    return billingMonth === calMonth ? a + monthly(s) * 12 : a;
                  }
                  return a + monthly(s);
                }, 0);
                const calYearly = activeCalEntries.reduce((a, s) => a + monthly(s) * 12, 0);
                return (
                  <CalendarSection entries={entries} fmt={fmt} fmtReal={fmtReal} monthly={monthly} month={calMonth} year={calYear}
                    onPrev={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); }}
                    onNext={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); }}
                    onToday={() => { setCalMonth(now.getMonth()); setCalYear(now.getFullYear()); }}
                    calTotal={calTotal} calYearly={calYearly} isPast={isPast} calMonth={calMonth}
                  />
                );
              })()}
            </div>
          </div>

          {/* ════ ANALYTICS ════ */}
          <div ref={tabRefs.analytics} className={`absolute inset-0 overflow-y-auto desktop-scroll pb-32 lg:pb-12 safe-top ${activeTab === 'analytics' || exitingTab === 'analytics' ? 'block' : 'hidden'}`}>
            <div className="p-4 pt-6 space-y-4 lg:p-8 lg:pt-7 lg:space-y-0 lg:max-w-[1180px]">
              <PageHeader title={t.analytics_title} subtitle={t.analytics_subtitle} className="lg:mb-7">
                <ImportExportMenu entries={entries} onImport={handleImport} vaultState={vaultState} />
              </PageHeader>
              <MobilePageHeader icon={BarChart2} title={t.analytics_title}>
                <ImportExportMenu entries={entries} onImport={handleImport} vaultState={vaultState} />
              </MobilePageHeader>

              {/* Сетка карточек: колонка на мобиле, 2 колонки на десктопе */}
              <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
              <div data-group className={`${CARD} p-5 lg:col-span-2 flex items-baseline justify-between gap-4`}>
                <span className="text-[11px] text-ink-3 uppercase tracking-[0.16em]">{t.per_month}</span>
                <span className="text-2xl font-semibold tracking-tight">{fmt(totalMonthlyUSD)}</span>
              </div>

              {/* ── Тренд расходов по месяцам ── */}
              {(() => {
                const now = new Date();
                const monthLabels = t.months_short;

                // Строим диапазон месяцев (trendRange штук, включая текущий)
                const months = Array.from({ length: trendRange }, (_, i) => {
                  const d = new Date(now.getFullYear(), now.getMonth() - (trendRange - 1 - i), 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                });

                // Für jeden Monat die tatsächlichen Abbuchungen — nur von Verträgen,
                // die in diesem Monat schon (und noch) liefen.
                const monthlyTotals = months.map(({ year, month }) => {
                  return entries.reduce((sum, s) => {
                    if (!isBilled(s)) return sum;
                    if (!wasActiveIn(s, year, month)) return sum;

                    const billingDay   = extractBillingDay(s.date);
                    const billingMonth = extractBillingMonth(s.date); // null для месячных

                    if (!billingDay) return sum;

                    if (s.period === 'monthly') {
                      // Месячная — списывается каждый месяц
                      return sum + toUSD(s.price ?? 0, s.currency_code || 'USD', rates);
                    }

                    if (s.period === 'yearly') {
                      // Годовая — только в тот месяц когда реально списывается
                      if (billingMonth !== null && billingMonth === month) {
                        return sum + toUSD(s.price ?? 0, s.currency_code || 'USD', rates);
                      }
                      return sum;
                    }

                    return sum;
                  }, 0);
                });

                const maxVal     = Math.max(...monthlyTotals, 0.01);
                const totalRange = monthlyTotals.reduce((a, v) => a + v, 0);

                return (
                  <div data-group className={`${CARD} p-5 lg:col-span-2 lg:p-6`}>
                    {/* Заголовок + переключатель */}
                    <div className="flex items-center justify-between mb-5 gap-3">
                      <p className="text-[11px] text-ink-3 uppercase tracking-[0.16em]">{t.trend_title}</p>
                      <Segmented
                        items={[3, 6, 12].map(r => ({ id: r, label: `${r}${t.trend_unit}` }))}
                        value={trendRange} onChange={setTrendRange}
                        trackClass="bg-surface border border-border rounded-lg"
                        itemClass="px-2.5 py-1 text-xs" />
                    </div>

                    {/* Бары */}
                    <TrendBars
                      totals={monthlyTotals} maxVal={maxVal} months={months} labels={monthLabels}
                      fmt={fmt} isDesktop={isDesktop} range={trendRange} />

                    {/* Итог за период */}
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
                      <span className="text-xs text-ink-3">{t.trend_last(trendRange)}</span>
                      <span className="text-sm font-semibold">{fmt(totalRange)}</span>
                    </div>
                  </div>
                );
              })()}
              <AnalyticsPieChart
                datasets={{
                  category: byCategory,
                  kind: byKindTotals,
                  location: byLocationTotals,
                  entry: byEntryTotals,
                }}
                fmt={fmt}
                active={activeTab === 'analytics'} />
              {byCategory.length > 0 && (
                <div data-group className={`${CARD} p-5 space-y-4`}>
                  <p className="text-[11px] text-ink-3 uppercase tracking-[0.16em]">{t.by_categories}</p>
                  {byCategory.map((cat, i) => {
                    const share = totalMonthlyUSD ? (cat.total / totalMonthlyUSD) * 100 : 0;
                    const Icon  = cat.icon;
                    return (
                      <MeterRow key={cat.id} share={share} rank={i} index={i}
                        leading={
                          <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-ink-2" />
                          </div>
                        }
                        title={t[cat.labelKey]} subtitle={t.entries_count(cat.entries.length)}
                        value={fmt(cat.total)} meta={`${share.toFixed(0)}%`} />
                    );
                  })}
                </div>
              )}
              {/* Abos gegen Fixkosten */}
              {byKindTotals.length > 0 && (
                <div data-group className={`${CARD} p-5 space-y-4`}>
                  <p className="text-[11px] text-ink-3 uppercase tracking-[0.16em]">{t.by_kind}</p>
                  {byKindTotals.map((row, i) => {
                    const share = totalMonthlyUSD ? (row.total / totalMonthlyUSD) * 100 : 0;
                    const Icon  = row.icon;
                    return (
                      <MeterRow key={row.id} share={share} rank={i} index={i}
                        leading={
                          <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-ink-2" />
                          </div>
                        }
                        title={t[row.labelKey]} subtitle={t.entries_count(row.entries.length)}
                        value={fmt(row.total)} meta={`${share.toFixed(0)}%`} />
                    );
                  })}
                </div>
              )}

              {/* Nach Adresse */}
              {byLocationTotals.length > 1 && (
                <div data-group className={`${CARD} p-5 space-y-4`}>
                  <p className="text-[11px] text-ink-3 uppercase tracking-[0.16em]">{t.by_locations}</p>
                  {byLocationTotals.map((row, i) => {
                    const share = totalMonthlyUSD ? (row.total / totalMonthlyUSD) * 100 : 0;
                    return (
                      <MeterRow key={row.id} share={share} rank={i} index={i}
                        leading={
                          <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
                            <MapPin className="w-4 h-4 text-ink-2" />
                          </div>
                        }
                        title={row.label} subtitle={t.entries_count(row.entries.length)}
                        value={fmt(row.total)} meta={`${share.toFixed(0)}%`} />
                    );
                  })}
                </div>
              )}

              {/* По подпискам */}
              <div data-group className={`${CARD} p-5 space-y-4`}>
                <p className="text-[11px] text-ink-3 uppercase tracking-[0.16em]">{t.by_subscriptions}</p>
                {activeEntries.length === 0 && <p className="text-sm text-ink-3">{t.add_first_sub}</p>}
                {[...activeEntries].sort((a, b) => monthly(b) - monthly(a)).map((entry, i) => {
                  const share = totalMonthlyUSD ? (monthly(entry) / totalMonthlyUSD) * 100 : 0;
                  return (
                    <MeterRow key={entry.id} share={share} rank={i} index={i}
                      leading={<LogoIcon entry={entry} size="sm" />}
                      title={entry.name} subtitle={`${fmt(monthly(entry))} / ${t.sub_per_month}`}
                      value={`${share.toFixed(0)} %`} />
                  );
                })}
              </div>
              {/* Пробный период — внизу */}
              {(() => {
                const trialEntries = entries.filter(s => s.status === 'trial');
                if (trialEntries.length === 0) return null;
                return (
                  <div data-group className={`${CARD} p-5 space-y-3`}>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                      <p className="text-[11px] text-ink-3 uppercase tracking-[0.16em]">{t.trial_period}</p>
                    </div>
                    {trialEntries.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <LogoIcon entry={entry} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{entry.name}</p>
                            {entry.trial_end && <p className="text-xs text-ink-3">{fmtDateFromISO(entry.trial_end, lang, t.months_short)}</p>}
                          </div>
                        </div>
                        <p className="text-sm text-ink-3 shrink-0">—</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {/* На паузе — внизу */}
              {(() => {
                const pausedEntries = entries.filter(s => s.status === 'paused');
                if (pausedEntries.length === 0) return null;
                return (
                  <div data-group className={`${CARD} p-5 space-y-3`}>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-error" />
                      <p className="text-[11px] text-ink-3 uppercase tracking-[0.16em]">{t.on_pause}</p>
                    </div>
                    {pausedEntries.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <LogoIcon entry={entry} size="sm" />
                          <p className="text-sm font-medium truncate">{entry.name}</p>
                        </div>
                        <p className="text-sm text-ink-3 shrink-0">—</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {/* Gekündigt — ganz unten, kostet nichts mehr */}
              {(() => {
                const canceledEntries = entries.filter(s => s.status === 'canceled');
                if (canceledEntries.length === 0) return null;
                return (
                  <div data-group className={`${CARD} p-5 space-y-3`}>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-ink-3" />
                      <p className="text-[11px] text-ink-3 uppercase tracking-[0.16em]">{t.canceled_section}</p>
                    </div>
                    {canceledEntries.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <LogoIcon entry={entry} size="sm" />
                          <p className="text-sm font-medium truncate">{entry.name}</p>
                        </div>
                        <p className="text-sm text-ink-3 shrink-0">—</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
              </div>
            </div>
          </div>
        </div>

        {/* ── Навбар (мобильный; на десктопе — боковая панель) ── */}
        {/* Eine gleitende Pille wandert zwischen den Reitern — §4.4 */}
        <div className="fixed bottom-5 left-0 right-0 flex justify-center px-4 pointer-events-none safe-bottom z-30 lg:hidden">
          <Segmented
            value={activeTab} onChange={switchTab}
            items={[
              { id: 'home',      label: t.nav_home,      icon: Home },
              { id: 'calendar',  label: t.nav_calendar,  icon: CalendarDays },
              { id: 'analytics', label: t.nav_analytics, icon: BarChart2 },
            ]}
            className="max-w-[360px] w-full pointer-events-auto"
            layout="grid grid-cols-3"
            trackClass="glass border border-border rounded-full shadow-xl"
            itemClass="flex flex-col items-center justify-center gap-1 py-2 min-h-[52px]"
            pillClass="rounded-full"
            renderItem={(item) => (
              <>
                <item.icon className="w-5 h-5" strokeWidth={2} />
                <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
              </>
            )}
          />
        </div>

        {/* ── Eintrag ansehen ── */}
        <EntryDetail
          open={detailOpen && Boolean(detailEntry) && !isModalOpen && !confirmEntry}
          entry={detailEntry} currency={currency}
          fmt={fmt} fmtOriginal={fmtOriginal} monthly={monthly}
          vaultState={vaultState}
          onEdit={() => detailEntry && openEdit(detailEntry)}
          onDelete={() => detailEntry && setConfirmEntry(detailEntry)}
          onClose={closeDetail} />

        {/* ── Eintrag anlegen / bearbeiten ── */}
        <EntryModal key={editingEntry?.id || 'new'} open={isModalOpen} initial={editingEntry} currency={currency}
          locations={locations}
          vaultState={vaultState} onDocsChange={refreshDocCounts}
          onSave={handleSave} onClose={closeModal} />

        {/* ── Toast mit Rückgängig ── */}
        <Toast open={Boolean(toast)} entry={toast?.entry} onUndo={undoDelete} />

        {/* ── Löschen bestätigen ── */}
        <ConfirmDelete
          entry={confirmEntry}
          onCancel={() => setConfirmEntry(null)}
          onConfirm={() => { triggerDelete(confirmEntry); setConfirmEntry(null); }} />
      </div>
    </div>
  );
};

// ─── Toast (§4.3) ─────────────────────────────────────────────────────────────
// Unten rechts, Fläche 2 mit kräftigem Rand, dünner Laufbalken.
const Toast = ({ open, entry, onUndo }) => {
  const t = useT();
  const rendered = usePresence(open, DURATION.toastOut);
  const ref = useRef(null);
  // Während der Ausblendung ist `entry` schon weg — den letzten Namen behalten
  const [shown, setShown] = useState(entry);
  if (entry && entry !== shown) setShown(entry);

  useLayoutEffect(() => {
    if (!rendered || reducedMotion()) return;
    restartAnimation(ref.current, open
      ? `toast-in ${DURATION.toastIn}ms ${STANDARD_EASE}`
      : `toast-out ${DURATION.toastOut}ms ${STANDARD_EASE} forwards`);
  }, [open, rendered]);

  if (!rendered) return null;
  return (
    <div className="fixed bottom-28 left-0 right-0 flex justify-center px-4 pointer-events-none z-40
      lg:bottom-6 lg:left-auto lg:right-6 lg:justify-end lg:px-0">
      <div ref={ref} role="status"
        className="pointer-events-auto max-w-[420px] w-full lg:w-[340px] bg-surface-2 border border-border-strong
          rounded-lg px-4 py-3 flex flex-col gap-2.5 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">{t.sub_deleted}</p>
            <p className="text-xs text-ink-3 truncate">{shown?.name}</p>
          </div>
          <button onClick={onUndo} className={btn('secondary', 'sm', 'shrink-0')}>{t.undo}</button>
        </div>
        {open && (
          <div className="w-full h-0.5 rounded-full bg-surface-3 overflow-hidden">
            <div className="h-full bg-border-strong animate-toast-progress" />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Löschen bestätigen ───────────────────────────────────────────────────────
const ConfirmDelete = ({ entry, onCancel, onConfirm }) => {
  const t = useT();
  const isDesktop = useIsDesktop();
  const [shown, setShown] = useState(entry);
  if (entry && entry !== shown) setShown(entry);

  return (
    <Overlay open={Boolean(entry)} onClose={onCancel} sheet={!isDesktop}
      panelClass="inset-x-0 bottom-0 mx-auto w-full max-w-[420px] bg-surface-2 border border-border-strong
        rounded-t-2xl px-5 pt-5 pb-8 shadow-2xl
        lg:inset-0 lg:m-auto lg:h-fit lg:rounded-2xl lg:p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-error/10 border border-error/30 flex items-center justify-center shrink-0">
          <Trash2 className="w-4 h-4 text-error" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{t.sub_delete} «{shown?.name}»?</p>
          <p className="text-xs text-ink-3 mt-1 leading-relaxed">{t.delete_confirm_hint}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 lg:flex-row-reverse lg:gap-3">
        <button onClick={onConfirm} className={btn('danger', 'md', 'w-full py-3 lg:flex-1')}>
          {t.sub_delete}
        </button>
        <button onClick={onCancel} className={btn('ghost', 'md', 'w-full py-3 lg:flex-1')}>
          {t.modal_cancel}
        </button>
      </div>
    </Overlay>
  );
};

// ─── Анимация строки для онбординга ───────────────────────────────────────────
const SwipeDemo = () => {
  const t = useT();
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const delays = [1200, 900, 1200, 900];
    const timer = setTimeout(() => setPhase(p => (p + 1) % 4), delays[phase]);
    return () => clearTimeout(timer);
  }, [phase]);

  const x          = phase === 1 ? -72 : phase === 3 ? 72 : 0;
  const showDelete = phase === 1;
  const showEdit   = phase === 3;

  return (
    <div className="w-full rounded-lg overflow-hidden border border-border relative">
      <div className="absolute inset-0 flex">
        <div className={`flex-1 flex items-center pl-5 gap-2 text-xs font-medium text-white transition-opacity duration-200 ${showEdit ? 'opacity-100 bg-success' : 'opacity-0'}`}>
          <Pencil className="w-4 h-4" /> {t.modal_edit}
        </div>
        <div className={`flex-1 flex items-center justify-end pr-5 gap-2 text-xs font-medium text-white transition-opacity duration-200 ${showDelete ? 'opacity-100 bg-error' : 'opacity-0'}`}>
          {t.sub_delete} <Trash2 className="w-4 h-4" />
        </div>
      </div>
      <div
        className="relative flex items-center px-4 py-3.5 gap-3 bg-surface-2 text-left"
        style={{ transform: `translateX(${x}px)`, transition: `transform 550ms ${STANDARD_EASE}` }}
      >
        <div className="w-8 h-8 bg-surface-3 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
          <img src="https://www.google.com/s2/favicons?sz=32&domain=spotify.com" className="w-5 h-5 object-contain" alt="" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Spotify</p>
          <p className="text-xs text-ink-3">$12 · 5 Mar</p>
        </div>
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-surface-3">
          <Music className="w-3 h-3 text-ink-2" />
        </div>
      </div>
    </div>
  );
};

// ─── Строка подписки для онбординга на десктопе ───────────────────────────────
const DesktopRowDemo = () => {
  const t = useT();
  return (
    <div className={`w-full ${CARD} overflow-hidden`}>
      <div className="flex items-center gap-3 px-4 py-3.5 bg-surface-3">
        <div className="w-10 h-10 bg-surface-2 rounded-lg border border-border flex items-center justify-center shrink-0 overflow-hidden">
          <img src="https://www.google.com/s2/favicons?sz=32&domain=spotify.com" className="w-5 h-5 object-contain" alt="" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-medium">Spotify</p>
          <p className="text-xs text-ink-3">5 Mar</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold">$12</p>
          <p className="text-[11px] text-ink-3 uppercase">/ {t.sub_per_month}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="w-8 h-8 rounded-lg border border-border bg-surface-2 flex items-center justify-center text-ink-2">
            <Pencil className="w-4 h-4" />
          </div>
          <div className="w-8 h-8 rounded-lg border border-border bg-surface-2 flex items-center justify-center text-ink-2">
            <Trash2 className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Онбординг ─────────────────────────────────────────────────────────────────
const getOnboardingSteps = (t) => [
  { icon: Sparkles,     ...t.onb_slides[0] },
  { icon: Plus,         ...t.onb_slides[1] },
  { type: 'swipe',
    icon: List,         ...t.onb_slides[2] },
  { icon: CalendarDays, ...t.onb_slides[3] },
  { icon: BarChart2,    ...t.onb_slides[4] },
  { type: 'pwa',
    icon: Download,     ...t.onb_slides[5] },
];

const Onboarding = ({ onDone, toggleLang, lang, theme, toggleTheme }) => {
  const t = useT();
  const isDesktop = useIsDesktop();
  const [step,  setStep]  = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);

  const ONBOARDING_STEPS = getOnboardingSteps(t);
  const total  = ONBOARDING_STEPS.length;
  const isLast = step === total - 1;
  const s      = ONBOARDING_STEPS[step];

  const goNext = () => isLast ? onDone() : setStep(p => p + 1);
  const goPrev = () => step > 0 && setStep(p => p - 1);

  const onTouchStart = (e) => { startX.current = e.touches[0].clientX; startY.current = e.touches[0].clientY; };
  const onTouchEnd   = (e) => {
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goNext(); else goPrev();
  };

  // Стрелки и Enter — навигация с клавиатуры
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') isLast ? onDone() : setStep(p => p + 1);
      if (e.key === 'ArrowLeft') setStep(p => (p > 0 ? p - 1 : p));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isLast, onDone]);

  // Jeder Schritt kommt von rechts herein — dieselbe Kurve wie der Ansichtswechsel
  const slideRef = useRef(null);
  useLayoutEffect(() => {
    if (!reducedMotion()) {
      restartAnimation(slideRef.current, `view-in ${DURATION.viewIn}ms ${POWER1_OUT}`);
    }
  }, [step]);

  return (
    <div className="min-h-screen bg-surface text-ink flex justify-center select-none lg:items-center lg:p-8"
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="w-full max-w-[450px] min-h-screen border-x border-border bg-surface flex flex-col overflow-hidden
        lg:max-w-[560px] lg:min-h-0 lg:h-auto lg:border lg:border-border lg:rounded-2xl lg:shadow-2xl lg:bg-surface-2">

        {/* Sprache und Farbschema — nur auf dem ersten Bild */}
        {step === 0 && (
          <div className="flex justify-end items-center gap-2 px-6 pt-6">
            <ThemeToggle theme={theme} onToggle={toggleTheme} label={t.theme_toggle} />
            {toggleLang && <LangToggle lang={lang} toggleLang={toggleLang} />}
          </div>
        )}

        {/* Контент — растягивается, но контролирует выравнивание */}
        <div className="flex-1 flex flex-col px-8 pt-8">

          {/* Слайд — фиксированная зона контента */}
          <div className="flex-1 flex flex-col items-center justify-center">
              <div ref={slideRef} key={step} className="w-full flex flex-col items-center text-center">
                {/* Symbol — auf allen Bildern gleich gebaut */}
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-surface-3 mb-7">
                  <s.icon className="w-7 h-7 text-ink" strokeWidth={1.75} />
                </div>

                {/* Заголовок */}
                <h2 className="text-2xl font-semibold tracking-tight mb-4">{s.title}</h2>

                {/* Управление строкой: свайп на тач-устройствах, кнопки на десктопе */}
                {s.type === 'swipe' && (
                  <div className="w-full mb-4">
                    {isDesktop ? <DesktopRowDemo /> : <SwipeDemo />}
                  </div>
                )}

                {/* PWA-инструкция */}
                {s.type === 'pwa' && (() => {
                  const ua = navigator.userAgent;
                  const isIOS = /iPad|iPhone|iPod/.test(ua);
                  const isAndroid = /Android/.test(ua);
                  // На десктопе — только инструкция для Chrome/Edge
                  if (isDesktop && !isIOS && !isAndroid) return (
                    <div className="w-full mb-4">
                      <div className={`${CARD} p-4 text-left space-y-3`}>
                        <p className="text-[11px] text-ink-3 uppercase tracking-[0.16em]">Desktop · Chrome/Edge</p>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
                            <Download className="w-4 h-4 text-ink-2" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-ink">{t.pwa_desktop_install}</p>
                            <p className="text-xs text-ink-3">{t.pwa_desktop_install_hint}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  return (
                    <div className="w-full space-y-3 mb-4">
                      {(isIOS || (!isIOS && !isAndroid)) && (
                        <div className={`${CARD} p-4 text-left space-y-3`}>
                          <p className="text-[11px] text-ink-3 uppercase tracking-[0.16em]">iOS · Safari</p>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
                              {/* Share icon iOS */}
                              <svg viewBox="0 0 24 24" className="w-4 h-4 text-ink-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                                <polyline points="16 6 12 2 8 6"/>
                                <line x1="12" y1="2" x2="12" y2="15"/>
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-ink">{t.pwa_ios_share}</p>
                              <p className="text-xs text-ink-3">{t.pwa_ios_share_hint}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
                              <svg viewBox="0 0 24 24" className="w-4 h-4 text-ink-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="5" y="2" width="14" height="20" rx="2"/>
                                <line x1="12" y1="6" x2="12" y2="6"/>
                                <line x1="9" y1="18" x2="15" y2="18"/>
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-ink">{t.pwa_ios_add}</p>
                              <p className="text-xs text-ink-3">{t.pwa_ios_add_hint}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      {(isAndroid || (!isIOS && !isAndroid)) && (
                        <div className={`${CARD} p-4 text-left space-y-3`}>
                          <p className="text-[11px] text-ink-3 uppercase tracking-[0.16em]">Android · Chrome</p>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
                              {/* Three dots menu */}
                              <svg viewBox="0 0 24 24" className="w-4 h-4 text-ink-2" fill="currentColor">
                                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-ink">{t.pwa_android_menu}</p>
                              <p className="text-xs text-ink-3">{t.pwa_android_menu_hint}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
                              <svg viewBox="0 0 24 24" className="w-4 h-4 text-ink-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L12 16M12 16L8 12M12 16L16 12"/>
                                <path d="M3 20h18"/>
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-ink">{t.pwa_android_install}</p>
                              <p className="text-xs text-ink-3">{t.pwa_android_install_hint}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Описание */}
                <p className="text-ink-2 text-sm leading-relaxed max-w-[46ch]">
                  {s.type === 'swipe' && isDesktop ? t.onb_manage_desktop : s.subtitle}
                </p>
              </div>
          </div>

          {/* Точки — всегда на одном месте, прибиты к низу контентной зоны */}
          <div className="flex justify-center gap-2 py-8">
            {ONBOARDING_STEPS.map((_, i) => (
              <button key={i} type="button" onClick={() => setStep(i)} data-no-press
                aria-label={`${i + 1}`}
                className={`rounded-full transition-all duration-300 ${i === step ? 'w-6 h-1.5 bg-ink' : 'w-1.5 h-1.5 bg-border-strong hover:bg-ink-3'}`} />
            ))}
          </div>
        </div>

        {/* Кнопки — всегда внизу */}
        <div className="px-8 pb-12 space-y-2 lg:pb-10">
          <button onClick={goNext} className={btn('primary', 'md', 'w-full py-3')}>
            {isLast ? `${APP_NAME} →` : t.onb_next}
          </button>
          {!isLast && (
            <button onClick={() => onDone(step)} className={btn('ghost', 'md', 'w-full py-2.5')}>{t.onb_skip}</button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Аватар с меню выхода ───────────────────────────────────────────────────────
// ─── Support Menu ──────────────────────────────────────────────────────────────
const SUPPORT_LINKS = [
  {
    id: 'boosty',
    label: 'Boosty',
    hint: 'Card',
    url: 'https://boosty.to/casablanque/donate',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
      </svg>
    ),
  },

  {
    id: 'CloudTips',
    label: 'CloudTips',
    hint: 'Card/SBP',
    url: 'https://pay.cloudtips.ru/p/18fa81b4',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
      </svg>
    ),
  },

  {
    id: 'usdt',
    label: 'USDT',
    hint: 'Avalanche C-Chain (AVAXC)',
    url: null,
    address: '0x3bE6114bc999482843bde238F4e17997B5355F76',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.75 13.5v1.5h-1.5v-1.5C9.5 15.83 8.5 14.92 8.5 13.75h1.5c0 .55.67 1 1.5 1s1.5-.45 1.5-1c0-.59-.54-.88-1.76-1.22C9.87 12.1 8.5 11.5 8.5 10.25 8.5 9.08 9.5 8.17 11.25 8V6.5h1.5V8c1.75.17 2.75 1.08 2.75 2.25h-1.5c0-.55-.67-1-1.5-1s-1.5.45-1.5 1c0 .55.49.84 1.74 1.18 1.38.38 2.76.96 2.76 2.32 0 1.17-1 2.08-2.75 2.25z"/>
      </svg>
    ),
  },
];

// align: 'left' — öffnet nach unten (Kopfzeile), 'top' — nach oben (Seitenleiste)
const SupportMenu = ({ align = 'left' }) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const menuPos = align === 'top' ? 'left-0 bottom-12' : 'left-0 top-12';

  const copyAddress = (address) => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)} title={t.support_title} aria-label={t.support_title}
        className="w-10 h-10 rounded-lg border border-border bg-surface-2 flex items-center justify-center
          text-ink-2 hover:text-ink hover:bg-surface-3 transition shrink-0">
        <Heart className="w-4 h-4" />
      </button>
      <PopMenu open={open} className={menuPos} origin={align === 'top' ? 'bottom left' : 'top left'}>
        <MenuHeader title={t.support_title} hint={t.support_subtitle} />
        {SUPPORT_LINKS.map(link => (
          <div key={link.id} data-menu-item className="px-3 py-2">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-ink-2"><link.icon /></span>
              <span className="text-sm font-medium text-ink">{link.label}</span>
              <span className="text-[11px] text-ink-3 ml-auto truncate">{link.hint}</span>
            </div>
            {link.url ? (
              <a href={link.url} target="_blank" rel="noopener noreferrer" onClick={close}
                className={btn('secondary', 'sm', 'w-full text-xs')}>
                {t.support_open}
              </a>
            ) : (
              <button onClick={() => copyAddress(link.address)} className={btn('secondary', 'sm', 'w-full text-xs')}>
                {copied ? <><Check className="w-3.5 h-3.5" />{t.support_copied}</> : <><Copy className="w-3.5 h-3.5" />{t.support_copy}</>}
              </button>
            )}
          </div>
        ))}
      </PopMenu>
    </div>
  );
};


// ─── Import / Export Menu ─────────────────────────────────────────────────────
const ImportExportMenu = ({ entries, onImport, vaultState }) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [importStatus, setImportStatus] = useState(null); // null | 'ok' | 'err'
  const [importMsg, setImportMsg]       = useState('');
  const [backupBusy, setBackupBusy]     = useState(false);
  const close    = useCallback(() => setOpen(false), []);
  const ref      = useDismiss(open, close);
  const fileRef  = useRef(null);

  // ── Export ─────────────────────────────────────────────────────────────────
  // CSV bleibt die flache Übersicht; alles Strukturierte steckt im JSON.
  const CSV_HEADERS = [
    'name', 'provider', 'price', 'currency_code', 'period', 'category', 'kind', 'location', 'status',
    'date', 'trial_end', 'contract_start', 'contract_end', 'notice_period_months', 'url',
  ];

  const exportCSV = () => {
    download('gold-und-geld-export.csv', 'text/csv', toCSV(CSV_HEADERS, entries));
  };

  // Verschlüsselte Passwörter kommen mit — zusammen mit den Tresor-Metadaten
  // lassen sie sich auf einem anderen Gerät mit demselben Master-Passwort öffnen.
  const exportJSON = () => {
    const payload = {
      app: APP_NAME,
      version: 3,
      exported_at: new Date().toISOString(),
      vault: vault.readMeta(),
      entries: entries.map(({ billingDay, ...rest }) => rest),
    };
    download('gold-und-geld-export.json', 'application/json', JSON.stringify(payload, null, 2));
  };

  const download = (filename, mime, content) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = filename;
    a.click();
    // Große Sicherungen brauchen einen Moment, bis der Browser sie geschrieben hat
    setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
  };

  // ── Sicherung ──────────────────────────────────────────────────────────────
  // Der Unterschied zum Export: hier kommen Dokumente, Einstellungen und die
  // Tresor-Metadaten mit. Das ist die Datei, aus der sich ein Gerät vollständig
  // wiederherstellen lässt — ohne Kompression, dafür ohne fremde Bibliothek.
  const exportBackup = async () => {
    setBackupBusy(true);

    try {
      const payload = await backup.createBackup({ entries });
      download(backup.backupFilename(), 'application/json', JSON.stringify(payload));
    } catch {
      setImportMsg(t.io_backup_err);
      setImportStatus('err');
      setTimeout(() => setImportStatus(null), 3500);
    }

    setBackupBusy(false);
  };

  // ── Import ─────────────────────────────────────────────────────────────────
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const text = await file.text();

    try {
      let rows = [];

      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);

        // Eine Sicherung wird nicht dazugemischt, sie tritt an die Stelle des
        // bisherigen Stands — deshalb erst fragen, dann alles ersetzen.
        if (backup.isBackup(parsed)) {
          if (!window.confirm(t.io_restore_confirm)) return;

          const result = await backup.restoreBackup(parsed, { entryStore });
          setImportMsg(t.io_restore_ok(result.entries));
          setImportStatus('ok');

          // Sprache, Farbschema und Währung stecken in den Einstellungen —
          // ein Neuladen ist der ehrlichste Weg, sie überall wirken zu lassen.
          setTimeout(() => window.location.reload(), 900);
          return;
        }

        rows = Array.isArray(parsed) ? parsed : parsed?.entries ?? [];

        // Tresor übernehmen, solange lokal keiner existiert — sonst sind die
        // mitgelieferten Passwörter mit dem hiesigen Schlüssel nicht lesbar.
        const importedVault = Array.isArray(parsed) ? null : parsed?.vault;
        if (importedVault && !vault.adoptMeta(importedVault) && !vault.sameVault(importedVault)) {
          rows = rows.map(({ login_secret, ...rest }) => rest);
        }
      } else {
        rows = parseCSV(text);
      }

      if (!rows.length || !rows[0].name) throw new Error('bad format');

      await onImport(rows);
      vaultState?.sync();
      setImportMsg(t.io_import_ok(rows.length));
      setImportStatus('ok');
    } catch {
      setImportMsg(t.io_import_err);
      setImportStatus('err');
    }

    setTimeout(() => setImportStatus(null), 3500);
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)} title={t.io_title} aria-label={t.io_title}
        className="w-10 h-10 rounded-lg border border-border bg-surface-2 flex items-center justify-center
          text-ink-2 hover:text-ink hover:bg-surface-3 transition shrink-0">
        <Download className="w-4 h-4" />
      </button>

      <PopMenu open={open} className="right-0 top-12" origin="top right" width="w-[248px]">
        <MenuHeader title={t.io_title} hint={t.io_subtitle} />

        {/* Экспорт */}
        <div data-menu-item className="px-3 py-2">
          <div className="flex items-center gap-2 mb-2 text-ink">
            <Download className="w-4 h-4 text-ink-2" />
            <span className="text-sm font-medium">{t.io_export}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV}  className={btn('secondary', 'sm', 'flex-1 text-xs')}>CSV</button>
            <button onClick={exportJSON} className={btn('secondary', 'sm', 'flex-1 text-xs')}>JSON</button>
          </div>
          <p className="text-[11px] text-ink-3 mt-2">{t.io_docs_note}</p>
        </div>

        {/* Полная резервная копия */}
        <div data-menu-item className="px-3 py-2 border-t border-border mt-1 pt-3">
          <div className="flex items-center gap-2 mb-2 text-ink">
            <Archive className="w-4 h-4 text-ink-2" />
            <span className="text-sm font-medium">{t.io_backup}</span>
          </div>
          <button onClick={exportBackup} disabled={backupBusy}
            className={btn('secondary', 'sm', 'w-full text-xs disabled:opacity-60')}>
            {backupBusy ? t.io_backup_busy : t.io_backup_btn}
          </button>
          <p className="text-[11px] text-ink-3 mt-2">{t.io_backup_note}</p>
        </div>

        {/* Импорт */}
        <div data-menu-item className="px-3 py-2 border-t border-border mt-1 pt-3">
          <div className="flex items-center gap-2 mb-2 text-ink">
            <Upload className="w-4 h-4 text-ink-2" />
            <span className="text-sm font-medium">{t.io_import}</span>
            <span className="text-[11px] text-ink-3 ml-auto">{t.io_import_hint}</span>
          </div>
          <button onClick={() => fileRef.current?.click()} className={btn('secondary', 'sm', 'w-full text-xs')}>
            {t.io_import_btn}
          </button>
          <input ref={fileRef} type="file" accept=".csv,.json" className="hidden" onChange={handleFile} />
          <p className="text-[11px] text-ink-3 mt-2">{t.io_restore_hint}</p>
          {importStatus && (
            <p className={`text-[11px] text-center mt-2 ${importStatus === 'ok' ? 'text-success' : 'text-error'}`}>
              {importMsg}
            </p>
          )}
        </div>
      </PopMenu>
    </div>
  );
};

// ─── Календарь ─────────────────────────────────────────────────────────────────
const CalendarSection = ({ entries, fmt, fmtReal, monthly, month, year, onPrev, onNext, onToday, calTotal, calYearly, isPast, calMonth }) => {
  const t = useT();
  const isDesktop   = useIsDesktop();
  const today       = new Date();
  const isToday     = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const monthLength = daysInMonth(year, month);
  const offset      = (new Date(year, month, 1).getDay() + 6) % 7;

  const visibleSubs = entries.filter(entry => {
    if (entry.status === 'paused' || entry.status === 'canceled') return false;
    return true;
  });

  const subsByDay = {};
  visibleSubs.forEach(entry => {
    // Пробные — отображаем на дату окончания пробного периода
    if (entry.status === 'trial') {
      if (!entry.trial_end) return;
      const end = new Date(entry.trial_end);
      if (end.getFullYear() !== year || end.getMonth() !== month) return;
      const d = end.getDate();
      if (!subsByDay[d]) subsByDay[d] = [];
      subsByDay[d].push(entry);
      return;
    }

    const raw = entry.billingDay ?? extractBillingDay(entry.date);
    if (!raw || raw < 1) return;

    // Годовые — только в тот месяц когда реально списывается
    if (entry.period === 'yearly') {
      const billingMonth = extractBillingMonth(entry.date);
      if (billingMonth === null || billingMonth !== month) return;
    }

    // Der 31. wird im Februar zum 28. — sonst fiele der Eintrag aus dem Raster,
    // obwohl die Monatssumme ihn weiter mitzählt.
    const d = clampDay(year, month, raw);

    if (!subsByDay[d]) subsByDay[d] = [];
    subsByDay[d].push(entry);
  });

  const cells = [...Array(offset).fill(null), ...Array.from({ length: monthLength }, (_, i) => i + 1)];

  // Punktfarben: Testphase warnt, Jahreszahlung ist kräftiger, sonst Tinte
  const dotClass = (entry, onInk) => {
    if (entry.status === 'trial') return 'bg-warning';
    if (onInk) return 'bg-surface/70';
    return entry.period === 'yearly' ? 'bg-ink' : 'bg-ink-3';
  };

  return (
    <div data-group className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">
      <div className="space-y-3 lg:col-span-2">
      <div className="flex items-center justify-between px-1">
        <button onClick={onPrev} aria-label="←"
          className="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center text-ink-2 hover:text-ink hover:bg-surface-3 transition">
          <ChevronDown className="w-4 h-4 rotate-90" />
        </button>
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold tracking-tight lg:text-lg">{t.months_full[month]} {year}</p>
          {onToday && (
            <button onClick={onToday} className={btn('ghost', 'sm', 'hidden lg:inline-flex text-xs')}>
              {t.today}
            </button>
          )}
        </div>
        <button onClick={onNext} aria-label="→"
          className="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center text-ink-2 hover:text-ink hover:bg-surface-3 transition">
          <ChevronDown className="w-4 h-4 -rotate-90" />
        </button>
      </div>
      <div className="grid grid-cols-7">
        {t.days_short.map(d => <div key={d} className="text-center text-[11px] text-ink-3 uppercase tracking-[0.12em] py-1 lg:text-left lg:pl-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 lg:gap-1.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const daySubs = subsByDay[day] || [];
          const hasAny  = daySubs.length > 0;
          const hasActive = daySubs.some(isBilled);
          const today_ = isToday(day);
          const total   = daySubs
            .filter(isBilled)
            .reduce((a, s) => a + (s.period === 'yearly' ? monthly(s) * 12 : monthly(s)), 0);

          // ── Десктоп: крупная ячейка со списком сервисов ──
          if (isDesktop) return (
            <div key={day} className={`min-h-[104px] rounded-lg p-2 flex flex-col border transition
              ${today_  ? 'bg-ink text-surface border-ink'
                : hasAny ? 'bg-surface-2 border-border hover:border-border-strong'
                         : 'bg-transparent border-transparent'}`}>
              <div className="flex items-baseline justify-between gap-1">
                <span className={`text-xs font-medium ${today_ ? 'text-surface' : hasAny ? 'text-ink' : 'text-ink-3'}`}>{day}</span>
                {hasAny && hasActive && (
                  <span className={`text-[11px] font-medium truncate ${today_ ? 'text-surface/70' : 'text-ink-2'}`}>{fmt(total)}</span>
                )}
              </div>
              <div className="mt-1.5 space-y-1 overflow-hidden">
                {daySubs.slice(0, 2).map(s => (
                  <div key={s.id} className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass(s, today_)}`} />
                    <span className={`text-[11px] leading-tight truncate ${today_ ? 'text-surface/70' : 'text-ink-2'}`}>{s.name}</span>
                  </div>
                ))}
                {daySubs.length > 2 && (
                  <p className={`text-[11px] pl-3 ${today_ ? 'text-surface/60' : 'text-ink-3'}`}>{t.more_count(daySubs.length - 2)}</p>
                )}
              </div>
            </div>
          );

          return (
            <div key={day} className={`relative aspect-square rounded-lg flex flex-col items-center justify-center border
              ${today_ ? 'bg-ink text-surface border-ink' : hasAny ? 'bg-surface-2 border-border' : 'border-transparent'}`}>
              <span className={`text-xs font-medium leading-none ${today_ ? 'text-surface' : hasAny ? 'text-ink' : 'text-ink-3'}`}>{day}</span>
              {hasAny && hasActive && <span className={`text-[9px] mt-1 leading-none ${today_ ? 'text-surface/70' : 'text-ink-2'}`}>{fmt(total)}</span>}
              {hasAny && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {daySubs.slice(0, 3).map(s => (
                    <div key={s.id} className={`w-1 h-1 rounded-full ${dotClass(s, today_)}`} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>

      {/* Суммы + список списаний. На десктопе — правая колонка */}
      <div className="space-y-3 lg:col-span-1 lg:space-y-4">
      <div className={`${CARD} p-4 space-y-2.5 lg:p-5`}>
        <div className="flex justify-between text-sm gap-3">
          <span className="text-ink-3">{isPast ? t.spent(t.months_genitive[calMonth ?? month]) : t.expected(t.months_genitive[calMonth ?? month])}</span>
          <span className="font-semibold shrink-0">{fmt(calTotal ?? 0)}</span>
        </div>
        <div className="flex justify-between text-sm gap-3">
          <span className="text-ink-3">{t.per_year}</span>
          <span className="font-semibold shrink-0">{fmt(calYearly ?? 0)}</span>
        </div>
      </div>
      {Object.keys(subsByDay).length > 0 && (
        <div className={`${CARD} divide-y divide-border overflow-hidden mt-2 lg:mt-0`}>
          {Object.entries(subsByDay).sort(([a],[b]) => Number(a)-Number(b)).flatMap(([day, entries]) =>
            entries.map(entry => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <LogoIcon entry={entry} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{entry.name}</p>
                      {entry.status === 'trial' && <Badge tone="warning">{t.badge_trial}</Badge>}
                    </div>
                    <p className="text-xs text-ink-3">{day}. {t.months_short[month]}</p>
                  </div>
                </div>
                {entry.status === 'trial'
                  ? <p className="text-xs text-ink-3 shrink-0">{t.not_billing}</p>
                  : <p className="text-sm font-semibold shrink-0">{fmtReal(entry)}</p>
                }
              </div>
            ))
          )}
        </div>
      )}
      </div>
    </div>
  );
};

// ─── Soon ──────────────────────────────────────────────────────────────────────
const SoonSection = ({ soonEntries, fmtOriginal, className = '' }) => {
  const t = useT();
  const ref = useDragScroll();
  return (
    <section className={`space-y-3 ${className}`}>
      <SectionTitle icon={CalendarDays} label={t.soon} />
      {soonEntries.length === 0
        ? <p className="text-sm text-ink-3 px-1 lg:px-5 lg:py-6 lg:bg-surface-2 lg:border lg:border-border lg:rounded-xl">{t.soon_empty}</p>
        : <div ref={ref} data-no-tab-swipe
            className="flex gap-3 overflow-x-auto px-1 pb-1 lg:flex-col lg:overflow-visible lg:px-0">
            {soonEntries.map(entry => <SoonCard key={entry.id} entry={entry} fmtOriginal={fmtOriginal} />)}
          </div>
      }
    </section>
  );
};

// ─── Kündigungsfristen ────────────────────────────────────────────────────────
// Farbe folgt der Dringlichkeit: verstrichen · unter 30 Tagen · darüber
const deadlineTone = (days) => (days < 0 ? 'error' : days <= 30 ? 'warning' : 'muted');

const deadlineText = (days, t) => {
  if (days < 0)  return t.deadline_passed;
  if (days === 0) return t.deadline_today;
  if (days === 1) return t.deadline_tomorrow;
  return t.deadline_days(days);
};

const DeadlineBadge = ({ days }) => {
  const t = useT();
  return (
    <Badge tone={deadlineTone(days)} icon={AlertTriangle}>{deadlineText(days, t)}</Badge>
  );
};

const DeadlinesSection = ({ deadlines, onOpen, className = '' }) => {
  const t    = useT();
  const lang = useLang();

  return (
    <section className={`space-y-3 ${className}`}>
      <SectionTitle icon={AlertTriangle} label={t.deadlines_title} />
      {deadlines.length === 0 ? (
        <p className="text-sm text-ink-3 px-1 lg:px-5 lg:py-6 lg:bg-surface-2 lg:border lg:border-border lg:rounded-xl">
          {t.deadlines_empty}
        </p>
      ) : (
        <div className={`${CARD} divide-y divide-border overflow-hidden`}>
          {deadlines.map(({ entry, date, days }) => (
            <button key={entry.id} type="button" onClick={() => onOpen(entry)} data-no-press
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-3 transition">
              <LogoIcon entry={entry} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{entry.name}</p>
                <p className="text-xs text-ink-3 truncate">
                  {t.deadline_until} {fmtDateFromISO(date, lang, t.months_short)}
                </p>
              </div>
              <DeadlineBadge days={days} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

// ─── Komponenten ──────────────────────────────────────────────────────────────
// Ein Symbol, das erst zur Laufzeit feststeht, wird als Prop gereicht statt im
// Render zu einer Komponente erklärt: sonst sieht React bei jedem Durchlauf eine
// neue Komponente und hängt sie samt Zustand neu ein — die Merkerkennung für
// kaputte Favicons ginge dabei jedes Mal verloren.
const Glyph = ({ icon: Icon, className, strokeWidth = 1.75 }) => (
  <Icon className={className} strokeWidth={strokeWidth} />
);

const SectionTitle = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-2 px-1">
    <Icon className="w-4 h-4 text-ink-3" strokeWidth={2} />
    <h3 className="font-semibold text-base tracking-tight">{label}</h3>
  </div>
);

const LogoIcon = ({ entry, size = 'md' }) => {
  const [err, setErr] = useState(false);
  const wrap = size === 'sm' ? 'w-9 h-9' : 'w-10 h-10';
  const img  = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
  const glyph = getLucideIcon(entry);
  const url  = !err && !glyph ? getLogoUrl(entry) : null;
  return (
    <div className={`${wrap} bg-surface-3 rounded-lg flex items-center justify-center overflow-hidden shrink-0`}>
      {glyph
        ? <Glyph icon={glyph} className={`${img} text-ink-2`} />
        : url
          ? <img src={url} className={`${img} object-contain`} alt="" onError={() => setErr(true)} />
          : <CreditCard className="w-4 h-4 text-ink-2" strokeWidth={1.75} />}
    </div>
  );
};

// Kategorien tragen keine Farbe — nur das Symbol, notfalls mit Beschriftung
const CategoryBadge = ({ cat, tiny = false }) => {
  const t = useT();
  const Icon = cat.icon;
  if (tiny) return (
    <span title={t[cat.labelKey]}
      className="flex items-center justify-center w-5 h-5 rounded-md bg-surface-3 text-ink-3 shrink-0">
      <Icon className="w-3 h-3" />
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-3 text-ink-2">
      <Icon className="w-3.5 h-3.5" />
      <span className="text-xs font-medium">{t[cat.labelKey]}</span>
    </span>
  );
};

const SoonCard = ({ entry, fmtOriginal }) => {
  const t    = useT();
  const lang = useLang();
  const cat  = entry.category ? getCat(entry.category) : null;

  // Считаем сколько дней до списания
  const daysLeft = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let target;
    if (entry.status === 'trial' && entry.trial_end) {
      target = new Date(entry.trial_end);
      target.setHours(0, 0, 0, 0);
    } else {
      const day = entry.billingDay ?? extractBillingDay(entry.date);
      if (!day) return null;
      target = billingDateIn(today.getFullYear(), today.getMonth(), day);
      // Im Folgemonat neu stauchen — der 31. liegt dort vielleicht gar nicht
      if (target < today) target = billingDateIn(today.getFullYear(), today.getMonth() + 1, day);
    }
    return Math.round((target - today) / 86400000);
  })();

  const daysLabel = (() => {
    if (daysLeft === null) return null;
    if (daysLeft === 0) return t.deadline_today;
    if (daysLeft === 1) return t.deadline_tomorrow;
    return lang === 'de' ? `in ${daysLeft} T.` : `in ${daysLeft}d`;
  })();

  const tone = daysLeft === 0 ? 'error' : daysLeft === 1 ? 'warning' : 'muted';

  return (
    <div className={`w-[172px] ${CARD} lift p-4 shrink-0 flex flex-col
      lg:w-full lg:flex-row lg:items-center lg:gap-3`}>
      <div className="flex justify-between items-start mb-4 lg:mb-0 lg:contents">
        <LogoIcon entry={entry} size="md" />
        {/* Am Desktop wandert das Abzeichen ans Zeilenende */}
        <span className="lg:order-3 lg:ml-auto">
          <Badge tone={tone}>{daysLabel ?? entry.date}</Badge>
        </span>
      </div>
      <div className="lg:min-w-0 lg:flex-1 lg:order-2">
        <p className="font-medium text-sm leading-snug mb-1.5 lg:mb-0"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {entry.name}
        </p>
        <div className="flex items-center justify-between gap-1 lg:justify-start lg:gap-2">
          <p className="text-ink-3 text-xs truncate">{fmtOriginal(entry)}</p>
          {cat && <CategoryBadge cat={cat} tiny />}
        </div>
      </div>
    </div>
  );
};

// ─── Wischen am Telefon ───────────────────────────────────────────────────────
// Ohne Animationsbibliothek: touch-action übernimmt die vertikale Achse, die
// horizontale bewegen wir selbst und lassen sie mit der Hauskurve zurückgleiten.
const useSwipeRow = ({ onLeft, onRight, onTap, max = 90, threshold = 70 }) => {
  const ref   = useRef(null);
  const state = useRef({ active: false, axis: null, dx: 0, startX: 0, startY: 0, swiped: false });

  const move = (px, animate) => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = animate && !reducedMotion() ? `transform 400ms ${STANDARD_EASE}` : 'none';
    el.style.transform  = px ? `translateX(${px}px)` : '';
  };

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse') return; // Mit der Maus wird geklickt, nicht gewischt
    state.current = { active: true, axis: null, dx: 0, startX: e.clientX, startY: e.clientY, swiped: false };
    move(0, false);
  };

  const onPointerMove = (e) => {
    const s = state.current;
    if (!s.active) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;

    // Achse erst nach ein paar Pixeln festlegen — schräge Gesten sind Scrollen
    if (!s.axis) {
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      s.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
      if (s.axis === 'x') { try { ref.current?.setPointerCapture(e.pointerId); } catch { /* nicht fangbar */ } }
    }
    if (s.axis !== 'x') return;

    // Jenseits der Grenze wird es zäh
    const over = Math.abs(dx) - max;
    s.dx = over > 0 ? Math.sign(dx) * (max + over * 0.12) : dx;
    move(s.dx, false);
  };

  const end = (e) => {
    const s = state.current;
    if (!s.active) return;
    s.active = false;
    try { ref.current?.releasePointerCapture(e.pointerId); } catch { /* nie gefangen */ }
    move(0, true);
    if (s.axis !== 'x') return;

    // Eine Wischgeste löst danach noch ein click aus — das schlucken wir
    s.swiped = true;
    if (s.dx <= -threshold) onLeft?.();
    else if (s.dx >= threshold) onRight?.();
  };

  const onClick = () => {
    if (state.current.swiped) { state.current.swiped = false; return; }
    onTap?.();
  };

  return { ref, handlers: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end, onClick } };
};

const EntryRow = ({ entry, fmt, fmtOriginal, monthly, onOpen, onEdit, onDelete, docCount = 0 }) => {
  const t    = useT();
  const lang = useLang();
  const isDesktop = useIsDesktop();
  const cat = entry.category ? getCat(entry.category) : null;
  const deadlineDays = daysUntil(cancelByDate(entry));
  const deadlineSoon = deadlineDays !== null && deadlineDays <= 60;
  const { ref: swipeRef, handlers } = useSwipeRow({ onLeft: onDelete, onRight: onEdit, onTap: onOpen });

  const badges = (
    <>
      {cat && <CategoryBadge cat={cat} tiny />}
      {entry.status === 'paused'   && <Badge tone="error">{t.badge_paused}</Badge>}
      {entry.status === 'trial'    && <Badge tone="warning">{t.badge_trial}</Badge>}
      {entry.status === 'canceled' && <Badge>{t.badge_canceled}</Badge>}
      {deadlineSoon && <DeadlineBadge days={deadlineDays} />}
      {docCount > 0 && <Badge icon={Paperclip} title={t.docs_count(docCount)}>{docCount}</Badge>}
    </>
  );

  // ── Десктоп: клик по строке — редактирование, действия по наведению ──
  if (isDesktop) {
    const meta = [
      entry.provider || null,
      entry.location || null,
      fmtBillingDate(entry.date, t, lang),
      entry.status === 'trial' && entry.trial_end ? fmtDateFromISO(entry.trial_end, lang, t.months_short) : null,
      entry.period === 'yearly' ? `≈ ${fmt(monthly(entry))} / ${t.sub_per_month}` : null,
    ].filter(Boolean).join(' · ');

    return (
      <div data-row onClick={onOpen} title={t.detail_open}
        className="group flex items-center gap-4 px-5 py-3.5 bg-surface-2 hover:bg-surface-3 transition cursor-pointer">
        <LogoIcon entry={entry} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium truncate">{entry.name}</p>
            {badges}
          </div>
          <p className="text-xs text-ink-3 truncate mt-0.5">{meta}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold">{fmtOriginal(entry)}</p>
          <p className="text-[11px] text-ink-3 uppercase tracking-[0.1em]">
            / {entry.period === 'yearly' ? t.sub_per_year : t.sub_per_month}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
          <button type="button" title={t.modal_edit} onClick={e => { e.stopPropagation(); onEdit(); }}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-2 transition">
            <Pencil className="w-4 h-4" />
          </button>
          <button type="button" title={t.sub_delete} onClick={e => { e.stopPropagation(); onDelete(); }}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-ink-3 hover:text-error hover:border-error/40 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-row className="relative overflow-hidden">
      {/* Was unter der Zeile liegt */}
      <div className="absolute inset-0 flex text-white">
        <div className="flex-1 bg-success flex items-center pl-6 text-xs font-medium gap-2">
          <Pencil className="w-4 h-4" /> {t.modal_edit}
        </div>
        <div className="flex-1 bg-error flex items-center justify-end pr-6 text-xs font-medium gap-2">
          {t.sub_delete} <Trash2 className="w-4 h-4" />
        </div>
      </div>
      <div ref={swipeRef} data-no-tab-swipe {...handlers}
        className="relative flex items-center px-4 py-3 gap-3 bg-surface-2 touch-pan-y cursor-pointer">
        <LogoIcon entry={entry} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium truncate">{entry.name}</p>
            {badges}
          </div>
          <p className="text-xs text-ink-3 truncate mt-0.5">
            {fmtOriginal(entry)} / {entry.period === 'yearly' ? t.sub_per_year : t.sub_per_month}
            {fmtBillingDate(entry.date, t, lang) && ` · ${fmtBillingDate(entry.date, t, lang)}`}
            {entry.status === 'trial' && entry.trial_end && ` · ${fmtDateFromISO(entry.trial_end, lang, t.months_short)}`}
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Валюта ────────────────────────────────────────────────────────────────────
const CurrencySelector = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const curr = getCurrency(value);

  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 border border-border bg-surface-2 text-ink-2
          hover:text-ink hover:bg-surface-3 text-xs font-medium px-3 py-1.5 rounded-full transition">
        {curr.label} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <PopMenu open={open} className="top-10 left-0" width="w-[150px]">
        {CURRENCIES.map(c => (
          <MenuItem key={c.code} onClick={() => { onChange(c.code); setOpen(false); }}
            className={value === c.code ? 'text-ink' : ''}>
            <span className="flex-1">{c.label}</span>
            {value === c.code && <Check className="w-4 h-4" />}
          </MenuItem>
        ))}
      </PopMenu>
    </div>
  );
};

// ─── Модалка ───────────────────────────────────────────────────────────────────
// ─── DatePicker ────────────────────────────────────────────────────────────────
const DatePicker = ({ value, onChange, label }) => {
  const t    = useT();
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const today = new Date();
  const parsed = value ? new Date(value) : null;
  const [viewYear,  setViewYear]  = useState(parsed?.getFullYear()  ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth()     ?? today.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const offset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const selectDay = (d) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0);  setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const selectedDay   = parsed?.getDate();
  const selectedMonth = parsed?.getMonth();
  const selectedYear  = parsed?.getFullYear();

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)} data-no-press
        className={`${INPUT_CLASS} bg-surface-2 flex items-center gap-3 text-left hover:bg-surface-3`}>
        <CalendarDays className="w-4 h-4 text-ink-3 shrink-0" />
        <span className="text-xs text-ink-3">{label}</span>
        <span className="ml-auto text-sm">
          {parsed
            ? <span className="text-ink">{fmtDateFromISO(value, lang, t.months_short)}</span>
            : <span className="text-ink-3">{t.datepicker_choose}</span>}
        </span>
      </button>

      <PopMenu open={open} className="top-full mt-2 left-0 right-0" width="" >
        <div className="p-3">
          {/* Навигация по месяцу */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} aria-label="←"
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-ink-2 hover:bg-surface-3 transition">
              <ChevronDown className="w-4 h-4 rotate-90" />
            </button>
            <span className="text-sm font-medium">{t.months_full[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} aria-label="→"
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-ink-2 hover:bg-surface-3 transition">
              <ChevronDown className="w-4 h-4 -rotate-90" />
            </button>
          </div>
          {/* Дни недели */}
          <div className="grid grid-cols-7 mb-1">
            {t.days_short.map(d => <div key={d} className="text-center text-[11px] text-ink-3 uppercase py-1">{d}</div>)}
          </div>
          {/* Дни */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />;
              const isSelected = day === selectedDay && viewMonth === selectedMonth && viewYear === selectedYear;
              const isToday    = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
              return (
                <button key={day} type="button" onClick={() => selectDay(day)} data-no-press
                  className={`aspect-square rounded-lg text-xs font-medium transition
                    ${isSelected ? 'bg-ink text-surface'
                      : isToday   ? 'bg-surface-sunken text-ink'
                      : 'text-ink-2 hover:bg-surface-3'}`}>
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </PopMenu>
    </div>
  );
};

// ─── Formular-Bausteine ───────────────────────────────────────────────────────
const FieldShell = ({ label, hint, children, className = '' }) => (
  <label className={`block space-y-1.5 ${className}`}>
    <span className="block text-[11px] text-ink-3 px-1">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-ink-3 px-1">{hint}</span>}
  </label>
);

// Wie FieldShell, aber ohne <label> — für Gruppen aus mehreren Bedienelementen,
// wo ein Klick auf die Beschriftung nicht sinnvoll in ein Feld springen kann.
const FieldGroup = ({ label, hint, children, className = '' }) => (
  <div className={`space-y-1.5 ${className}`}>
    {label && <p className="text-[11px] text-ink-3 px-1">{label}</p>}
    {children}
    {hint && <p className="text-[11px] text-ink-3 px-1">{hint}</p>}
  </div>
);

// Abschnittsüberschrift im Formular — der einzige Taktgeber in langen Masken.
// (SectionTitle weiter oben trägt Symbol und Rahmen und gehört den Seiten.)
const GroupTitle = ({ children, className = '' }) => (
  <p className={`text-[11px] uppercase tracking-[0.16em] text-ink-3 px-1 ${className}`}>{children}</p>
);

// Der Ein-Zustand ist eine der wenigen Stellen, an denen der Akzent auftaucht (§2)
const Switch = ({ checked, onChange, label }) => (
  <button type="button" role="switch" aria-checked={checked} data-no-press
    onClick={() => onChange(!checked)}
    className="w-full flex items-center gap-3 text-left group">
    <span className={`w-9 h-5 rounded-full p-0.5 shrink-0 transition-colors duration-200
      ${checked ? 'bg-accent' : 'bg-border-strong'}`}>
      <span className="block w-4 h-4 rounded-full bg-surface-2 shadow-sm transition-transform duration-300"
        style={{ transform: `translateX(${checked ? 16 : 0}px)`, transitionTimingFunction: STANDARD_EASE }} />
    </span>
    <span className="text-xs text-ink-2 group-hover:text-ink transition-colors">{label}</span>
  </button>
);

// Ruhiger Hinweis — Farbe nur als schmaler Streifen am Rand
const Note = ({ tone = 'muted', icon: Icon = AlertTriangle, children }) => (
  <div className={`flex gap-2.5 rounded-lg border px-3 py-2.5 ${TONE[tone]}`}>
    <Icon className="w-4 h-4 shrink-0 mt-px" />
    <p className="text-[11px] leading-relaxed">{children}</p>
  </div>
);

const SelectInput = ({ value, onChange, placeholder, options }) => (
  <div className="relative">
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`${INPUT_CLASS} appearance-none pr-10 ${value ? 'text-ink' : 'text-ink-3'}`}>
      <option value="">{placeholder}</option>
      {options.map(option => (
        <option key={option.value} value={option.value} className="text-ink">{option.label}</option>
      ))}
    </select>
    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
  </div>
);

// Passwortartige Eingabe mit Aufdecken und Kopieren
const SecretInput = ({ value, onChange, placeholder, disabled = false, readOnly = false }) => {
  const t = useT();
  const [revealed, setRevealed] = useState(false);
  const [copied,   setCopied]   = useState(false);

  const copy = () => {
    if (!value) return;
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  };

  return (
    <div className="relative">
      <input
        type={revealed ? 'text' : 'password'}
        autoComplete="new-password"
        className={`${INPUT_CLASS} pr-20 ${disabled ? 'opacity-50' : ''}`}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        readOnly={readOnly}
        onChange={e => onChange(e.target.value)}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
        <button type="button" onClick={() => setRevealed(v => !v)} disabled={disabled}
          title={revealed ? t.access_hide : t.access_show}
          className="w-8 h-8 flex items-center justify-center rounded-md text-ink-3 hover:text-ink transition disabled:opacity-40">
          {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <button type="button" onClick={copy} disabled={disabled || !value} title={t.access_copy}
          className={`w-8 h-8 flex items-center justify-center rounded-md transition disabled:opacity-40 ${copied ? 'text-success' : 'text-ink-3 hover:text-ink'}`}>
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};

// Ein Feld aus der Kategorievorlage
const TemplateField = ({ field, value, onChange }) => {
  const lang = useLang();
  const t    = useT();
  const text = fieldLabel(field, lang);

  if (field.type === 'select') {
    return (
      <FieldShell label={text}>
        <SelectInput
          value={value} onChange={onChange}
          placeholder="—"
          options={field.options.map(option => ({ value: option.value, label: optionLabel(option, lang) }))}
        />
      </FieldShell>
    );
  }

  if (field.type === 'textarea') {
    return (
      <FieldShell label={text}>
        <textarea rows={2} className={`${INPUT_CLASS} resize-none`} value={value}
          placeholder={field.placeholder || ''} onChange={e => onChange(e.target.value)} />
      </FieldShell>
    );
  }

  if (field.type === 'secret') {
    return (
      <FieldShell label={text}>
        <SecretInput value={value} onChange={onChange} placeholder={field.placeholder || ''} />
      </FieldShell>
    );
  }

  const inputType =
    field.type === 'number' || field.type === 'money' ? 'number'
    : field.type === 'date' ? 'date'
    : field.type === 'tel'  ? 'tel'
    : field.type === 'url'  ? 'url'
    : 'text';

  return (
    <FieldShell label={field.unit ? `${text} (${field.unit})` : text}>
      <input
        type={inputType}
        inputMode={inputType === 'number' ? 'decimal' : undefined}
        className={INPUT_CLASS}
        placeholder={field.placeholder || (field.type === 'money' ? t.modal_price_placeholder : '')}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </FieldShell>
  );
};

// Frei definierbare Felder
const CustomFields = ({ custom, onChange }) => {
  const t = useT();

  const update = (id, patch) =>
    onChange(custom.map(field => field.id === id ? { ...field, ...patch } : field));

  const add = () =>
    onChange([...custom, { id: newId(), label: '', value: '', type: 'text' }]);

  const remove = (id) => onChange(custom.filter(field => field.id !== id));

  return (
    <div className="space-y-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-ink-3 px-1">{t.custom_fields}</p>

      {custom.map(field => (
        <div key={field.id} className="rounded-xl border border-border bg-surface p-3 space-y-2">
          <div className="flex gap-2">
            <input className={`${INPUT_CLASS} flex-1`} placeholder={t.custom_label}
              value={field.label} onChange={e => update(field.id, { label: e.target.value })} />
            <div className="w-[128px] shrink-0">
              <SelectInput
                value={field.type}
                onChange={type => update(field.id, { type })}
                placeholder={t.type_text}
                options={CUSTOM_FIELD_TYPES.map(type => ({ value: type, label: t[`type_${type}`] }))}
              />
            </div>
            <button type="button" onClick={() => remove(field.id)} title={t.custom_remove}
              className="w-11 shrink-0 rounded-lg border border-border flex items-center justify-center text-ink-3 hover:text-error hover:border-error/40 transition">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {field.type === 'secret' ? (
            <SecretInput value={field.value} placeholder={t.custom_value}
              onChange={value => update(field.id, { value })} />
          ) : field.type === 'textarea' ? (
            <textarea rows={2} className={`${INPUT_CLASS} resize-none`} placeholder={t.custom_value}
              value={field.value} onChange={e => update(field.id, { value: e.target.value })} />
          ) : (
            <input
              type={field.type === 'number' || field.type === 'money' ? 'number' : field.type === 'date' ? 'date' : 'text'}
              className={INPUT_CLASS}
              placeholder={t.custom_value}
              value={field.value}
              onChange={e => update(field.id, { value: e.target.value })}
            />
          )}
        </div>
      ))}

      <button type="button" onClick={add}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-border-strong
          text-xs font-medium text-ink-2 hover:text-ink hover:bg-surface-3 transition">
        <Plus className="w-4 h-4" />{t.custom_add}
      </button>
    </div>
  );
};

// ─── Tresor: Anlegen, Entsperren, Sperren ─────────────────────────────────────
const VaultPanel = ({ vaultState }) => {
  const t = useT();
  const [passphrase, setPassphrase] = useState('');
  const [repeat,     setRepeat]     = useState('');
  const [error,      setError]      = useState('');
  const [busy,       setBusy]       = useState(false);

  if (!vaultState.available) {
    return <Note tone="warning">{t.vault_unavailable}</Note>;
  }

  if (vaultState.unlocked) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-2.5">
        <KeyRound className="w-4 h-4 text-success shrink-0" />
        <p className="text-xs text-ink-2 flex-1">{t.vault_title}</p>
        <button type="button" onClick={vaultState.lock} className={btn('secondary', 'sm', 'text-xs')}>
          {t.vault_lock}
        </button>
      </div>
    );
  }

  const submit = async () => {
    setError('');
    if (passphrase.length < 8) { setError(t.vault_too_short); return; }
    if (!vaultState.configured && passphrase !== repeat) { setError(t.vault_mismatch); return; }

    setBusy(true);
    try {
      if (vaultState.configured) {
        const ok = await vaultState.unlock(passphrase);
        if (!ok) setError(t.vault_wrong);
      } else {
        await vaultState.create(passphrase);
      }
      setPassphrase(''); setRepeat('');
    } catch {
      setError(t.vault_wrong);
    }
    setBusy(false);
  };

  const resetVault = () => {
    if (!window.confirm(t.vault_reset_confirm)) return;
    vaultState.reset();
    setPassphrase(''); setRepeat(''); setError('');
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-ink-3" />
        <p className="text-xs font-medium text-ink">
          {vaultState.configured ? t.vault_locked : t.vault_title}
        </p>
      </div>

      <p className="text-[11px] text-ink-3 leading-relaxed">
        {vaultState.configured ? t.vault_locked_hint : t.vault_intro}
      </p>

      <input type="password" autoComplete="current-password" className={INPUT_CLASS}
        placeholder={t.vault_passphrase} value={passphrase}
        onChange={e => setPassphrase(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()} />

      {!vaultState.configured && (
        <>
          <input type="password" autoComplete="new-password" className={INPUT_CLASS}
            placeholder={t.vault_repeat} value={repeat}
            onChange={e => setRepeat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} />
          <Note tone="warning">{t.vault_warning}</Note>
        </>
      )}

      {error && <p className="text-[11px] text-error px-1">{error}</p>}

      <button type="button" onClick={submit} disabled={busy || !passphrase}
        className={btn('primary', 'md', 'w-full')}>
        {vaultState.configured ? t.vault_unlock : t.vault_create}
      </button>

      {vaultState.configured && (
        <button type="button" onClick={resetVault}
          className="w-full text-[11px] text-ink-3 hover:text-error transition py-1.5 rounded-lg">
          {t.vault_reset} · {t.vault_reset_hint}
        </button>
      )}
    </div>
  );
};

// ─── Dokumente eines Eintrags ─────────────────────────────────────────────────
const DocumentsPanel = ({ entryId, onChange }) => {
  const t    = useT();
  const lang = useLang();
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);
  const fileRef = useRef(null);
  const available = documentStore.isAvailable();

  const reload = useCallback(() => {
    if (!available) return;
    documentStore.listFor(entryId).then(setDocuments).catch(() => {});
  }, [entryId, available]);

  useEffect(() => { reload(); }, [reload]);

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    setBusy(true);
    setError('');

    for (const file of files) {
      try {
        await documentStore.add(entryId, file);
      } catch (err) {
        setError(err.message === 'too-large'
          ? t.docs_too_large(Math.round(documentStore.MAX_FILE_BYTES / 1024 / 1024))
          : t.docs_error);
      }
    }

    setBusy(false);
    reload();
    onChange?.();
  };

  const removeDocument = async (id) => {
    await documentStore.remove(id);
    reload();
    onChange?.();
  };

  if (!available) {
    return <Note tone="warning">{t.docs_unavailable}</Note>;
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-ink-3 px-1">{t.docs_hint}</p>

      {documents.length === 0 ? (
        <p className="text-sm text-ink-3 text-center py-6">{t.docs_empty}</p>
      ) : (
        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
          {documents.map(document => (
            <div key={document.id} className="flex items-center gap-3 px-3 py-2.5 bg-surface">
              <FileText className="w-4 h-4 text-ink-3 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{document.name}</p>
                <p className="text-[11px] text-ink-3">
                  {documentStore.formatSize(document.size)} · {fmtDateFromISO(document.addedAt, lang, t.months_short)}
                </p>
              </div>
              <button type="button" title={t.docs_open}
                onClick={() => documentStore.openDocument(document.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-3 transition">
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button type="button" title={t.docs_download}
                onClick={() => documentStore.openDocument(document.id, { download: true })}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-3 transition">
                <Download className="w-3.5 h-3.5" />
              </button>
              <button type="button" title={t.docs_delete}
                onClick={() => removeDocument(document.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:text-error hover:bg-surface-3 transition">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-[11px] text-error px-1">{error}</p>}

      <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-border-strong
          text-xs font-medium text-ink-2 hover:text-ink hover:bg-surface-3 transition disabled:opacity-50">
        <Upload className="w-4 h-4" />{t.docs_add}
      </button>
      <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFiles} />
    </div>
  );
};

// ─── Eintrag ansehen ──────────────────────────────────────────────────────────
// Die Detailansicht zeigt ausschließlich, was auch gefüllt ist. Aus einem
// Formular mit dreißig Feldern wird so eine Karte mit sechs Zeilen.

const CopyButton = ({ value }) => {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!value) return;
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  };

  return (
    <button type="button" onClick={copy} title={t.access_copy}
      className={`w-7 h-7 shrink-0 rounded-md flex items-center justify-center transition
        ${copied ? 'text-success' : 'text-ink-3 hover:text-ink hover:bg-surface-3'}`}>
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

// Geheimes bleibt verdeckt, bis jemand hinsieht
const SecretValue = ({ value }) => {
  const t = useT();
  const [revealed, setRevealed] = useState(false);

  return (
    <span className="flex items-center gap-1.5 min-w-0">
      <span className={`truncate ${revealed ? 'font-mono' : 'tracking-[0.2em] text-ink-2'}`}>
        {revealed ? value : '•'.repeat(Math.min(value.length, 12))}
      </span>
      <button type="button" onClick={() => setRevealed(v => !v)}
        title={revealed ? t.access_hide : t.access_show}
        className="w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-ink-3 hover:text-ink transition">
        {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </span>
  );
};

const DetailSection = ({ icon: Icon, title, children }) => (
  <section className="space-y-2">
    <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-ink-3 px-1">
      {Icon && <Icon className="w-3.5 h-3.5" />}{title}
    </p>
    <div className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
      {children}
    </div>
  </section>
);

const DetailRow = ({ label, copy, children }) => (
  <div className="flex items-center gap-3 px-4 py-2.5">
    <span className="text-[11px] text-ink-3 w-[40%] shrink-0 leading-relaxed lg:w-[34%]">{label}</span>
    <div className="min-w-0 flex-1 text-sm text-ink break-words">{children}</div>
    {copy && <CopyButton value={copy} />}
  </div>
);

const LinkValue = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer"
    className="inline-flex items-center gap-1 text-ink hover:text-ink-2 transition underline underline-offset-2 break-all">
    {children}
    <ExternalLink className="w-3 h-3 shrink-0" />
  </a>
);

// Ein gespeicherter Wert, dargestellt nach dem Typ seiner Felddefinition
const DetailValue = ({ field, value, currency }) => {
  const lang = useLang();
  const t    = useT();

  if (field.type === 'select') {
    const option = (field.options || []).find(o => o.value === value);
    return <span>{option ? optionLabel(option, lang) : value}</span>;
  }

  if (field.type === 'date') {
    return <span>{fmtDateFromISO(value, lang, t.months_short) || value}</span>;
  }

  if (field.type === 'secret') return <SecretValue value={value} />;

  if (field.type === 'url') {
    const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return <LinkValue href={href}>{value}</LinkValue>;
  }

  if (field.type === 'tel') {
    return (
      <a href={`tel:${value.replace(/\s/g, '')}`}
        className="text-ink hover:text-ink-2 transition underline underline-offset-2">
        {value}
      </a>
    );
  }

  if (field.type === 'money') {
    const amount = Number(value);
    const text   = Number.isFinite(amount) ? fmtMoney(amount, currency, lang) : value;
    return <span>{field.unit ? `${text} ${field.unit}` : text}</span>;
  }

  if (field.type === 'textarea') {
    return <span className="whitespace-pre-line leading-relaxed">{value}</span>;
  }

  return <span>{field.unit ? `${value} ${field.unit}` : value}</span>;
};

// Kopierbar ist, was man sonst abtippen müsste — Nummern, Kennungen, Adressen
const COPYABLE_TYPES = new Set(['text', 'number', 'tel', 'url', 'secret']);

// Gefüllte Vorlagenfelder in sinnvoller Reihenfolge: erst die der Kategorie,
// dann die allgemeinen, zuletzt Werte aus einer früheren Kategorie.
const collectFilledFields = (entry) => {
  const values = entry.fields || {};
  const taken  = new Set();

  const pick = (defs) => defs.reduce((rows, field) => {
    const value = values[field.id];
    if (!value || !String(value).trim() || taken.has(field.id)) return rows;
    taken.add(field.id);
    return [...rows, { field, value: String(value) }];
  }, []);

  const template = pick(templateFor(entry.category));
  const common   = pick(COMMON_FIELDS);

  const orphans = Object.entries(values)
    .filter(([id, value]) => value && String(value).trim() && !taken.has(id))
    .map(([id, value]) => ({
      field: findFieldDef(id) || { id, label: { de: id, en: id }, type: 'text' },
      value: String(value),
    }));

  return { template, common: [...common, ...orphans] };
};

const DetailDocuments = ({ entryId }) => {
  const t    = useT();
  const lang = useLang();
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    if (!documentStore.isAvailable()) return;
    let cancelled = false;
    documentStore.listFor(entryId)
      .then(rows => { if (!cancelled) setDocuments(rows); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [entryId]);

  if (documents.length === 0) return null;

  return (
    <DetailSection icon={Paperclip} title={t.tab_docs}>
      {documents.map(document => (
        <div key={document.id} className="flex items-center gap-3 px-4 py-2.5">
          <FileText className="w-4 h-4 text-ink-3 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm truncate">{document.name}</p>
            <p className="text-[11px] text-ink-3">
              {documentStore.formatSize(document.size)} · {fmtDateFromISO(document.addedAt, lang, t.months_short)}
            </p>
          </div>
          <button type="button" title={t.docs_open}
            onClick={() => documentStore.openDocument(document.id)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-3 transition">
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button type="button" title={t.docs_download}
            onClick={() => documentStore.openDocument(document.id, { download: true })}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-3 transition">
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </DetailSection>
  );
};

const STATUS_TONE = { active: 'success', paused: 'error', trial: 'warning', canceled: 'muted' };
const STATUS_LABEL = {
  active:   'modal_status_active',
  paused:   'modal_status_paused',
  trial:    'modal_status_trial',
  canceled: 'modal_status_canceled',
};

const EntryDetail = ({ open, entry, currency, fmt, fmtOriginal, monthly, vaultState, onEdit, onDelete, onClose }) => {
  const t    = useT();
  const lang = useLang();
  const isDesktop = useIsDesktop();

  const [secret, setSecret] = useState('');

  // Gespeichertes Passwort entschlüsseln, sobald der Tresor offen ist
  useEffect(() => {
    if (!entry?.login_secret || !vaultState.unlocked) return;

    let cancelled = false;
    vaultState.decrypt(entry.login_secret)
      .then(value => { if (!cancelled) setSecret(value); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [entry?.login_secret, vaultState]);

  // Beim Schließen bleibt der Eintrag gesetzt, damit das Blatt ausgleiten kann
  if (!entry) return null;

  const cat        = entry.category ? getCat(entry.category) : null;
  const kind       = getKind(kindOf(entry));
  const status     = entry.status || 'active';
  const cancelBy   = cancelByDate(entry);
  const cancelDays = daysUntil(cancelBy);
  const billing    = fmtBillingDate(entry.date, t, lang);

  const { template, common } = collectFilledFields(entry);
  const customFields = (entry.custom || []).filter(field => String(field.value || '').trim());

  const hasContract = Boolean(entry.contract_start || entry.contract_end || entry.notice_period_months);
  const hasAccess   = Boolean(entry.url || entry.login_username || entry.login_secret || entry.login_note);
  const hasAnything = hasContract || hasAccess || template.length > 0 || common.length > 0
    || customFields.length > 0 || Boolean(entry.notes);

  // Der Umrechnungshinweis lohnt nur, wenn er etwas Neues sagt
  const monthlyHint =
    entry.period === 'yearly' || (entry.currency_code || DEFAULT_CURRENCY) !== currency
      ? t.detail_per_month(fmt(monthly(entry)))
      : null;

  const catalogEntry = getCatalogEntry(entry.name);

  return (
    <Overlay open={open} onClose={onClose} sheet={!isDesktop} labelledBy="entry-detail-title"
      panelClass={isDesktop
        ? 'inset-0 m-auto h-fit w-[620px] max-h-[88vh] overflow-y-auto desktop-scroll bg-surface-2 rounded-2xl p-8 border border-border shadow-2xl'
        : 'inset-x-3 bottom-3 top-14 overflow-y-auto bg-surface-2 rounded-2xl p-5 border border-border max-w-[450px] mx-auto shadow-2xl'}>

      {/* ── Kopf ── */}
      <div className="flex items-start gap-3">
        <LogoIcon entry={entry} size="md" />
        <div className="min-w-0 flex-1">
          <h2 id="entry-detail-title" className="text-lg font-semibold tracking-tight leading-snug lg:text-xl">
            {entry.name}
          </h2>
          {entry.provider && <p className="text-xs text-ink-3 truncate mt-0.5">{entry.provider}</p>}
        </div>
        <button type="button" onClick={onClose} title={t.detail_close}
          className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-3 transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        {cat && <CategoryBadge cat={cat} />}
        {kind && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-3 text-ink-2">
            <kind.icon className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{t[kind.oneKey]}</span>
          </span>
        )}
        {entry.location && (
          <span className="inline-flex items-center gap-1.5 max-w-full px-2 py-0.5 rounded-md bg-surface-3 text-ink-2">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs font-medium truncate">{entry.location}</span>
          </span>
        )}
        <StatusPill tone={STATUS_TONE[status] || 'muted'} label={t[STATUS_LABEL[status]] || status}
          pulse={status === 'trial'} />
        {cancelDays !== null && cancelDays <= 60 && <DeadlineBadge days={cancelDays} />}
      </div>

      {/* ── Betrag ── */}
      <div className="mt-4 rounded-xl border border-border bg-surface px-4 py-3.5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-3">
            {entry.period === 'yearly' ? t.modal_yearly : t.modal_monthly}
          </p>
          <p className="text-2xl font-semibold tracking-tight mt-1">{fmtOriginal(entry)}</p>
          {monthlyHint && <p className="text-[11px] text-ink-3 mt-0.5">{monthlyHint}</p>}
        </div>
        {(billing || (status === 'trial' && entry.trial_end)) && (
          <div className="text-right shrink-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-3">
              {status === 'trial' && entry.trial_end ? t.detail_trial_ends : t.detail_billing}
            </p>
            <p className="text-sm font-medium mt-1">
              {status === 'trial' && entry.trial_end
                ? fmtDateFromISO(entry.trial_end, lang, t.months_short)
                : billing}
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 space-y-5">
        {/* ── Laufzeit ── */}
        {hasContract && (
          <DetailSection icon={CalendarDays} title={t.contract_section}>
            {entry.contract_start && (
              <DetailRow label={t.contract_start}>
                {fmtDateFromISOWithYear(entry.contract_start, lang, t.months_short)}
              </DetailRow>
            )}
            {entry.contract_end && (
              <DetailRow label={t.contract_end}>
                {fmtDateFromISOWithYear(entry.contract_end, lang, t.months_short)}
              </DetailRow>
            )}
            {entry.notice_period_months ? (
              <DetailRow label={t.notice_period}>{t.notice_months(entry.notice_period_months)}</DetailRow>
            ) : null}
            <DetailRow label={t.auto_renew}>{entry.auto_renew ? t.detail_yes : t.detail_no}</DetailRow>
            {cancelBy && (
              <DetailRow label={t.deadline_until}>
                <span className="flex flex-wrap items-center gap-2">
                  {fmtDateFromISOWithYear(cancelBy, lang, t.months_short)}
                  {cancelDays !== null && <DeadlineBadge days={cancelDays} />}
                </span>
              </DetailRow>
            )}
          </DetailSection>
        )}

        {/* ── Vertragsdaten der Kategorie ── */}
        {template.length > 0 && (
          <DetailSection icon={ClipboardList} title={t.details_template}>
            {template.map(({ field, value }) => (
              <DetailRow key={field.id} label={fieldLabel(field, lang)}
                copy={COPYABLE_TYPES.has(field.type) ? value : null}>
                <DetailValue field={field} value={value} currency={entry.currency_code || currency} />
              </DetailRow>
            ))}
          </DetailSection>
        )}

        {/* ── Abrechnung & Kontakt ── */}
        {common.length > 0 && (
          <DetailSection icon={Wallet} title={t.details_common}>
            {common.map(({ field, value }) => (
              <DetailRow key={field.id} label={fieldLabel(field, lang)}
                copy={COPYABLE_TYPES.has(field.type) ? value : null}>
                <DetailValue field={field} value={value} currency={entry.currency_code || currency} />
              </DetailRow>
            ))}
          </DetailSection>
        )}

        {/* ── Eigene Felder ── */}
        {customFields.length > 0 && (
          <DetailSection icon={Package} title={t.custom_fields}>
            {customFields.map(field => (
              <DetailRow key={field.id} label={field.label}
                copy={COPYABLE_TYPES.has(field.type) ? field.value : null}>
                <DetailValue field={{ type: field.type }} value={field.value}
                  currency={entry.currency_code || currency} />
              </DetailRow>
            ))}
          </DetailSection>
        )}

        {/* ── Zugang ── */}
        {hasAccess && (
          <DetailSection icon={KeyRound} title={t.tab_access}>
            {entry.url && (
              <DetailRow label={t.access_url} copy={entry.url}>
                <LinkValue href={/^https?:\/\//i.test(entry.url) ? entry.url : `https://${entry.url}`}>
                  {entry.url.replace(/^https?:\/\//i, '')}
                </LinkValue>
              </DetailRow>
            )}
            {entry.login_username && (
              <DetailRow label={t.access_username} copy={entry.login_username}>
                {entry.login_username}
              </DetailRow>
            )}
            {entry.login_secret && (
              <DetailRow label={t.access_password} copy={secret || null}>
                {vaultState.unlocked
                  ? (secret ? <SecretValue value={secret} /> : <span className="text-ink-3">···</span>)
                  : <span className="inline-flex items-center gap-1.5 text-ink-3 text-xs">
                      <Lock className="w-3.5 h-3.5" />{t.vault_locked}
                    </span>}
              </DetailRow>
            )}
            {entry.login_note && (
              <DetailRow label={t.access_note}>
                <span className="whitespace-pre-line leading-relaxed">{entry.login_note}</span>
              </DetailRow>
            )}
          </DetailSection>
        )}

        {/* ── Dokumente ── */}
        <DetailDocuments entryId={entry.id} />

        {/* ── Notizen ── */}
        {entry.notes && (
          <DetailSection icon={FileText} title={t.detail_notes}>
            <p className="px-4 py-3 text-sm leading-relaxed whitespace-pre-line">{entry.notes}</p>
          </DetailSection>
        )}

        {/* Nichts außer der Basis erfasst — dann sagen wir das, statt Leere zu zeigen */}
        {!hasAnything && (
          <div className="rounded-xl border border-dashed border-border-strong px-4 py-6 text-center space-y-1">
            <p className="text-sm text-ink-2">{t.detail_empty}</p>
            <p className="text-[11px] text-ink-3 leading-relaxed">{t.detail_empty_hint}</p>
          </div>
        )}

        {/* ── Kündigungshilfe aus dem Katalog ── */}
        {catalogEntry?.cancelUrl && (
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
              <X className="w-4 h-4 text-ink-3 shrink-0" />
              <span className="text-xs text-ink-2">
                {t.cancel_how}
                <a href={catalogEntry.cancelUrl} target="_blank" rel="noopener noreferrer"
                  className="text-ink hover:text-ink-2 transition underline underline-offset-2">
                  {t.cancel_link}
                </a>
              </span>
            </div>
            <div className="px-4 py-3 space-y-2">
              {catalogEntry.cancelSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="text-[11px] font-medium text-ink-3 mt-px shrink-0 w-3">{i + 1}.</span>
                  <span className="text-xs text-ink-2 leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 mt-6 lg:flex-row-reverse lg:gap-3 lg:mt-7">
        <button type="button" onClick={onEdit} className={btn('primary', 'md', 'w-full py-3 lg:flex-1')}>
          <Pencil className="w-4 h-4" />{t.modal_edit}
        </button>
        <button type="button" onClick={onDelete}
          className={btn('ghost', 'md', 'w-full py-3 lg:flex-1 hover:text-error')}>
          <Trash2 className="w-4 h-4" />{t.sub_delete}
        </button>
      </div>
    </Overlay>
  );
};

// ─── Eintrag anlegen / bearbeiten ─────────────────────────────────────────────
// Drei Reiter statt vier, entlang der Fragen, die ein Vertrag beantwortet:
// Was ist das und was kostet es · Wie lange läuft er und wie kommt man raus ·
// Wo liegen Zugang und Papiere. Eine einzelne Dateiablage trug keinen Reiter.
const MODAL_TABS = [
  { id: 'basics',   labelKey: 'tab_basics',   icon: Wallet },
  { id: 'contract', labelKey: 'tab_contract', icon: ClipboardList },
  { id: 'filing',   labelKey: 'tab_filing',   icon: Paperclip },
];

const NOTICE_OPTIONS = [1, 2, 3, 6, 12];

// ─── Kategorieauswahl ─────────────────────────────────────────────────────────
// Neunzehn Kategorien als Chipwand haben das halbe Formular gefressen. Jetzt
// steht eine Zeile da; die volle Auswahl kommt auf Klick — mit Suche, weil
// Tippen ab etwa einem Dutzend Einträgen schneller ist als Zielen.
const CategoryPicker = ({ value, onChange }) => {
  const t = useT();
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  // Die Suche wird beim Schließen geleert, nicht beim Öffnen — so steht das
  // Feld schon leer da, wenn die Liste hereinkommt
  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);
  const ref = useDismiss(open, close);
  const searchRef = useRef(null);

  const cat  = getCat(value);
  const Icon = cat?.icon || Layers;

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => searchRef.current?.focus(), 40);
    return () => clearTimeout(id);
  }, [open]);

  const q = query.trim().toLowerCase();
  const matches = q ? CATEGORIES.filter(c => t[c.labelKey].toLowerCase().includes(q)) : CATEGORIES;

  const pick = (id) => { onChange(id); close(); };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => (open ? close() : setOpen(true))} aria-haspopup="listbox" aria-expanded={open}
        className={`${INPUT_CLASS} flex items-center gap-2.5 text-left hover:bg-surface-3`}>
        <Icon className={`w-4 h-4 shrink-0 ${cat ? 'text-ink-2' : 'text-ink-3'}`} />
        <span className={`flex-1 truncate ${cat ? 'text-ink' : 'text-ink-3'}`}>
          {cat ? t[cat.labelKey] : t.cat_choose}
        </span>
        <ChevronDown className={`w-4 h-4 text-ink-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <PopMenu open={open} className="top-full mt-1 left-0 right-0" width="">
        <div className="relative mb-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3 pointer-events-none" />
          <input ref={searchRef} value={query} placeholder={t.cat_search}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && matches.length) { e.preventDefault(); pick(matches[0].id); } }}
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm
              text-ink placeholder:text-ink-3 focus:outline-none focus:border-border-strong" />
        </div>

        <div className="max-h-[240px] overflow-y-auto desktop-scroll">
          {matches.length === 0
            ? <p className="px-3 py-5 text-xs text-ink-3 text-center">{t.cat_empty}</p>
            : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                {matches.map(item => {
                  const ItemIcon = item.icon;
                  const active   = item.id === value;
                  return (
                    <button key={item.id} type="button" data-menu-item onClick={() => pick(item.id)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition
                        ${active ? 'bg-surface-3 text-ink' : 'text-ink-2 hover:bg-surface-3 hover:text-ink'}`}>
                      <ItemIcon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 truncate">{t[item.labelKey]}</span>
                      {active && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
        </div>

        {value && (
          <button type="button" onClick={() => pick('')}
            className="w-full mt-1 pt-2 border-t border-border flex items-center gap-2.5 px-3 py-2
              text-sm text-ink-3 hover:text-ink transition">
            <X className="w-4 h-4 shrink-0" />{t.cat_clear}
          </button>
        )}
      </PopMenu>
    </div>
  );
};

const EntryModal = ({ open, initial, currency, locations = [], vaultState, onSave, onClose, onDocsChange }) => {
  const t    = useT();
  const lang = useLang();
  const isDesktop = useIsDesktop();

  // Dokumente hängen an einer ID — neue Einträge brauchen sie schon vor dem Speichern
  const [entryId] = useState(() => initial?.id || newId());

  const [tab, setTab] = useState('basics');

  // Währung: beim Bearbeiten die des Eintrags, beim Anlegen die aktuelle Anzeigewährung
  const [modalCurrency, setModalCurrency] = useState(initial?.currency_code || currency);
  const curr = getCurrency(modalCurrency);

  const [name,     setName]     = useState(initial?.name     || '');
  const [provider, setProvider] = useState(initial?.provider || '');
  const [price,    setPrice]    = useState(initial ? String(initial.price ?? '') : '');
  const [period,   setPeriod]   = useState(initial?.period   || 'monthly');
  const [category, setCategory] = useState(initial?.category || '');
  const [status,   setStatus]   = useState(initial?.status   || 'active');
  const [location, setLocation] = useState(initial?.location || '');

  // Die Art folgt der Kategorie, solange niemand widerspricht
  const [kindChoice, setKindChoice] = useState(initial?.kind || null);
  const kind = kindChoice || kindForCategory(category);
  const [trialEnd, setTrialEnd] = useState(initial?.trial_end || '');
  const [notes,    setNotes]    = useState(initial?.notes    || '');
  const [day,      setDay]      = useState(() => { const d = extractBillingDay(initial?.date); return d ? String(d) : ''; });
  const [month,    setMonth]    = useState(() => String(initial?.date || '').trim().split(' ')[1] || '');

  const [contractStart, setContractStart] = useState(initial?.contract_start || '');
  const [contractEnd,   setContractEnd]   = useState(initial?.contract_end   || '');
  const [noticeMonths,  setNoticeMonths]  = useState(
    initial?.notice_period_months ? String(initial.notice_period_months) : '');
  const [autoRenew,     setAutoRenew]     = useState(initial?.auto_renew !== false);

  const [fields, setFields] = useState(() => ({ ...(initial?.fields || {}) }));
  const [custom, setCustom] = useState(() => (initial?.custom || []).map(field => ({ ...field })));

  const [url,       setUrl]       = useState(initial?.url            || '');
  const [username,  setUsername]  = useState(initial?.login_username || '');
  const [loginNote, setLoginNote] = useState(initial?.login_note     || '');
  const [secret,        setSecret]        = useState('');
  const [secretTouched, setSecretTouched] = useState(false);
  const [secretError,   setSecretError]   = useState('');

  // Die Vorschläge werden aus dem Namen abgeleitet, nicht in einem Effekt
  // nachgezogen — ein Effekt löste sonst pro Tastendruck einen zweiten Render aus.
  // Gemerkt wird nur, ob die Liste weggeklickt wurde.
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [dayError, setDayError] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const priceRef    = useRef(null);
  const nameRef     = useRef(null);

  // Die Art folgt der Kategorie — die Umschaltung kommt erst auf Nachfrage
  const [kindOpen, setKindOpen] = useState(false);

  // Anzahl der Dokumente für die Markierung am Reiter
  const [docCount, setDocCount] = useState(0);
  const refreshDocs = useCallback(() => {
    if (!documentStore.isAvailable()) return;
    documentStore.listFor(entryId).then(list => setDocCount(list.length)).catch(() => {});
  }, [entryId]);
  useEffect(() => { refreshDocs(); }, [refreshDocs]);

  // Welcher Reiter hat die Eingabe abgelehnt — sonst springt das Formular
  // wortlos woandershin
  const [tabError, setTabError] = useState('');
  const flagTab = (id) => {
    setTab(id);
    setTabError(id);
    setTimeout(() => setTabError(''), 2000);
  };

  // Gespeichertes Passwort entschlüsseln, sobald der Tresor offen ist
  useEffect(() => {
    if (!initial?.login_secret || !vaultState.unlocked || secretTouched) return;

    let cancelled = false;
    vaultState.decrypt(initial.login_secret)
      .then(value => { if (!cancelled) setSecret(value); })
      .catch(() => { if (!cancelled) setSecretError(t.vault_decrypt_err); });

    return () => { cancelled = true; };
  }, [vaultState, initial?.login_secret, secretTouched, t.vault_decrypt_err]);

  // Autovervollständigung aus dem Anbieterkatalog
  const query = name.trim().toLowerCase();
  const suggestions = query
    ? SERVICE_CATALOG.filter(s =>
        s.name.toLowerCase().includes(query) ||
        (s.aliases || []).some(a => a.toLowerCase().includes(query))
      ).slice(0, 5)
    : [];

  // Beim Bearbeiten schweigt der Katalog — der Name steht ja schon fest
  const showSuggestions = !initial && !suggestionsDismissed && suggestions.length > 0;

  // Tippen holt die Liste zurück, nachdem sie einmal weg war
  const changeName = (value) => {
    setName(value);
    setSuggestionsDismissed(false);
  };

  const applySuggestion = (service) => {
    setName(service.name);
    setCategory(service.category);
    if (!provider) setProvider(service.name);
    setSuggestionsDismissed(true);
    setTimeout(() => priceRef.current?.focus(), 50);
  };

  const setField = (id, value) => setFields(prev => ({ ...prev, [id]: value }));

  const canSave = Boolean(name.trim()) && !saving;

  const handleSubmit = async () => {
    if (!canSave) return;

    const dayNum = Number(day);
    if (day && (dayNum < 1 || dayNum > 31)) {
      flagTab('basics');
      setDayError(true);
      setTimeout(() => setDayError(false), 600);
      return;
    }

    // Passwort nur neu verschlüsseln, wenn es angefasst wurde
    let loginSecret = initial?.login_secret || '';
    if (secretTouched) {
      if (!secret) {
        loginSecret = '';
      } else if (vaultState.unlocked) {
        setSaving(true);
        try {
          loginSecret = await vaultState.encrypt(secret);
        } catch {
          setSaving(false);
          flagTab('filing');
          setSecretError(t.vault_locked);
          return;
        }
        setSaving(false);
      } else {
        flagTab('filing');
        setSecretError(t.vault_locked_hint);
        return;
      }
    }

    onSave({
      id:            entryId,
      name:          name.trim(),
      provider:      provider.trim(),
      price:         price === '' ? 0 : Number(price),
      currency_code: modalCurrency,
      date:          day && month ? `${day} ${month}` : day || '—',
      period,
      category,
      kind,
      location:      location.trim(),
      logo:          initial?.logo || '',
      status,
      trial_end:     status === 'trial' && trialEnd ? trialEnd : null,

      contract_start:       contractStart || null,
      contract_end:         contractEnd   || null,
      notice_period_months: noticeMonths ? Number(noticeMonths) : null,
      auto_renew:           autoRenew,

      url:            url.trim(),
      login_username: username.trim(),
      login_secret:   loginSecret,
      login_note:     loginNote,

      fields,
      custom,
      notes,
    });
  };

  // ⌘/Strg + Enter speichert — die Hand bleibt auf der Tastatur
  const submitRef = useRef(null);
  useEffect(() => { submitRef.current = handleSubmit; });
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submitRef.current?.(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Ein neuer Eintrag beginnt im Namensfeld; am Telefon bleibt die Tastatur
  // unten, damit das Blatt erst zu Ende fährt
  useEffect(() => {
    if (!open || initial || !isDesktop) return;
    const id = setTimeout(() => nameRef.current?.focus(), DURATION.modalIn);
    return () => clearTimeout(id);
  }, [open, initial, isDesktop]);

  const cancelBy = cancelByDate({
    contract_end: contractEnd,
    notice_period_months: noticeMonths ? Number(noticeMonths) : null,
    auto_renew: autoRenew,
  });

  const templateFields = templateFor(category);
  const catalogEntry   = getCatalogEntry(initial?.name) || getCatalogEntry(name);

  const cat        = getCat(category);
  const activeKind = getKind(kind) || KINDS[0];
  const KindIcon   = activeKind.icon;
  const HeaderIcon = cat?.icon || Wallet;
  const subtitle   = [provider.trim(), cat && t[cat.labelKey]].filter(Boolean).join(' · ');

  // Was steckt hinter den Reitern? Ohne Markierung müsste man alle drei öffnen,
  // nur um zu sehen, dass zwei leer sind.
  const hasContractData = Boolean(
    contractStart || contractEnd || noticeMonths || custom.length ||
    Object.values(fields).some(value => String(value || '').trim()));
  const hasFilingData = Boolean(url || username || secret || loginNote || initial?.login_secret);

  const tabMark = (id) => {
    if (tabError === id)
      return <span className="w-1.5 h-1.5 rounded-full bg-error shrink-0" />;
    if (id === 'filing' && docCount > 0)
      return <span title={t.tab_filled} className="text-[10px] leading-none text-ink-3 tabular-nums shrink-0">{docCount}</span>;
    if ((id === 'contract' && hasContractData) || (id === 'filing' && hasFilingData))
      return <span title={t.tab_filled} className="w-1.5 h-1.5 rounded-full bg-ink-3 shrink-0" />;
    return null;
  };

  return (
    <Overlay open={open} onClose={onClose} sheet={!isDesktop} labelledBy="entry-modal-title"
      panelClass={isDesktop
        ? 'inset-0 m-auto h-fit w-[680px] max-h-[88vh] flex flex-col overflow-hidden bg-surface-2 rounded-2xl border border-border shadow-2xl'
        : 'inset-x-3 bottom-3 top-14 flex flex-col overflow-hidden bg-surface-2 rounded-2xl border border-border max-w-[450px] mx-auto shadow-2xl'}>

        {/* ── Kopf: bleibt stehen, damit Titel und Reiter nie wegscrollen ── */}
        <header className="shrink-0 border-b border-border px-5 pt-5 pb-3 lg:px-7 lg:pt-6">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0">
              <HeaderIcon className="w-5 h-5 text-ink-2" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="entry-modal-title" className="text-lg lg:text-xl font-semibold tracking-tight truncate">
                {initial ? (name.trim() || t.modal_edit) : t.modal_new}
              </h2>
              {(subtitle || initial) && (
                <p className="text-xs text-ink-3 truncate mt-0.5">{subtitle || t.modal_edit}</p>
              )}
            </div>
            <button type="button" onClick={onClose} title={t.detail_close} aria-label={t.detail_close}
              className="w-9 h-9 -mt-1 -mr-2 shrink-0 rounded-lg flex items-center justify-center
                text-ink-3 hover:text-ink hover:bg-surface-3 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Reiter — die Markierung gleitet mit, der Punkt verrät gefüllte Felder */}
          <Segmented
            items={MODAL_TABS.map(({ id, labelKey, icon }) => ({ id, label: t[labelKey], icon, mark: tabMark(id) }))}
            value={tab} onChange={setTab}
            className="w-full mt-4"
            layout="grid grid-cols-3"
            trackClass="bg-surface border border-border rounded-lg"
            itemClass="flex items-center justify-center gap-1.5 py-2 text-xs"
            renderItem={(item) => (
              <>
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.mark}
              </>
            )} />
        </header>

        {/* ── Rumpf: der einzige Bereich, der scrollt ── */}
        <div className="flex-1 min-h-0 overflow-y-auto desktop-scroll px-5 py-5 lg:px-7 lg:py-6">

        {/* ── Basis ── */}
        {tab === 'basics' && (
          <div className="space-y-6">

            {/* Was & wie viel */}
            <section className="space-y-3">
              <GroupTitle>{t.sec_money}</GroupTitle>

              <div className="relative">
                <FieldShell label={t.field_name}>
                  <input ref={nameRef} placeholder={t.modal_name_hint} className={INPUT_CLASS}
                    value={name} onChange={e => changeName(e.target.value)}
                    onFocus={() => setSuggestionsDismissed(false)} />
                </FieldShell>
                <PopMenu open={showSuggestions} className="top-full mt-1 left-0 right-0" width="">
                  {suggestions.map(service => {
                    const serviceCat  = getCat(service.category);
                    const ServiceIcon = service.lucideIcon || null;
                    return (
                      <MenuItem key={service.name}
                        onMouseDown={e => { e.preventDefault(); applySuggestion(service); }}
                        onTouchEnd={e => { e.preventDefault(); applySuggestion(service); }}>
                        {ServiceIcon
                          ? <ServiceIcon className="w-5 h-5 shrink-0" />
                          : <img src={faviconUrl(service.domain, 32)} className="w-5 h-5 rounded object-contain shrink-0" alt=""
                              onError={e => { e.target.style.display = 'none'; }} />}
                        <span className="flex-1 text-ink">{service.name}</span>
                        {serviceCat && <CategoryBadge cat={serviceCat} tiny />}
                      </MenuItem>
                    );
                  })}
                </PopMenu>
              </div>

              <FieldShell label={t.field_provider}>
                <input placeholder={t.modal_provider_hint} className={INPUT_CLASS}
                  value={provider} onChange={e => setProvider(e.target.value)} />
              </FieldShell>

              <div className="grid gap-3 lg:grid-cols-2">
                <FieldGroup label={t.field_amount}>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-2 text-sm pointer-events-none">{curr.symbol}</span>
                      <input ref={priceRef} type="number" inputMode="decimal" placeholder={t.modal_price_placeholder}
                        className={`${INPUT_CLASS} pl-9`}
                        value={price} onChange={e => setPrice(e.target.value)} />
                    </div>
                    <ModalCurrencySelector value={modalCurrency} onChange={setModalCurrency} />
                  </div>
                </FieldGroup>

                <FieldGroup label={t.field_period}>
                  <Segmented
                    items={[
                      { id: 'monthly', label: t.modal_monthly },
                      { id: 'yearly',  label: t.modal_yearly },
                    ]}
                    value={period}
                    onChange={p => { setPeriod(p); if (p === 'monthly') setMonth(''); }}
                    className="w-full"
                    layout="grid grid-cols-2"
                    trackClass="bg-surface border border-border rounded-lg"
                    itemClass="py-2 text-sm" />
                </FieldGroup>
              </div>
            </section>

            {/* Status & Abbuchung */}
            <section className="space-y-3">
              <GroupTitle>{t.sec_status}</GroupTitle>

              <Segmented
                items={[
                  { id: 'active',   label: t.modal_status_active,   tone: 'success' },
                  { id: 'paused',   label: t.modal_status_paused,   tone: 'error' },
                  { id: 'trial',    label: t.modal_status_trial,    tone: 'warning' },
                  { id: 'canceled', label: t.modal_status_canceled, tone: 'muted' },
                ]}
                value={status} onChange={setStatus}
                className="w-full"
                layout="grid grid-cols-2 lg:grid-cols-4"
                trackClass="bg-surface border border-border rounded-lg"
                itemClass="flex items-center justify-center gap-2 py-2 text-xs"
                renderItem={(item, active) => (
                  <>
                    <span className={`w-1.5 h-1.5 rounded-full transition-opacity ${DOT[item.tone]} ${active ? 'opacity-100' : 'opacity-40'}`} />
                    {item.label}
                  </>
                )} />

              {/* Bei Testphasen liefert das Ende der Testphase das Datum */}
              {status === 'trial' ? (
                <DatePicker value={trialEnd} onChange={setTrialEnd} label={t.modal_trial_end} />
              ) : (
                <FieldGroup label={period === 'yearly' ? t.modal_billing_date : t.modal_billing_day}>
                  <div className="flex items-center gap-2">
                    <input type="number" inputMode="numeric" min="1" max="31" placeholder="15"
                      className={`${INPUT_CLASS} w-20 shrink-0 text-center ${dayError ? 'border-error shake' : ''}`}
                      value={day}
                      onChange={e => { const v = e.target.value; if (v === '' || (Number(v) >= 1 && Number(v) <= 31)) setDay(v); }} />
                    {period === 'yearly'
                      ? <div className="flex-1"><MonthPicker value={month} onChange={setMonth} /></div>
                      : <span className="text-xs text-ink-3">{t.modal_billing_suffix}</span>}
                  </div>
                </FieldGroup>
              )}
            </section>

            {/* Einordnung */}
            <section className="space-y-3">
              <GroupTitle>{t.sec_place}</GroupTitle>

              <FieldGroup label={t.cat_label}>
                <CategoryPicker value={category} onChange={setCategory} />
              </FieldGroup>

              {/* Die Art folgt der Kategorie — sie steht als Satz da, bis jemand widerspricht */}
              {kindOpen ? (
                <FieldGroup label={t.kind_label} hint={t.kind_hint}>
                  <Segmented
                    items={KINDS.map(k => ({ id: k.id, label: t[k.labelKey], icon: k.icon }))}
                    value={kind} onChange={setKindChoice}
                    className="w-full"
                    layout="grid grid-cols-2"
                    trackClass="bg-surface border border-border rounded-lg"
                    itemClass="flex items-center justify-center gap-2 py-2 text-xs"
                    renderItem={(item) => (
                      <>
                        <item.icon className="w-3.5 h-3.5 shrink-0" />
                        {item.label}
                      </>
                    )} />
                </FieldGroup>
              ) : (
                <div className="flex items-center gap-2 px-1">
                  <KindIcon className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                  <span className="text-xs text-ink-2">
                    {t.kind_label}: <span className="text-ink">{t[activeKind.oneKey]}</span>
                  </span>
                  <button type="button" onClick={() => setKindOpen(true)}
                    className="text-xs text-ink-3 hover:text-ink underline underline-offset-2 transition">
                    {t.kind_change}
                  </button>
                </div>
              )}

              {/* Adresse — der Ort, an dem der Vertrag hängt */}
              <FieldShell label={t.location_label} hint={locations.length ? '' : t.location_hint}>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
                  <input className={`${INPUT_CLASS} pl-10`} placeholder={t.location_placeholder}
                    value={location} onChange={e => setLocation(e.target.value)} />
                </div>
              </FieldShell>
              {locations.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {locations.map(known => {
                    const active = location.trim() === known;
                    return (
                      <button key={known} type="button" onClick={() => setLocation(active ? '' : known)}
                        className={`flex items-center gap-1.5 max-w-full px-2.5 py-1.5 rounded-lg text-xs font-medium border transition
                          ${active
                            ? 'bg-ink text-surface border-ink'
                            : 'bg-surface border-border text-ink-2 hover:bg-surface-3 hover:text-ink'}`}>
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{known}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <FieldShell label={t.modal_notes}>
                <textarea rows={2} className={`${INPUT_CLASS} resize-none`} placeholder={t.modal_notes_placeholder}
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </FieldShell>
            </section>
          </div>
        )}

        {/* ── Vertrag: Laufzeit, Frist und die Felder der Kategorie ── */}
        {tab === 'contract' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
              <GroupTitle className="px-0">{t.contract_section}</GroupTitle>

              <div className="grid grid-cols-2 gap-3">
                <FieldShell label={t.contract_start}>
                  <input type="date" className={`${INPUT_CLASS} bg-surface-2`}
                    value={contractStart} onChange={e => setContractStart(e.target.value)} />
                </FieldShell>
                <FieldShell label={t.contract_end}>
                  <input type="date" className={`${INPUT_CLASS} bg-surface-2`}
                    value={contractEnd} onChange={e => setContractEnd(e.target.value)} />
                </FieldShell>
              </div>

              <FieldShell label={t.notice_period}>
                <SelectInput value={noticeMonths} onChange={setNoticeMonths} placeholder={t.notice_none}
                  options={NOTICE_OPTIONS.map(n => ({ value: String(n), label: t.notice_months(n) }))} />
              </FieldShell>

              <Switch checked={autoRenew} onChange={setAutoRenew} label={t.auto_renew} />

              {cancelBy && (
                <Note tone="warning">{t.cancel_by_hint(fmtDateFromISO(cancelBy, lang, t.months_short))}</Note>
              )}
            </div>

            {/* Kündigungshilfe aus dem Katalog — sie gehört neben die Frist */}
            {catalogEntry?.cancelUrl && (
              <div className="rounded-xl border border-border bg-surface overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
                  <X className="w-4 h-4 text-ink-3 shrink-0" />
                  <span className="text-xs text-ink-2">
                    {t.cancel_how}
                    <a href={catalogEntry.cancelUrl} target="_blank" rel="noopener noreferrer"
                      className="text-ink hover:text-ink-2 transition underline underline-offset-2">
                      {t.cancel_link}
                    </a>
                  </span>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {catalogEntry.cancelSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-[11px] font-medium text-ink-3 mt-px shrink-0 w-3">{i + 1}.</span>
                      <span className="text-xs text-ink-2 leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Kategoriespezifische Felder */}
            <section className="space-y-3">
              <GroupTitle>{t.details_template}</GroupTitle>
              {!category && <p className="text-xs text-ink-3 px-1">{t.details_empty}</p>}
              <div className="grid gap-3 lg:grid-cols-2">
                {templateFields.map(field => (
                  <TemplateField key={field.id} field={field}
                    value={fields[field.id] || ''} onChange={value => setField(field.id, value)} />
                ))}
              </div>
            </section>

            {/* Abrechnung & Kontakt */}
            <section className="space-y-3">
              <GroupTitle>{t.details_common}</GroupTitle>
              <div className="grid gap-3 lg:grid-cols-2">
                {COMMON_FIELDS.map(field => (
                  <TemplateField key={field.id} field={field}
                    value={fields[field.id] || ''} onChange={value => setField(field.id, value)} />
                ))}
              </div>
            </section>

            <CustomFields custom={custom} onChange={setCustom} />
          </div>
        )}

        {/* ── Ablage: Zugangsdaten und Dokumente ── */}
        {tab === 'filing' && (
          <div className="space-y-6">
            <section className="space-y-3">
              <GroupTitle>{t.sec_access}</GroupTitle>

              <FieldShell label={t.access_url}>
                <div className="flex gap-2">
                  <input type="url" className={INPUT_CLASS} placeholder="https://..."
                    value={url} onChange={e => setUrl(e.target.value)} />
                  <a href={url || undefined} target="_blank" rel="noopener noreferrer" title={t.access_open}
                    className={`w-11 shrink-0 rounded-lg border border-border flex items-center justify-center transition ${url ? 'text-ink-2 hover:text-ink hover:bg-surface-3' : 'text-ink-3 pointer-events-none opacity-50'}`}>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </FieldShell>

              <FieldShell label={t.access_username}>
                <input className={INPUT_CLASS} autoComplete="username"
                  value={username} onChange={e => setUsername(e.target.value)} />
              </FieldShell>

              <VaultPanel vaultState={vaultState} />

              <FieldShell label={t.access_password}>
                <SecretInput
                  value={secret}
                  disabled={!vaultState.unlocked}
                  placeholder={vaultState.unlocked ? '' : t.vault_locked}
                  onChange={value => { setSecret(value); setSecretTouched(true); setSecretError(''); }}
                />
              </FieldShell>

              {secretError && <p className="text-[11px] text-error px-1">{secretError}</p>}

              <FieldShell label={t.access_note}>
                <textarea rows={2} className={`${INPUT_CLASS} resize-none`}
                  value={loginNote} onChange={e => setLoginNote(e.target.value)} />
              </FieldShell>
            </section>

            <section className="space-y-3">
              <GroupTitle>{t.tab_docs}</GroupTitle>
              <DocumentsPanel entryId={entryId}
                onChange={() => { refreshDocs(); onDocsChange?.(); }} />
            </section>
          </div>
        )}

        </div>

        {/* ── Fuß: bleibt stehen, Speichern trägt das Gewicht ── */}
        <footer className="shrink-0 border-t border-border px-5 py-4 lg:px-7 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className={btn('ghost', 'md', 'px-5 py-3')}>
            {t.modal_cancel}
          </button>
          <button disabled={!canSave} onClick={handleSubmit}
            className={btn('primary', 'md', 'flex-1 py-3 lg:flex-none lg:px-10')}>
            {initial ? t.modal_save : t.modal_add}
          </button>
        </footer>
    </Overlay>
  );
};

const ModalCurrencySelector = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const curr = getCurrency(value);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="h-full bg-surface border border-border rounded-lg px-3 text-sm flex items-center gap-1
          hover:bg-surface-3 transition text-ink-2 font-medium whitespace-nowrap">
        {curr.code} <ChevronDown className={`w-4 h-4 text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <PopMenu open={open} className="top-full mt-1 right-0" origin="top right" width="w-[150px]">
        {CURRENCIES.map(c => (
          <MenuItem key={c.code} onClick={() => { onChange(c.code); setOpen(false); }}
            className={value === c.code ? 'text-ink' : ''}>
            <span className="flex-1">{c.label}</span>
            {value === c.code && <Check className="w-4 h-4" />}
          </MenuItem>
        ))}
      </PopMenu>
    </div>
  );
};

// Gespeichert wird das kanonische englische Kürzel, angezeigt das übersetzte
const MonthPicker = ({ value, onChange }) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const selectedIndex = MONTHS_SHORT.indexOf(value);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`${INPUT_CLASS} text-left flex justify-between items-center hover:bg-surface-3`}>
        <span className={value ? 'text-ink' : 'text-ink-3'}>
          {selectedIndex >= 0 ? t.months_short[selectedIndex] : t.modal_month_placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-ink-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <PopMenu open={open} className="top-full mt-1 left-0 right-0" origin="top left" width="">
        <div className="grid grid-cols-3">
          {MONTHS_SHORT.map((m, i) => (
            <button key={m} type="button" data-menu-item onClick={() => { onChange(m); setOpen(false); }}
              className={`py-2 text-sm rounded-lg transition hover:bg-surface-3
                ${value === m ? 'text-ink font-medium bg-surface-3' : 'text-ink-2'}`}>
              {t.months_short[i]}
            </button>
          ))}
        </div>
      </PopMenu>
    </div>
  );
};

// ─── Десктоп: шапка страницы ──────────────────────────────────────────────────
const PageHeader = ({ title, subtitle, children, className = '' }) => (
  <header className={`hidden lg:flex items-end justify-between gap-6 ${className}`}>
    <div className="min-w-0">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-ink-3 mt-1.5">{subtitle}</p>}
    </div>
    {children && <div className="shrink-0 flex items-center gap-2">{children}</div>}
  </header>
);

// ─── Десктоп: боковая навигация ───────────────────────────────────────────────
// Auch hier gleitet die Markierung — senkrecht statt waagerecht.
const DesktopSidebar = ({ activeTab, onSwitch, onAdd, lang, toggleLang, theme, toggleTheme, count, total }) => {
  const t = useT();
  const items = [
    { id: 'home',      label: t.nav_home,      icon: Home,         shortcut: '1' },
    { id: 'calendar',  label: t.nav_calendar,  icon: CalendarDays, shortcut: '2' },
    { id: 'analytics', label: t.nav_analytics, icon: BarChart2,    shortcut: '3' },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[264px] shrink-0 h-screen sticky top-0 bg-surface border-r border-border px-5 py-7">
      <div className="flex items-center gap-3 px-1">
        <div className="w-10 h-10 rounded-lg bg-ink flex items-center justify-center shrink-0">
          <Wallet className="w-5 h-5 text-surface" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="font-semibold tracking-tight leading-none">{APP_NAME}</p>
          <p className="text-[11px] text-ink-3 mt-1.5 truncate">{t.active_count(count)}</p>
        </div>
      </div>

      <button onClick={onAdd} className={btn('primary', 'md', 'mt-7 w-full py-3')}>
        <Plus className="w-4 h-4" />
        {t.add_sub}
      </button>

      <Segmented
        items={items} value={activeTab} onChange={onSwitch}
        vertical className="mt-7 -mx-1"
        trackClass="gap-1"
        itemClass="flex items-center gap-3 px-3.5 py-2.5 text-sm w-full"
        renderItem={(item, active) => (
          <>
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{item.label}</span>
            <kbd className={`ml-auto text-[10px] leading-none px-1.5 py-1 rounded-md border
              ${active ? 'border-border-strong text-ink-2' : 'border-border text-ink-3'}`}>{item.shortcut}</kbd>
          </>
        )} />

      <div className="mt-auto space-y-3">
        <div className={`${CARD} px-4 py-3`}>
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-3">{t.per_month}</p>
          <p className="text-2xl font-semibold tracking-tight mt-1">{total}</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle theme={theme} onToggle={toggleTheme} label={t.theme_toggle} />
          <LangToggle lang={lang} toggleLang={toggleLang} className="flex-1" />
        </div>
      </div>
    </aside>
  );
};

// ─── Root: онбординг → локальное приложение ───────────────────────────────────
// Определён последним — все const-компоненты уже объявлены выше
export default function Root() {
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem('onboarded') === '1');
  const [lang,      setLang]      = useState(() => {
    const saved = localStorage.getItem('lang');
    if (saved) return saved;
    // Autoerkennung beim ersten Besuch: de → DE, alles andere → EN
    const nav = (navigator.language || navigator.languages?.[0] || 'en').toLowerCase();
    return nav.startsWith('de') ? 'de' : 'en';
  });

  const { theme, toggle: toggleTheme } = useTheme();
  useButtonPress();

  const toggleLang = () => {
    const next = lang === 'de' ? 'en' : 'de';
    setLang(next);
    localStorage.setItem('lang', next);
  };

  if (!onboarded) return (
    <LangContext.Provider value={lang}>
      <Onboarding toggleLang={toggleLang} lang={lang} theme={theme} toggleTheme={toggleTheme}
        onDone={() => {
          setOnboarded(true);
          localStorage.setItem('onboarded', '1');
        }} />
    </LangContext.Provider>
  );

  return (
    <LangContext.Provider value={lang}>
      <App toggleLang={toggleLang} lang={lang} theme={theme} toggleTheme={toggleTheme} />
    </LangContext.Provider>
  );
}
