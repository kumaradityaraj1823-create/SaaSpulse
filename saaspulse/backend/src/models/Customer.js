const { Schema, model } = require('mongoose');

const customerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    company: { type: String, trim: true, maxlength: 120, default: '' },
    city: { type: String, trim: true, maxlength: 80, default: '' },
    plan: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    // What this customer pays per month. Copied from the plan when they
    // subscribe or change plan, so later price changes don't rewrite history.
    mrr: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['active', 'churned'], default: 'active' },
    signupDate: { type: Date, required: true },
    churnDate: { type: Date, default: null },
    churnReason: { type: String, trim: true, maxlength: 200, default: '' },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { timestamps: true }
);

customerSchema.index({ status: 1, signupDate: -1 });
customerSchema.index({ plan: 1, status: 1 });
customerSchema.index({ name: 1 });

customerSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

module.exports = model('Customer', customerSchema);
