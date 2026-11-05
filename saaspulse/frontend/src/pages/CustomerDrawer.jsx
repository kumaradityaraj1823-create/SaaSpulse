import { useEffect, useState } from 'react';
import { X, Pencil, UserMinus, RotateCcw, Trash2, Mail, Building2, MapPin } from 'lucide-react';
import { api } from '../lib/api';
import { useFetch, useDataVersion } from '../lib/hooks';
import { formatDate, formatINR, initials } from '../lib/format';
import { Drawer, Modal, ConfirmDialog } from '../components/ui/Overlay';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { StatusBadge, PlanTag } from '../components/ui/Badges';
import { Skeleton, ErrorState } from '../components/ui/misc';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { ActivityLine } from './Overview';
import { PlanOptions, validateCustomer, serverFieldErrors } from './CustomerForm';

const CHURN_REASONS = ['Too expensive', 'Switched to a competitor', 'Missing a feature they needed', 'No longer needed', 'Company shut down', 'Poor onboarding experience', 'Other'];

function EditForm({ customer, plans, onDone }) {
  const toast = useToast();
  const { bump } = useDataVersion();
  const [v, setV] = useState({
    name: customer.name,
    email: customer.email,
    company: customer.company,
    city: customer.city,
    planId: customer.plan?.id,
    notes: customer.notes,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));

  const newPlan = plans.find((p) => p.id === v.planId);
  const delta = newPlan && v.planId !== customer.plan?.id ? newPlan.monthlyPrice - customer.mrr : 0;

  const save = async (e) => {
    e.preventDefault();
    const errs = validateCustomer(v);
    if (Object.keys(errs).length) return setErrors(errs);
    setSaving(true);
    try {
      const changes = Object.fromEntries(Object.entries(v).filter(([k, val]) => (k === 'planId' ? val !== customer.plan?.id : val !== customer[k])));
      if (Object.keys(changes).length) {
        await api.updateCustomer(customer.id, changes);
        toast('Changes saved');
        bump();
      }
      onDone();
    } catch (err) {
      const fe = serverFieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe);
      else toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={errors.name}>
          <Input value={v.name} onChange={set('name')} invalid={!!errors.name} />
        </Field>
        <Field label="Email" error={errors.email}>
          <Input type="email" value={v.email} onChange={set('email')} invalid={!!errors.email} />
        </Field>
        <Field label="Company">
          <Input value={v.company} onChange={set('company')} />
        </Field>
        <Field label="City">
          <Input value={v.city} onChange={set('city')} />
        </Field>
      </div>
      <Field
        label="Plan"
        hint={
          delta !== 0 && customer.status === 'active'
            ? `This is ${delta > 0 ? 'an upgrade' : 'a downgrade'}: MRR changes by ${delta > 0 ? '+' : '−'}${formatINR(Math.abs(delta))} from today.`
            : customer.status === 'churned'
              ? 'Churned customers don’t count toward MRR until reactivated.'
              : undefined
        }
      >
        <Select value={v.planId} onChange={set('planId')}>
          <PlanOptions plans={plans} includeArchivedId={customer.plan?.id} />
        </Select>
      </Field>
      <Field label="Notes">
        <Textarea value={v.notes} onChange={set('notes')} rows={3} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={saving}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

export default function CustomerDrawer({ id, plans, onClose }) {
  const toast = useToast();
  const { bump } = useDataVersion();
  const { data, error, loading, refetch } = useFetch((signal) => (id ? api.customer(id, { signal }) : Promise.resolve(null)), [id]);
  const [editing, setEditing] = useState(false);
  const [churnOpen, setChurnOpen] = useState(false);
  const [reason, setReason] = useState(CHURN_REASONS[0]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEditing(false);
  }, [id]);

  const c = data?.data;

  const changeStatus = async (status) => {
    setBusy(true);
    try {
      await api.setCustomerStatus(c.id, status, status === 'churned' ? reason : undefined);
      toast(status === 'churned' ? `${c.name} marked as churned` : `${c.name} reactivated`);
      setChurnOpen(false);
      bump();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.deleteCustomer(c.id);
      toast(`${c.name} deleted`);
      setDeleteOpen(false);
      onClose();
      bump();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={!!id} onClose={onClose} label="Customer details">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
        <span className="text-[13px] text-muted">Customer</span>
        <button onClick={onClose} className="-mr-1.5 rounded-md p-1.5 text-muted hover:bg-hover hover:text-ink" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : !c || (loading && c.id !== id) ? (
          <div className="space-y-4 p-5">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-24" />
            <Skeleton className="h-40" />
          </div>
        ) : (
          <div className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-hover text-[14px] font-semibold text-ink-2">{initials(c.name)}</div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[18px] font-semibold text-ink">{c.name}</h2>
                <div className="mt-0.5 flex items-center gap-2">
                  <StatusBadge status={c.status} />
                </div>
              </div>
              {!editing && (
                <Button size="sm" icon={Pencil} onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )}
            </div>

            {editing ? (
              <div className="mt-6">
                <EditForm customer={c} plans={plans} onDone={() => setEditing(false)} />
              </div>
            ) : (
              <>
                <dl className="mt-5 grid grid-cols-3 divide-x divide-line rounded-lg border border-line">
                  <div className="px-3 py-2.5">
                    <dt className="text-[12px] text-muted">MRR</dt>
                    <dd className={`mt-0.5 tnum text-[15px] font-semibold ${c.status === 'active' ? 'text-ink' : 'text-muted line-through'}`}>{formatINR(c.mrr)}</dd>
                  </div>
                  <div className="px-3 py-2.5">
                    <dt className="text-[12px] text-muted">Plan</dt>
                    <dd className="mt-0.5">
                      <PlanTag name={c.plan?.name} archived={c.plan?.isArchived} />
                    </dd>
                  </div>
                  <div className="px-3 py-2.5">
                    <dt className="text-[12px] text-muted">{c.status === 'churned' ? 'Churned' : 'Customer since'}</dt>
                    <dd className="mt-0.5 text-[13.5px] text-ink">{formatDate(c.status === 'churned' ? c.churnDate : c.signupDate)}</dd>
                  </div>
                </dl>

                <ul className="mt-5 space-y-2 text-[13px] text-ink-2">
                  <li className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-muted" />
                    <a href={`mailto:${c.email}`} className="truncate hover:text-ink hover:underline">
                      {c.email}
                    </a>
                  </li>
                  {c.company && (
                    <li className="flex items-center gap-2.5">
                      <Building2 className="h-4 w-4 text-muted" />
                      {c.company}
                    </li>
                  )}
                  {c.city && (
                    <li className="flex items-center gap-2.5">
                      <MapPin className="h-4 w-4 text-muted" />
                      {c.city}
                    </li>
                  )}
                </ul>

                {c.status === 'churned' && c.churnReason && (
                  <p className="mt-4 rounded-lg bg-down-bg px-3 py-2 text-[13px] text-down">Reason for leaving: {c.churnReason}</p>
                )}
                {c.notes && <p className="mt-4 whitespace-pre-wrap rounded-lg bg-surface-2 px-3 py-2 text-[13px] text-ink-2">{c.notes}</p>}

                <div className="mt-6">
                  <h3 className="text-[13px] font-semibold text-ink">Revenue history</h3>
                  <ol className="mt-3 space-y-3.5">
                    {c.activity.map((a) => (
                      <li key={a.id}>
                        <ActivityLine a={a} showName={false} />
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {c && !editing && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line bg-surface-2 px-5 py-3">
          <Button size="sm" variant="danger-ghost" icon={Trash2} onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
          {c.status === 'active' ? (
            <Button size="sm" icon={UserMinus} onClick={() => setChurnOpen(true)}>
              Mark as churned
            </Button>
          ) : (
            <Button size="sm" variant="primary" icon={RotateCcw} loading={busy} onClick={() => changeStatus('active')}>
              Reactivate
            </Button>
          )}
        </div>
      )}

      {c && (
        <>
          <Modal
            open={churnOpen}
            onClose={() => setChurnOpen(false)}
            title={`Mark ${c.name} as churned?`}
            description={`Their ${formatINR(c.mrr)} MRR is removed from today. You can reactivate them later.`}
            footer={
              <>
                <Button onClick={() => setChurnOpen(false)}>Cancel</Button>
                <Button variant="danger" loading={busy} onClick={() => changeStatus('churned')}>
                  Mark as churned
                </Button>
              </>
            }
          >
            <Field label="Why did they leave?">
              <Select value={reason} onChange={(e) => setReason(e.target.value)}>
                {CHURN_REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </Field>
          </Modal>
          <ConfirmDialog
            open={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            onConfirm={remove}
            loading={busy}
            danger
            title={`Delete ${c.name}?`}
            description="This removes the customer and their revenue history from every chart. To keep the history, mark them as churned instead."
            confirmLabel="Delete customer"
          />
        </>
      )}
    </Drawer>
  );
}
