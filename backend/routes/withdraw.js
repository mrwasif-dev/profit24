const express = require('express');
const authMiddleware = require('../middleware/auth');
const Withdraw = require('../models/Withdraw');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Setting = require('../models/Setting');
const { notifyNewWithdraw } = require('../config/telegram');

const router = express.Router();

// Get withdrawal settings
async function getWithdrawSettings() {
  let settings = await Setting.findOne({ key: 'withdraw_settings' });
  if (!settings) {
    settings = await Setting.create({
      key: 'withdraw_settings',
      value: {
        minAmount: 30,
        maxAmount: 500000,
        dailyLimit: 100000,
        monthlyLimit: 1000000,
        processingFee: 0,
        minBalanceRequired: 100
      }
    });
  }
  return settings.value;
}

// Create withdrawal request
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { amount, accountType, accountNumber, accountTitle } = req.body;
    const user = await User.findById(req.userId);
    
    const settings = await getWithdrawSettings();
    
    // Check if user has active plan
    const activePlan = await require('../models/Deposit').findOne({ 
      userId: req.userId, 
      status: 'approved',
      profitStartDate: { $exists: true }
    });
    
    if (!activePlan) {
      return res.status(400).json({ error: 'You must have an active investment plan to withdraw' });
    }
    
    // Validate amount
    if (amount < settings.minAmount) {
      return res.status(400).json({ error: `Minimum withdrawal is ${settings.minAmount} PKR` });
    }
    
    if (amount > settings.maxAmount) {
      return res.status(400).json({ error: `Maximum withdrawal per request is ${settings.maxAmount} PKR` });
    }
    
    // Check balance
    if (user.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyWithdrawals = await Withdraw.aggregate([
      { $match: { userId: user._id, createdAt: { $gte: today }, status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const dailyTotal = dailyWithdrawals[0]?.total || 0;
    
    if (dailyTotal + amount > settings.dailyLimit) {
      return res.status(400).json({ error: `Daily withdrawal limit is ${settings.dailyLimit} PKR` });
    }
    
    const withdraw = await Withdraw.create({
      userId: req.userId,
      amount,
      accountType,
      accountNumber,
      accountTitle,
      status: 'pending'
    });
    
    await Transaction.create({
      userId: req.userId,
      type: 'withdraw',
      amount,
      status: 'pending',
      referenceId: withdraw._id,
      description: `Withdrawal request to ${accountType.toUpperCase()}`
    });
    
    // Notify admin
    await notifyNewWithdraw(withdraw, user);
    
    res.json({ success: true, withdrawId: withdraw._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's withdrawals
router.get('/my-withdrawals', authMiddleware, async (req, res) => {
  try {
    const withdrawals = await Withdraw.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get withdrawal settings
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const settings = await getWithdrawSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
