const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema({
  planId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  minAmount: { type: Number, required: true },
  maxAmount: { type: Number, required: true },
  profitPercent: { type: Number, default: 11 },
  durationDays: { type: Number, default: 60 },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
});

module.exports = mongoose.model('Plan', PlanSchema);
