const express = require('express');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const Referral = require('../models/Referral');
const Deposit = require('../models/Deposit');

const router = express.Router();

// Get my team
router.get('/my-team', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    
    // Find all referrals
    const referrals = await Referral.find({ referrerId: req.userId });
    
    const teamMembers = [];
    let totalTeamInvestment = 0;
    let totalTeamProfit = 0;
    
    for (const ref of referrals) {
      const member = await User.findById(ref.referredId);
      if (member) {
        teamMembers.push({
          username: member.username,
          joinedDate: member.createdAt,
          totalInvestment: ref.totalDeposit,
          totalProfit: ref.totalBonus,
          status: ref.totalDeposit > 0 ? 'active' : 'pending'
        });
        totalTeamInvestment += ref.totalDeposit;
        totalTeamProfit += ref.totalBonus;
      }
    }
    
    res.json({
      totalReferrals: referrals.length,
      totalTeamInvestment,
      totalTeamProfit,
      myReferralBonus: currentUser.totalReferralBonus,
      teamMembers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get referral link
router.get('/referral-link', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const link = `${process.env.WEBSITE_URL}/?ref=${user.referralCode}`;
    res.json({ link, code: user.referralCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
