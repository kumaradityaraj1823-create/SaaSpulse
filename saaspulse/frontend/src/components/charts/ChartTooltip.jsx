/** Shared tooltip shell — text uses ink tokens; the small swatch carries series identity */
export function TooltipCard({ title, rows, footer }) {
  return (
    <div className="min-w-[200px] rounded-lg border border-line bg-surface px-3 py-2.5 text-[12.5px] shadow-[0_8px_24px_-6px_rgba(0,0,0,0.2)]">
      <div className="mb-1.5 font-medium text-ink">{title}</div>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-ink-2">
              {r.color && <span className="h-2 w-2 rounded-sm" style={{ background: r.color }} aria-hidden />}
              {r.label}
            </span>
            <span className={`tnum ${r.strong ? 'font-semibold text-ink' : 'text-ink'}`}>{r.value}</span>
          </div>
        ))}
      </div>
      {footer && <div className="mt-2 border-t border-line pt-1.5 text-ink-2">{footer}</div>}
    </div>
  );
}

export const axisTick = { fill: 'var(--muted)', fontSize: 11.5 };

/** "Nov" — adds the year on January so long ranges stay readable */
export const shortMonth = (key) => {
  const [y, m] = key.split('-').map(Number);
  const name = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' });
  return m === 1 ? `${name} ’${String(y).slice(2)}` : name;
};
