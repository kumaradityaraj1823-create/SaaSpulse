const Activity = require('../models/Activity');
const Customer = require('../models/Customer');
const env = require('../config/env');
const { lastMonthKeys } = require('../utils/dates');
const planService = require('./plan.service');

const round = (n, dp = 1) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};
const pct = (part, whole) => (whole > 0 ? round((part / whole) * 100) : 0);

/**
 * Rebuilds monthly MRR history from Activity events.
 *
 * One aggregation groups every revenue event by (month, type). We then walk the
 * months in order, carrying a running total — so each month's closing MRR is
 * the opening MRR plus that month's new, expansion, contraction and churn.
 */
async function monthlyTrend(months) {
  const keys = lastMonthKeys(months);
  const firstKey = keys[0];

  const grouped = await Activity.aggregate([
    {
      $group: {
        _id: {
          month: { $dateToString: { format: '%Y-%m', date: '$occurredAt', timezone: env.reportingTz } },
          type: '$type',
        },
        mrr: { $sum: '$mrrDelta' },
        customers: { $sum: '$customerDelta' },
        count: { $sum: 1 },
      },
    },
  ]);

  // Opening balance = everything that happened before the window
  let mrr = 0;
  let customers = 0;
  const byMonth = new Map();
  for (const g of grouped) {
    const { month, type } = g._id;
    if (month < firstKey) {
      mrr += g.mrr;
      customers += g.customers;
      continue;
    }
    if (!byMonth.has(month)) byMonth.set(month, {});
    byMonth.get(month)[type] = g;
  }

  return keys.map((key) => {
    const m = byMonth.get(key) || {};
    const v = (type, field) => (m[type] ? m[type][field] : 0);

    const startMrr = mrr;
    const startCustomers = customers;
    const newMrr = v('signup', 'mrr');
    const reactivationMrr = v('reactivation', 'mrr');
    const expansionMrr = v('upgrade', 'mrr');
    const contractionMrr = -v('downgrade', 'mrr');
    const churnedMrr = -v('churn', 'mrr');
    const netNewMrr = newMrr + reactivationMrr + expansionMrr - contractionMrr - churnedMrr;

    mrr += netNewMrr;
    customers += v('signup', 'customers') + v('reactivation', 'customers') + v('churn', 'customers');

    const [y, mo] = key.split('-').map(Number);
    return {
      month: key,
      label: new Date(Date.UTC(y, mo - 1, 15)).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
      startMrr,
      mrr,
      newMrr,
      reactivationMrr,
      expansionMrr,
      contractionMrr,
      churnedMrr,
      netNewMrr,
      startCustomers,
      activeCustomers: customers,
      newCustomers: v('signup', 'count'),
      reactivatedCustomers: v('reactivation', 'count'),
      churnedCustomers: v('churn', 'count'),
      // Share of customers at the start of the month who cancelled during it
      churnRate: pct(v('churn', 'count'), startCustomers),
      // Revenue kept from customers who were already paying at the start of the month
      nrr: startMrr > 0 ? round(((startMrr + expansionMrr - contractionMrr - churnedMrr) / startMrr) * 100) : null,
    };
  });
}

async function currentTotals() {
  const [row] = await Customer.aggregate([
    {
      $group: {
        _id: null,
        mrr: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, '$mrr', 0] } },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        churned: { $sum: { $cond: [{ $eq: ['$status', 'churned'] }, 1, 0] } },
      },
    },
  ]);
  return row || { mrr: 0, active: 0, churned: 0 };
}

async function overview({ months }) {
  // Always compute at least 3 months so KPI comparisons have data
  const trend = await monthlyTrend(Math.max(months, 3));
  const [totals, plans, topCustomers] = await Promise.all([
    currentTotals(),
    planService.listWithStats(),
    Customer.find({ status: 'active' }).sort({ mrr: -1, signupDate: 1 }).limit(5).populate('plan', 'name'),
  ]);

  const current = trend[trend.length - 1];
  const lastFull = trend[trend.length - 2];
  const prevFull = trend[trend.length - 3];
  const previousMonthEnd = lastFull; // MRR at the end of last month

  const arpu = totals.active > 0 ? round(totals.mrr / totals.active, 0) : 0;
  const prevArpu = previousMonthEnd.activeCustomers > 0 ? round(previousMonthEnd.mrr / previousMonthEnd.activeCustomers, 0) : 0;

  const windowed = trend.slice(-months);
  const sum = (field) => windowed.reduce((s, m) => s + m[field], 0);

  return {
    asOf: new Date().toISOString(),
    period: { months, from: windowed[0].month, to: current.month, currentMonth: current.label, lastFullMonth: lastFull.label },
    kpis: {
      mrr: totals.mrr,
      arr: totals.mrr * 12,
      mrrPreviousMonth: previousMonthEnd.mrr,
      mrrGrowth: previousMonthEnd.mrr > 0 ? round(((totals.mrr - previousMonthEnd.mrr) / previousMonthEnd.mrr) * 100) : null,
      activeCustomers: totals.active,
      activeCustomersPreviousMonth: previousMonthEnd.activeCustomers,
      churnedCustomers: totals.churned,
      totalCustomers: totals.active + totals.churned,
      arpu,
      arpuPreviousMonth: prevArpu,
      // Rates use the last complete month so a half-finished month doesn't look artificially good
      churnRate: lastFull.churnRate,
      churnRatePrevious: prevFull.churnRate,
      nrr: lastFull.nrr,
      nrrPrevious: prevFull.nrr,
      // Totals for the selected window
      windowNewMrr: sum('newMrr') + sum('reactivationMrr'),
      windowExpansionMrr: sum('expansionMrr'),
      windowLostMrr: sum('churnedMrr') + sum('contractionMrr'),
      windowNewCustomers: sum('newCustomers'),
      windowChurnedCustomers: sum('churnedCustomers'),
    },
    trend: windowed,
    plans,
    topCustomers,
  };
}

module.exports = { overview, monthlyTrend, currentTotals };
