const express = require('express');
const User = require('../models/User');

const router = express.Router();

// Top depositors
router.get('/deposits', async (req, res) => {
  try {
    const leaders = await User.find({ isActive: true })
      .sort({ totalDeposit: -1 })
      .limit(10)
      .select('username totalDeposit');
    
    res.json(leaders.map((u, i) => ({
      rank: i + 1,
      username: u.username,
      amount: u.totalDeposit
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Top earners
router.get('/earners', async (req, res) => {
  try {
    const leaders = await User.find({ isActive: true })
      .sort({ totalProfit: -1 })
      .limit(10)
      .select('username totalProfit');
    
    res.json(leaders.map((u, i) => ({
      rank: i + 1,
      username: u.username,
      amount: u.totalProfit
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Top referrers
router.get('/referrers', async (req, res) => {
  try {
    const leaders = await User.find({ isActive: true })
      .sort({ totalReferrals: -1 })
      .limit(10)
      .select('username totalReferrals');
    
    res.json(leaders.map((u, i) => ({
      rank: i + 1,
      username: u.username,
      count: u.totalReferrals
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
