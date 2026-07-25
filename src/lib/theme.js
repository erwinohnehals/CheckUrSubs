// ─── Farbschema ───────────────────────────────────────────────────────────────
// Hell ist der Grundzustand, Dunkel hängt an der Klasse `dark` auf <html> —
// genau wie in design-language.html. Die Vorauswahl setzt bereits ein Inline-
// Skript in index.html, damit beim Start nichts aufblitzt.

import { useCallback, useEffect, useState } from 'react';

export const THEME_KEY = 'goldgeld.theme'; // 'light' | 'dark' | 'system'
const SYSTEM_DARK = '(prefers-color-scheme: dark)';

export const readPreference = () => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch { return 'system'; }
};

export const resolveTheme = (preference) =>
  preference === 'system'
    ? (window.matchMedia(SYSTEM_DARK).matches ? 'dark' : 'light')
    : preference;

// Die Statusleiste der PWA folgt der Flächenfarbe des Themes
const SURFACE = { light: '#F5F3EF', dark: '#161414' };

export const applyTheme = (preference) => {
  const theme = resolveTheme(preference);
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', SURFACE[theme]);
  return theme;
};

export const useTheme = () => {
  const [preference, setPreference] = useState(readPreference);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(SYSTEM_DARK).matches);

  const theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  // Der einzige Nebeneffekt: Klasse, color-scheme und Statusleiste nachziehen
  useEffect(() => {
    applyTheme(preference);
    if (preference === 'system') return;
    try { localStorage.setItem(THEME_KEY, preference); } catch { /* Speicher gesperrt */ }
  }, [preference, theme]);

  // Systemwechsel wirken nur, solange nichts manuell gewählt wurde
  useEffect(() => {
    const mq = window.matchMedia(SYSTEM_DARK);
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggle = useCallback(() => {
    setPreference(prev => (resolveTheme(prev) === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, preference, setPreference, toggle };
};
