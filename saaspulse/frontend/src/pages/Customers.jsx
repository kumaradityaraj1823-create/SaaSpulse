import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Download, Plus, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Users, X } from 'lucide-react';
import { api } from '../lib/api';
import { useFetch, useDebounced } from '../lib/hooks';
import { formatDate, formatINR, formatNumber } from '../lib/format';
import { PageHeader, ErrorState, EmptyState, Skeleton } from '../components/ui/misc';
import { Select } from '../components/ui/Field';
import { StatusBadge, PlanTag } from '../components/ui/Badges';
import Button from '../components/ui/Button';
import NewCustomerModal from './CustomerForm';
import CustomerDrawer from './CustomerDrawer';

const COLUMNS = [
  { key: 'name', label: 'Customer', sortable: true },
  { key: 'company', label: 'Company', sortable: true, className: 'hidden md:table-cell' },
  { key: 'plan', label: 'Plan', className: 'hidden sm:table-cell' },
  { key: 'mrr', label: 'MRR', sortable: true, align: 'right' },
  { key: 'status', label: 'Status', sortable: true, className: 'hidden sm:table-cell' },
  { key: 'signupDate', label: 'Signed up', sortable: true, align: 'right', className: 'hidden lg:table-cell' },
];

const LIMIT = 20;

