import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import {
  Home, List, BarChart2, Plus, Pencil, Trash2, CreditCard,
  CalendarDays, ChevronDown, Check, ArrowUpDown, Search, X,
  RefreshCw, Gamepad2, Briefcase, Music, BookOpen, Zap,
  Shield, Heart, Sparkles, Wifi, Globe, Phone, Server, Tv, Package,
  Wallet, Download, Upload, Smartphone, Droplets, Car, Radio, Dumbbell,
  Users, Lock, Eye, EyeOff, Copy, ExternalLink, Paperclip, FileText,
  AlertTriangle, KeyRound, Flame, Plug, Trash, HeartPulse, ClipboardList
} from 'lucide-react';
import { createEntryStore, newId } from './lib/entryStore';
import { LangContext, useLang, useT, APP_NAME } from './lib/i18n';
import {
  templateFor, COMMON_FIELDS, label as fieldLabel, optionLabel, CUSTOM_FIELD_TYPES,
} from './lib/fieldTemplates';
import * as vault from './lib/vault';
import * as documentStore from './lib/documentStore';

const entryStore = createEntryStore(window.localStorage);

// ─── Kategorien ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'insurance',     labelKey: 'cat_insurance',     icon: Shield,     color: 'text-indigo-400', bg: 'bg-indigo-500/15', border: 'border-indigo-500/30', bar: 'bg-indigo-500' },
  { id: 'health',        labelKey: 'cat_health',        icon: HeartPulse, color: 'text-rose-400',   bg: 'bg-rose-500/15',   border: 'border-rose-500/30',   bar: 'bg-rose-500'   },
  { id: 'energy',        labelKey: 'cat_energy',        icon: Plug,       color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', bar: 'bg-yellow-500' },
  { id: 'water',         labelKey: 'cat_water',         icon: Droplets,   color: 'text-cyan-400',   bg: 'bg-cyan-500/15',   border: 'border-cyan-500/30',   bar: 'bg-cyan-500'   },
  { id: 'housing',       labelKey: 'cat_housing',       icon: Home,       color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/30', bar: 'bg-orange-500' },
  { id: 'internet',      labelKey: 'cat_internet',      icon: Wifi,       color: 'text-sky-400',    bg: 'bg-sky-500/15',    border: 'border-sky-500/30',    bar: 'bg-sky-500'    },
  { id: 'mobile',        labelKey: 'cat_mobile',        icon: Smartphone, color: 'text-teal-400',   bg: 'bg-teal-500/15',   border: 'border-teal-500/30',   bar: 'bg-teal-500'   },
  { id: 'transport',     labelKey: 'cat_transport',     icon: Car,        color: 'text-lime-400',   bg: 'bg-lime-500/15',   border: 'border-lime-500/30',   bar: 'bg-lime-500'   },
  { id: 'broadcast',     labelKey: 'cat_broadcast',     icon: Radio,      color: 'text-slate-300',  bg: 'bg-slate-500/15',  border: 'border-slate-500/30',  bar: 'bg-slate-500'  },
  { id: 'banking',       labelKey: 'cat_banking',       icon: Wallet,     color: 'text-emerald-400',bg: 'bg-emerald-500/15',border: 'border-emerald-500/30',bar: 'bg-emerald-500'},
  { id: 'fitness',       labelKey: 'cat_fitness',       icon: Dumbbell,   color: 'text-red-400',    bg: 'bg-red-500/15',    border: 'border-red-500/30',    bar: 'bg-red-500'    },
  { id: 'membership',    labelKey: 'cat_membership',    icon: Users,      color: 'text-fuchsia-400',bg: 'bg-fuchsia-500/15',border: 'border-fuchsia-500/30',bar: 'bg-fuchsia-500'},
  { id: 'entertainment', labelKey: 'cat_entertainment', icon: Music,      color: 'text-pink-400',   bg: 'bg-pink-500/15',   border: 'border-pink-500/30',   bar: 'bg-pink-500'   },
  { id: 'work',          labelKey: 'cat_work',          icon: Briefcase,  color: 'text-blue-400',   bg: 'bg-blue-500/15',   border: 'border-blue-500/30',   bar: 'bg-blue-500'   },
  { id: 'ai',            labelKey: 'cat_ai',            icon: Sparkles,   color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/30', bar: 'bg-purple-500' },
  { id: 'games',         labelKey: 'cat_games',         icon: Gamepad2,   color: 'text-green-400',  bg: 'bg-green-500/15',  border: 'border-green-500/30',  bar: 'bg-green-500'  },
  { id: 'education',     labelKey: 'cat_education',     icon: BookOpen,   color: 'text-amber-400',  bg: 'bg-amber-500/15',  border: 'border-amber-500/30',  bar: 'bg-amber-500'  },
  { id: 'vpn',           labelKey: 'cat_vpn',           icon: Lock,       color: 'text-violet-400', bg: 'bg-violet-500/15', border: 'border-violet-500/30', bar: 'bg-violet-500' },
  { id: 'other',         labelKey: 'cat_other',         icon: Package,    color: 'text-zinc-400',   bg: 'bg-zinc-500/15',   border: 'border-zinc-500/30',   bar: 'bg-zinc-500'   },
];
const getCat = (id) => CATEGORIES.find(c => c.id === id) || null;

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
// Kanonische Monatskürzel — so liegen jährliche Abbuchungsdaten gespeichert
// ("8 Mar"). Angezeigt wird immer die übersetzte Variante aus t.months_short.
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
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
const extractBillingDay = (raw) => {
  if (!raw) return null;
  const m = String(raw).match(/\d+/);
  if (!m) return null;
  const d = parseInt(m[0], 10);
  return (Number.isFinite(d) && d >= 1 && d <= 31) ? d : null;
};

// "8 Mar" → 2 (nullbasiert, wie Date.getMonth())
const extractBillingMonth = (raw) => {
  if (!raw) return null;
  const parts = String(raw).trim().split(/\s+/);
  if (parts.length < 2) return null;
  const idx = MONTHS_SHORT.indexOf(parts[1]);
  return idx >= 0 ? idx : null;
};

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

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

const isDueWithinDays = (entry, days = 7) => {
  const now        = new Date();
  const billingDay = entry.billingDay ?? extractBillingDay(entry.date);
  if (!billingDay) return false;

  // Jährliche nur, wenn der Abbuchungsmonat der aktuelle ist
  if (entry.period === 'yearly') {
    const billingMonth = extractBillingMonth(entry.date);
    if (billingMonth === null || billingMonth !== now.getMonth()) return false;
  }

  const today = startOfToday();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), billingDay);
  const target = thisMonth >= today ? thisMonth : new Date(today.getFullYear(), today.getMonth() + 1, billingDay);
  const diff = Math.round((target - today) / 86400000);
  return diff >= 0 && diff <= days;
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
// APP
// ═══════════════════════════════════════════════════════════════════════════════
const App = ({ toggleLang, lang }) => {
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
  const [docCounts,    setDocCounts]    = useState({});
  const vaultState = useVault();
  const [toast,        setToast]        = useState(null);
  const [confirmEntry,   setConfirmEntry]   = useState(null);
  const [sortBy,       setSortBy]       = useState('name');
  const [searchQuery,  setSearchQuery]  = useState('');
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

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  // Сбрасываем скролл вкладки при каждом переключении на неё
  useEffect(() => {
    tabRefs[activeTab]?.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  const swipeRef = useTabSwipe(activeTab, switchTab, !isModalOpen && !isDesktop);

  // ── Anzahl hinterlegter Dokumente je Eintrag ───────────────────────────────
  const refreshDocCounts = useCallback(() => {
    if (!documentStore.isAvailable()) return;
    documentStore.countsByEntry().then(setDocCounts).catch(() => {});
  }, []);

  useEffect(() => { refreshDocCounts(); }, [refreshDocCounts]);

  // ── Клавиатура (десктоп) ───────────────────────────────────────────────────
  const searchRef = useRef(null);
  useEffect(() => {
    if (!isDesktop) return;
    const onKey = (e) => {
      const typing = ['INPUT', 'TEXTAREA'].includes(e.target?.tagName) || e.target?.isContentEditable;
      if (e.key === 'Escape') {
        if (isModalOpen) { setIsModalOpen(false); setEditingEntry(null); }
        else if (confirmEntry) setConfirmEntry(null);
        else if (typing) e.target.blur();
        return;
      }
      if (isModalOpen || confirmEntry || typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'n' || e.key === 'т') { e.preventDefault(); setEditingEntry(null); setIsModalOpen(true); }
      if (e.key === '/') { e.preventDefault(); switchTab('home'); setTimeout(() => searchRef.current?.focus(), 0); }
      if (e.key === '1') switchTab('home');
      if (e.key === '2') switchTab('calendar');
      if (e.key === '3') switchTab('analytics');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDesktop, isModalOpen, confirmEntry]);

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
  const activeEntries  = entries.filter(s => !s.status || s.status === 'active');
  const totalMonthlyUSD = activeEntries.reduce((a, s) => a + monthly(s), 0);
  const totalYearlyUSD  = totalMonthlyUSD * 12;

  const openAdd  = () => { setEditingEntry(null); setIsModalOpen(true); };
  const openEdit = (s) => { setEditingEntry(s);   setIsModalOpen(true); };

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

  // Kündigungsfristen der nächsten 90 Tage — inklusive bereits verstrichener
  const deadlineEntries = entries
    .filter(s => s.status !== 'paused')
    .map(s => ({ entry: s, date: cancelByDate(s) }))
    .filter(({ date }) => date !== null)
    .map(item => ({ ...item, days: daysUntil(item.date) }))
    .filter(({ days }) => days !== null && days <= 90)
    .sort((a, b) => a.days - b.days);

  const matchesSearch = (entry, query) => {
    if (!query) return true;
    const haystack = [
      entry.name, entry.provider, entry.notes,
      ...Object.values(entry.fields || {}),
      ...(entry.custom || []).flatMap(field => [field.label, field.value]),
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(query);
  };

  const sortedEntries = [...entries]
    .filter(s => matchesSearch(s, searchQuery.trim().toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'price') return monthly(b) - monthly(a);
      if (sortBy === 'date')  return (a.billingDay || 99) - (b.billingDay || 99);
      return a.name.localeCompare(b.name);
    });

  const sortLabel   = sortBy === 'name' ? t.sort_az : sortBy === 'price' ? t.sort_price : t.sort_date;
  const cycleSortBy = () => setSortBy(p => p === 'name' ? 'price' : p === 'price' ? 'date' : 'name');

  const byCategory = CATEGORIES.map(cat => ({
    ...cat,
    entries:  activeEntries.filter(s => s.category === cat.id),
    total: activeEntries.filter(s => s.category === cat.id).reduce((a, s) => a + monthly(s), 0),
  })).filter(c => c.entries.length > 0);

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
    <div className="min-h-screen bg-black text-white font-sans flex justify-center select-none lg:select-text">
      {/* ── Боковая навигация (десктоп) ── */}
      <DesktopSidebar
        activeTab={activeTab} onSwitch={switchTab} onAdd={openAdd}
        lang={lang} toggleLang={toggleLang}
        count={activeEntries.length} total={fmt(totalMonthlyUSD)}
      />

      <div className="w-full max-w-[450px] min-h-screen border-x border-zinc-900 bg-black flex flex-col relative overflow-hidden
        lg:max-w-[1240px] lg:border-x-0 lg:border-r lg:h-screen">

        {/* Контент со свайпом между вкладками */}
        <div ref={el => { swipeRef.current = el; }} className="flex-1 relative overflow-hidden">

          {/* ════ HOME ════ */}
          <div ref={tabRefs.home} className={`absolute inset-0 overflow-y-auto no-scrollbar desktop-scroll pb-32 lg:pb-12 safe-top ${activeTab === 'home' ? 'block' : 'hidden'}`}>
            <div className="p-4 space-y-5 lg:p-10 lg:pt-8 lg:space-y-7">
              {/* Заголовок — десктоп */}
              <PageHeader title={t.nav_home} subtitle={t.home_subtitle} />

              <header className="relative flex items-center justify-between px-1 pt-2 lg:hidden">
                <SupportMenu />
                <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold tracking-tight whitespace-nowrap">{APP_NAME}</h1>
                <div className="flex items-center gap-2">
                  {/* Переключатель языка — тогл */}
                  <button onClick={toggleLang}
                    className="relative flex items-center h-7 w-[64px] rounded-full border border-zinc-700 bg-zinc-900 p-0.5 transition-all active:scale-95">
                    {/* Ползунок */}
                    <motion.div
                      animate={{ x: lang === 'en' ? 32 : 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      className="absolute w-[28px] h-[22px] rounded-full bg-white shadow-sm"
                    />
                    {/* Лейблы */}
                    <span className={`relative z-10 flex-1 text-center text-[10px] font-bold tracking-wide transition-colors ${lang === 'de' ? 'text-black' : 'text-zinc-500'}`}>DE</span>
                    <span className={`relative z-10 flex-1 text-center text-[10px] font-bold tracking-wide transition-colors ${lang === 'en' ? 'text-black' : 'text-zinc-500'}`}>EN</span>
                  </button>
                </div>
              </header>

            {/* Сетка дашборда: на мобиле — колонка, на десктопе — 3 колонки */}
            <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">

              <section className="bg-gradient-to-b from-zinc-800/40 to-zinc-900/20 border border-zinc-800 rounded-[40px] p-6 text-center shadow-2xl
                lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:flex lg:items-center lg:gap-10 lg:text-left lg:p-8">
              <div className="lg:flex-1 lg:min-w-0">
                <p className="text-zinc-500 uppercase text-[10px] tracking-[0.22em] font-semibold mb-2">{t.per_month}</p>
                <h2 className="text-6xl font-bold tracking-tighter mb-3 lg:text-7xl">{fmt(totalMonthlyUSD)}</h2>
                <div className="flex items-center justify-center gap-2 lg:justify-start">
                  <CurrencySelector value={currency} onChange={(c) => { setCurrency(c); localStorage.setItem('currencyManual', '1'); }} />
                  <button onClick={() => { setRatesLoading(true); fetchRates().then(r => { if (r) setRates(r); setRatesLoading(false); }); }}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-800/70 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/70 transition active:scale-95">
                    <RefreshCw className={`w-3 h-3 ${ratesLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="flex items-center justify-center flex-wrap gap-2 mt-3 lg:justify-start">
                  {(() => {
                    const active  = entries.filter(s => !s.status || s.status === 'active').length;
                    const paused  = entries.filter(s => s.status === 'paused').length;
                    const trial   = entries.filter(s => s.status === 'trial').length;
                    return <>
                      <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-400 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.16em]">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        {t.active_count(active)}
                      </div>
                      {paused > 0 && (
                        <div className="inline-flex items-center gap-2 bg-red-500/10 text-red-400 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.16em]">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          {t.paused_count(paused)}
                        </div>
                      )}
                      {trial > 0 && (
                        <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.16em]">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          {t.trial_count(trial)}
                        </div>
                      )}
                    </>;
                  })()}
                </div>
              </div>
                <div className="grid grid-cols-2 mt-5 text-left border-t border-zinc-800/60 pt-4
                  lg:grid-cols-1 lg:gap-6 lg:mt-0 lg:pt-0 lg:border-t-0 lg:border-l lg:pl-10 lg:w-[190px] lg:shrink-0">
                  <div>
                    <p className="text-xl font-semibold lg:text-2xl">{fmt(totalYearlyUSD)}</p>
                    <p className="text-zinc-500 text-[10px] uppercase font-semibold mt-1">{t.per_year}</p>
                  </div>
                  <div className="text-right lg:text-left">
                    <p className="text-xl font-semibold lg:text-2xl">{fmt(totalMonthlyUSD / 30)}</p>
                    <p className="text-zinc-500 text-[10px] uppercase font-semibold mt-1">{t.per_day}</p>
                  </div>
                </div>
              </section>

              {/* Кнопка добавить — на десктопе живёт в боковой навигации */}
              <div className="flex justify-center -mt-1 lg:hidden">
                <button onClick={openAdd}
                  className="w-2/3 flex items-center justify-center gap-2 bg-white text-black font-semibold text-sm rounded-2xl py-3.5 active:scale-[0.97] transition shadow-lg">
                  <Plus className="w-4 h-4" />
                  {t.add_sub}
                </button>
              </div>

              <div className="space-y-5 lg:col-start-3 lg:row-start-1 lg:row-span-2 lg:self-start lg:space-y-6">
                <SoonSection soonEntries={soonEntries} fmt={fmt} fmtOriginal={fmtOriginal} monthly={monthly} />
                {(deadlineEntries.length > 0 || entries.length > 0) && (
                  <DeadlinesSection deadlines={deadlineEntries} onOpen={openEdit} />
                )}
              </div>

              {entries.length === 0 ? (
                /* ── Empty state ── */
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="flex flex-col items-center text-center px-6 py-10 space-y-5
                    lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:py-16 lg:bg-[#1C1C1E] lg:border lg:border-zinc-800/60 lg:rounded-3xl">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-[32px] bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                      <CreditCard className="w-10 h-10 text-zinc-700" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-zinc-600" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold tracking-tight">{t.empty_title}</p>
                    <p className="text-sm text-zinc-500 leading-relaxed max-w-[260px]">
                      {t.empty_subtitle}
                    </p>
                  </div>
                  <button onClick={openAdd}
                    className="flex items-center gap-2 bg-white text-black font-semibold text-sm rounded-2xl px-6 py-3 hover:bg-zinc-200 active:scale-95 transition shadow-lg">
                    <Plus className="w-4 h-4" />
                    {t.add_first_sub}
                  </button>
                </motion.div>
              ) : (
                <section className="space-y-3 lg:col-span-2 lg:col-start-1 lg:row-start-2">
                  <div className="flex items-center justify-between px-1 gap-3">
                    <SectionTitle icon={List} label={t.all_subs} />
                    <div className="relative hidden lg:block flex-1 max-w-[280px] ml-auto">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
                      <input ref={searchRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t.search_placeholder}
                        className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl pl-9 pr-9 py-2 text-sm focus:outline-none focus:border-zinc-600 transition text-zinc-200 placeholder:text-zinc-600" />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <button onClick={cycleSortBy} className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition font-semibold uppercase tracking-wide shrink-0
                      lg:border lg:border-zinc-800 lg:bg-zinc-900/60 lg:rounded-2xl lg:px-3 lg:py-2 lg:text-[11px]">
                      <ArrowUpDown className="w-3 h-3" />{sortLabel}
                    </button>
                  </div>
                  <div className="relative px-1 lg:hidden">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t.search_placeholder}
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:border-zinc-600 transition text-zinc-200 placeholder:text-zinc-600" />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="bg-[#1C1C1E] rounded-3xl border border-zinc-800/60 divide-y divide-zinc-800/80 overflow-hidden">
                    {!swipeHinted && sortedEntries.length > 0 && (
                      <div className="px-4 py-2 text-[10px] text-zinc-600 text-center tracking-wide lg:hidden">
                        {t.swipe_hint}
                      </div>
                    )}
                    {sortedEntries.map(entry => (
                      <EntryRow key={entry.id} entry={entry} fmt={fmt} fmtOriginal={fmtOriginal} monthly={monthly}
                        docCount={docCounts[entry.id] || 0}
                        onEdit={() => openEdit(entry)} onDelete={() => setConfirmEntry(entry)} />
                    ))}
                    {sortedEntries.length === 0 && searchQuery && (
                      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                        <Search className="w-6 h-6 text-zinc-700" />
                        <p className="text-sm text-zinc-500">{t.nothing_found(searchQuery)}</p>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
            </div>
          </div>

          {/* ════ CALENDAR ════ */}
          <div ref={tabRefs.calendar} className={`absolute inset-0 overflow-y-auto no-scrollbar desktop-scroll pb-32 lg:pb-12 safe-top ${activeTab === 'calendar' ? 'block' : 'hidden'}`}>
            <div className="p-4 pt-6 space-y-5 lg:p-10 lg:pt-8 lg:space-y-7">
              <PageHeader title={t.calendar_title} subtitle={t.calendar_subtitle} />
              <header className="flex flex-col items-center gap-2 pt-2 mb-2 lg:hidden">
                <h2 className="text-lg font-semibold tracking-tight">{t.calendar_title}</h2>
                <div className="w-9 h-9 rounded-2xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
                  <CalendarDays className="w-4 h-4 text-sky-300" />
                </div>
              </header>
              {(() => {
                const now    = new Date();
                const isPast = calYear < now.getFullYear() || (calYear === now.getFullYear() && calMonth < now.getMonth());
                const calEntries = entries.filter(entry => entry.status !== 'paused');
                const activeCalEntries = calEntries.filter(s => !s.status || s.status === 'active');
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
          <div ref={tabRefs.analytics} className={`absolute inset-0 overflow-y-auto no-scrollbar desktop-scroll pb-32 lg:pb-12 safe-top ${activeTab === 'analytics' ? 'block' : 'hidden'}`}>
            <div className="p-4 pt-6 space-y-4 lg:p-10 lg:pt-8 lg:space-y-0">
              <PageHeader title={t.analytics_title} subtitle={t.analytics_subtitle} className="lg:mb-7">
                <ImportExportMenu entries={entries} onImport={handleImport} vaultState={vaultState} />
              </PageHeader>
              <header className="relative flex items-center justify-between px-1 pt-2 mb-2 lg:hidden">
                <div className="w-10 h-10" />{/* spacer */}
                <div className="flex flex-col items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-tight">{t.analytics_title}</h2>
                  <div className="w-9 h-9 rounded-2xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
                    <BarChart2 className="w-4 h-4 text-purple-300" />
                  </div>
                </div>
                <ImportExportMenu entries={entries} onImport={handleImport} vaultState={vaultState} />
              </header>

              {/* Сетка карточек: колонка на мобиле, 2 колонки на десктопе */}
              <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
              <div className="bg-[#1C1C1E] rounded-3xl border border-zinc-800/60 p-5 space-y-3 lg:col-span-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-400 uppercase tracking-[0.16em]">{t.per_month}</span>
                  <span className="text-base font-semibold">{fmt(totalMonthlyUSD)}</span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-blue-500 rounded-full" />
                </div>
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

                // Для каждого месяца считаем реальные списания по датам биллинга
                const monthlyTotals = months.map(({ month, year }) => {
                  return entries.reduce((sum, s) => {
                    if (s.status === 'paused') return sum;
                    if (s.status === 'trial') return sum; // пробные не списываются

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
                  <div className="bg-[#1C1C1E] rounded-3xl border border-zinc-800/60 p-5 lg:col-span-2 lg:p-6">
                    {/* Заголовок + переключатель */}
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs text-zinc-500 uppercase tracking-[0.16em]">{t.trend_title}</p>
                      <div className="flex items-center gap-1 bg-zinc-800 rounded-xl p-0.5">
                        {[3, 6, 12].map(r => (
                          <button key={r} onClick={() => setTrendRange(r)}
                            className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg transition ${
                              trendRange === r ? 'bg-zinc-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
                            }`}>
                            {r}{t.trend_unit}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Бары */}
                    <div className="flex items-end gap-1 lg:gap-2">
                      {monthlyTotals.map((val, i) => {
                        const isCurrentMonth = i === trendRange - 1;
                        const heightPct = maxVal > 0 ? Math.max(5, (val / maxVal) * 100) : 5;
                        return (
                          <div key={i} className="group flex-1 flex flex-col items-center gap-1">
                            {/* Значение — только на десктопе, при наведении */}
                            <span className="hidden lg:block text-[10px] font-semibold text-zinc-400 opacity-0 group-hover:opacity-100 transition">
                              {fmt(val)}
                            </span>
                            <div className="w-full flex items-end h-12 lg:h-36">
                              <motion.div
                                key={`${trendRange}-${i}`}
                                initial={{ height: 0 }}
                                animate={{ height: `${heightPct}%` }}
                                transition={{ duration: 0.4, ease: 'easeOut', delay: i * 0.03 }}
                                className={`w-full rounded-md transition-colors ${isCurrentMonth ? 'bg-purple-500' : val > 0 ? 'bg-zinc-600 lg:group-hover:bg-zinc-500' : 'bg-zinc-800'}`}
                                style={{ minHeight: '3px' }}
                              />
                            </div>
                            {/* Показываем метку только если баров не слишком много */}
                            {(trendRange <= 6 || i % 2 === 0 || isDesktop) && (
                              <span className={`text-[8px] font-medium leading-none lg:text-[11px] ${isCurrentMonth ? 'text-purple-400' : 'text-zinc-600'}`}>
                                {monthLabels[months[i].month]}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Итог за период */}
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-800">
                      <span className="text-[10px] text-zinc-500">
                        {t.trend_last(trendRange)}
                      </span>
                      <span className="text-sm font-semibold">{fmt(totalRange)}</span>
                    </div>
                  </div>
                );
              })()}
              {byCategory.length > 0 && (
                <div className="bg-[#1C1C1E] rounded-3xl border border-zinc-800/60 p-5 space-y-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-[0.16em]">{t.by_categories}</p>
                  {byCategory.map(cat => {
                    const share = totalMonthlyUSD ? (cat.total / totalMonthlyUSD) * 100 : 0;
                    const Icon  = cat.icon;
                    return (
                      <div key={cat.id} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${cat.bg} border ${cat.border}`}>
                              <Icon className={`w-3.5 h-3.5 ${cat.color}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{t[cat.labelKey]}</p>
                              <p className="text-[10px] text-zinc-500">{cat.entries.length}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold">{fmt(cat.total)}</p>
                            <p className="text-[10px] text-zinc-500">{share.toFixed(0)}%</p>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, share)}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }} className={`h-full rounded-full ${cat.bar}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* По подпискам */}
              <div className="bg-[#1C1C1E] rounded-3xl border border-zinc-800/60 p-5 space-y-4">
                <p className="text-xs text-zinc-500 uppercase tracking-[0.16em]">{t.by_subscriptions}</p>
                {activeEntries.length === 0 && <p className="text-sm text-zinc-500">{t.add_first_sub}</p>}
                {[...activeEntries].sort((a, b) => monthly(b) - monthly(a)).map(entry => {
                  const share = totalMonthlyUSD ? (monthly(entry) / totalMonthlyUSD) * 100 : 0;
                  return (
                    <div key={entry.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <LogoIcon entry={entry} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{entry.name}</p>
                            <p className="text-xs text-zinc-500">{fmt(monthly(entry))} / {t.sub_per_month}</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold shrink-0">{share.toFixed(0)}<span className="text-xs text-zinc-500 ml-0.5">%</span></p>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, share)}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }} className="h-full bg-purple-500 rounded-full" />
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Пробный период — внизу */}
              {(() => {
                const trialEntries = entries.filter(s => s.status === 'trial');
                if (trialEntries.length === 0) return null;
                return (
                  <div className="bg-[#1C1C1E] rounded-3xl border border-amber-500/20 p-5 space-y-3">
                    <p className="text-xs text-amber-400/70 uppercase tracking-[0.16em]">{t.trial_period}</p>
                    {trialEntries.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <LogoIcon entry={entry} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{entry.name}</p>
                            {entry.trial_end && <p className="text-[10px] text-zinc-500">{fmtDateFromISO(entry.trial_end, lang, t.months_short)}</p>}
                          </div>
                        </div>
                        <p className="text-sm text-zinc-500 shrink-0">—</p>
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
                  <div className="bg-[#1C1C1E] rounded-3xl border border-red-500/20 p-5 space-y-3">
                    <p className="text-xs text-red-400/70 uppercase tracking-[0.16em]">{t.on_pause}</p>
                    {pausedEntries.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <LogoIcon entry={entry} size="sm" />
                          <p className="text-sm font-medium truncate">{entry.name}</p>
                        </div>
                        <p className="text-sm text-zinc-500 shrink-0">—</p>
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
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 pointer-events-none safe-bottom z-30 lg:hidden">
          <nav className="bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-full py-3 px-4 max-w-[360px] w-full grid grid-cols-3 shadow-2xl pointer-events-auto">
            <NavItem icon={Home}         label={t.nav_home}      active={activeTab === 'home'}      onClick={() => switchTab('home')} />
            <NavItem icon={CalendarDays} label={t.nav_calendar}  active={activeTab === 'calendar'}  onClick={() => switchTab('calendar')} />
            <NavItem icon={BarChart2}    label={t.nav_analytics} active={activeTab === 'analytics'} onClick={() => switchTab('analytics')} />
          </nav>
        </div>

        <AnimatePresence>
          {isModalOpen && (
            <EntryModal key={editingEntry?.id || 'new'} initial={editingEntry} currency={currency}
              vaultState={vaultState} onDocsChange={refreshDocCounts}
              onSave={handleSave} onClose={() => { setIsModalOpen(false); setEditingEntry(null); }} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-24 left-0 right-0 flex justify-center px-4 pointer-events-none z-40 lg:bottom-6 lg:left-auto lg:right-6 lg:justify-end lg:px-0">
              <div className="pointer-events-auto max-w-[420px] w-full lg:w-[340px] bg-zinc-900 border border-red-500/30 rounded-2xl px-4 py-3 flex flex-col gap-2 shadow-xl shadow-red-500/10">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm">
                    <p className="font-medium text-zinc-50">{t.sub_deleted}</p>
                    <p className="text-xs text-zinc-400 truncate">{toast.entry?.name}</p>
                  </div>
                  <button onClick={undoDelete} className="text-xs font-semibold text-red-400 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/40 active:scale-95 transition shrink-0">
                    {t.undo}
                  </button>
                </div>
                <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-red-500 animate-toast-progress" />
                </div>
              </div>
            </motion.div>
          )}
                </AnimatePresence>

<AnimatePresence>
  {confirmEntry && (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center lg:items-center lg:backdrop-blur-sm"
      onClick={() => setConfirmEntry(null)}>
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[420px] bg-zinc-900 border border-zinc-700 rounded-t-3xl px-4 pt-5 pb-8 shadow-2xl lg:rounded-3xl lg:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-100">{t.sub_delete || 'Delete'} «{confirmEntry.name}»?</p>
            <p className="text-xs text-zinc-500 mt-0.5">{t.delete_confirm_hint || 'Вы уверены?'}</p>
          </div>
        </div>
        <div className="lg:flex lg:flex-row-reverse lg:gap-3">
          <button
            onClick={() => { triggerDelete(confirmEntry); setConfirmEntry(null); }}
            className="w-full bg-red-600/90 hover:bg-red-600 text-white text-sm font-semibold py-3 rounded-2xl active:scale-[0.98] transition mb-3 lg:mb-0 lg:flex-1">
            {t.sub_delete || 'Delete'}
          </button>
          <button
            onClick={() => setConfirmEntry(null)}
            className="w-full text-zinc-400 text-sm py-2 active:scale-[0.98] transition hover:text-zinc-200 lg:flex-1 lg:py-3 lg:rounded-2xl lg:border lg:border-zinc-700 lg:hover:bg-zinc-800">
            {t.modal_cancel || 'Cancel'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
</div>
</div>
);
};

// ─── Анимация строки для онбординга ───────────────────────────────────────────
const SwipeDemo = () => {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const delays = [1200, 900, 1200, 900];
    const t = setTimeout(() => setPhase(p => (p + 1) % 4), delays[phase]);
    return () => clearTimeout(t);
  }, [phase]);

  const x          = phase === 1 ? -72 : phase === 3 ? 72 : 0;
  const showDelete = phase === 1;
  const showEdit   = phase === 3;

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-zinc-800 relative">
      <div className="absolute inset-0 flex">
        <div className={`flex-1 flex items-center pl-5 gap-2 text-xs font-semibold transition-opacity duration-200 ${showEdit ? 'opacity-100 bg-emerald-600/80' : 'opacity-0'}`}>
          <Pencil className="w-3.5 h-3.5" /> Редактировать
        </div>
        <div className={`flex-1 flex items-center justify-end pr-5 gap-2 text-xs font-semibold transition-opacity duration-200 ${showDelete ? 'opacity-100 bg-red-600/80' : 'opacity-0'}`}>
          Удалить <Trash2 className="w-3.5 h-3.5" />
        </div>
      </div>
      <motion.div
        animate={{ x }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative flex items-center px-4 py-3.5 gap-3 bg-[#1C1C1E]"
      >
        <div className="w-8 h-8 bg-zinc-800 rounded-2xl border border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
          <img src="https://www.google.com/s2/favicons?sz=32&domain=spotify.com" className="w-5 h-5 object-contain" alt="" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Spotify</p>
          <p className="text-xs text-zinc-500">$12 / мес · 5 Mar</p>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-pink-500/15 border border-pink-500/30">
          <Music className="w-2.5 h-2.5 text-pink-400" />
        </div>
      </motion.div>
    </div>
  );
};

// ─── Строка подписки для онбординга на десктопе ───────────────────────────────
const DesktopRowDemo = () => {
  const t = useT();
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-zinc-800">
      <div className="flex items-center gap-3 px-4 py-3.5 bg-zinc-800/40">
        <div className="w-10 h-10 bg-zinc-800 rounded-2xl border border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
          <img src="https://www.google.com/s2/favicons?sz=32&domain=spotify.com" className="w-5 h-5 object-contain" alt="" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-medium">Spotify</p>
          <p className="text-xs text-zinc-500">5 Mar</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold">$12</p>
          <p className="text-[10px] text-zinc-500 uppercase">/ {t.sub_per_month}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="w-8 h-8 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Pencil className="w-3.5 h-3.5" />
          </div>
          <div className="w-8 h-8 rounded-xl border border-red-500/40 bg-red-500/10 flex items-center justify-center text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Онбординг ─────────────────────────────────────────────────────────────────
const getOnboardingSteps = (t) => [
  { icon: Sparkles,    iconColor: 'text-white',      iconBg: 'bg-zinc-800',       ...t.onb_slides[0] },
  { icon: Plus,        iconColor: 'text-black',       iconBg: 'bg-white',          ...t.onb_slides[1] },
  { type: 'swipe',
    icon: List,        iconColor: 'text-zinc-300',    iconBg: 'bg-zinc-800',       ...t.onb_slides[2] },
  { icon: CalendarDays,iconColor: 'text-sky-300',     iconBg: 'bg-sky-500/15',     ...t.onb_slides[3] },
  { icon: BarChart2,   iconColor: 'text-purple-300',  iconBg: 'bg-purple-500/15',  ...t.onb_slides[4] },
  { type: 'pwa',
    icon: Download,    iconColor: 'text-green-300',   iconBg: 'bg-green-500/15',   ...t.onb_slides[5] },
];

const Onboarding = ({ onDone, toggleLang, lang }) => {
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

  return (
    <div className="min-h-screen bg-black text-white font-sans flex justify-center select-none lg:items-center lg:p-8"
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="w-full max-w-[450px] min-h-screen border-x border-zinc-900 bg-black flex flex-col overflow-hidden
        lg:max-w-[560px] lg:min-h-0 lg:h-auto lg:border lg:border-zinc-800 lg:rounded-[40px] lg:shadow-2xl lg:bg-zinc-950">

        {/* Тогл языка — только на первом слайде */}
        {step === 0 && toggleLang && (
          <div className="flex justify-end px-6 pt-6">
            <button onClick={toggleLang}
              className="relative flex items-center h-7 w-[64px] rounded-full bg-zinc-800 border border-zinc-700 p-[3px] select-none">
              <motion.div className="absolute w-[28px] h-[22px] bg-white rounded-full shadow"
                animate={{ x: lang === 'en' ? 32 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
              <span className={`relative z-10 flex-1 text-center text-[10px] font-bold tracking-wide transition-colors ${lang === 'de' ? 'text-black' : 'text-zinc-500'}`}>DE</span>
              <span className={`relative z-10 flex-1 text-center text-[10px] font-bold tracking-wide transition-colors ${lang === 'en' ? 'text-black' : 'text-zinc-500'}`}>EN</span>
            </button>
          </div>
        )}

        {/* Контент — растягивается, но контролирует выравнивание */}
        <div className="flex-1 flex flex-col px-8 pt-8">

          {/* Слайд — фиксированная зона контента */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div key={step}
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="w-full flex flex-col items-center text-center"
              >
                {/* Иконка — одинаковая на всех слайдах */}
                <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center border border-zinc-700 mb-7 ${s.iconBg}`}>
                  <s.icon className={`w-9 h-9 ${s.iconColor}`} />
                </div>

                {/* Заголовок */}
                <h2 className="text-2xl font-bold tracking-tight mb-4">{s.title}</h2>

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
                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left space-y-3">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest">Desktop · Chrome/Edge</p>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center shrink-0">
                            <Download className="w-4 h-4 text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{t.pwa_desktop_install}</p>
                            <p className="text-xs text-zinc-500">{t.pwa_desktop_install_hint}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  return (
                    <div className="w-full space-y-3 mb-4">
                      {(isIOS || (!isIOS && !isAndroid)) && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left space-y-3">
                          <p className="text-xs text-zinc-500 uppercase tracking-widest">iOS · Safari</p>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                              {/* Share icon iOS */}
                              <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                                <polyline points="16 6 12 2 8 6"/>
                                <line x1="12" y1="2" x2="12" y2="15"/>
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{t.pwa_ios_share}</p>
                              <p className="text-xs text-zinc-500">{t.pwa_ios_share_hint}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                              <svg viewBox="0 0 24 24" className="w-4 h-4 text-zinc-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="5" y="2" width="14" height="20" rx="2"/>
                                <line x1="12" y1="6" x2="12" y2="6"/>
                                <line x1="9" y1="18" x2="15" y2="18"/>
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{t.pwa_ios_add}</p>
                              <p className="text-xs text-zinc-500">{t.pwa_ios_add_hint}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      {(isAndroid || (!isIOS && !isAndroid)) && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left space-y-3">
                          <p className="text-xs text-zinc-500 uppercase tracking-widest">Android · Chrome</p>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                              {/* Three dots menu */}
                              <svg viewBox="0 0 24 24" className="w-4 h-4 text-zinc-300" fill="currentColor">
                                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{t.pwa_android_menu}</p>
                              <p className="text-xs text-zinc-500">{t.pwa_android_menu_hint}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center shrink-0">
                              <svg viewBox="0 0 24 24" className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L12 16M12 16L8 12M12 16L16 12"/>
                                <path d="M3 20h18"/>
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{t.pwa_android_install}</p>
                              <p className="text-xs text-zinc-500">{t.pwa_android_install_hint}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Описание */}
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {s.type === 'swipe' && isDesktop ? t.onb_manage_desktop : s.subtitle}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Точки — всегда на одном месте, прибиты к низу контентной зоны */}
          <div className="flex justify-center gap-2 py-8">
            {ONBOARDING_STEPS.map((_, i) => (
              <div key={i} onClick={() => setStep(i)}
                className={`rounded-full transition-all duration-300 cursor-pointer ${i === step ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-zinc-700'}`} />
            ))}
          </div>
        </div>

        {/* Кнопки — всегда внизу */}
        <div className="px-8 pb-12 space-y-3 lg:pb-10">
          <button onClick={goNext}
            className="w-full bg-white text-black font-semibold py-3.5 rounded-2xl hover:bg-zinc-200 active:scale-95 transition text-sm">
            {isLast ? `${APP_NAME} →` : t.onb_next}
          </button>
          {!isLast && (
            <button onClick={() => onDone(step)} className="w-full text-zinc-500 text-sm py-2 hover:text-zinc-300 transition">{t.onb_skip}</button>
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
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/30',
    color: 'text-orange-400',
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
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
    color: 'text-blue-400',
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
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    color: 'text-emerald-400',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.75 13.5v1.5h-1.5v-1.5C9.5 15.83 8.5 14.92 8.5 13.75h1.5c0 .55.67 1 1.5 1s1.5-.45 1.5-1c0-.59-.54-.88-1.76-1.22C9.87 12.1 8.5 11.5 8.5 10.25 8.5 9.08 9.5 8.17 11.25 8V6.5h1.5V8c1.75.17 2.75 1.08 2.75 2.25h-1.5c0-.55-.67-1-1.5-1s-1.5.45-1.5 1c0 .55.49.84 1.74 1.18 1.38.38 2.76.96 2.76 2.32 0 1.17-1 2.08-2.75 2.25z"/>
      </svg>
    ),
  },
];

// align: 'left' — открывается вниз (мобильная шапка), 'top' — вверх (боковая панель)
const SupportMenu = ({ align = 'left' }) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);
  const menuPos = align === 'top' ? 'left-0 bottom-12' : 'left-0 top-12';

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, [open]);

  const copyAddress = (address) => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}
        className={`w-10 h-10 border-2 border-zinc-700 bg-zinc-800 flex items-center justify-center hover:border-zinc-600 hover:bg-zinc-700 active:scale-95 transition shrink-0 ${
          align === 'top' ? 'rounded-2xl' : 'rounded-full'
        }`}>
        <Heart className="w-4 h-4 text-zinc-300" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.92, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -6 }} transition={{ duration: 0.15 }}
            className={`absolute ${menuPos} bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl z-50 w-[240px] overflow-hidden`}>
            <div className="px-4 py-3 border-b border-zinc-800">
              <p className="text-xs font-semibold text-zinc-200">{t.support_title}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{t.support_subtitle}</p>
            </div>
            {SUPPORT_LINKS.map(link => (
              <div key={link.id} className={`mx-3 my-2 rounded-xl border ${link.border} ${link.bg} p-3`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={link.color}><link.icon /></span>
                  <span className="text-sm font-semibold text-zinc-100">{link.label}</span>
                  <span className="text-[10px] text-zinc-500 ml-auto">{link.hint}</span>
                </div>
                {link.url ? (
                  <a href={link.url} target="_blank" rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                    className={`block w-full text-center text-xs font-semibold py-1.5 rounded-lg ${link.color} bg-black/20 active:scale-95 transition`}>
                    {t.support_open}
                  </a>
                ) : (
                  <button onClick={() => copyAddress(link.address)}
                    className={`w-full text-xs font-semibold py-1.5 rounded-lg ${link.color} bg-black/20 active:scale-95 transition`}>
                    {copied ? t.support_copied : t.support_copy}
                  </button>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


// ─── Import / Export Menu ─────────────────────────────────────────────────────
const ImportExportMenu = ({ entries, onImport, vaultState }) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [importStatus, setImportStatus] = useState(null); // null | 'ok' | 'err'
  const [importMsg, setImportMsg]       = useState('');
  const ref      = useRef(null);
  const fileRef  = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, [open]);

  // ── Export ─────────────────────────────────────────────────────────────────
  // CSV bleibt die flache Übersicht; alles Strukturierte steckt im JSON.
  const CSV_HEADERS = [
    'name', 'provider', 'price', 'currency_code', 'period', 'category', 'status',
    'date', 'trial_end', 'contract_start', 'contract_end', 'notice_period_months', 'url',
  ];

  const csvCell = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const exportCSV = () => {
    const rows = entries.map(entry => CSV_HEADERS.map(h => csvCell(entry[h])).join(','));
    download('gold-und-geld-export.csv', 'text/csv', [CSV_HEADERS.join(','), ...rows].join('\n'));
  };

  // Verschlüsselte Passwörter kommen mit — zusammen mit den Tresor-Metadaten
  // lassen sie sich auf einem anderen Gerät mit demselben Master-Passwort öffnen.
  const exportJSON = () => {
    const payload = {
      app: APP_NAME,
      version: 2,
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
    URL.revokeObjectURL(a.href);
  };

  // ── Import ─────────────────────────────────────────────────────────────────
  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',');
      return Object.fromEntries(headers.map((h, i) =>
        [h, (values[i] ?? '').trim().replace(/^"|"$/g, '')]));
    });
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const text = await file.text();

    try {
      let rows = [];

      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
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
      <button onClick={() => setOpen(v => !v)}
        className="w-10 h-10 rounded-full border-2 border-zinc-700 bg-zinc-800 flex items-center justify-center hover:border-zinc-600 hover:bg-zinc-700 active:scale-95 transition shrink-0">
        <Download className="w-4 h-4 text-zinc-300" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.92, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -6 }} transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl z-50 w-[220px] overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <p className="text-xs font-semibold text-zinc-200">{t.io_title}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{t.io_subtitle}</p>
            </div>

            {/* Экспорт */}
            <div className="mx-3 my-2 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Download className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-zinc-100">{t.io_export}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={exportCSV}
                  className="flex-1 text-xs font-semibold py-1.5 rounded-lg text-blue-400 bg-black/20 active:scale-95 transition">
                  CSV
                </button>
                <button onClick={exportJSON}
                  className="flex-1 text-xs font-semibold py-1.5 rounded-lg text-blue-400 bg-black/20 active:scale-95 transition">
                  JSON
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">{t.io_docs_note}</p>
            </div>

            {/* Импорт */}
            <div className="mx-3 mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-zinc-100">{t.io_import}</span>
                <span className="text-[10px] text-zinc-500 ml-auto">{t.io_import_hint}</span>
              </div>
              <button onClick={() => fileRef.current?.click()}
                className="w-full text-xs font-semibold py-1.5 rounded-lg text-emerald-400 bg-black/20 active:scale-95 transition">
                {t.io_import_btn}
              </button>
              <input ref={fileRef} type="file" accept=".csv,.json" className="hidden" onChange={handleFile} />
              {importStatus && (
                <p className={`text-[11px] text-center mt-2 ${importStatus === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {importMsg}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Календарь ─────────────────────────────────────────────────────────────────
const CalendarSection = ({ entries, fmt, fmtReal, monthly, month, year, onPrev, onNext, onToday, calTotal, calYearly, isPast, calMonth }) => {
  const t = useT();
  const isDesktop   = useIsDesktop();
  const today       = new Date();
  const isToday     = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset      = (new Date(year, month, 1).getDay() + 6) % 7;

  const visibleSubs = entries.filter(entry => {
    if (entry.status === 'paused') return false;
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

    const d = entry.billingDay ?? extractBillingDay(entry.date);
    if (!d || d < 1 || d > daysInMonth) return;

    // Годовые — только в тот месяц когда реально списывается
    if (entry.period === 'yearly') {
      const billingMonth = extractBillingMonth(entry.date);
      if (billingMonth === null || billingMonth !== month) return;
    }

    if (!subsByDay[d]) subsByDay[d] = [];
    subsByDay[d].push(entry);
  });

  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">
      <div className="space-y-3 lg:col-span-2">
      <div className="flex items-center justify-between px-1">
        <button onClick={onPrev} className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition active:scale-95">
          <ChevronDown className="w-4 h-4 rotate-90" />
        </button>
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold lg:text-lg">{t.months_full[month]} {year}</p>
          {onToday && (
            <button onClick={onToday}
              className="hidden lg:block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 rounded-xl px-2.5 py-1 transition">
              {t.today}
            </button>
          )}
        </div>
        <button onClick={onNext} className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition active:scale-95">
          <ChevronDown className="w-4 h-4 -rotate-90" />
        </button>
      </div>
      <div className="grid grid-cols-7">
        {t.days_short.map(d => <div key={d} className="text-center text-[10px] text-zinc-600 font-semibold uppercase tracking-wide py-1 lg:text-left lg:pl-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 lg:gap-1.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const daySubs = subsByDay[day] || [];
          const hasAny  = daySubs.length > 0;
          const hasActive = daySubs.some(s => !s.status || s.status === 'active');
          const total   = daySubs
            .filter(s => !s.status || s.status === 'active')
            .reduce((a, s) => a + (s.period === 'yearly' ? monthly(s) * 12 : monthly(s)), 0);

          // ── Десктоп: крупная ячейка со списком сервисов ──
          if (isDesktop) return (
            <div key={day} className={`min-h-[104px] rounded-2xl p-2 flex flex-col border transition
              ${isToday(day) ? 'bg-white text-black border-white'
                : hasAny     ? 'bg-zinc-800/60 border-zinc-700 hover:border-zinc-600'
                             : 'bg-zinc-900/40 border-transparent'}`}>
              <div className="flex items-baseline justify-between gap-1">
                <span className={`text-xs font-semibold ${isToday(day) ? 'text-black' : hasAny ? 'text-white' : 'text-zinc-600'}`}>{day}</span>
                {hasAny && hasActive && (
                  <span className={`text-[10px] font-bold truncate ${isToday(day) ? 'text-zinc-600' : 'text-amber-400'}`}>{fmt(total)}</span>
                )}
              </div>
              <div className="mt-1.5 space-y-1 overflow-hidden">
                {daySubs.slice(0, 2).map(s => (
                  <div key={s.id} className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      s.status === 'trial' ? 'bg-amber-400' :
                      s.period === 'yearly' ? 'bg-red-400' : 'bg-purple-400'
                    }`} />
                    <span className={`text-[10px] leading-tight truncate ${isToday(day) ? 'text-zinc-700' : 'text-zinc-400'}`}>{s.name}</span>
                  </div>
                ))}
                {daySubs.length > 2 && (
                  <p className={`text-[10px] pl-3 ${isToday(day) ? 'text-zinc-600' : 'text-zinc-600'}`}>{t.more_count(daySubs.length - 2)}</p>
                )}
              </div>
            </div>
          );

          return (
            <div key={day} className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center
              ${isToday(day) ? 'bg-white text-black' : hasAny ? 'bg-zinc-800 border border-zinc-700' : 'bg-zinc-900/40'}`}>
              <span className={`text-xs font-semibold leading-none ${isToday(day) ? 'text-black' : hasAny ? 'text-white' : 'text-zinc-600'}`}>{day}</span>
              {hasAny && hasActive && <span className={`text-[8px] font-bold mt-0.5 leading-none ${isToday(day) ? 'text-zinc-600' : 'text-amber-400'}`}>{fmt(total)}</span>}
              {hasAny && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {daySubs.slice(0, 3).map(s => (
                    <div key={s.id} className={`w-1 h-1 rounded-full ${
                      s.status === 'trial' ? 'bg-white' :
                      s.period === 'yearly' ? 'bg-red-400' : 'bg-purple-400'
                    }`} />
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
      <div className="bg-[#1C1C1E] rounded-3xl border border-zinc-800/60 p-4 space-y-2 lg:p-5">
        <div className="flex justify-between text-sm gap-3">
          <span className="text-zinc-400">{isPast ? t.spent(t.months_genitive[calMonth ?? month]) : t.expected(t.months_genitive[calMonth ?? month])}</span>
          <span className="font-semibold shrink-0">{fmt(calTotal ?? 0)}</span>
        </div>
        <div className="flex justify-between text-sm gap-3">
          <span className="text-zinc-400">{t.per_year}</span>
          <span className="font-semibold shrink-0">{fmt(calYearly ?? 0)}</span>
        </div>
      </div>
      {Object.keys(subsByDay).length > 0 && (
        <div className="bg-[#1C1C1E] rounded-3xl border border-zinc-800/60 divide-y divide-zinc-800/80 overflow-hidden mt-2 lg:mt-0">
          {Object.entries(subsByDay).sort(([a],[b]) => Number(a)-Number(b)).flatMap(([day, entries]) =>
            entries.map(entry => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <LogoIcon entry={entry} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{entry.name}</p>
                      {entry.status === 'trial' && <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-lg shrink-0">{t.modal_status_trial.toLowerCase()}</span>}
                    </div>
                    <p className="text-xs text-zinc-500">{day}. {t.months_short[month]}</p>
                  </div>
                </div>
                {entry.status === 'trial'
                  ? <p className="text-xs text-zinc-500 shrink-0">{t.not_billing}</p>
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
        ? <p className="text-sm text-zinc-600 px-1 lg:bg-[#1C1C1E] lg:border lg:border-zinc-800/60 lg:rounded-3xl lg:px-5 lg:py-6 lg:text-center">{t.soon_empty}</p>
        : <div ref={ref} data-no-tab-swipe
            className="flex gap-3 overflow-x-auto no-scrollbar px-1 pb-1 lg:flex-col lg:overflow-visible lg:px-0">
            {soonEntries.map(entry => <SoonCard key={entry.id} entry={entry} fmtOriginal={fmtOriginal} />)}
          </div>
      }
    </section>
  );
};

// ─── Kündigungsfristen ────────────────────────────────────────────────────────
// Farbe folgt der Dringlichkeit: verstrichen · unter 30 Tagen · darüber
const deadlineTone = (days) =>
  days < 0  ? { text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30'    }
: days <= 30 ? { text: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30'  }
:              { text: 'text-zinc-400',   bg: 'bg-zinc-500/10',   border: 'border-zinc-600/40'   };

const deadlineText = (days, t) => {
  if (days < 0)  return t.deadline_passed;
  if (days === 0) return t.deadline_today;
  if (days === 1) return t.deadline_tomorrow;
  return t.deadline_days(days);
};

const DeadlineBadge = ({ days }) => {
  const t = useT();
  const tone = deadlineTone(days);
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-lg shrink-0 border ${tone.text} ${tone.bg} ${tone.border}`}>
      <AlertTriangle className="w-2.5 h-2.5" />{deadlineText(days, t)}
    </span>
  );
};

const DeadlinesSection = ({ deadlines, onOpen, className = '' }) => {
  const t    = useT();
  const lang = useLang();

  return (
    <section className={`space-y-3 ${className}`}>
      <SectionTitle icon={AlertTriangle} label={t.deadlines_title} />
      {deadlines.length === 0 ? (
        <p className="text-sm text-zinc-600 px-1 lg:bg-[#1C1C1E] lg:border lg:border-zinc-800/60 lg:rounded-3xl lg:px-5 lg:py-6 lg:text-center">
          {t.deadlines_empty}
        </p>
      ) : (
        <div className="bg-[#1C1C1E] rounded-3xl border border-zinc-800/60 divide-y divide-zinc-800/80 overflow-hidden">
          {deadlines.map(({ entry, date, days }) => (
            <button key={entry.id} type="button" onClick={() => onOpen(entry)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/40 transition">
              <LogoIcon entry={entry} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{entry.name}</p>
                <p className="text-xs text-zinc-500 truncate">
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
const SectionTitle = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-2 px-1">
    <Icon className="w-4 h-4 text-zinc-400" strokeWidth={2} />
    <h3 className="font-semibold text-base tracking-tight">{label}</h3>
  </div>
);

const LogoIcon = ({ entry, size = 'md' }) => {
  const [err, setErr] = useState(false);
  const wrap = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const img  = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
  const LucideIcon = getLucideIcon(entry);
  const url  = !err && !LucideIcon ? getLogoUrl(entry) : null;
  return (
    <div className={`${wrap} bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700 overflow-hidden shrink-0`}>
      {LucideIcon
        ? <LucideIcon className={`${img} text-zinc-300`} />
        : url
          ? <img src={url} className={`${img} object-contain`} alt="" onError={() => setErr(true)} />
          : <CreditCard className="w-4 h-4 text-zinc-300" />}
    </div>
  );
};

const CategoryBadge = ({ cat, tiny = false }) => {
  const Icon = cat.icon;
  if (tiny) return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg ${cat.bg} border ${cat.border}`}>
      <Icon className={`w-2.5 h-2.5 ${cat.color}`} />
    </div>
  );
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl ${cat.bg} border ${cat.border}`}>
      <Icon className={`w-3 h-3 ${cat.color}`} />
      <span className={`text-xs font-medium ${cat.color}`}>{cat.label}</span>
    </div>
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
      target = new Date(today.getFullYear(), today.getMonth(), day);
      if (target < today) target.setMonth(target.getMonth() + 1);
    }
    return Math.round((target - today) / 86400000);
  })();

  const daysLabel = (() => {
    if (daysLeft === null) return null;
    if (daysLeft === 0) return t.deadline_today;
    if (daysLeft === 1) return t.deadline_tomorrow;
    return lang === 'de' ? `in ${daysLeft} T.` : `in ${daysLeft}d`;
  })();

  return (
    <div className="w-[168px] bg-[#1C1C1E] rounded-[28px] p-5 border border-zinc-800 active:scale-[0.97] transition shrink-0 flex flex-col
      lg:w-full lg:flex-row lg:items-center lg:gap-3 lg:rounded-2xl lg:p-4 lg:active:scale-100 lg:hover:border-zinc-700">
      <div className="flex justify-between items-start mb-4 lg:mb-0 lg:contents">
        <LogoIcon entry={entry} size="md" />
        <span className={`text-[10px] font-bold px-2 py-1 rounded-xl border shrink-0 ml-2 lg:order-last lg:ml-0 ${
          daysLeft === 0 ? 'text-red-400 bg-red-500/15 border-red-500/30' :
          daysLeft === 1 ? 'text-amber-400 bg-amber-500/15 border-amber-500/30' :
          'text-white bg-zinc-800 border-zinc-700'
        }`}>{daysLabel ?? entry.date}</span>
      </div>
      <div className="lg:min-w-0 lg:flex-1">
        <p className="font-semibold text-sm leading-snug mb-2 flex-1 lg:mb-0" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{entry.name}</p>
        <div className="flex items-center justify-between gap-1 lg:justify-start lg:gap-2 lg:mt-0.5">
          <p className="text-zinc-400 text-xs truncate">{fmtOriginal(entry)}</p>
          {cat && <CategoryBadge cat={cat} tiny />}
        </div>
      </div>
    </div>
  );
};

const EntryRow = ({ entry, fmt, fmtOriginal, monthly, onEdit, onDelete, docCount = 0 }) => {
  const t    = useT();
  const lang = useLang();
  const isDesktop = useIsDesktop();
  const cat = entry.category ? getCat(entry.category) : null;
  const deadlineDays = daysUntil(cancelByDate(entry));
  const deadlineSoon = deadlineDays !== null && deadlineDays <= 60;
  const x = useMotionValue(0);
  const startRef = useRef(null);
  const isVertical = useRef(false);
  const axisLocked = useRef(false); // ось зафиксирована — больше не переключаем

  const onPointerDown = (e) => {
    startRef.current = { x: e.clientX, y: e.clientY };
    isVertical.current = false;
    axisLocked.current = false;
  };

  const onPointerMove = (e) => {
    if (!startRef.current || axisLocked.current) return;
    const dx = Math.abs(e.clientX - startRef.current.x);
    const dy = Math.abs(e.clientY - startRef.current.y);
    // Ждём минимум 20px перед определением оси
    if (dx < 20 && dy < 20) return;
    // Угол > ~22° от горизонтали (dy/dx > 0.2) считаем скроллом
    if (dy > dx * 0.2) {
      isVertical.current = true;
      axisLocked.current = true;
      x.set(0);
    } else {
      axisLocked.current = true; // горизонталь — фиксируем, не даём перепрыгнуть
    }
  };

  // ── Десктоп: клик по строке — редактирование, действия по наведению ──
  if (isDesktop) {
    const meta = [
      entry.provider || null,
      fmtBillingDate(entry.date, t, lang),
      entry.status === 'trial' && entry.trial_end ? fmtDateFromISO(entry.trial_end, lang, t.months_short) : null,
      entry.period === 'yearly' ? `≈ ${fmt(monthly(entry))} / ${t.sub_per_month}` : null,
    ].filter(Boolean).join(' · ');

    return (
      <div onClick={onEdit}
        className="group flex items-center gap-4 px-5 py-3.5 bg-[#1C1C1E] hover:bg-zinc-800/40 transition cursor-pointer">
        <LogoIcon entry={entry} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{entry.name}</p>
            {cat && <CategoryBadge cat={cat} tiny />}
            {entry.status === 'paused' && <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded-lg shrink-0">{t.badge_paused}</span>}
            {entry.status === 'trial'  && <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-lg shrink-0">{t.badge_trial}</span>}
            {deadlineSoon && <DeadlineBadge days={deadlineDays} />}
            {docCount > 0 && (
              <span title={t.docs_count(docCount)}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-400 bg-zinc-500/10 border border-zinc-600/40 px-1.5 py-0.5 rounded-lg shrink-0">
                <Paperclip className="w-2.5 h-2.5" />{docCount}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 truncate mt-0.5">{meta}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold">{fmtOriginal(entry)}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">
            / {entry.period === 'yearly' ? t.sub_per_year : t.sub_per_month}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-40 group-hover:opacity-100 transition">
          <button type="button" title={t.modal_edit}
            onClick={e => { e.stopPropagation(); onEdit(); }}
            className="w-8 h-8 rounded-xl border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button type="button" title={t.sub_delete}
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="w-8 h-8 rounded-xl border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}>
      <div className="absolute inset-0 flex">
        <div className="flex-1 bg-emerald-600/90 flex items-center pl-6 text-xs font-semibold gap-2">
          <Pencil className="w-3.5 h-3.5" /> {t.modal_edit}
        </div>
        <div className="flex-1 bg-red-600/90 flex items-center justify-end pr-6 text-xs font-semibold gap-2">
          {t.sub_delete} <Trash2 className="w-3.5 h-3.5" />
        </div>
      </div>
      <motion.div
        data-no-tab-swipe
        drag={isVertical.current ? false : 'x'}
        dragConstraints={{ left: -90, right: 90 }}
        dragElastic={0.08}
        dragSnapToOrigin
        style={{ x }}
        onDragEnd={(_, info) => {
          if (!isVertical.current) {
            if (info.offset.x <= -70) onDelete();
            else if (info.offset.x >= 70) onEdit();
          }
          startRef.current = null;
          isVertical.current = false;
          axisLocked.current = false;
        }}
        className={`relative flex items-center px-4 py-3 gap-3 bg-[#1C1C1E]`}>
        <LogoIcon entry={entry} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{entry.name}</p>
            {cat && <CategoryBadge cat={cat} tiny />}
            {entry.status === 'paused' && <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded-lg shrink-0">{t.badge_paused}</span>}
            {entry.status === 'trial'  && <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-lg shrink-0">{t.badge_trial}</span>}
            {deadlineSoon && <DeadlineBadge days={deadlineDays} />}
            {docCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-zinc-400 bg-zinc-500/10 border border-zinc-600/40 px-1.5 py-0.5 rounded-lg shrink-0">
                <Paperclip className="w-2.5 h-2.5" />{docCount}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 truncate">
            {fmtOriginal(entry)} / {entry.period === 'yearly' ? t.sub_per_year : t.sub_per_month}
            {fmtBillingDate(entry.date, t, lang) && ` · ${fmtBillingDate(entry.date, t, lang)}`}
            {entry.status === 'trial' && entry.trial_end && ` · ${fmtDateFromISO(entry.trial_end, lang, t.months_short)}`}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Валюта ────────────────────────────────────────────────────────────────────
const CurrencySelector = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const curr = getCurrency(value);
  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 bg-zinc-800/70 hover:bg-zinc-700/70 border border-zinc-700 text-zinc-300 text-xs font-semibold px-3 py-1.5 rounded-full transition active:scale-95">
        {curr.label} <ChevronDown className="w-3 h-3" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.96 }} transition={{ duration: 0.12 }}
            className="absolute top-9 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden z-50 min-w-[130px]">
            {CURRENCIES.map(c => (
              <button key={c.code} onClick={() => { onChange(c.code); setOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-zinc-800 transition">
                <span className={value === c.code ? 'text-white font-semibold' : 'text-zinc-400'}>{c.label}</span>
                {value === c.code && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Модалка ───────────────────────────────────────────────────────────────────
// ─── DatePicker ────────────────────────────────────────────────────────────────
const DatePicker = ({ value, onChange, label }) => {
  const t    = useT();
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const today = new Date();
  const parsed = value ? new Date(value) : null;
  const [viewYear,  setViewYear]  = useState(parsed?.getFullYear()  ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth()     ?? today.getMonth());
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, [open]);

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
      <div
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 cursor-pointer active:bg-amber-500/20 transition">
        <CalendarDays className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="text-xs text-amber-400 font-medium">{label}</span>
        <span className="ml-auto text-sm">
          {parsed
            ? <span className="text-zinc-200">{fmtDateFromISO(value, lang, t.months_short)}</span>
            : <span className="text-zinc-600">{t.datepicker_choose}</span>}
        </span>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 right-0 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl z-50 p-4">
            {/* Навигация по месяцу */}
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={prevMonth}
                className="w-7 h-7 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 active:scale-95 transition">
                <ChevronDown className="w-3.5 h-3.5 rotate-90" />
              </button>
              <span className="text-sm font-semibold">{t.months_full[viewMonth]} {viewYear}</span>
              <button type="button" onClick={nextMonth}
                className="w-7 h-7 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 active:scale-95 transition">
                <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
              </button>
            </div>
            {/* Дни недели */}
            <div className="grid grid-cols-7 mb-1">
              {t.days_short.map(d => <div key={d} className="text-center text-[10px] text-zinc-600 font-semibold uppercase py-1">{d}</div>)}
            </div>
            {/* Дни */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, i) => {
                if (!day) return <div key={`e-${i}`} />;
                const isSelected = day === selectedDay && viewMonth === selectedMonth && viewYear === selectedYear;
                const isToday    = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                return (
                  <button key={day} type="button" onClick={() => selectDay(day)}
                    className={`aspect-square rounded-xl text-xs font-medium transition active:scale-95
                      ${isSelected ? 'bg-amber-500 text-black font-bold'
                        : isToday   ? 'bg-zinc-700 text-white'
                        : 'text-zinc-300 hover:bg-zinc-800'}`}>
                    {day}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Formular-Bausteine ───────────────────────────────────────────────────────
const INPUT_CLASS = 'w-full bg-black border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-500 transition placeholder:text-zinc-600';

const FieldShell = ({ label, hint, children }) => (
  <label className="block space-y-1.5">
    <span className="block text-[11px] text-zinc-500 px-1">{label}</span>
    {children}
    {hint && <span className="block text-[10px] text-zinc-600 px-1">{hint}</span>}
  </label>
);

const SelectInput = ({ value, onChange, placeholder, options }) => (
  <div className="relative">
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`${INPUT_CLASS} appearance-none pr-10 ${value ? 'text-white' : 'text-zinc-600'}`}>
      <option value="">{placeholder}</option>
      {options.map(option => (
        <option key={option.value} value={option.value} className="text-white">{option.label}</option>
      ))}
    </select>
    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
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
          className="w-8 h-8 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-200 transition disabled:opacity-40">
          {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <button type="button" onClick={copy} disabled={disabled || !value} title={t.access_copy}
          className={`w-8 h-8 flex items-center justify-center rounded-xl transition disabled:opacity-40 ${copied ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-200'}`}>
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
        className={`${INPUT_CLASS} ${inputType === 'date' ? '[color-scheme:dark]' : ''}`}
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
      <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500 px-1">{t.custom_fields}</p>

      {custom.map(field => (
        <div key={field.id} className="rounded-2xl border border-zinc-800 bg-black/40 p-3 space-y-2">
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
              className="w-11 shrink-0 rounded-2xl border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:border-red-500/40 transition">
              <Trash2 className="w-3.5 h-3.5" />
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
              className={`${INPUT_CLASS} ${field.type === 'date' ? '[color-scheme:dark]' : ''}`}
              placeholder={t.custom_value}
              value={field.value}
              onChange={e => update(field.id, { value: e.target.value })}
            />
          )}
        </div>
      ))}

      <button type="button" onClick={add}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-dashed border-zinc-700 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition">
        <Plus className="w-3.5 h-3.5" />{t.custom_add}
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
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/90 leading-relaxed">{t.vault_unavailable}</p>
      </div>
    );
  }

  if (vaultState.unlocked) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
        <KeyRound className="w-4 h-4 text-emerald-400 shrink-0" />
        <p className="text-xs text-emerald-200/90 flex-1">{t.vault_title}</p>
        <button type="button" onClick={vaultState.lock}
          className="text-[11px] font-semibold text-emerald-300 border border-emerald-500/40 rounded-xl px-2.5 py-1 hover:bg-emerald-500/15 transition">
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
    <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Lock className="w-3.5 h-3.5 text-zinc-400" />
        <p className="text-xs font-semibold text-zinc-200">
          {vaultState.configured ? t.vault_locked : t.vault_title}
        </p>
      </div>

      <p className="text-[11px] text-zinc-500 leading-relaxed">
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
          <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200/90 leading-relaxed">{t.vault_warning}</p>
          </div>
        </>
      )}

      {error && <p className="text-[11px] text-red-400 px-1">{error}</p>}

      <button type="button" onClick={submit} disabled={busy || !passphrase}
        className="w-full bg-white text-black text-sm font-semibold py-2.5 rounded-2xl hover:bg-zinc-200 active:scale-[0.98] transition disabled:opacity-40">
        {vaultState.configured ? t.vault_unlock : t.vault_create}
      </button>

      {vaultState.configured && (
        <button type="button" onClick={resetVault}
          className="w-full text-[11px] text-zinc-600 hover:text-red-400 transition py-1">
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
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/90">{t.docs_unavailable}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-zinc-500 px-1">{t.docs_hint}</p>

      {documents.length === 0 ? (
        <p className="text-sm text-zinc-600 text-center py-6">{t.docs_empty}</p>
      ) : (
        <div className="rounded-2xl border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
          {documents.map(document => (
            <div key={document.id} className="flex items-center gap-3 px-3 py-2.5 bg-black/40">
              <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{document.name}</p>
                <p className="text-[10px] text-zinc-600">
                  {documentStore.formatSize(document.size)} · {fmtDateFromISO(document.addedAt, lang, t.months_short)}
                </p>
              </div>
              <button type="button" title={t.docs_open}
                onClick={() => documentStore.openDocument(document.id)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 hover:text-sky-400 transition">
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button type="button" title={t.docs_download}
                onClick={() => documentStore.openDocument(document.id, { download: true })}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 hover:text-emerald-400 transition">
                <Download className="w-3.5 h-3.5" />
              </button>
              <button type="button" title={t.docs_delete}
                onClick={() => removeDocument(document.id)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 hover:text-red-400 transition">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-[11px] text-red-400 px-1">{error}</p>}

      <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-zinc-700 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition disabled:opacity-40">
        <Upload className="w-3.5 h-3.5" />{t.docs_add}
      </button>
      <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFiles} />
    </div>
  );
};

// ─── Eintrag anlegen / bearbeiten ─────────────────────────────────────────────
const MODAL_TABS = [
  { id: 'basics',  labelKey: 'tab_basics',  icon: Wallet },
  { id: 'details', labelKey: 'tab_details', icon: ClipboardList },
  { id: 'access',  labelKey: 'tab_access',  icon: KeyRound },
  { id: 'docs',    labelKey: 'tab_docs',    icon: Paperclip },
];

const NOTICE_OPTIONS = [1, 2, 3, 6, 12];

const EntryModal = ({ initial, currency, vaultState, onSave, onClose, onDocsChange }) => {
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

  const [suggestions,     setSuggestions]     = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dayError, setDayError] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const justApplied = useRef(false);
  const priceRef    = useRef(null);

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
  useEffect(() => {
    if (justApplied.current) { justApplied.current = false; return; }
    const q = name.trim().toLowerCase();
    if (q.length < 1) { setSuggestions([]); setShowSuggestions(false); return; }

    const matches = SERVICE_CATALOG.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.aliases || []).some(a => a.toLowerCase().includes(q))
    ).slice(0, 5);

    setSuggestions(matches);
    setShowSuggestions(matches.length > 0 && !initial);
  }, [name, initial]);

  const applySuggestion = (service) => {
    justApplied.current = true;
    setName(service.name);
    setCategory(service.category);
    if (!provider) setProvider(service.name);
    setShowSuggestions(false);
    setSuggestions([]);
    setTimeout(() => priceRef.current?.focus(), 50);
  };

  const setField = (id, value) => setFields(prev => ({ ...prev, [id]: value }));

  const canSave = Boolean(name.trim()) && !saving;

  const handleSubmit = async () => {
    if (!canSave) return;

    const dayNum = Number(day);
    if (day && (dayNum < 1 || dayNum > 31)) {
      setTab('basics');
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
          setTab('access');
          setSecretError(t.vault_locked);
          return;
        }
        setSaving(false);
      } else {
        setTab('access');
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

  const cancelBy = cancelByDate({
    contract_end: contractEnd,
    notice_period_months: noticeMonths ? Number(noticeMonths) : null,
    auto_renew: autoRenew,
  });

  const templateFields = templateFor(category);
  const catalogEntry   = getCatalogEntry(initial?.name) || getCatalogEntry(name);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
      <motion.div
        initial={isDesktop ? { opacity: 0, scale: 0.96, y: 12 } : { y: '100%', opacity: 0 }}
        animate={isDesktop ? { opacity: 1, scale: 1, y: 0 }      : { y: 0, opacity: 1 }}
        exit={isDesktop    ? { opacity: 0, scale: 0.96, y: 12 } : { y: '100%', opacity: 0 }}
        transition={isDesktop ? { duration: 0.16, ease: 'easeOut' } : { type: 'spring', damping: 26, stiffness: 220 }}
        className={isDesktop
          ? 'fixed inset-0 m-auto h-fit w-[680px] max-h-[88vh] overflow-y-auto no-scrollbar bg-zinc-900 rounded-[32px] p-8 z-50 border border-zinc-800 shadow-2xl'
          : 'fixed inset-x-4 bottom-4 top-16 overflow-y-auto no-scrollbar bg-zinc-900 rounded-[36px] p-6 z-50 border border-zinc-800 max-w-[450px] mx-auto shadow-2xl'}>

        <h2 className="text-xl font-semibold mb-4 text-center lg:text-left lg:text-2xl">
          {initial ? t.modal_edit : t.modal_new}
        </h2>

        {/* Reiter */}
        <div className="flex gap-1 p-1 rounded-2xl bg-black/50 border border-zinc-800 mb-5">
          {MODAL_TABS.map(({ id, labelKey, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold transition ${
                tab === id ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t[labelKey]}</span>
            </button>
          ))}
        </div>

        {/* ── Basis ── */}
        {tab === 'basics' && (
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            <div className="relative lg:col-span-2">
              <input placeholder={t.modal_name_placeholder} className={INPUT_CLASS}
                value={name} onChange={e => setName(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)} />
              <AnimatePresence>
                {showSuggestions && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute top-full mt-1 left-0 right-0 bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden z-50 shadow-2xl">
                    {suggestions.map(service => {
                      const cat = getCat(service.category);
                      const Icon = cat?.icon || Package;
                      const ServiceIcon = service.lucideIcon || null;
                      return (
                        <button key={service.name} type="button"
                          onMouseDown={e => { e.preventDefault(); applySuggestion(service); }}
                          onTouchEnd={e => { e.preventDefault(); applySuggestion(service); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800 transition text-left">
                          {ServiceIcon
                            ? <ServiceIcon className="w-5 h-5 text-zinc-400" />
                            : <img src={faviconUrl(service.domain, 32)} className="w-5 h-5 rounded object-contain" alt=""
                                onError={e => { e.target.style.display = 'none'; }} />}
                          <span className="text-sm flex-1">{service.name}</span>
                          {cat && (
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg ${cat.bg} border ${cat.border}`}>
                              <Icon className={`w-2.5 h-2.5 ${cat.color}`} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <input placeholder={t.modal_provider_placeholder} className={`${INPUT_CLASS} lg:col-span-2`}
              value={provider} onChange={e => setProvider(e.target.value)} />

            {/* Betrag + Währung */}
            <div className="flex gap-2 lg:col-span-1">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">{curr.symbol}</span>
                <input ref={priceRef} type="number" inputMode="decimal" placeholder={t.modal_price_placeholder}
                  className={`${INPUT_CLASS} pl-9`}
                  value={price} onChange={e => setPrice(e.target.value)} />
              </div>
              <ModalCurrencySelector value={modalCurrency} onChange={setModalCurrency} />
            </div>

            {/* Rhythmus */}
            <div className="flex gap-2 lg:col-span-1">
              {['monthly', 'yearly'].map(p => (
                <button key={p} type="button" onClick={() => { setPeriod(p); if (p === 'monthly') setMonth(''); }}
                  className={`flex-1 py-3 rounded-2xl text-sm font-medium border transition ${period === p ? 'bg-white text-black border-white' : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'}`}>
                  {p === 'monthly' ? t.modal_monthly : t.modal_yearly}
                </button>
              ))}
            </div>

            {/* Status */}
            <div className="flex gap-2 lg:col-span-2">
              {[
                { id: 'active', label: t.modal_status_active, color: 'text-green-400', bg: 'bg-green-500/15', border: 'border-green-500/40' },
                { id: 'paused', label: t.modal_status_paused, color: 'text-red-400',   bg: 'bg-red-500/15',   border: 'border-red-500/40'   },
                { id: 'trial',  label: t.modal_status_trial,  color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/40' },
              ].map(s => (
                <button key={s.id} type="button" onClick={() => setStatus(s.id)}
                  className={`flex-1 py-2.5 rounded-2xl text-xs font-semibold border transition ${status === s.id ? `${s.bg} ${s.border} ${s.color}` : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}>
                  {s.label}
                </button>
              ))}
            </div>

            {status === 'trial' && (
              <div className="lg:col-span-2">
                <DatePicker value={trialEnd} onChange={setTrialEnd} label={t.modal_trial_end} />
              </div>
            )}

            {/* Abbuchungsdatum — bei Testphasen liefert trial_end das Datum */}
            {status !== 'trial' && (
              <div className="space-y-1.5 lg:col-span-2">
                <p className="text-[11px] text-zinc-500 px-1">
                  {period === 'yearly' ? t.modal_billing_date : t.modal_billing_day}
                </p>
                <div className="flex gap-2">
                  <input type="number" inputMode="numeric" min="1" max="31"
                    placeholder={period === 'yearly' ? t.modal_day_placeholder : t.modal_day_billing_placeholder}
                    className={`${period === 'yearly' ? 'flex-1' : 'w-full'} bg-black border rounded-2xl px-4 py-3 text-sm focus:outline-none transition
                      ${dayError ? 'border-red-500 shake' : 'border-zinc-800 focus:border-zinc-500'}`}
                    value={day}
                    onChange={e => { const v = e.target.value; if (v === '' || (Number(v) >= 1 && Number(v) <= 31)) setDay(v); }} />
                  {period === 'yearly' && (
                    <div className="flex-1"><MonthPicker value={month} onChange={setMonth} /></div>
                  )}
                </div>
              </div>
            )}

            {/* Kategorie */}
            <div className="flex flex-wrap gap-2 lg:col-span-2">
              {CATEGORIES.map(cat => {
                const Icon   = cat.icon;
                const active = category === cat.id;
                return (
                  <button key={cat.id} type="button" onClick={() => setCategory(active ? '' : cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium border transition ${active ? `${cat.bg} ${cat.border} ${cat.color}` : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}>
                    <Icon className="w-3 h-3" />{t[cat.labelKey]}
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-2">
              <FieldShell label={t.modal_notes}>
                <textarea rows={2} className={`${INPUT_CLASS} resize-none`} placeholder={t.modal_notes_placeholder}
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </FieldShell>
            </div>
          </div>
        )}

        {/* ── Details ── */}
        {tab === 'details' && (
          <div className="space-y-5">
            {/* Laufzeit & Kündigungsfrist */}
            <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 space-y-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.contract_section}</p>

              <div className="grid grid-cols-2 gap-3">
                <FieldShell label={t.contract_start}>
                  <input type="date" className={`${INPUT_CLASS} [color-scheme:dark]`}
                    value={contractStart} onChange={e => setContractStart(e.target.value)} />
                </FieldShell>
                <FieldShell label={t.contract_end}>
                  <input type="date" className={`${INPUT_CLASS} [color-scheme:dark]`}
                    value={contractEnd} onChange={e => setContractEnd(e.target.value)} />
                </FieldShell>
              </div>

              <FieldShell label={t.notice_period}>
                <SelectInput value={noticeMonths} onChange={setNoticeMonths} placeholder={t.notice_none}
                  options={NOTICE_OPTIONS.map(n => ({ value: String(n), label: t.notice_months(n) }))} />
              </FieldShell>

              <button type="button" onClick={() => setAutoRenew(v => !v)}
                className="w-full flex items-center gap-3 text-left">
                <span className={`w-9 h-5 rounded-full p-0.5 transition shrink-0 ${autoRenew ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                  <motion.span animate={{ x: autoRenew ? 16 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="block w-4 h-4 rounded-full bg-white" />
                </span>
                <span className="text-xs text-zinc-300">{t.auto_renew}</span>
              </button>

              {cancelBy && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <p className="text-[11px] text-amber-200/90">
                    {t.cancel_by_hint(fmtDateFromISO(cancelBy, lang, t.months_short))}
                  </p>
                </div>
              )}
            </div>

            {/* Kategoriespezifische Felder */}
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500 px-1">{t.details_template}</p>
              {!category && <p className="text-xs text-zinc-600 px-1">{t.details_empty}</p>}
              <div className="grid gap-3 lg:grid-cols-2">
                {templateFields.map(field => (
                  <TemplateField key={field.id} field={field}
                    value={fields[field.id] || ''} onChange={value => setField(field.id, value)} />
                ))}
              </div>
            </div>

            {/* Abrechnung & Kontakt */}
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500 px-1">{t.details_common}</p>
              <div className="grid gap-3 lg:grid-cols-2">
                {COMMON_FIELDS.map(field => (
                  <TemplateField key={field.id} field={field}
                    value={fields[field.id] || ''} onChange={value => setField(field.id, value)} />
                ))}
              </div>
            </div>

            <CustomFields custom={custom} onChange={setCustom} />
          </div>
        )}

        {/* ── Zugang ── */}
        {tab === 'access' && (
          <div className="space-y-3">
            <FieldShell label={t.access_url}>
              <div className="flex gap-2">
                <input type="url" className={INPUT_CLASS} placeholder="https://..."
                  value={url} onChange={e => setUrl(e.target.value)} />
                <a href={url || undefined} target="_blank" rel="noopener noreferrer" title={t.access_open}
                  className={`w-12 shrink-0 rounded-2xl border border-zinc-800 flex items-center justify-center transition ${url ? 'text-zinc-400 hover:text-sky-400 hover:border-sky-500/40' : 'text-zinc-700 pointer-events-none'}`}>
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

            {secretError && <p className="text-[11px] text-red-400 px-1">{secretError}</p>}

            <FieldShell label={t.access_note}>
              <textarea rows={2} className={`${INPUT_CLASS} resize-none`}
                value={loginNote} onChange={e => setLoginNote(e.target.value)} />
            </FieldShell>
          </div>
        )}

        {/* ── Dokumente ── */}
        {tab === 'docs' && (
          <DocumentsPanel entryId={entryId} onChange={onDocsChange} />
        )}

        {/* Kündigungshilfe aus dem Katalog */}
        {catalogEntry?.cancelUrl && tab === 'basics' && (
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
              <X className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="text-xs text-zinc-400">
                {t.cancel_how}
                <a href={catalogEntry.cancelUrl} target="_blank" rel="noopener noreferrer"
                  className="text-red-400 hover:text-red-300 transition underline underline-offset-2">
                  {t.cancel_link}
                </a>
              </span>
            </div>
            <div className="px-4 py-3 space-y-2">
              {catalogEntry.cancelSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="text-[10px] font-bold text-zinc-600 mt-0.5 shrink-0 w-3">{i + 1}.</span>
                  <span className="text-xs text-zinc-400 leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="lg:flex lg:flex-row-reverse lg:gap-3 lg:mt-7">
          <button disabled={!canSave} onClick={handleSubmit}
            className="mt-5 w-full bg-white text-black font-semibold py-3.5 rounded-2xl hover:bg-zinc-200 active:scale-95 transition disabled:opacity-40 disabled:hover:bg-white text-sm lg:mt-0 lg:flex-1">
            {initial ? t.modal_save : t.modal_add}
          </button>
          <button type="button" onClick={onClose}
            className="mt-3 mb-2 w-full text-zinc-400 text-sm py-2 hover:text-zinc-200 transition lg:my-0 lg:flex-1 lg:py-3.5 lg:rounded-2xl lg:border lg:border-zinc-800 lg:hover:bg-zinc-800">
            {t.modal_cancel}
          </button>
        </div>
      </motion.div>
    </>
  );
};

const ModalCurrencySelector = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const curr = getCurrency(value);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="h-full bg-black border border-zinc-800 rounded-2xl px-3 py-3 text-sm flex items-center gap-1 focus:outline-none focus:border-zinc-500 transition text-zinc-300 font-semibold whitespace-nowrap">
        {curr.code} <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.12 }}
            className="absolute bottom-14 right-0 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden z-50 min-w-[120px]">
            {CURRENCIES.map(c => (
              <button key={c.code} type="button" onClick={() => { onChange(c.code); setOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-zinc-800 transition">
                <span className={value === c.code ? 'text-white font-semibold' : 'text-zinc-400'}>{c.label}</span>
                {value === c.code && <Check className="w-3 h-3 text-white" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Gespeichert wird das kanonische englische Kürzel, angezeigt das übersetzte
const MonthPicker = ({ value, onChange }) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const selectedIndex = MONTHS_SHORT.indexOf(value);

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full bg-black border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-left flex justify-between items-center focus:outline-none focus:border-zinc-500 transition">
        <span className={value ? 'text-white' : 'text-zinc-600'}>
          {selectedIndex >= 0 ? t.months_short[selectedIndex] : t.modal_month_placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.12 }}
            className="absolute bottom-14 left-0 right-0 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden z-50 grid grid-cols-3">
            {MONTHS_SHORT.map((m, i) => (
              <button key={m} type="button" onClick={() => { onChange(m); setOpen(false); }}
                className={`py-2.5 text-sm transition hover:bg-zinc-800 ${value === m ? 'font-semibold text-white' : 'text-zinc-400'}`}>
                {t.months_short[i]}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const NavItem = ({ icon: Icon, label, active, onClick }) => (
  <button type="button" onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1 text-xs font-medium tracking-[0.1em] uppercase ${active ? 'text-white' : 'text-zinc-500'}`}>
    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition ${active ? 'bg-white text-black border-white' : 'border-zinc-800 bg-zinc-900/60'}`}>
      <Icon className="w-4 h-4" />
    </div>
    <span className="text-[9px]">{label}</span>
  </button>
);

// ─── Десктоп: шапка страницы ──────────────────────────────────────────────────
const PageHeader = ({ title, subtitle, children, className = '' }) => (
  <header className={`hidden lg:flex items-end justify-between gap-6 ${className}`}>
    <div className="min-w-0">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-zinc-500 mt-1.5">{subtitle}</p>}
    </div>
    {children && <div className="shrink-0 flex items-center gap-2">{children}</div>}
  </header>
);

// ─── Десктоп: боковая навигация ───────────────────────────────────────────────
const SideNavItem = ({ icon: Icon, label, shortcut, active, onClick }) => (
  <button type="button" onClick={onClick}
    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium border transition ${
      active
        ? 'bg-zinc-800 text-white border-zinc-700'
        : 'text-zinc-500 border-transparent hover:text-zinc-200 hover:bg-zinc-900'
    }`}>
    <Icon className="w-4 h-4 shrink-0" />
    <span className="truncate">{label}</span>
    <kbd className={`ml-auto text-[10px] leading-none px-1.5 py-1 rounded-md border ${
      active ? 'border-zinc-700 text-zinc-400' : 'border-zinc-800 text-zinc-600'
    }`}>{shortcut}</kbd>
  </button>
);

const DesktopSidebar = ({ activeTab, onSwitch, onAdd, lang, toggleLang, count, total }) => {
  const t = useT();
  return (
    <aside className="hidden lg:flex flex-col w-[264px] shrink-0 h-screen sticky top-0 bg-black border-r border-zinc-900 px-5 py-7">
      <div className="flex items-center gap-3 px-1">
        <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-lg shrink-0">
          <Wallet className="w-5 h-5 text-black" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold tracking-tight leading-none">{APP_NAME}</p>
          <p className="text-[11px] text-zinc-500 mt-1.5 truncate">{t.active_count(count)}</p>
        </div>
      </div>

      <button onClick={onAdd}
        className="mt-7 w-full flex items-center justify-center gap-2 bg-white text-black font-semibold text-sm rounded-2xl py-3 hover:bg-zinc-200 active:scale-[0.97] transition shadow-lg">
        <Plus className="w-4 h-4" />
        {t.add_sub}
      </button>

      <nav className="mt-7 flex flex-col gap-1">
        <SideNavItem icon={Home}         label={t.nav_home}      shortcut="1" active={activeTab === 'home'}      onClick={() => onSwitch('home')} />
        <SideNavItem icon={CalendarDays} label={t.nav_calendar}  shortcut="2" active={activeTab === 'calendar'}  onClick={() => onSwitch('calendar')} />
        <SideNavItem icon={BarChart2}    label={t.nav_analytics} shortcut="3" active={activeTab === 'analytics'} onClick={() => onSwitch('analytics')} />
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-semibold">{t.per_month}</p>
          <p className="text-2xl font-semibold tracking-tight mt-1">{total}</p>
        </div>
        <div className="flex items-center gap-2">
          <SupportMenu align="top" />
          <button onClick={toggleLang}
            className="relative flex items-center h-10 flex-1 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-1 hover:border-zinc-700 transition">
            <motion.div
              animate={{ x: lang === 'en' ? '100%' : '0%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute left-1 top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-sm"
            />
            <span className={`relative z-10 flex-1 text-center text-[11px] font-bold tracking-wide transition-colors ${lang === 'de' ? 'text-black' : 'text-zinc-500'}`}>DE</span>
            <span className={`relative z-10 flex-1 text-center text-[11px] font-bold tracking-wide transition-colors ${lang === 'en' ? 'text-black' : 'text-zinc-500'}`}>EN</span>
          </button>
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
    // Автодетект при первом визите: ru/uk/be → RU, всё остальное → EN
    const nav = (navigator.language || navigator.languages?.[0] || 'en').toLowerCase();
    return nav.startsWith('de') ? 'de' : 'en';
  });

  const toggleLang = () => {
    const next = lang === 'de' ? 'en' : 'de';
    setLang(next);
    localStorage.setItem('lang', next);
  };

  if (!onboarded) return (
    <LangContext.Provider value={lang}>
      <Onboarding toggleLang={toggleLang} lang={lang} onDone={() => {
        setOnboarded(true);
        localStorage.setItem('onboarded', '1');
      }} />
    </LangContext.Provider>
  );

  return (
    <LangContext.Provider value={lang}>
      <App toggleLang={toggleLang} lang={lang} />
    </LangContext.Provider>
  );
}
