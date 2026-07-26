import { useState, useLayoutEffect, useRef } from 'react';
import { useT } from '../lib/i18n';
import { STANDARD_EASE, DURATION, reducedMotion, restartAnimation, usePresence } from '../lib/motion';
import { btn } from './tokens';

// ─── Toast (§4.3) ─────────────────────────────────────────────────────────────
// Unten rechts, Fläche 2 mit kräftigem Rand, dünner Laufbalken.
export const Toast = ({ open, entry, onUndo }) => {
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
