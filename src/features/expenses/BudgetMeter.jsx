// ─── Der Balken eines Budgets ─────────────────────────────────────────────────
// Nicht MeterRow: dort unterscheidet die Deckkraft einer Tintenfläche die Ränge
// einer Liste. Hier ist der Füllstand ein Status, und Status ist die eine Stelle,
// an der Farbe getragen wird — ruhige Tinte im Rahmen, Warnton kurz davor, Fehler
// darüber.

import { EXPO_OUT } from '../../lib/motion';

const FILL = {
  neutral: 'bg-ink',
  warning: 'bg-warning',
  error:   'bg-error',
};

export const BudgetMeter = ({ ratio = 0, tone = 'neutral', index = 0, thin = false }) => {
  // Über der Grenze läuft der Balken voll und der Ton trägt die Nachricht — ein
  // Balken, der über seinen Rahmen hinausliefe, hätte keinen Rahmen mehr
  const share = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) * 100 : 100;

  return (
    <div className={`w-full ${thin ? 'h-1' : 'h-1.5'} bg-surface-3 rounded-full overflow-hidden`}>
      <div
        className={`h-full rounded-full origin-left ${FILL[tone] || FILL.neutral}`}
        style={{
          width: `${Math.max(share > 0 ? 2 : 0, share)}%`,
          animation: `bar-fill 600ms ${EXPO_OUT} ${index * 40}ms backwards`,
        }} />
    </div>
  );
};
