const mongoose = require('mongoose');

const ProfitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  depositId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deposit', required: true },
  amount: { type: Number, required: true },
  dayNumber: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'credited'], default: 'credited' },
  creditedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Profit', ProfitSchema);
