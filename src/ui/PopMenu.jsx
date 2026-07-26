import { useRef } from 'react';
import { DURATION, usePresence, usePopAnimation } from '../lib/motion';
import { PANEL } from './tokens';

// ─── Dropdown 'pop' (§4.3) ────────────────────────────────────────────────────
// Bleibt bis zum Ende der Ausblendung montiert; Zeilen kaskadieren hinein.
//
// Die Rolle wird gereicht, nicht gesetzt: dasselbe Panel trägt mal eine Liste
// aus MenuItems, mal einen Kalender, mal ein Suchfeld mit Raster. „menu“ über
// einem Kalender verspricht der Vorlesesoftware Einträge, die es nicht gibt —
// deshalb sagt es nur, wer wirklich ein Menü ist.
//
// `data-popmenu` bleibt dagegen an jedem Panel: daran erkennt das Blatt
// darunter, dass Escape gerade nicht ihm gilt. Verhalten und Rolle hängen
// so nicht mehr aneinander.
export const PopMenu = ({
  open, children, className = '', origin = 'top left', width = 'w-[240px]', role,
}) => {
  const rendered = usePresence(open, DURATION.ddOut);
  const panelRef = useRef(null);
  usePopAnimation(open, panelRef, { origin });

  if (!rendered) return null;
  return (
    <div ref={panelRef} role={role} data-popmenu
      className={`absolute z-50 ${width} ${PANEL} overflow-hidden p-1 ${className}`}>
      {children}
    </div>
  );
};

export const MenuHeader = ({ title, hint }) => (
  <div className="px-3 pt-2 pb-2.5 mb-1 border-b border-border">
    <p className="text-sm font-medium text-ink">{title}</p>
    {hint && <p className="text-xs text-ink-3 mt-0.5">{hint}</p>}
  </div>
);

// Ein MenuItem steht immer in einem PopMenu mit `role="menu"` — die Rolle bleibt
// überschreibbar, falls es einmal woanders landet.
export const MenuItem = ({ icon: Icon, children, className = '', role = 'menuitem', ...props }) => (
  <button type="button" data-menu-item role={role}
    className={`w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg text-sm
      text-ink-2 hover:bg-surface-3 hover:text-ink transition ${className}`}
    {...props}>
    {Icon && <Icon className="w-4 h-4 shrink-0" />}
    {children}
  </button>
);
