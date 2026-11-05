const Activity = require('../models/Activity');

const CUSTOMER_DELTA = { signup: 1, reactivation: 1, churn: -1, upgrade: 0, downgrade: 0 };

/** Builds an Activity document (not yet saved) for a customer revenue event */
function buildActivity(customer, type, { mrrDelta, fromPlan = null, toPlan = null, note = '', occurredAt = new Date() }) {
  return {
    type,
    customer: customer._id,
    customerName: customer.name,
    mrrDelta,
    customerDelta: CUSTOMER_DELTA[type],
    fromPlan,
    toPlan,
    note,
    occurredAt,
  };
}

async function record(customer, type, opts) {
  return Activity.create(buildActivity(customer, type, opts));
}

async function listRecent({ limit = 15 } = {}) {
  return Activity.find().sort({ occurredAt: -1, _id: -1 }).limit(limit);
}

async function listForCustomer(customerId) {
  return Activity.find({ customer: customerId }).sort({ occurredAt: -1, _id: -1 });
}

module.exports = { buildActivity, record, listRecent, listForCustomer };
