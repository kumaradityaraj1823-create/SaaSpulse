import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatINR, formatINRCompact, formatSignedINR, formatNumber } from '../../lib/format';
import { TooltipCard, axisTick, shortMonth } from './ChartTooltip';

function MrrTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <TooltipCard
      title={d.label}
      rows={[
        { label: 'MRR at month end', value: formatINR(d.mrr), strong: true, color: 'var(--s-mrr)' },
        { label: 'Net new MRR', value: formatSignedINR(d.netNewMrr) },
        { label: 'Paying customers', value: formatNumber(d.activeCustomers) },
      ]}
    />
  );
}

export default function MrrChart({ data, height = 260 }) {
  return (
    <div style={{ height }} role="img" aria-label="Monthly recurring revenue over time">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="month" tickFormatter={shortMonth} tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--axis)' }} interval="preserveStartEnd" minTickGap={16} tickMargin={8} />
          <YAxis tickFormatter={(v) => formatINRCompact(v, 1)} tick={axisTick} tickLine={false} axisLine={false} width={52} tickCount={5} />
          <Tooltip content={<MrrTooltip />} cursor={{ stroke: 'var(--line-strong)', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="mrr"
            stroke="var(--s-mrr)"
            strokeWidth={2}
            fill="var(--s-mrr)"
            fillOpacity={0.1}
            activeDot={{ r: 4.5, fill: 'var(--s-mrr)', stroke: 'var(--surface)', strokeWidth: 2 }}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
