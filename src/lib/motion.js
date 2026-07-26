// ─── Bewegungssprache ─────────────────────────────────────────────────────────
// Die Kurven und Helfer aus design-language.html §4. Animiert wird ausschließlich
// mit CSS-Keyframes (siehe index.css); JS misst nur und setzt Inline-Shorthands.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// ── Kurven ────────────────────────────────────────────────────────────────────
export const STANDARD_EASE = 'cubic-bezier(0.625, 0.05, 0, 1)'; // Hauskurve
export const EXPO_OUT      = 'cubic-bezier(0.19, 1, 0.22, 1)';
export const POWER1_OUT    = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
export const POWER1_IN     = 'cubic-bezier(0.55, 0.085, 0.68, 0.53)';

// ── Dauern ────────────────────────────────────────────────────────────────────
export const DURATION = {
  ddIn: 192,   ddOut: 115,
  modalIn: 320, modalOut: 200, backdropIn: 240,
  toastIn: 400, toastOut: 300,
  viewIn: 250,  viewOut: 250, viewOverlap: 150,
  navSwap: 320,
  pill: 400,
  listItem: 250,
};

export const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Ein identischer animation-Shorthand startet nicht neu — erst leeren,
// Reflow erzwingen, dann setzen. Macht Animationen unterbrechbar.
export const restartAnimation = (el, shorthand) => {
  if (!el) return;
  el.style.animation = '';
  el.getBoundingClientRect();
  el.style.animation = shorthand;
};

// Kaskade für Kinder eines Containers: 250ms STANDARD, 50ms/Element, 20px Aufstieg.
// Deckelt die Anzahl gestaffelter Elemente, damit lange Listen nicht zäh wirken.
export const staggerIn = (elements, { duration = DURATION.listItem, step = 50, rise = 20, base = 0, max = 24 } = {}) => {
  if (reducedMotion()) return;
  Array.from(elements).forEach((el, i) => {
    if (!el) return;
    el.style.setProperty('--rise-y', `${rise}px`);
    restartAnimation(el, `rise-in ${duration}ms ${STANDARD_EASE} ${base + Math.min(i, max) * step}ms backwards`);
  });
};

// Seitliche Kaskade für den Bereichswechsel: dieselbe Staffelung wie staggerIn,
// nur waagerecht. Ein negatives `shift` lässt die Einträge von links einlaufen.
export const staggerSwap = (elements, { shift = 14, duration = DURATION.navSwap, step = 45, base = 0, max = 12 } = {}) => {
  if (reducedMotion()) return;
  Array.from(elements).forEach((el, i) => {
    if (!el) return;
    el.style.setProperty('--swap-x', `${shift}px`);
    restartAnimation(el, `swap-in ${duration}ms ${EXPO_OUT} ${base + Math.min(i, max) * step}ms backwards`);
  });
};

// ── Ein- und Ausblenden mit Nachlauf ──────────────────────────────────────────
// Hält ausblendende Elemente montiert, bis ihre Exit-Animation durch ist.
export const usePresence = (open, exitMs) => {
  const [rendered, setRendered] = useState(open);

  // Öffnen wirkt sofort — noch im selben Durchlauf
  if (open && !rendered) setRendered(true);

  useEffect(() => {
    if (open || !rendered) return;
    // animationend kann in Hintergrund-Tabs verschluckt werden — Timeout mit Puffer
    const id = window.setTimeout(() => setRendered(false), reducedMotion() ? 0 : exitMs + 100);
    return () => window.clearTimeout(id);
  }, [open, exitMs, rendered]);

  return rendered;
};

// ── Dropdown 'pop' ────────────────────────────────────────────────────────────
// Panel wächst aus der Ecke des Auslösers, Zeilen kaskadieren hinterher.
export const usePopAnimation = (open, panelRef, { origin = 'top left' } = {}) => {
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (reducedMotion()) return;

    panel.style.transformOrigin = origin;
    const items = panel.querySelectorAll('[data-menu-item]');

    if (open) {
      restartAnimation(panel, `dd-pop-in ${DURATION.ddIn}ms ${STANDARD_EASE}`);
      items.forEach((item, i) => {
        restartAnimation(item, `dd-item-in 160ms ${STANDARD_EASE} ${64 + i * 19}ms backwards`);
      });
    } else {
      restartAnimation(panel, `dd-pop-out ${DURATION.ddOut}ms ${STANDARD_EASE} forwards`);
      items.forEach((item, i) => {
        // Schließen läuft von unten nach oben
        restartAnimation(item, `dd-item-out 98ms ${STANDARD_EASE} ${(items.length - 1 - i) * 9}ms forwards`);
      });
    }
  }, [open, panelRef, origin]);
};

// ── Gleitende Markierung (Segmented Control) ──────────────────────────────────
// Eine einzige Pille wandert von ihrer aktuellen Position zur neuen Auswahl.
export const useSlidingPill = (activeKey) => {
  const trackRef = useRef(null);
  const pillRef  = useRef(null);
  const items    = useRef(new Map());
  const firstPaint = useRef(true);
  const activeKeyRef = useRef(activeKey);

  const setItem = useCallback((key) => (el) => {
    if (el) items.current.set(key, el);
    else items.current.delete(key);
  }, []);

  const move = useCallback((key, animate) => {
    const pill = pillRef.current;
    const el   = items.current.get(key);
    if (!pill || !el) return;

    pill.style.transition = animate && !reducedMotion()
      ? ['transform', 'width', 'height'].map(p => `${p} ${DURATION.pill}ms ${STANDARD_EASE}`).join(', ')
      : 'none';
    pill.style.transform = `translate(${el.offsetLeft}px, ${el.offsetTop}px)`;
    pill.style.width     = `${el.offsetWidth}px`;
    pill.style.height    = `${el.offsetHeight}px`;
    pill.style.opacity   = '1';
  }, []);

  // Erster Anstrich schnappt, danach wird geglitten
  useLayoutEffect(() => {
    activeKeyRef.current = activeKey;
    move(activeKey, !firstPaint.current);
    firstPaint.current = false;
  }, [activeKey, move]);

  // Layout-Änderungen (Schriftladen, Zähler, Resize) nachziehen. Der Observer
  // bleibt über Auswahlwechsel hinweg bestehen, damit sein initialer Aufruf
  // eine gerade gestartete Gleitbewegung nicht mit einem Snap überschreibt.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => move(activeKeyRef.current, false));
    observer.observe(track);
    return () => observer.disconnect();
  }, [move]);

  return { trackRef, pillRef, setItem };
};

// ── Globales Druckfeedback für Buttons ────────────────────────────────────────
// Ein delegierter Listener statt Handler an jedem Button.
export const useButtonPress = () => {
  useEffect(() => {
    const onPointerDown = (e) => {
      if (reducedMotion()) return;
      const button = e.target.closest?.('button');
      if (!button || button.disabled || button.hasAttribute('data-no-press')) return;
      restartAnimation(button, 'btn-press 400ms linear');
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, []);
};
