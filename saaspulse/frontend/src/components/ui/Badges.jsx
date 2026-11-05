import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export function StatusBadge({ status }) {
  const active = status === 'active';
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] ${active ? 'text-ink' : 'text-muted'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-up' : 'bg-muted'}`} aria-hidden />
      {active ? 'Active' : 'Churned'}
    </span>
  );
}

export function PlanTag({ name, archived }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[12px] font-medium text-ink-2">
      {name || '—'}
      {archived && <span className="text-muted font-normal">· legacy</span>}
    </span>
  );
}

/**
 * Delta — change vs a previous value. `goodWhen` says whether up is good (MRR) or bad (churn).
 */
export function Delta({ value, suffix = '%', goodWhen = 'up', label, digits = 1 }) {
  if (value == null || Number.isNaN(value)) return <span className="text-[12.5px] text-muted">{label || 'No prior data'}</span>;
  const rounded = Number(value.toFixed(digits));
  const isUp = rounded > 0;
  const flat = rounded === 0;
  const good = flat ? null : (isUp && goodWhen === 'up') || (!isUp && goodWhen === 'down');
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12.5px]">
      <span
        className={`inline-flex items-center gap-0.5 whitespace-nowrap rounded px-1 py-px font-medium tnum ${
          flat ? 'bg-hover text-ink-2' : good ? 'bg-up-bg text-up' : 'bg-down-bg text-down'
        }`}
      >
        {!flat && <Icon className="h-3 w-3" strokeWidth={2.5} aria-hidden />}
        {flat ? '0' : `${isUp ? '+' : '−'}${Math.abs(rounded)}`}
        {suffix}
      </span>
      {label && <span className="text-muted">{label}</span>}
    </span>
  );
}
