const mongoose = require('mongoose');

const ReferralSchema = new mongoose.Schema({
  referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referredId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  totalDeposit: { type: Number, default: 0 },
  totalBonus: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  referredAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Referral', ReferralSchema);
