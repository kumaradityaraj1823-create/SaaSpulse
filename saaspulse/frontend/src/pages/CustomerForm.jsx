import { useState } from 'react';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { Modal } from '../components/ui/Overlay';
import Button from '../components/ui/Button';
import { api } from '../lib/api';
import { formatINR, toInputDate } from '../lib/format';
import { useDataVersion } from '../lib/hooks';
import { useToast } from '../components/ui/Toast';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCustomer(v) {
  const e = {};
  if (!v.name || v.name.trim().length < 2) e.name = 'Enter the customer’s name';
  if (!EMAIL_RX.test((v.email || '').trim())) e.email = 'Enter a valid email address';
  if (!v.planId) e.planId = 'Choose a plan';
  return e;
}

/** Maps field errors returned by the API onto the form */
export function serverFieldErrors(err) {
  const out = {};
  (err.details || []).forEach((d) => {
    out[d.field] = d.message;
  });
  if (err.status === 409 && /email/i.test(err.message)) out.email = err.message;
  return out;
}

export function PlanOptions({ plans, includeArchivedId }) {
  return plans
    .filter((p) => !p.isArchived || p.id === includeArchivedId)
    .map((p) => (
      <option key={p.id} value={p.id}>
        {p.name} — {formatINR(p.monthlyPrice)}/mo{p.isArchived ? ' (legacy)' : ''}
      </option>
    ));
}

export default function NewCustomerModal({ open, onClose, plans, onCreated }) {
  const toast = useToast();
  const { bump } = useDataVersion();
  const firstPlan = plans.find((p) => !p.isArchived);
  const empty = { name: '', email: '', company: '', city: '', planId: firstPlan?.id || '', signupDate: toInputDate(), notes: '' };
  const [v, setV] = useState(empty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => {
    setV((s) => ({ ...s, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const close = () => {
    setV(empty);
    setErrors({});
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateCustomer({ ...v, planId: v.planId || firstPlan?.id });
    if (Object.keys(errs).length) return setErrors(errs);
    setSaving(true);
    try {
      const res = await api.createCustomer({ ...v, planId: v.planId || firstPlan?.id });
      toast(`${res.data.name} added`);
      bump();
      onCreated?.(res.data);
      close();
    } catch (err) {
      const fe = serverFieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe);
      else toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add customer"
      description="They start paying their plan’s monthly price from the signup date."
      width="max-w-lg"
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" type="submit" form="new-customer" loading={saving}>
            Add customer
          </Button>
        </>
      }
    >
      <form id="new-customer" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={errors.name} htmlFor="c-name">
          <Input id="c-name" value={v.name} onChange={set('name')} invalid={!!errors.name} autoFocus placeholder="Ishita Raman" />
        </Field>
        <Field label="Work email" error={errors.email} htmlFor="c-email">
          <Input id="c-email" type="email" value={v.email} onChange={set('email')} invalid={!!errors.email} placeholder="ishita@company.in" />
        </Field>
        <Field label="Company" htmlFor="c-company">
          <Input id="c-company" value={v.company} onChange={set('company')} placeholder="Lumen Labs" />
        </Field>
        <Field label="City" htmlFor="c-city">
          <Input id="c-city" value={v.city} onChange={set('city')} placeholder="Bengaluru" />
        </Field>
        <Field label="Plan" error={errors.planId} htmlFor="c-plan">
          <Select id="c-plan" value={v.planId || firstPlan?.id || ''} onChange={set('planId')} invalid={!!errors.planId}>
            <PlanOptions plans={plans} />
          </Select>
        </Field>
        <Field label="Signup date" error={errors.signupDate} htmlFor="c-date">
          <Input id="c-date" type="date" value={v.signupDate} max={toInputDate()} onChange={set('signupDate')} invalid={!!errors.signupDate} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes" hint="Optional. Only visible to your team." htmlFor="c-notes">
            <Textarea id="c-notes" value={v.notes} onChange={set('notes')} rows={2} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
