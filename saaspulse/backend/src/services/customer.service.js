const Customer = require('../models/Customer');
const Plan = require('../models/Plan');
const Activity = require('../models/Activity');
const activityService = require('./activity.service');
const ApiError = require('../utils/ApiError');
const escapeRegex = require('../utils/escapeRegex');
const { toCsv } = require('../utils/csv');

const PLAN_FIELDS = 'name monthlyPrice isArchived';

/** Builds the Mongo filter shared by list + export */
function buildFilter({ search, status, plan }) {
  const filter = {};
  if (status && status !== 'all') filter.status = status;
  if (plan && plan !== 'all') filter.plan = plan;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { company: rx }];
  }
  return filter;
}

function buildSort(sort) {
  const dir = sort.startsWith('-') ? -1 : 1;
  const field = sort.replace(/^-/, '');
  return { [field]: dir, _id: dir };
}

async function list(query) {
  const { page, limit, sort, status } = query;
  const filter = buildFilter(query);
  // Counts per status ignore the status filter itself, so the UI tabs can show them
  const baseFilter = buildFilter({ ...query, status: 'all' });

  const [items, total, all, active, churned] = await Promise.all([
    Customer.find(filter)
      .sort(buildSort(sort))
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('plan', PLAN_FIELDS),
    Customer.countDocuments(filter),
    Customer.countDocuments(baseFilter),
    Customer.countDocuments({ ...baseFilter, status: 'active' }),
    Customer.countDocuments({ ...baseFilter, status: 'churned' }),
  ]);

  return {
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      status,
      counts: { all, active, churned },
    },
  };
}

async function getById(id) {
  const customer = await Customer.findById(id).populate('plan', PLAN_FIELDS);
  if (!customer) throw ApiError.notFound('Customer not found.');
  const activity = await activityService.listForCustomer(customer._id);
  return { ...customer.toJSON(), activity };
}

async function findPlanForAssignment(planId, { allowArchived = false } = {}) {
  const plan = await Plan.findById(planId);
  if (!plan) throw ApiError.badRequest('Selected plan does not exist.');
  if (plan.isArchived && !allowArchived) throw ApiError.badRequest(`The ${plan.name} plan is archived and can't take new customers.`);
  return plan;
}

async function assertEmailFree(email, exceptId) {
  const existing = await Customer.findOne({ email }).select('_id');
  if (existing && String(existing._id) !== String(exceptId)) {
    throw ApiError.conflict(`A customer with the email ${email} already exists.`);
  }
}

async function create(data) {
  const plan = await findPlanForAssignment(data.planId);
  await assertEmailFree(data.email);

  const signupDate = data.signupDate || new Date();
  const customer = await Customer.create({
    name: data.name,
    email: data.email,
    company: data.company,
    city: data.city,
    notes: data.notes,
    plan: plan._id,
    mrr: plan.monthlyPrice,
    signupDate,
  });

  await activityService.record(customer, 'signup', {
    mrrDelta: plan.monthlyPrice,
    toPlan: plan.name,
    occurredAt: signupDate,
  });

  return getById(customer._id);
}

async function update(id, data) {
  const customer = await Customer.findById(id).populate('plan', PLAN_FIELDS);
  if (!customer) throw ApiError.notFound('Customer not found.');

  if (data.email && data.email !== customer.email) await assertEmailFree(data.email, id);

  for (const field of ['name', 'email', 'company', 'city', 'notes']) {
    if (data[field] !== undefined) customer[field] = data[field];
  }

  let planChange = null;
  if (data.planId && String(data.planId) !== String(customer.plan._id)) {
    const newPlan = await findPlanForAssignment(data.planId);
    const oldPlanName = customer.plan.name;
    const delta = newPlan.monthlyPrice - customer.mrr;
    customer.plan = newPlan._id;
    customer.mrr = newPlan.monthlyPrice;

    // Only active customers move revenue; a churned customer's plan is just updated
    if (customer.status === 'active' && delta !== 0) {
      planChange = { type: delta > 0 ? 'upgrade' : 'downgrade', mrrDelta: delta, fromPlan: oldPlanName, toPlan: newPlan.name };
    }
  }

  await customer.save();
  if (planChange) {
    const { type, ...opts } = planChange;
    await activityService.record(customer, type, opts);
  }
  return getById(id);
}

async function setStatus(id, { status, reason }) {
  const customer = await Customer.findById(id).populate('plan', PLAN_FIELDS);
  if (!customer) throw ApiError.notFound('Customer not found.');
  if (customer.status === status) throw ApiError.conflict(`Customer is already ${status}.`);

  const now = new Date();
  if (status === 'churned') {
    customer.status = 'churned';
    customer.churnDate = now;
    customer.churnReason = reason || '';
    await customer.save();
    await activityService.record(customer, 'churn', { mrrDelta: -customer.mrr, fromPlan: customer.plan.name, note: reason, occurredAt: now });
  } else {
    customer.status = 'active';
    customer.churnDate = null;
    customer.churnReason = '';
    await customer.save();
    await activityService.record(customer, 'reactivation', { mrrDelta: customer.mrr, toPlan: customer.plan.name, occurredAt: now });
  }
  return getById(id);
}

async function remove(id) {
  const customer = await Customer.findByIdAndDelete(id);
  if (!customer) throw ApiError.notFound('Customer not found.');
  // Remove its revenue history too, so charts stay consistent with the customer list
  await Activity.deleteMany({ customer: customer._id });
  return { id };
}

async function exportCsv(query) {
  const items = await Customer.find(buildFilter(query)).sort(buildSort(query.sort)).populate('plan', 'name').lean();
  return toCsv(
    [
      { label: 'name', value: (c) => c.name },
      { label: 'email', value: (c) => c.email },
      { label: 'company', value: (c) => c.company },
      { label: 'city', value: (c) => c.city },
      { label: 'plan', value: (c) => c.plan?.name },
      { label: 'mrr', value: (c) => c.mrr },
      { label: 'status', value: (c) => c.status },
      { label: 'signup_date', value: (c) => c.signupDate },
      { label: 'churn_date', value: (c) => c.churnDate },
      { label: 'churn_reason', value: (c) => c.churnReason },
    ],
    items
  );
}

module.exports = { list, getById, create, update, setStatus, remove, exportCsv };
