import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, UserPlus, UserMinus, RotateCcw, Activity as ActivityIcon } from 'lucide-react';
import { api } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { formatDate, formatINR, formatINRCompact, formatNumber, formatPct, formatSignedINR, timeAgo } from '../lib/format';
import { Panel, Segmented, Skeleton, ErrorState, EmptyState } from '../components/ui/misc';
import { Delta, PlanTag } from '../components/ui/Badges';
import MrrChart from '../components/charts/MrrChart';
import MovementsChart, { MOVEMENT_SERIES } from '../components/charts/MovementsChart';
import PlanMix from '../components/charts/PlanMix';

const RANGES = [
  { value: 3, label: '3M' },
  { value: 6, label: '6M' },
  { value: 12, label: '12M' },
  { value: 24, label: '24M' },
];

function pctChange(now, before) {
  return before > 0 ? ((now - before) / before) * 100 : null;
}

function Kpi({ label, value, children }) {
  return (
    <div className="px-5 py-4">
      <div className="text-[12.5px] text-ink-2">{label}</div>
      <div className="figure-display mt-1.5 text-[30px] text-ink">{value}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Hero({ data, months, setMonths }) {
  const k = data.kpis;
  return (
    <section className="rounded-xl border border-line bg-surface">
      <div className="flex flex-col gap-4 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[13px] font-medium text-ink-2">Monthly recurring revenue</h2>
          <div className="figure-display mt-2 text-[52px] text-ink sm:text-[64px] tnum">{formatINR(k.mrr)}</div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <Delta value={k.mrrGrowth} label={`since end of ${data.period.lastFullMonth.split(' ')[0]}`} />
            <span className="text-[12.5px] text-muted">
              ARR <span className="tnum text-ink-2">{formatINRCompact(k.arr, 2)}</span>
            </span>
          </div>
        </div>
        <Segmented label="Time range" options={RANGES} value={months} onChange={setMonths} />
      </div>
      <div className="px-2 pb-2 pt-4 sm:px-3">
        <MrrChart data={data.trend} />
      </div>
      <div className="grid grid-cols-2 border-t border-line lg:grid-cols-4 [&>*]:border-line [&>*:nth-child(odd)]:border-r lg:[&>*]:border-r lg:[&>*:last-child]:border-r-0 [&>*:nth-child(-n+2)]:border-b lg:[&>*]:border-b-0">
        <Kpi label="Paying customers" value={formatNumber(k.activeCustomers)}>
          <Delta value={pctChange(k.activeCustomers, k.activeCustomersPreviousMonth)} label="this month" />
        </Kpi>
        <Kpi label="Avg. revenue per customer" value={formatINR(k.arpu)}>
          <Delta value={pctChange(k.arpu, k.arpuPreviousMonth)} label="this month" />
        </Kpi>
        <Kpi label={`Customer churn, ${data.period.lastFullMonth}`} value={formatPct(k.churnRate)}>
          <Delta value={k.churnRate - k.churnRatePrevious} suffix=" pts" goodWhen="down" label="vs month before" />
        </Kpi>
        <Kpi label={`Net revenue retention, ${data.period.lastFullMonth}`} value={k.nrr == null ? '—' : formatPct(k.nrr)}>
          <Delta value={k.nrr != null && k.nrrPrevious != null ? k.nrr - k.nrrPrevious : null} suffix=" pts" label="vs month before" />
        </Kpi>
      </div>
    </section>
  );
}

function HeroSkeleton() {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-3 h-14 w-72" />
      <Skeleton className="mt-6 h-[240px] w-full" />
      <div className="mt-5 grid grid-cols-2 gap-6 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </section>
  );
}

const ACTIVITY_META = {
  signup: { icon: UserPlus, verb: 'signed up on' },
  upgrade: { icon: ArrowUpRight, verb: 'upgraded to' },
  downgrade: { icon: ArrowDownRight, verb: 'downgraded to' },
  churn: { icon: UserMinus, verb: 'cancelled' },
  reactivation: { icon: RotateCcw, verb: 'came back on' },
};

export function ActivityLine({ a, showName = true }) {
  const meta = ACTIVITY_META[a.type];
  const Icon = meta.icon;
  const plan = a.type === 'churn' ? a.fromPlan : a.toPlan;
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line ${a.mrrDelta < 0 ? 'text-down' : 'text-ink-2'}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-ink-2">
          {showName && <span className="font-medium text-ink">{a.customerName} </span>}
          {meta.verb} <span className="text-ink">{plan}</span>
          {a.note && a.type === 'churn' && <span className="text-muted"> — {a.note}</span>}
        </p>
        <p className="text-[12px] text-muted">{timeAgo(a.occurredAt)}</p>
      </div>
      <span className={`tnum text-[13px] ${a.mrrDelta < 0 ? 'text-down' : 'text-ink'}`}>{formatSignedINR(a.mrrDelta)}</span>
    </div>
  );
}

