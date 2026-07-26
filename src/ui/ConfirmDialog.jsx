// ─── Nachfragen ───────────────────────────────────────────────────────────────
// Eine Rückfrage, die aussieht wie der Rest der Anwendung. `window.confirm` tat
// dasselbe, aber in der Schrift des Betriebssystems, ohne Farbschema und in
// einer PWA mitten im Vollbild — ausgerechnet vor den Schritten, die am meisten
// kosten: eine Sicherung einspielen, den Tresor verwerfen, Erfasstes wegwerfen.
//
// Am Telefon fährt sie als Blatt hoch, am Schreibtisch steht sie in der Mitte —
// dieselbe Mechanik wie bei jedem anderen Blatt (§4.3).

import { AlertTriangle } from 'lucide-react';
import { useT } from '../lib/i18n';
import { btn } from './tokens';
import { Overlay } from './Overlay';
import { useIsDesktop } from './hooks';

// Der Ton färbt Symbol und Bestätigungsknopf. `danger` ist rot und meint
// „danach ist es weg“; `default` bleibt Tinte und fragt nur nach.
const TONE_MARK = {
  danger:  'bg-error/10 border-error/30 text-error',
  default: 'bg-surface-3 border-border text-ink-2',
};

export const ConfirmDialog = ({
  open, title, body, confirmLabel, cancelLabel,
  tone = 'danger', icon: Icon = AlertTriangle,
  onConfirm, onCancel,
}) => {
  const t = useT();
  const isDesktop = useIsDesktop();

  return (
    <Overlay open={open} onClose={onCancel} sheet={!isDesktop} labelledBy="confirm-dialog-title"
      panelClass="inset-x-0 bottom-0 mx-auto w-full max-w-[420px] bg-surface-2 border border-border-strong
        rounded-t-2xl px-5 pt-5 pb-8 shadow-2xl
        lg:inset-0 lg:m-auto lg:h-fit lg:rounded-2xl lg:p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${TONE_MARK[tone]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p id="confirm-dialog-title" className="text-sm font-semibold text-ink">{title}</p>
          {body && <p className="text-xs text-ink-3 mt-1 leading-relaxed">{body}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-2 lg:flex-row-reverse lg:gap-3">
        {/* Der Bestätigungsknopf steht zuerst im Dokument, bekommt den Fokus aber
            nicht: eine Rückfrage, die mit dem Finger schon auf „Löschen“ aufgeht,
            ist keine Rückfrage. Die Tastatur landet auf „Abbrechen“. */}
        <button type="button" onClick={onConfirm} data-focus-skip
          className={btn(tone === 'danger' ? 'danger' : 'primary', 'md', 'w-full py-3 lg:flex-1')}>
          {confirmLabel}
        </button>
        <button type="button" onClick={onCancel} className={btn('ghost', 'md', 'w-full py-3 lg:flex-1')}>
          {cancelLabel || t.modal_cancel}
        </button>
      </div>
    </Overlay>
  );
};
