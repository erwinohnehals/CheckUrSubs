import { useEffect, useLayoutEffect, useRef } from 'react';
import {
  STANDARD_EASE, DURATION, reducedMotion, restartAnimation, usePresence,
} from '../lib/motion';

// ─── Modal (§4.3) ─────────────────────────────────────────────────────────────
// Am Desktop steigt das Panel auf und skaliert, am Telefon fährt ein Blatt hoch.
// Der Austritt läuft schneller als der Eintritt.
export const Overlay = ({ open, onClose, children, panelClass = '', sheet = false, labelledBy }) => {
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
