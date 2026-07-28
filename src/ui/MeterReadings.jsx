// ─── Zählerstände am Vertrag ──────────────────────────────────────────────────
// Strom, Gas, Wasser: abgelesen wird mehrmals, und erst die Reihe sagt etwas.
// Gerechnet wird in lib/meterReadings.js — hier steht nur, wie es aussieht.
//
// Der Editor gehört ins Formular, die Liste in die Vertragsansicht. Beide
// liegen hier, damit die Reihe an einer Stelle beschrieben ist.

import { Plus, Trash2 } from 'lucide-react';
import { useLang, useT } from '../lib/i18n';
import { fmtDateFromISOWithYear, todayISO } from '../lib/dates';
import { meterSeries, meterSummary, fmtQuantity } from '../lib/meterReadings';
import { INPUT_CLASS } from './tokens';

const newReadingId = () => (globalThis.crypto?.randomUUID
  ? globalThis.crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

// Was zwischen zwei Ständen liegt, in einer Zeile: Verbrauch, Zeitraum, Rate.
// Ohne Vorgänger gibt es nichts zu sagen, und dann sagen wir auch nichts.
const SeriesNote = ({ row, unit }) => {
  const t    = useT();
  const lang = useLang();

  if (!row) return null;
  if (row.meterChanged) return <span className="text-warning">{t.meter_changed}</span>;
  if (row.used === null) return null;

  const used = fmtQuantity(row.used, lang, unit);

  return (
    <span>
      {row.days === 0 ? t.meter_same_day(used) : t.meter_used_since(used, row.days)}
      {row.perDay !== null && ` · ${t.meter_per_day(fmtQuantity(row.perDay, lang, unit, 2))}`}
    </span>
  );
};

// Ø und Hochrechnung über die ganze Reihe — erst ab zwei Ständen zu haben
const SummaryStrip = ({ readings, unit }) => {
  const t    = useT();
  const lang = useLang();
  const summary = meterSummary(readings);

  if (!summary) return null;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-2">
      <span>{t.meter_average}: {t.meter_per_day(fmtQuantity(summary.perDay, lang, unit, 2))}</span>
      <span>{t.meter_projection}: {t.meter_per_year(fmtQuantity(summary.perYear, lang, unit, 0))}</span>
      <span className="text-ink-3">{t.meter_readings_n(summary.count)}</span>
    </div>
  );
};

// ─── Formular ─────────────────────────────────────────────────────────────────
export const MeterReadingsEditor = ({ readings = [], onChange, unit }) => {
  const t = useT();

  // Im Formular steht, was getippt wurde — auch die halb fertige Zeile. Was sich
  // daraus rechnen lässt, kommt aus der Reihe und wird über die ID zugeordnet;
  // angezeigt wird von neu nach alt, gespeichert chronologisch.
  const stats = new Map(meterSeries(readings).map(row => [row.id, row]));
  const rows  = [...readings].sort((a, b) =>
    String(b.date || '').localeCompare(String(a.date || '')));

  const update = (id, patch) =>
    onChange(readings.map(reading => (reading.id === id ? { ...reading, ...patch } : reading)));

  const add = () =>
    onChange([...readings, { id: newReadingId(), date: todayISO(), value: '', note: '' }]);

  const remove = (id) => onChange(readings.filter(reading => reading.id !== id));

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-ink-3 px-1">{t.meter_hint}</p>

      <SummaryStrip readings={readings} unit={unit} />

      {rows.length === 0 && (
        <p className="text-sm text-ink-3 text-center py-6">{t.meter_empty}</p>
      )}

      {rows.map(row => (
        <div key={row.id} className="rounded-xl border border-border bg-surface p-3 space-y-2">
          <div className="flex gap-2">
            <input type="date" aria-label={t.meter_date}
              className={`${INPUT_CLASS} flex-1`}
              value={row.date || ''}
              onChange={e => update(row.id, { date: e.target.value })} />

            <div className="relative flex-1">
              <input type="number" inputMode="decimal" step="any" min="0" aria-label={t.meter_value}
                className={`${INPUT_CLASS} ${unit ? 'pr-14' : ''}`}
                value={row.value ?? ''}
                onChange={e => update(row.id, { value: e.target.value })} />
              {unit && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-3 pointer-events-none">
                  {unit}
                </span>
              )}
            </div>

            <button type="button" onClick={() => remove(row.id)} title={t.meter_remove}
              className="w-11 shrink-0 rounded-lg border border-border flex items-center justify-center text-ink-3 hover:text-error hover:border-error/40 transition">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <input className={INPUT_CLASS} placeholder={t.meter_note}
            value={row.note || ''}
            onChange={e => update(row.id, { note: e.target.value })} />

          <p className="text-[11px] text-ink-3 px-1 empty:hidden">
            <SeriesNote row={stats.get(row.id)} unit={unit} />
          </p>
        </div>
      ))}

      <button type="button" onClick={add}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-border-strong
          text-xs font-medium text-ink-2 hover:text-ink hover:bg-surface-3 transition">
        <Plus className="w-4 h-4" />{t.meter_add}
      </button>
    </div>
  );
};

// ─── Vertragsansicht ──────────────────────────────────────────────────────────
// Zeilen für DetailSection: der Rahmen und die Trennlinien kommen von dort.
export const MeterReadingsRows = ({ readings = [], unit }) => {
  const t    = useT();
  const lang = useLang();
  const rows = meterSeries(readings);
  const summary = meterSummary(readings);

  if (!rows.length) return null;

  return (
    <>
      {summary && (
        <div className="flex items-center gap-3 px-4 py-2.5">
          <span className="text-[11px] text-ink-3 w-[40%] shrink-0 leading-relaxed lg:w-[34%]">
            {t.meter_projection}
          </span>
          <div className="min-w-0 flex-1 text-sm text-ink break-words">
            {t.meter_per_year(fmtQuantity(summary.perYear, lang, unit, 0))}
            <span className="text-ink-3">
              {' · '}{t.meter_per_day(fmtQuantity(summary.perDay, lang, unit, 2))}
            </span>
          </div>
        </div>
      )}

      {rows.map((row, index) => (
        <div key={row.id} className="flex items-start gap-3 px-4 py-2.5">
          <span className="text-[11px] text-ink-3 w-[40%] shrink-0 leading-relaxed lg:w-[34%]">
            {fmtDateFromISOWithYear(row.date, lang, t.months_short)}
            {index === 0 && <span className="block text-ink-3">{t.meter_latest}</span>}
            {rows.length > 1 && index === rows.length - 1 && (
              <span className="block text-ink-3">{t.meter_first}</span>
            )}
          </span>
          <div className="min-w-0 flex-1 text-sm text-ink break-words">
            <span className="tabular-nums">{fmtQuantity(row.value, lang, unit, 3)}</span>
            <span className="block text-[11px] text-ink-3 empty:hidden">
              <SeriesNote row={row} unit={unit} />
            </span>
            {row.note && <span className="block text-[11px] text-ink-3">{row.note}</span>}
          </div>
        </div>
      ))}
    </>
  );
};
