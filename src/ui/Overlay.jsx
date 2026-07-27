import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  STANDARD_EASE, DURATION, reducedMotion, restartAnimation, staggerOverlay, usePresence,
} from '../lib/motion';

// ─── Was den Tastaturfokus fangen darf ────────────────────────────────────────
const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const focusable = (root) =>
  Array.from(root?.querySelectorAll(FOCUSABLE) || [])
    // Ein Feld in einem ausgeblendeten Reiter ist da, aber nicht erreichbar
    .filter(el => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement);

// ─── Sperre für den Hintergrund ───────────────────────────────────────────────
// Der Rumpf trägt `overflow-y: scroll`, damit die Seite beim Wechseln nicht
// springt. Nimmt man ihm das Scrollen, verschwindet der Balken und alles rutscht
// um seine Breite — deshalb wird sie als Polster nachgereicht.
// Gezählt wird, weil sich Blätter stapeln dürfen: erst das letzte gibt frei.
let lockCount = 0;
let restoreScroll = null;

const lockScroll = () => {
  if (lockCount++ > 0) return;
  const { body } = document;
  const gap = window.innerWidth - document.documentElement.clientWidth;
  const previous = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
  body.style.overflow = 'hidden';
  if (gap > 0) body.style.paddingRight = `${gap}px`;
  restoreScroll = () => {
    body.style.overflow = previous.overflow;
    body.style.paddingRight = previous.paddingRight;
  };
};

const unlockScroll = () => {
  if (--lockCount > 0) return;
  lockCount = 0;
  restoreScroll?.();
  restoreScroll = null;
};

// Wer oben liegt, hört auf Escape und fängt den Fokus — ein Blatt unter einem
// anderen tut beides nicht. Die Reihenfolge steht im Dokument selbst, also wird
// dort nachgesehen und keine zweite Liste geführt, die davon abweichen könnte.
const isTopmost = (panel) => {
  if (!panel) return false;
  const panels = document.querySelectorAll('[data-overlay-panel]');
  return panels[panels.length - 1] === panel;
};

// ─── Modal (§4.3) ─────────────────────────────────────────────────────────────
// Am Desktop steigt das Panel auf und skaliert, am Telefon fährt ein Blatt hoch.
// Der Austritt läuft schneller als der Eintritt.
export const Overlay = ({ open, onClose, children, panelClass = '', sheet = false, labelledBy }) => {
  const rendered = usePresence(open, DURATION.modalOut);
  const backdropRef = useRef(null);
  const panelRef    = useRef(null);
  // Wohin der Fokus zurückgeht, wenn das Blatt wieder zu ist
  const openerRef   = useRef(null);

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

    // Der Inhalt kaskadiert nur beim Aufgehen. Beim Schließen geht das Blatt als
    // Ganzes — eine Kaskade rückwärts hielte das Panel länger stehen, als der
    // Griff zum Schließen es verträgt.
    if (enter) staggerOverlay(panelRef.current);
  }, [open, rendered, sheet]);

  // ── Fokus, Sperre und Stapelplatz ────────────────────────────────────────
  // Ein Dialog, aus dem die Tabulatortaste hinausführt, ist für die Tastatur
  // keiner: dahinter liegt eine Seite, die man nicht sieht und trotzdem bedient.
  useEffect(() => {
    if (!open) return;

    openerRef.current = document.activeElement;
    lockScroll();

    // Erst der Eintritt, dann der Fokus — sonst scrollt der Browser das Blatt
    // an seiner Startposition zurecht und die Animation beginnt verrutscht.
    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return;
      // Ein Feld bekommt den Fokus, ein Schließkreuz nicht — sonst steht der
      // Zeiger beim Öffnen schon auf „abbrechen“.
      const target = focusable(panel).find(el => !el.hasAttribute('data-focus-skip'));
      (target || panel).focus({ preventScroll: true });
    }, reducedMotion() ? 0 : DURATION.modalIn);

    return () => {
      window.clearTimeout(focusTimer);
      unlockScroll();

      // Nur zurückgeben, was noch da ist — ein gelöschter Eintrag hat keine Zeile mehr
      const opener = openerRef.current;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open]);

  // Escape schließt — aber erst, wenn kein Menü mehr offen ist. Ein offenes
  // PopMenu fängt die Taste selbst ab und darf das Modal nicht mitreißen.
  // Erkannt wird es am Datenattribut, nicht an der ARIA-Rolle: nicht jedes
  // Panel ist ein Menü, und die Rolle soll das sagen dürfen.
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      // Nur das oberste Blatt hört zu — geprüft beim Drücken, nicht beim
      // Anmelden: über uns kann inzwischen ein weiteres liegen.
      if (!isTopmost(panelRef.current)) return;

      if (e.key === 'Escape') {
        if (document.querySelector('[data-popmenu]')) return;
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const panel = panelRef.current;
      const items = focusable(panel);
      if (items.length === 0) { e.preventDefault(); panel?.focus({ preventScroll: true }); return; }

      const first = items[0];
      const last  = items[items.length - 1];
      const active = document.activeElement;

      // Am Rand umschlagen — und zurückholen, was schon draußen steht
      if (!panel?.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus({ preventScroll: true });
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!rendered) return null;

  // An den Rumpf gehängt, nicht dorthin, wo der Aufruf steht: eine Rückfrage
  // darf aus einem Menü heraus aufgehen, und ein `overflow-hidden` oder ein
  // `transform` über ihr würde sie sonst beschneiden oder festnageln.
  return createPortal(
    <>
      {/* Der Grund tritt zurück: abgedunkelt und weichgezeichnet, damit ein
          Blatt über einer vollen Ansicht als eigene Ebene liest und nicht als
          Kasten darin. Ein Wert für alle Blätter — der Grund gehört dem Haus,
          nicht dem einzelnen Dialog. */}
      <div ref={backdropRef} onClick={onClose}
        className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[6px]" />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={labelledBy}
        data-overlay-panel tabIndex={-1}
        onClick={e => e.stopPropagation()}
        className={`fixed z-50 outline-none ${panelClass}`}>
        {children}
      </div>
    </>,
    document.body,
  );
};
