import { EXPO_OUT } from '../lib/motion';
import { rankOpacity } from './tokens';

// ─── Balken ───────────────────────────────────────────────────────────────────
// Anteile werden über die Deckkraft einer Tintenfläche unterschieden.
export const MeterRow = ({ leading, title, subtitle, value, meta, share, rank = 0, index = 0 }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        {leading}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          {subtitle && <p className="text-xs text-ink-3 truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold">{value}</p>
        {meta && <p className="text-xs text-ink-3">{meta}</p>}
      </div>
    </div>
    <div className="w-full h-1.5 bg-surface-3 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-ink origin-left"
        style={{
          width: `${Math.max(2, Math.min(100, share))}%`,
          opacity: rankOpacity(rank),
          animation: `bar-fill 600ms ${EXPO_OUT} ${index * 40}ms backwards`,
        }} />
    </div>
  </div>
);
