import { useCallback, useEffect, useRef, useState } from 'react';
import { STANDARD_EASE, reducedMotion } from '../lib/motion';

// ─── Desktop-Breakpoint (deckt sich mit tailwind lg) ──────────────────────────
// Liegt hier und nicht in App: auch geteilte Bausteine — Bestätigung, Blätter —
// bauen sich am Telefon anders auf als am Schreibtisch.
const DESKTOP_QUERY = '(min-width: 1024px)';

export const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
};

// Schließt Menüs bei Klick daneben und mit Escape
export const useDismiss = (open, onClose) => {
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

// ─── Ungesicherte Eingaben ────────────────────────────────────────────────────
// Ein Formular mit dreißig Feldern, ein Fingertipp neben das Blatt, und alles
// ist weg — ohne Server, von dem sich etwas zurückholen ließe. Also wird beim
// Öffnen gemerkt, wie es dastand, und beim Schließen verglichen.
//
// `snapshot` ist ein einzelner Wert, üblicherweise ein JSON-String: so kostet
// der Vergleich nichts und der Aufrufer entscheidet, was überhaupt zählt.
// Gemerkt wird der erste je gesehene Stand, nicht der aktuelle — was der Tresor
// erst nachträglich entschlüsselt, ist keine Änderung des Benutzers.
export const useDirty = (snapshot) => {
  // Zustand statt Ref: der Anfangswert wird genau einmal ausgewertet und darf
  // im Render gelesen werden.
  const [initial] = useState(snapshot);
  return snapshot !== initial;
};

// Fängt das Schließen ab, solange etwas ungesichert ist. Wer nichts geändert
// hat, merkt davon nichts — die Rückfrage kommt nur, wenn es etwas zu verlieren gibt.
export const useCloseGuard = (dirty, onClose) => {
  const [asking, setAsking] = useState(false);

  const requestClose = useCallback(() => {
    if (dirty) setAsking(true);
    else onClose();
  }, [dirty, onClose]);

  const confirmClose = useCallback(() => { setAsking(false); onClose(); }, [onClose]);
  const cancelClose  = useCallback(() => setAsking(false), []);

  return { asking, requestClose, confirmClose, cancelClose };
};

// ─── Öffnungsrichtung eines Menüs ─────────────────────────────────────────────
// Ein Menü in einer scrollenden Liste weiß nicht, wie viel Platz unter ihm liegt.
// Gemessen wird gegen den nächsten scrollenden Vorfahren, denn der schneidet
// enger ab als das Fenster. Reicht es unten nicht und oben mehr, klappt es hoch.
//
// Gemessen wird beim Öffnen, nicht beim Rendern — der Auslöser steht dann schon,
// und die Richtung bleibt nach dem Schließen stehen: das Menü ist noch montiert
// und soll dort ausblenden, wo es stand.
const scrollParent = (el) => {
  for (let node = el?.parentElement; node; node = node.parentElement) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
  }
  return null;
};

export const useDropUp = (height = 300) => {
  const [up, setUp] = useState(false);

  const measure = useCallback((el) => {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const box  = scrollParent(el)?.getBoundingClientRect();
    const top    = box ? Math.max(box.top, 0) : 0;
    const bottom = box ? Math.min(box.bottom, window.innerHeight) : window.innerHeight;

    const below = bottom - rect.bottom;
    const above = rect.top - top;
    setUp(below < height && above > below);
  }, [height]);

  return [up, measure];
};

// ─── Wischen am Telefon ───────────────────────────────────────────────────────
// Ohne Animationsbibliothek: touch-action übernimmt die vertikale Achse, die
// horizontale bewegen wir selbst und lassen sie mit der Hauskurve zurückgleiten.
export const useSwipeRow = ({ onLeft, onRight, onTap, max = 90, threshold = 70 }) => {
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
