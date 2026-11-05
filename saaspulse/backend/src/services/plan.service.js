const Plan = require('../models/Plan');
const Customer = require('../models/Customer');
const ApiError = require('../utils/ApiError');

/** All plans with live subscriber and revenue stats (one aggregation) */
async function listWithStats() {
  const rows = await Plan.aggregate([
    {
      $lookup: {
        from: Customer.collection.name,
        localField: '_id',
        foreignField: 'plan',
        as: 'customers',
        pipeline: [{ $project: { status: 1, mrr: 1 } }],
      },
    },
    {
      $project: {
        name: 1,
        monthlyPrice: 1,
        description: 1,
        isArchived: 1,
        createdAt: 1,
        activeCustomers: {
          $size: { $filter: { input: '$customers', cond: { $eq: ['$$this.status', 'active'] } } },
        },
        churnedCustomers: {
          $size: { $filter: { input: '$customers', cond: { $eq: ['$$this.status', 'churned'] } } },
        },
        mrr: {
          $sum: {
            $map: {
              input: { $filter: { input: '$customers', cond: { $eq: ['$$this.status', 'active'] } } },
              in: '$$this.mrr',
            },
          },
        },
      },
    },
    { $sort: { isArchived: 1, monthlyPrice: 1 } },
  ]);

  const totalMrr = rows.reduce((s, r) => s + r.mrr, 0);
  return rows.map(({ _id, ...r }) => {
    const totalCustomers = r.activeCustomers + r.churnedCustomers;
    return {
      id: String(_id),
      ...r,
      totalCustomers,
      mrrShare: totalMrr > 0 ? round1((r.mrr / totalMrr) * 100) : 0,
      churnRate: totalCustomers > 0 ? round1((r.churnedCustomers / totalCustomers) * 100) : 0,
    };
  });
}

const round1 = (n) => Math.round(n * 10) / 10;

async function create(data) {
  const plan = await Plan.create(data);
  return plan;
}

async function update(id, data) {
  const plan = await Plan.findById(id);
  if (!plan) throw ApiError.notFound('Plan not found.');
  Object.assign(plan, data);
  await plan.save();
  return plan;
}

async function remove(id) {
  const plan = await Plan.findById(id);
  if (!plan) throw ApiError.notFound('Plan not found.');
  const used = await Customer.countDocuments({ plan: plan._id });
  if (used > 0) {
    throw ApiError.conflict(`${used} customer${used === 1 ? ' is' : 's are'} on ${plan.name}. Archive it instead so they keep their plan.`);
  }
  await plan.deleteOne();
  return { id };
}

module.exports = { listWithStats, create, update, remove };
