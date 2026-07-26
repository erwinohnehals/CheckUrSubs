// ─── Währung im Formular ──────────────────────────────────────────────────────
// Sitzt rechts neben einem Betragsfeld und trägt darum nur das Kürzel. Beide
// Bereiche erfassen Beträge in ihrer Währung, also gehört sie hierher.

import { useState, useCallback } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { CURRENCIES, getCurrency } from '../lib/money';
import { PopMenu, MenuItem } from './PopMenu';
import { useDismiss } from './hooks';

export const CurrencySelect = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const curr = getCurrency(value);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="h-full bg-surface border border-border rounded-lg px-3 text-sm flex items-center gap-1
          hover:bg-surface-3 transition text-ink-2 font-medium whitespace-nowrap">
        {curr.code} <ChevronDown className={`w-4 h-4 text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <PopMenu open={open} className="top-full mt-1 right-0" origin="top right" width="w-[150px]">
        {CURRENCIES.map(c => (
          <MenuItem key={c.code} onClick={() => { onChange(c.code); setOpen(false); }}
            className={value === c.code ? 'text-ink' : ''}>
            <span className="flex-1">{c.label}</span>
            {value === c.code && <Check className="w-4 h-4" />}
          </MenuItem>
        ))}
      </PopMenu>
    </div>
  );
};