function RecentActivity() {
  const { data, error, loading, refetch } = useFetch((signal) => api.activity(7, { signal }), []);
  return (
    <Panel title="Recent activity" description="Every change to revenue, newest first" bodyClassName="px-5 pb-4 pt-3">
      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : loading && !data ? (
        <div className="space-y-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9" />)}</div>
      ) : data.data.length === 0 ? (
        <EmptyState icon={ActivityIcon} title="No activity yet">Add a customer to see revenue changes here.</EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {data.data.map((a) => (
            <li key={a.id}>
              <Link to={`/customers?open=${a.customer}`} className="-mx-2 block rounded-lg px-2 py-2.5 hover:bg-hover">
                <ActivityLine a={a} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default function Overview() {
  const [months, setMonths] = useState(12);
  const { data: res, error, loading, refetch } = useFetch((signal) => api.overview(months, { signal }), [months]);
  const data = res?.data;

  if (error && !data) {
    return (
      <div className="rounded-xl border border-line bg-surface">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  const k = data?.kpis;
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Overview</h1>
          <p className="mt-0.5 text-[13.5px] text-ink-2">
            {data ? `Revenue for the last ${months} months, as of ${new Date(data.asOf).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : 'Loading revenue…'}
          </p>
        </div>
        {loading && data && <span className="text-[12.5px] text-muted">Updating…</span>}
      </div>

      {!data ? <HeroSkeleton /> : <Hero data={data} months={months} setMonths={setMonths} />}

      {data && (
        <div className="grid gap-5 lg:grid-cols-5">
          <Panel
            className="lg:col-span-3"
            title="Where MRR came from"
            description={`Net new MRR over ${months} months: ${formatSignedINR(k.windowNewMrr + k.windowExpansionMrr - k.windowLostMrr)}`}
            bodyClassName="px-3 pb-3 pt-2"
          >
            <ul className="flex flex-wrap gap-x-5 gap-y-1 px-2 pb-2 pt-1 text-[12.5px]" aria-label="Legend">
              {MOVEMENT_SERIES.map((s) => {
                const total = s.key === 'gained' ? k.windowNewMrr : s.key === 'expansion' ? k.windowExpansionMrr : -k.windowLostMrr;
                return (
                  <li key={s.key} className="flex items-center gap-1.5 text-ink-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
                    {s.label}
                    <span className="tnum text-ink">{formatSignedINR(total)}</span>
                  </li>
                );
              })}
            </ul>
            <MovementsChart data={data.trend} />
          </Panel>

          <Panel className="lg:col-span-2" title="Revenue by plan" description="Share of current MRR" bodyClassName="px-5 pb-4 pt-4">
            <PlanMix plans={data.plans} />
          </Panel>
        </div>
      )}

      {data && (
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <RecentActivity />
          </div>
          <Panel className="lg:col-span-2" title="Largest accounts" description="Highest-paying active customers" bodyClassName="px-5 pb-3 pt-2">
            <ul className="divide-y divide-line">
              {data.topCustomers.map((c) => (
                <li key={c.id}>
                  <Link to={`/customers?open=${c.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-hover">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{c.company || c.name}</p>
                      <p className="truncate text-[12px] text-muted">
                        {c.name} · since {formatDate(c.signupDate, { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <PlanTag name={c.plan?.name} />
                    <span className="w-20 text-right tnum text-[13px] text-ink">{formatINR(c.mrr)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </div>
  );
}
