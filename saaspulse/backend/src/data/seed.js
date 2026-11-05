const { Types } = require('mongoose');
const Plan = require('../models/Plan');
const Customer = require('../models/Customer');
const Activity = require('../models/Activity');
const { buildActivity } = require('../services/activity.service');

/**
 * Generates ~18 months of realistic subscription history by simulating each
 * day: new signups (growing over time), plus a small daily chance for every
 * customer to churn, upgrade, downgrade or come back. Uses a seeded random
 * generator so the demo looks the same every time.
 */

function mulberry32(seed) {
  return function rand() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PLANS = [
  { name: 'Starter', monthlyPrice: 299, description: 'Legacy entry plan, replaced by Basic.', isArchived: true },
  { name: 'Basic', monthlyPrice: 499, description: 'For solo founders and very small teams.' },
  { name: 'Pro', monthlyPrice: 1499, description: 'For growing teams that need integrations and reports.' },
  { name: 'Enterprise', monthlyPrice: 4999, description: 'SSO, audit logs and a dedicated success manager.' },
];
const UPGRADE = { Starter: 'Basic', Basic: 'Pro', Pro: 'Enterprise' };
const DOWNGRADE = { Enterprise: 'Pro', Pro: 'Basic' };

const FIRST = ['Aarav', 'Aditi', 'Arjun', 'Ananya', 'Bhavya', 'Chetan', 'Devika', 'Eshan', 'Farhan', 'Gauri', 'Harsh', 'Ishita', 'Jai', 'Kavya', 'Kabir', 'Lakshmi', 'Manav', 'Meher', 'Nikhil', 'Neelam', 'Omkar', 'Pallavi', 'Pranav', 'Riya', 'Rohan', 'Sana', 'Siddharth', 'Tanvi', 'Uday', 'Vani', 'Varun', 'Yash', 'Zoya', 'Kiran', 'Aisha', 'Dev', 'Mira', 'Reyansh', 'Tara', 'Vihaan'];
const LAST = ['Sharma', 'Iyer', 'Patel', 'Menon', 'Reddy', 'Kulkarni', 'Nair', 'Banerjee', 'Gupta', 'Qureshi', 'Rao', 'Desai', 'Bhatia', 'Fernandes', 'Chatterjee', 'Joshi', 'Pillai', 'Saxena', 'Kapoor', 'Ghosh', 'Mehta', 'Shetty', 'Verma', 'Das'];
const CO_A = ['Lumen', 'Quill', 'Freight', 'Tiny', 'Kite', 'Saffron', 'Monsoon', 'Peak', 'Banyan', 'Neem', 'Orbit', 'Pixel', 'Copper', 'Ledger', 'Tide', 'Sprout', 'Vista', 'Harbor', 'Cedar', 'Chai', 'Mango', 'Rivet', 'Nimbus', 'Atlas'];
const CO_B = ['Labs', 'Works', 'Stack', 'Hub', 'Systems', 'Analytics', 'Health', 'Pay', 'Studio', 'Logistics', 'Learning', 'Foods', 'Cloud', 'Retail'];
const TLD = ['in', 'io', 'co', 'com', 'co.in', 'dev'];
const CITIES = ['Bengaluru', 'Mumbai', 'Pune', 'Hyderabad', 'Chennai', 'Delhi', 'Gurugram', 'Noida', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Kochi', 'Indore', 'Chandigarh'];
const CHURN_REASONS = ['Too expensive', 'Switched to a competitor', 'Missing a feature they needed', 'No longer needed', 'Company shut down', 'Poor onboarding experience', ''];

const DAY = 24 * 3600 * 1000;

function generate({ months = 18, now = new Date(), seed = 20261029 } = {}) {
  const rand = mulberry32(seed);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const planDocs = PLANS.map((p) => ({ _id: new Types.ObjectId(), slug: p.name.toLowerCase(), isArchived: false, ...p }));
  const planBy = Object.fromEntries(planDocs.map((p) => [p.name, p]));

  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  const totalDays = Math.floor((now - start) / DAY);
  const starterCutoff = 4 * 30; // Starter was sold only in the first ~4 months

  const customers = [];
  const activities = [];
  const usedEmails = new Set();

  const at = (dayIndex) => new Date(start.getTime() + dayIndex * DAY + Math.floor(rand() * 10 + 4) * 3600 * 1000);

  for (let d = 0; d <= totalDays; d++) {
    const progress = d / totalDays;
    const date = at(d);
    if (date > now) break;

    // Existing customers: churn / plan changes / win-backs
    for (const c of customers) {
      if (c.signupDate >= date) continue;
      const r = rand();
      if (c.status === 'active') {
        const churnP = c.planName === 'Enterprise' ? 0.0005 : c.planName === 'Starter' ? 0.0012 : 0.0008;
        if (r < churnP) {
          c.status = 'churned';
          c.churnDate = date;
          c.churnReason = pick(CHURN_REASONS);
          activities.push(buildActivity(c, 'churn', { mrrDelta: -c.mrr, fromPlan: c.planName, note: c.churnReason, occurredAt: date }));
        } else if (r < churnP + (c.planName === 'Starter' ? 0.0012 : 0.0007) && UPGRADE[c.planName]) {
          const to = planBy[UPGRADE[c.planName]];
          activities.push(buildActivity(c, 'upgrade', { mrrDelta: to.monthlyPrice - c.mrr, fromPlan: c.planName, toPlan: to.name, occurredAt: date }));
          Object.assign(c, { plan: to._id, planName: to.name, mrr: to.monthlyPrice });
        } else if (r > 1 - 0.0002 && DOWNGRADE[c.planName]) {
          const to = planBy[DOWNGRADE[c.planName]];
          activities.push(buildActivity(c, 'downgrade', { mrrDelta: to.monthlyPrice - c.mrr, fromPlan: c.planName, toPlan: to.name, occurredAt: date }));
          Object.assign(c, { plan: to._id, planName: to.name, mrr: to.monthlyPrice });
        }
      } else if (r < 0.0004 && date - c.churnDate > 30 * DAY) {
        if (c.planName === 'Starter') Object.assign(c, { plan: planBy.Basic._id, planName: 'Basic', mrr: planBy.Basic.monthlyPrice });
        c.status = 'active';
        c.churnDate = null;
        c.churnReason = '';
        activities.push(buildActivity(c, 'reactivation', { mrrDelta: c.mrr, toPlan: c.planName, note: 'Came back', occurredAt: date }));
      }
    }

    // New signups: grows from ~6/month to ~38/month, with weekday dips
    const weekday = date.getUTCDay();
    const expected = (0.2 + 1.05 * progress ** 1.3) * (weekday === 0 || weekday === 6 ? 0.55 : 1.15);
    let n = 0;
    let l = Math.exp(-expected);
    let p = rand();
    while (p > l) { n++; p *= rand(); }

    for (let i = 0; i < n; i++) {
      const first = pick(FIRST);
      const last = pick(LAST);
      const company = `${pick(CO_A)} ${pick(CO_B)}`;
      const domain = `${company.toLowerCase().replace(/\s+/g, '')}.${pick(TLD)}`;
      let email = `${first.toLowerCase()}@${domain}`;
      let k = 2;
      while (usedEmails.has(email)) email = `${first.toLowerCase()}.${last.toLowerCase()}${k++ > 2 ? k : ''}@${domain}`;
      usedEmails.add(email);

      const roll = rand();
      let planName;
      if (d < starterCutoff && roll < 0.3) planName = 'Starter';
      else if (roll < 0.62) planName = 'Basic';
      else if (roll < 0.9) planName = 'Pro';
      else planName = 'Enterprise';
      const plan = planBy[planName];

      const c = {
        _id: new Types.ObjectId(),
        name: `${first} ${last}`,
        email,
        company,
        city: pick(CITIES),
        plan: plan._id,
        planName,
        mrr: plan.monthlyPrice,
        status: 'active',
        signupDate: date,
        churnDate: null,
        churnReason: '',
        notes: '',
      };
      customers.push(c);
      activities.push(buildActivity(c, 'signup', { mrrDelta: plan.monthlyPrice, toPlan: planName, occurredAt: date }));
    }
  }

  // Starter is archived once the history is generated
  planBy.Starter.isArchived = true;
  for (const p of planDocs) if (p.name !== 'Starter') p.isArchived = false;

  return {
    plans: planDocs,
    customers: customers.map(({ planName, ...c }) => c),
    activities,
  };
}

async function seedDatabase() {
  await Promise.all([Plan.deleteMany({}), Customer.deleteMany({}), Activity.deleteMany({})]);
  const { plans, customers, activities } = generate();
  await Plan.insertMany(plans);
  await Customer.insertMany(customers);
  await Activity.insertMany(activities);
  return { plans: plans.length, customers: customers.length, activities: activities.length };
}

async function seedIfEmpty() {
  const count = await Plan.estimatedDocumentCount();
  if (count > 0) return null;
  return seedDatabase();
}

module.exports = { generate, seedDatabase, seedIfEmpty };
