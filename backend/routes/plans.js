const express = require('express');
const Plan = require('../models/Plan');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all active plans
router.get('/', async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ order: 1, minAmount: 1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's active plan
router.get('/my-plan', authMiddleware, async (req, res) => {
  try {
    const User = require('../models/User');
    const Deposit = require('../models/Deposit');
    const Profit = require('../models/Profit');
    
    const user = await User.findById(req.userId);
    
    if (!user.activePlanId) {
      return res.json({ hasActivePlan: false });
    }
    
    const activeDeposit = await Deposit.findOne({ 
      userId: req.userId, 
      status: 'approved',
      profitStartDate: { $exists: true }
    }).sort({ createdAt: -1 });
    
    if (!activeDeposit) {
      return res.json({ hasActivePlan: false });
    }
    
    const daysPassed = Math.floor((Date.now() - activeDeposit.profitStartDate) / (24 * 60 * 60 * 1000));
    const daysRemaining = Math.max(0, 60 - daysPassed);
    const profitsReceived = await Profit.find({ 
      userId: req.userId, 
      depositId: activeDeposit._id 
    });
    const totalProfitReceived = profitsReceived.reduce((sum, p) => sum + p.amount, 0);
    const expectedTotalProfit = activeDeposit.amount * 0.11 * 60;
    
    res.json({
      hasActivePlan: true,
      planId: activeDeposit.planId,
      amount: activeDeposit.amount,
      startDate: activeDeposit.profitStartDate,
      daysPassed: Math.min(daysPassed, 60),
      daysRemaining,
      totalProfitReceived,
      expectedTotalProfit,
      nextProfitIn: daysPassed < 60 ? 'Today at 12:00 AM' : 'Plan completed'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
