const { Schema, model } = require('mongoose');

const planSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    // Lowercased copy of name, used for case-insensitive uniqueness
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    monthlyPrice: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, maxlength: 200, default: '' },
    // Archived plans stay on existing customers but can't be picked for new ones
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

planSchema.pre('validate', function setSlug() {
  if (this.name) this.slug = this.name.trim().toLowerCase();
});

planSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.slug;
    return ret;
  },
});

module.exports = model('Plan', planSchema);
