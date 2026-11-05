const { parse } = require('csv-parse/sync');
const Customer = require('../models/Customer');
const Plan = require('../models/Plan');
const Activity = require('../models/Activity');
const { buildActivity } = require('./activity.service');
const { parseDate } = require('../utils/dates');
const ApiError = require('../utils/ApiError');

const MAX_ROWS = 5000;
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEADER_ALIASES = {
  customer_name: 'name',
  full_name: 'name',
  email_address: 'email',
  plan_name: 'plan',
  signup: 'signup_date',
  signupdate: 'signup_date',
  churn: 'churn_date',
  churndate: 'churn_date',
  organisation: 'company',
  organization: 'company',
};

function normaliseHeader(h) {
  const key = String(h).trim().toLowerCase().replace(/[\s-]+/g, '_');
  return HEADER_ALIASES[key] || key;
}

/**
 * Validates every row of a customer CSV.
 * dryRun = true  → only reports what would happen (used for the preview step)
 * dryRun = false → inserts valid rows and their revenue history
 */
async function importCustomers(buffer, { dryRun }) {
  let records;
  try {
    records = parse(buffer, {
      columns: (header) => header.map(normaliseHeader),
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    });
  } catch (err) {
    throw ApiError.badRequest(`Couldn't read the CSV: ${err.message}`);
  }

  if (records.length === 0) throw ApiError.badRequest('The file has no data rows.');
  if (records.length > MAX_ROWS) throw ApiError.badRequest(`The file has ${records.length} rows. The limit is ${MAX_ROWS} per import.`);
  const columns = Object.keys(records[0]);
  const missing = ['name', 'email', 'plan'].filter((c) => !columns.includes(c));
  if (missing.length) throw ApiError.badRequest(`Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`);

  const plans = await Plan.find();
  const planByName = new Map(plans.map((p) => [p.name.toLowerCase(), p]));
  const emails = records.map((r) => String(r.email || '').toLowerCase()).filter(Boolean);
  const existing = new Set((await Customer.find({ email: { $in: emails } }).select('email').lean()).map((c) => c.email));
  const seen = new Set();
  const today = new Date();

  const rows = records.map((r, i) => {
    const line = i + 2; // +1 for header, +1 for 1-based lines
    const email = String(r.email || '').toLowerCase();
    const problems = [];

    if (!r.name) problems.push('Name is missing');
    else if (r.name.length < 2) problems.push('Name is too short');
    if (!email) problems.push('Email is missing');
    else if (!EMAIL_RX.test(email)) problems.push('Email is not valid');
    else if (existing.has(email)) problems.push('Email already exists');
    else if (seen.has(email)) problems.push('Email appears twice in this file');

    const plan = planByName.get(String(r.plan || '').toLowerCase());
    if (!r.plan) problems.push('Plan is missing');
    else if (!plan) problems.push(`Unknown plan "${r.plan}"`);
    else if (plan.isArchived) problems.push(`Plan "${plan.name}" is archived`);

    const status = String(r.status || 'active').toLowerCase();
    if (!['active', 'churned'].includes(status)) problems.push(`Status must be active or churned`);

    const signupDate = r.signup_date ? parseDate(r.signup_date) : today;
    if (!signupDate) problems.push('Signup date is not a valid date');
    else if (signupDate > today) problems.push('Signup date is in the future');

    let churnDate = null;
    if (status === 'churned') {
      churnDate = r.churn_date ? parseDate(r.churn_date) : today;
      if (!churnDate) problems.push('Churn date is not a valid date');
      else if (signupDate && churnDate < signupDate) problems.push('Churn date is before signup date');
      else if (churnDate > today) problems.push('Churn date is in the future');
    }

    if (email) seen.add(email);
    return {
      line,
      name: r.name || '',
      email,
      company: r.company || '',
      city: r.city || '',
      plan: plan ? plan.name : r.plan || '',
      status,
      signupDate: signupDate && !Number.isNaN(signupDate.getTime()) ? signupDate : null,
      churnDate,
      ok: problems.length === 0,
      problems,
      _plan: plan,
    };
  });

  const valid = rows.filter((r) => r.ok);
  let imported = 0;

  if (!dryRun && valid.length) {
    const docs = await Customer.insertMany(
      valid.map((r) => ({
        name: r.name,
        email: r.email,
        company: r.company,
        city: r.city,
        plan: r._plan._id,
        mrr: r._plan.monthlyPrice,
        status: r.status,
        signupDate: r.signupDate,
        churnDate: r.churnDate,
      })),
      { ordered: false }
    );
    imported = docs.length;

    const byEmail = new Map(valid.map((r) => [r.email, r]));
    const events = [];
    for (const c of docs) {
      const r = byEmail.get(c.email);
      events.push(buildActivity(c, 'signup', { mrrDelta: c.mrr, toPlan: r.plan, occurredAt: c.signupDate, note: 'Imported from CSV' }));
      if (c.status === 'churned') {
        events.push(buildActivity(c, 'churn', { mrrDelta: -c.mrr, fromPlan: r.plan, occurredAt: c.churnDate, note: 'Imported from CSV' }));
      }
    }
    await Activity.insertMany(events);
  }

  return {
    dryRun,
    summary: { total: rows.length, valid: valid.length, invalid: rows.length - valid.length, imported },
    rows: rows.slice(0, 1000).map(({ _plan, ...r }) => r),
  };
}

const TEMPLATE = `name,email,company,city,plan,signup_date,status,churn_date
Ishita Raman,ishita@lumenlabs.in,Lumen Labs,Bengaluru,Pro,2026-05-14,active,
Farhan Qureshi,farhan@quillstack.io,Quillstack,Hyderabad,Enterprise,2026-06-20,active,
Neelam Bhatia,neelam@tinyfolio.co,Tinyfolio,Pune,Basic,2026-07-02,churned,2026-09-15
Omkar Patil,omkar@freightly.in,Freightly,Mumbai,Pro,2026-08-11,active,
`;

module.exports = { importCustomers, TEMPLATE };
