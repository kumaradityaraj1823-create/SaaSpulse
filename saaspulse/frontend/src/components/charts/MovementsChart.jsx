import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatINR, formatINRCompact, formatSignedINR } from '../../lib/format';
import { TooltipCard, axisTick, shortMonth } from './ChartTooltip';

export const MOVEMENT_SERIES = [
  { key: 'gained', label: 'New', color: 'var(--s-new)' },
  { key: 'expansion', label: 'Expansion', color: 'var(--s-expansion)' },
  { key: 'lost', label: 'Churn & contraction', color: 'var(--s-lost)' },
];

function MovementsTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <TooltipCard
      title={d.label}
      rows={[
        { label: 'New & reactivated', value: formatINR(d.gained), color: 'var(--s-new)' },
        { label: 'Expansion', value: formatINR(d.expansion), color: 'var(--s-expansion)' },
        { label: 'Churned', value: formatINR(d.churnedMrr), color: 'var(--s-lost)' },
        { label: 'Contraction', value: formatINR(d.contractionMrr), color: 'var(--s-lost)' },
      ]}
      footer={
        <span className="flex justify-between gap-6">
          <span>Net new MRR</span>
          <span className="tnum font-semibold text-ink">{formatSignedINR(d.netNewMrr)}</span>
        </span>
      }
    />
  );
}

export default function MovementsChart({ data, height = 240 }) {
  const rows = data.map((m) => ({
    ...m,
    gained: m.newMrr + m.reactivationMrr,
    expansion: m.expansionMrr,
    lost: -(m.churnedMrr + m.contractionMrr),
  }));
  const barSize = data.length > 12 ? 12 : 20;
  return (
    <div style={{ height }} role="img" aria-label="MRR gained and lost each month">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} stackOffset="sign" margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="20%">
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="month" tickFormatter={shortMonth} tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} tickMargin={8} />
          <YAxis tickFormatter={(v) => formatINRCompact(v, 1)} tick={axisTick} tickLine={false} axisLine={false} width={52} tickCount={5} />
          <ReferenceLine y={0} stroke="var(--axis)" />
          <Tooltip content={<MovementsTooltip />} cursor={{ fill: 'var(--hover)' }} />
          <Bar dataKey="gained" stackId="m" fill="var(--s-new)" maxBarSize={barSize} stroke="var(--surface)" strokeWidth={1} isAnimationActive={false} />
          <Bar dataKey="expansion" stackId="m" fill="var(--s-expansion)" maxBarSize={barSize} radius={[4, 4, 0, 0]} stroke="var(--surface)" strokeWidth={1} isAnimationActive={false} />
          <Bar dataKey="lost" stackId="m" fill="var(--s-lost)" maxBarSize={barSize} radius={[4, 4, 0, 0]} stroke="var(--surface)" strokeWidth={1} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
