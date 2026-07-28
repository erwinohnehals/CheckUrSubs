// ─── Leitzahl ─────────────────────────────────────────────────────────────────
// Eine große Zahl trägt die Seite; rechts daneben stehen dieselbe Zahl in
// anderer Frist — pro Jahr, pro Tag. Zusammen als ein Block, nicht an die
// Enden einer breiten Karte verteilt: sonst hält die beiden Hälften nichts.
// Am Telefon rutscht die Nebenspalte unter die Leitzahl.

import { CARD } from './tokens';

export const StatHero = ({ label, value, pills, stats = [], className = '' }) => (
  <section data-group className={`${CARD} p-6 lg:flex lg:items-center lg:gap-10 lg:p-8 ${className}`}>
    <div className="lg:flex-1 lg:min-w-0">
      <p className="text-ink-3 uppercase text-[11px] tracking-[0.18em] font-medium mb-2">{label}</p>
      <h2 className={`text-5xl font-semibold tracking-tight lg:text-6xl ${pills ? 'mb-4' : ''}`}>{value}</h2>
      {pills && <div className="flex items-center flex-wrap gap-2">{pills}</div>}
    </div>
    {stats.length > 0 && (
      <div className="grid grid-cols-2 mt-6 text-left border-t border-border pt-5
        lg:grid-cols-1 lg:gap-6 lg:mt-0 lg:pt-0 lg:border-t-0 lg:border-l lg:pl-10 lg:w-[190px] lg:shrink-0">
        {stats.map((stat, index) => (
          // Am Telefon stehen zwei nebeneinander — die rechte rückt an ihren Rand
          <div key={stat.label} className={index % 2 === 1 ? 'text-right lg:text-left' : ''}>
            <p className="text-xl font-semibold tracking-tight lg:text-2xl">{stat.value}</p>
            <p className="text-ink-3 text-[11px] uppercase tracking-[0.12em] mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    )}
  </section>
);
