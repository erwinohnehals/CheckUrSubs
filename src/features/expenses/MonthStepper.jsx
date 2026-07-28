// ─── Der Monat im Blick ───────────────────────────────────────────────────────
// Monat und Budget stehen über demselben Monat: wer im Monatsreiter zum März
// blättert und dann zum Budget wechselt, erwartet dort den März. Deshalb ein
// Stepper und ein Zustand für beide.

import { useT } from '../../lib/i18n';
import { Stepper } from '../../ui';

export const MonthStepper = ({ month, onStep, onToday, atCurrent }) => {
  const t = useT();
  const [year, index] = month.split('-').map(Number);

  return (
    <Stepper
      label={`${t.months_full[index - 1]} ${year}`}
      onPrev={() => onStep(-1)} prevLabel={t.month_previous}
      onNext={() => onStep(1)} nextLabel={t.month_next}
      onReset={atCurrent ? undefined : onToday} resetLabel={t.today}
    />
  );
};
