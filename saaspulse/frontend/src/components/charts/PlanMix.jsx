import { formatINR, formatNumber, formatPct } from '../../lib/format';

const SLOTS = ['var(--s-1)', 'var(--s-2)', 'var(--s-3)', 'var(--s-4)'];

/**
 * Colour follows the plan (by price order), never its rank, so a plan keeps
 * the same colour when others are added, archived or filtered out.
 */
export function planColor(plans, planId) {
  // Current plans first (by price), legacy plans after, so live plans get the clearest colours
  const ordered = [...plans].sort((a, b) => Number(a.isArchived) - Number(b.isArchived) || a.monthlyPrice - b.monthlyPrice);
  const i = ordered.findIndex((p) => p.id === planId);
  return i >= 0 && i < SLOTS.length ? SLOTS[i] : 'var(--muted)';
}

export default function PlanMix({ plans }) {
  const withRevenue = plans.filter((p) => p.mrr > 0);
  const total = withRevenue.reduce((s, p) => s + p.mrr, 0);
  const rows = [...plans].filter((p) => p.mrr > 0 || !p.isArchived).sort((a, b) => b.mrr - a.mrr);

  return (
    <div>
      {/* Share of MRR as one bar; segments separated by a 2px surface gap */}
      <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Share of MRR by plan">
        {withRevenue
          .sort((a, b) => a.monthlyPrice - b.monthlyPrice)
          .map((p) => (
            <div key={p.id} style={{ width: `${(p.mrr / total) * 100}%`, background: planColor(plans, p.id) }} title={`${p.name}: ${formatPct(p.mrrShare)}`} />
          ))}
      </div>

      <table className="mt-4 w-full text-[13px]">
        <thead>
          <tr className="text-left text-[12px] text-muted">
            <th className="pb-2 font-medium">Plan</th>
            <th className="pb-2 text-right font-medium">Customers</th>
            <th className="pb-2 text-right font-medium">MRR</th>
            <th className="pb-2 text-right font-medium">Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-t border-line">
              <td className="py-2.5">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: planColor(plans, p.id) }} aria-hidden />
                  <span className="text-ink">{p.name}</span>
                  {p.isArchived && <span className="text-[11.5px] text-muted">legacy</span>}
                </span>
              </td>
              <td className="py-2.5 text-right tnum text-ink-2">{formatNumber(p.activeCustomers)}</td>
              <td className="py-2.5 text-right tnum text-ink">{formatINR(p.mrr)}</td>
              <td className="py-2.5 text-right tnum text-ink-2">{formatPct(p.mrrShare)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
