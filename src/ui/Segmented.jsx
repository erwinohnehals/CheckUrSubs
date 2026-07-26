import { useSlidingPill } from '../lib/motion';

// ─── Segmented Control mit gleitender Markierung (§4.4) ───────────────────────
// Eine einzige Pille wandert zwischen den Einträgen — keine Hintergründe, die
// an- und ausgehen. Die Beschriftungen blenden nur ihre Farbe über.
export const Segmented = ({
  items, value, onChange,
  className = '', trackClass = '', itemClass = '', pillClass = '',
  activeItemClass = 'text-ink', inactiveItemClass = 'text-ink-2 hover:text-ink',
  vertical = false,
  layout, renderItem,
}) => {
  const { trackRef, pillRef, setItem } = useSlidingPill(value);

  return (
    <div ref={trackRef}
      className={`relative ${layout || (vertical ? 'flex flex-col' : 'inline-flex')} gap-0.5 p-1 ${trackClass} ${className}`}>
      <span ref={pillRef} aria-hidden="true" className={`seg-pill rounded-lg ${pillClass}`} />
      {items.map(item => {
        const active = item.id === value;
        return (
          <button key={item.id} type="button" ref={setItem(item.id)} data-no-press
            onClick={() => onChange(item.id)}
            aria-current={active ? 'page' : undefined}
            className={`relative z-10 rounded-lg font-medium
              transition-colors duration-300
              ${active ? activeItemClass : inactiveItemClass} ${itemClass}`}>
            {renderItem ? renderItem(item, active) : item.label}
          </button>
        );
      })}
    </div>
  );
};
