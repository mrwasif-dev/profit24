const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  whatsapp: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 },
  totalDeposit: { type: Number, default: 0 },
  totalProfit: { type: Number, default: 0 },
  totalWithdraw: { type: Number, default: 0 },
  referralCode: { type: String, unique: true },
  referredBy: { type: String, default: null },
  totalReferrals: { type: Number, default: 0 },
  totalReferralBonus: { type: Number, default: 0 },
  activePlanId: { type: Number, default: null },
  activePlanAmount: { type: Number, default: null },
  planStartDate: { type: Date, default: null },
  planEndDate: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  isBlocked: { type: Boolean, default: false },
  telegramId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
