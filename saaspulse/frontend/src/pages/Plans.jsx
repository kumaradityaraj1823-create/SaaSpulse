import { useState } from 'react';
import { Plus, Pencil, Archive, ArchiveRestore, Trash2, Layers } from 'lucide-react';
import { api } from '../lib/api';
import { useFetch, useDataVersion } from '../lib/hooks';
import { formatINR, formatNumber, formatPct } from '../lib/format';
import { PageHeader, ErrorState, EmptyState, Skeleton } from '../components/ui/misc';
import { Modal, ConfirmDialog } from '../components/ui/Overlay';
import { Field, Input } from '../components/ui/Field';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { planColor } from '../components/charts/PlanMix';

function PlanModal({ open, plan, onClose }) {
  const toast = useToast();
  const { bump } = useDataVersion();
  const editing = !!plan;
  const [v, setV] = useState({ name: plan?.name || '', monthlyPrice: plan?.monthlyPrice ?? '', description: plan?.description || '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (v.name.trim().length < 2) errs.name = 'Enter a plan name';
    if (!(Number(v.monthlyPrice) > 0)) errs.monthlyPrice = 'Enter a price greater than 0';
    if (Object.keys(errs).length) return setErrors(errs);
    setSaving(true);
    try {
      const body = { name: v.name.trim(), monthlyPrice: Number(v.monthlyPrice), description: v.description.trim() };
      if (editing) await api.updatePlan(plan.id, body);
      else await api.createPlan(body);
      toast(editing ? `${body.name} updated` : `${body.name} created`);
      bump();
      onClose();
    } catch (err) {
      if (err.status === 409) setErrors({ name: 'A plan with this name already exists' });
      else toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const priceChanged = editing && Number(v.monthlyPrice) !== plan.monthlyPrice && plan.activeCustomers > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${plan.name}` : 'Create plan'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="plan-form" loading={saving}>
            {editing ? 'Save changes' : 'Create plan'}
          </Button>
        </>
      }
    >
      <form id="plan-form" onSubmit={submit} noValidate className="space-y-4">
        <Field label="Name" error={errors.name}>
          <Input value={v.name} onChange={set('name')} invalid={!!errors.name} autoFocus placeholder="Growth" />
        </Field>
        <Field
          label="Monthly price (₹)"
          error={errors.monthlyPrice}
          hint={priceChanged ? `Applies to new subscribers. The ${plan.activeCustomers} existing customers keep paying ${formatINR(plan.monthlyPrice)}.` : undefined}
        >
          <Input type="number" min="1" step="1" inputMode="numeric" value={v.monthlyPrice} onChange={set('monthlyPrice')} invalid={!!errors.monthlyPrice} placeholder="999" />
        </Field>
        <Field label="Description" hint="Optional. Shown on this page only.">
          <Input value={v.description} onChange={set('description')} placeholder="Who this plan is for" />
        </Field>
      </form>
    </Modal>
  );
}

export default function Plans() {
  const toast = useToast();
  const { bump } = useDataVersion();
  const { data, error, refetch } = useFetch((signal) => api.plans({ signal }), []);
  const [modal, setModal] = useState(null); // { plan } | { plan: null }
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const plans = data?.data || [];
  const totalMrr = plans.reduce((s, p) => s + p.mrr, 0);

  const toggleArchive = async (p) => {
    try {
      await api.updatePlan(p.id, { isArchived: !p.isArchived });
      toast(p.isArchived ? `${p.name} is available again` : `${p.name} archived. Existing customers keep it.`);
      bump();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.deletePlan(deleting.id);
      toast(`${deleting.name} deleted`);
      bump();
      setDeleting(null);
    } catch (err) {
      toast(err.message, 'error');
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Plans"
        description="What you charge, who's on each plan, and how much each brings in."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setModal({ plan: null })}>
            Create plan
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        {error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : !data ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : plans.length === 0 ? (
          <EmptyState icon={Layers} title="No plans yet" action={<Button variant="primary" icon={Plus} onClick={() => setModal({ plan: null })}>Create plan</Button>}>
            Create a plan before adding customers.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-left text-[12px] text-muted">
                  <th className="h-9 px-4 font-medium">Plan</th>
                  <th className="h-9 px-4 text-right font-medium">Price / month</th>
                  <th className="h-9 px-4 text-right font-medium">Active</th>
                  <th className="hidden h-9 px-4 text-right font-medium md:table-cell">Churned</th>
                  <th className="h-9 px-4 font-medium">MRR</th>
                  <th className="h-9 w-px px-4"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id} className={`border-b border-line last:border-b-0 ${p.isArchived ? 'text-muted' : ''}`}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: planColor(plans, p.id) }} aria-hidden />
                        <span className={`font-medium ${p.isArchived ? 'text-ink-2' : 'text-ink'}`}>{p.name}</span>
                        {p.isArchived && <span className="rounded border border-line px-1.5 text-[11.5px] text-muted">Archived</span>}
                      </div>
                      {p.description && <p className="mt-0.5 max-w-sm pl-[18px] text-[12.5px] text-muted">{p.description}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-right tnum text-ink">{formatINR(p.monthlyPrice)}</td>
                    <td className="px-4 py-3.5 text-right tnum text-ink-2">{formatNumber(p.activeCustomers)}</td>
                    <td className="hidden px-4 py-3.5 text-right tnum text-ink-2 md:table-cell">
                      {formatNumber(p.churnedCustomers)} <span className="text-muted">({formatPct(p.churnRate)})</span>
                    </td>
                    <td className="min-w-[180px] px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="w-20 tnum text-ink">{formatINR(p.mrr)}</span>
                        <div className="h-1.5 flex-1 rounded-full bg-hover" aria-hidden>
                          <div className="h-full rounded-full" style={{ width: `${totalMrr ? (p.mrr / totalMrr) * 100 : 0}%`, background: planColor(plans, p.id) }} />
                        </div>
                        <span className="w-11 text-right tnum text-[12.5px] text-muted">{formatPct(p.mrrShare)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex justify-end gap-0.5">
                        <Button size="icon" variant="ghost" title="Edit" aria-label={`Edit ${p.name}`} onClick={() => setModal({ plan: p })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" title={p.isArchived ? 'Restore' : 'Archive'} aria-label={`${p.isArchived ? 'Restore' : 'Archive'} ${p.name}`} onClick={() => toggleArchive(p)}>
                          {p.isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="icon" variant="ghost" title="Delete" aria-label={`Delete ${p.name}`} onClick={() => setDeleting(p)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-[12.5px] text-muted">
        Archived plans stay on the customers who have them but can’t be chosen for new customers. A plan can only be deleted if no customer has ever used it.
      </p>

      {modal && <PlanModal open plan={modal.plan} onClose={() => setModal(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        danger
        title={`Delete ${deleting?.name}?`}
        description={deleting?.totalCustomers ? `${deleting.totalCustomers} customers have used this plan, so it can’t be deleted. Archive it instead.` : 'This plan has never been used, so it can be removed safely.'}
        confirmLabel="Delete plan"
      />
    </div>
  );
}
