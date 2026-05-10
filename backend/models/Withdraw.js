const mongoose = require('mongoose');

const WithdrawSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  accountType: { type: String, enum: ['jazzcash', 'easypaisa'], required: true },
  accountNumber: { type: String, required: true },
  accountTitle: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedAt: { type: Date },
  rejectionReason: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Withdraw', WithdrawSchema);
