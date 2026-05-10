const express = require('express');
const authMiddleware = require('../middleware/auth');
const Transaction = require('../models/Transaction');

const router = express.Router();

// Get user's transaction history
router.get('/', authMiddleware, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get transaction by type
router.get('/:type', authMiddleware, async (req, res) => {
  try {
    const { type } = req.params;
    const transactions = await Transaction.find({ 
      userId: req.userId, 
      type 
    }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