export default function Customers() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'all';
  const plan = params.get('plan') || 'all';
  const sort = params.get('sort') || '-signupDate';
  const page = Number(params.get('page')) || 1;
  const openId = params.get('open');
  const [search, setSearch] = useState(params.get('q') || '');
  const q = useDebounced(search, 250);

  const update = (patch, { resetPage = true } = {}) => {
    const next = new URLSearchParams(params);
    Object.entries({ ...patch, ...(resetPage ? { page: null } : {}) }).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '' || v === 'all' || (k === 'page' && v === 1) || (k === 'sort' && v === '-signupDate')) next.delete(k);
      else next.set(k, v);
    });
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if ((params.get('q') || '') !== q) update({ q });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const plansRes = useFetch((signal) => api.plans({ signal }), []);
  const plans = plansRes.data?.data || [];
  const { data, error, loading, refetch } = useFetch(
    (signal) => api.customers({ search: q, status, plan, sort, page, limit: LIMIT }, { signal }),
    [q, status, plan, sort, page]
  );
  const meta = data?.meta;
  const rows = data?.data || [];

  const toggleSort = (key) => {
    const current = sort.replace('-', '');
    const desc = sort.startsWith('-');
    if (current !== key) update({ sort: key === 'name' || key === 'company' ? key : `-${key}` });
    else update({ sort: desc ? key : `-${key}` });
  };

  const tabs = [
    { value: 'all', label: 'All', count: meta?.counts.all },
    { value: 'active', label: 'Active', count: meta?.counts.active },
    { value: 'churned', label: 'Churned', count: meta?.counts.churned },
  ];

  const filtersActive = q || plan !== 'all' || status !== 'all';
  const from = meta ? (meta.page - 1) * meta.limit + 1 : 0;
  const to = meta ? Math.min(meta.total, meta.page * meta.limit) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        description="Everyone who has ever subscribed, and what they pay you each month."
        actions={
          <>
            <Button icon={Download} onClick={() => (window.location.href = api.exportUrl({ search: q, status, plan, sort }))}>
              Export CSV
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => update({ new: 1 }, { resetPage: false })}>
              Add customer
            </Button>
          </>
        }
      />

      <div className="rounded-xl border border-line bg-surface">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-line px-4 pt-3 lg:flex-row lg:items-center lg:justify-between lg:pb-0">
          <div className="-mb-px flex gap-5 overflow-x-auto" role="tablist" aria-label="Status">
            {tabs.map((t) => (
              <button
                key={t.value}
                role="tab"
                aria-selected={status === t.value}
                onClick={() => update({ status: t.value })}
                className={`flex h-10 items-center gap-1.5 border-b-2 text-[13.5px] font-medium ${
                  status === t.value ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {t.label}
                <span className="tnum rounded bg-hover px-1.5 text-[11.5px] text-ink-2">{t.count == null ? '·' : formatNumber(t.count)}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2 pb-3 lg:py-2">
            <div className="relative flex-1 lg:w-72 lg:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email or company"
                aria-label="Search customers"
                className="h-9 w-full rounded-lg border border-line-strong bg-surface pl-8 pr-8 text-[13.5px] text-ink placeholder:text-muted focus:border-focus focus:outline-none focus:ring-3 focus:ring-focus/15"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted hover:text-ink" aria-label="Clear search">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Select value={plan} onChange={(e) => update({ plan: e.target.value })} className="w-36" aria-label="Filter by plan">
              <option value="all">All plans</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Table */}
        {error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full text-[13.5px] transition-opacity ${loading && data ? 'opacity-60' : ''}`}>
              <thead>
                <tr className="border-b border-line bg-surface-2 text-[12px] text-muted">
                  {COLUMNS.map((col) => {
                    const active = sort.replace('-', '') === col.key;
                    const Icon = sort.startsWith('-') ? ArrowDown : ArrowUp;
                    return (
                      <th
                        key={col.key}
                        scope="col"
                        aria-sort={active ? (sort.startsWith('-') ? 'descending' : 'ascending') : undefined}
                        className={`h-9 px-4 font-medium ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.className || ''}`}
                      >
                        {col.sortable ? (
                          <button onClick={() => toggleSort(col.key)} className={`inline-flex items-center gap-1 hover:text-ink ${active ? 'text-ink' : ''}`}>
                            {col.label}
                            {active && <Icon className="h-3 w-3" />}
                          </button>
                        ) : (
                          col.label
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {!data &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-line">
                      <td colSpan={COLUMNS.length} className="px-4 py-3">
                        <Skeleton className="h-6" />
                      </td>
                    </tr>
                  ))}
                {rows.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => update({ open: c.id }, { resetPage: false })}
                    className={`cursor-pointer border-b border-line last:border-b-0 hover:bg-hover ${openId === c.id ? 'bg-hover' : ''}`}
                  >
                    <td className="max-w-[240px] px-4 py-2.5">
                      <button
                        className="block w-full text-left focus-visible:outline-offset-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          update({ open: c.id }, { resetPage: false });
                        }}
                      >
                        <span className="block truncate font-medium text-ink">{c.name}</span>
                        <span className="block truncate text-[12.5px] text-muted">
                          <span className="sm:hidden">{c.plan?.name} · </span>
                          {c.email}
                        </span>
                      </button>
                    </td>
                    <td className="hidden max-w-[200px] truncate px-4 py-2.5 text-ink-2 md:table-cell">{c.company || '—'}</td>
                    <td className="hidden px-4 py-2.5 sm:table-cell">
                      <PlanTag name={c.plan?.name} archived={c.plan?.isArchived} />
                    </td>
                    <td className={`px-4 py-2.5 text-right tnum ${c.status === 'active' ? 'text-ink' : 'text-muted'}`}>{formatINR(c.mrr)}</td>
                    <td className="hidden px-4 py-2.5 sm:table-cell">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="hidden px-4 py-2.5 text-right tnum text-ink-2 lg:table-cell">{formatDate(c.signupDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data && rows.length === 0 && (
              <EmptyState
                icon={Users}
                title={filtersActive ? 'No customers match these filters' : 'No customers yet'}
                action={
                  filtersActive ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSearch('');
                        update({ q: null, plan: null, status: null });
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : (
                    <Button size="sm" variant="primary" icon={Plus} onClick={() => update({ new: 1 })}>
                      Add customer
                    </Button>
                  )
                }
              >
                {filtersActive ? 'Try a different search or plan.' : 'Add your first customer or import a CSV to get started.'}
              </EmptyState>
            )}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.total > 0 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[12.5px] text-ink-2">
            <span className="tnum">
              {formatNumber(from)}–{formatNumber(to)} of {formatNumber(meta.total)}
            </span>
            <div className="flex items-center gap-1">
              <span className="mr-2 hidden tnum sm:inline">
                Page {meta.page} of {meta.totalPages}
              </span>
              <Button size="icon" variant="ghost" aria-label="Previous page" disabled={meta.page <= 1} onClick={() => update({ page: meta.page - 1 }, { resetPage: false })}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" aria-label="Next page" disabled={meta.page >= meta.totalPages} onClick={() => update({ page: meta.page + 1 }, { resetPage: false })}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <NewCustomerModal open={params.get('new') === '1' && plans.length > 0} onClose={() => update({ new: null }, { resetPage: false })} plans={plans} />
      <CustomerDrawer id={openId} plans={plans} onClose={() => update({ open: null }, { resetPage: false })} />
    </div>
  );
}
