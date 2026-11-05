const { Schema, model } = require('mongoose');

/**
 * Every change to a customer's revenue is recorded as an Activity.
 * The MRR history chart is rebuilt from these events, so it reflects what
 * actually happened in each month (not just today's state).
 *
 *   signup        +mrr   customer starts paying
 *   upgrade       +diff  moved to a pricier plan  (expansion)
 *   downgrade     -diff  moved to a cheaper plan  (contraction)
 *   churn         -mrr   customer cancelled
 *   reactivation  +mrr   churned customer came back
 */
const ACTIVITY_TYPES = ['signup', 'upgrade', 'downgrade', 'churn', 'reactivation'];

const activitySchema = new Schema(
  {
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerName: { type: String, required: true },
    mrrDelta: { type: Number, required: true },
    // +1 when a paying customer is gained, -1 when lost, 0 for plan changes
    customerDelta: { type: Number, enum: [-1, 0, 1], required: true },
    fromPlan: { type: String, default: null },
    toPlan: { type: String, default: null },
    note: { type: String, default: '' },
    occurredAt: { type: Date, required: true },
  },
  { timestamps: true }
);

activitySchema.index({ occurredAt: -1 });
activitySchema.index({ customer: 1, occurredAt: -1 });

activitySchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

module.exports = model('Activity', activitySchema);
module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
