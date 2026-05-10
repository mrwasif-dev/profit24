const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth');
const Deposit = require('../models/Deposit');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { notifyNewDeposit } = require('../config/telegram');

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for screenshot uploads
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'deposit-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Create deposit request
router.post('/create', authMiddleware, upload.single('screenshot'), async (req, res) => {
  try {
    const { planId, amount, transactionId } = req.body;
    const screenshot = req.file.filename;
    
    // Check if user already has active plan
    const existingActive = await Deposit.findOne({ 
      userId: req.userId, 
      status: 'approved',
      profitStartDate: { $exists: true }
    });
    
    if (existingActive) {
      return res.status(400).json({ error: 'You already have an active plan. Complete it first.' });
    }
    
    const deposit = await Deposit.create({
      userId: req.userId,
      planId: parseInt(planId),
      amount: parseFloat(amount),
      transactionId,
      screenshot,
      status: 'pending'
    });
    
    await Transaction.create({
      userId: req.userId,
      type: 'deposit',
      amount: parseFloat(amount),
      status: 'pending',
      referenceId: deposit._id,
      description: `Deposit request for plan ${planId}`
    });
    
    // Get user details for notification
    const user = await User.findById(req.userId);
    
    // Notify admin via Telegram
    await notifyNewDeposit(deposit, user);
    
    res.json({ success: true, depositId: deposit._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's deposits
router.get('/my-deposits', authMiddleware, async (req, res) => {
  try {
    const deposits = await Deposit.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(deposits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get deposit by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const deposit = await Deposit.findOne({ _id: req.params.id, userId: req.userId });
    res.json(deposit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
