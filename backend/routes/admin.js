const express = require('express');
const User = require('../models/User');
const Deposit = require('../models/Deposit');
const Withdraw = require('../models/Withdraw');
const Transaction = require('../models/Transaction');
const Plan = require('../models/Plan');
const Setting = require('../models/Setting');
const Referral = require('../models/Referral');
const Profit = require('../models/Profit');
const bcrypt = require('bcryptjs');
const { notifyUser } = require('../config/telegram');

const router = express.Router();

// Admin auth middleware
const adminAuth = (req, res, next) => {
  const token = req.headers['admin-key'];
  if (token !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Dashboard stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true, isBlocked: false });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newToday = await User.countDocuments({ createdAt: { $gte: today } });
    
    const deposits = await Deposit.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const withdrawals = await Withdraw.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const profits = await Profit.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const pendingDeposits = await Deposit.countDocuments({ status: 'pending' });
    const pendingWithdrawals = await Withdraw.countDocuments({ status: 'pending' });
    
    const totalReferrals = await Referral.countDocuments();
    const referralBonus = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$totalReferralBonus' } } }
    ]);
    
    res.json({
      totalUsers,
      activeUsers,
      newToday,
      totalDeposits: deposits[0]?.total || 0,
      totalWithdrawals: withdrawals[0]?.total || 0,
      totalProfit: profits[0]?.total || 0,
      pendingDeposits,
      pendingWithdrawals,
      totalReferrals,
      totalReferralBonus: referralBonus[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending deposits
router.get('/pending-deposits', adminAuth, async (req, res) => {
  try {
    const deposits = await Deposit.find({ status: 'pending' })
      .populate('userId', 'username whatsapp')
      .sort({ createdAt: 1 });
    res.json(deposits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve deposit
router.post('/approve-deposit', adminAuth, async (req, res) => {
  try {
    const { depositId } = req.body;
    const deposit = await Deposit.findById(depositId);
    const user = await User.findById(deposit.userId);
    
    // Update deposit
    deposit.status = 'approved';
    deposit.profitStartDate = new Date();
    deposit.approvedAt = new Date();
    await deposit.save();
    
    // Update user
    user.totalDeposit += deposit.amount;
    user.balance += deposit.amount;
    user.activePlanId = deposit.planId;
    user.activePlanAmount = deposit.amount;
    user.planStartDate = new Date();
    user.planEndDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    await user.save();
    
    // Update transaction
    await Transaction.findOneAndUpdate(
      { referenceId: depositId, type: 'deposit' },
      { status: 'approved' }
    );
    
    // Handle referral bonus
    if (user.referredBy) {
      const referrer = await User.findOne({ referralCode: user.referredBy });
      if (referrer) {
        const bonusAmount = deposit.amount * 0.11;
        referrer.balance += bonusAmount;
        referrer.totalReferralBonus += bonusAmount;
        await referrer.save();
        
        await Referral.findOneAndUpdate(
          { referrerId: referrer._id, referredId: user._id },
          { $inc: { totalDeposit: deposit.amount, totalBonus: bonusAmount } },
          { upsert: true }
        );
        
        await Transaction.create({
          userId: referrer._id,
          type: 'referral_bonus',
          amount: bonusAmount,
          status: 'completed',
          description: `Referral bonus from ${user.username}'s deposit of ${deposit.amount} PKR`
        });
        
        await notifyUser(referrer.telegramId, `🎉 *Referral Bonus Received!*\n\nYou earned ${bonusAmount} PKR from ${user.username}'s deposit of ${deposit.amount} PKR.`);
      }
    }
    
    // Notify user
    await notifyUser(user.telegramId, `✅ *Deposit Approved!*\n\nYour deposit of ${deposit.amount} PKR has been approved.\n\n💰 Balance: ${user.balance} PKR\n📈 Daily profit will start at 12:00 AM`);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject deposit
router.post('/reject-deposit', adminAuth, async (req, res) => {
  try {
    const { depositId, reason } = req.body;
    const deposit = await Deposit.findById(depositId);
    const user = await User.findById(deposit.userId);
    
    deposit.status = 'rejected';
    deposit.rejectionReason = reason;
    await deposit.save();
    
    await Transaction.findOneAndUpdate(
      { referenceId: depositId, type: 'deposit' },
      { status: 'rejected' }
    );
    
    await notifyUser(user.telegramId, `❌ *Deposit Rejected!*\n\nYour deposit of ${deposit.amount} PKR has been rejected.\n\nReason: ${reason || 'Please contact support'}`);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending withdrawals
router.get('/pending-withdrawals', adminAuth, async (req, res) => {
  try {
    const withdrawals = await Withdraw.find({ status: 'pending' })
      .populate('userId', 'username whatsapp balance')
      .sort({ createdAt: 1 });
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve withdrawal
router.post('/approve-withdraw', adminAuth, async (req, res) => {
  try {
    const { withdrawId } = req.body;
    const withdraw = await Withdraw.findById(withdrawId);
    const user = await User.findById(withdraw.userId);
    
    // Deduct from balance
    user.balance -= withdraw.amount;
    user.totalWithdraw += withdraw.amount;
    await user.save();
    
    // Update withdraw
    withdraw.status = 'approved';
    withdraw.approvedAt = new Date();
    await withdraw.save();
    
    // Update transaction
    await Transaction.findOneAndUpdate(
      { referenceId: withdrawId, type: 'withdraw' },
      { status: 'approved' }
    );
    
    await notifyUser(user.telegramId, `✅ *Withdrawal Approved!*\n\nYour withdrawal of ${withdraw.amount} PKR has been approved and sent to your ${withdraw.accountType.toUpperCase()} account.\n\n🏦 Account: ${withdraw.accountNumber}\n📛 Title: ${withdraw.accountTitle}`);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject withdrawal
router.post('/reject-withdraw', adminAuth, async (req, res) => {
  try {
    const { withdrawId, reason } = req.body;
    const withdraw = await Withdraw.findById(withdrawId);
    const user = await User.findById(withdraw.userId);
    
    withdraw.status = 'rejected';
    withdraw.rejectionReason = reason;
    await withdraw.save();
    
    await Transaction.findOneAndUpdate(
      { referenceId: withdrawId, type: 'withdraw' },
      { status: 'rejected' }
    );
    
    await notifyUser(user.telegramId, `❌ *Withdrawal Rejected!*\n\nYour withdrawal of ${withdraw.amount} PKR has been rejected.\n\nReason: ${reason || 'Please contact support'}\n\nYour balance has been restored.`);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update plan settings
router.put('/update-plan/:planId', adminAuth, async (req, res) => {
  try {
    const { planId } = req.params;
    const { name, minAmount, maxAmount, profitPercent, durationDays, isActive } = req.body;
    
    await Plan.findOneAndUpdate(
      { planId: parseInt(planId) },
      { name, minAmount, maxAmount, profitPercent, durationDays, isActive }
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update withdrawal settings
router.put('/withdraw-settings', adminAuth, async (req, res) => {
  try {
    const settings = await Setting.findOneAndUpdate(
      { key: 'withdraw_settings' },
      { value: req.body, updatedAt: Date.now() },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update referral settings
router.put('/referral-settings', adminAuth, async (req, res) => {
  try {
    const { bonusPercent } = req.body;
    await Setting.findOneAndUpdate(
      { key: 'referral_settings' },
      { value: { bonusPercent }, updatedAt: Date.now() },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update deposit accounts
router.put('/deposit-accounts', adminAuth, async (req, res) => {
  try {
    await Setting.findOneAndUpdate(
      { key: 'deposit_accounts' },
      { value: req.body.accounts, updatedAt: Date.now() },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Block user
router.post('/block-user', adminAuth, async (req, res) => {
  try {
    const { userId, isBlocked } = req.body;
    await User.findByIdAndUpdate(userId, { isBlocked });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Broadcast message
router.post('/broadcast', adminAuth, async (req, res) => {
  try {
    const { message, userType } = req.body;
    let query = {};
    
    if (userType === 'active') {
      query = { isActive: true, isBlocked: false };
    } else if (userType === 'inactive') {
      query = { isActive: false };
    }
    
    const users = await User.find(query);
    let sent = 0;
    
    for (const user of users) {
      if (user.telegramId) {
        await notifyUser(user.telegramId, `📢 *Announcement*\n\n${message}`);
        sent++;
      }
    }
    
    res.json({ success: true, sent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
