const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Generate Referral Code
function generateReferralCode(username) {
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return username.substring(0, 5).toUpperCase() + random;
}

// Sign Up
router.post('/signup', async (req, res) => {
  try {
    const { username, whatsapp, password, referralCode } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ username }, { whatsapp }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or WhatsApp already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await User.create({
      username,
      whatsapp,
      password: hashedPassword,
      referralCode: generateReferralCode(username),
      referredBy: referralCode || null
    });
    
    // Create referral relationship if exists
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        await User.updateOne({ _id: referrer._id }, { $inc: { totalReferrals: 1 } });
      }
    }
    
    // Generate token
    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    res.json({ 
      success: true, 
      token, 
      user: { 
        id: user._id, 
        username: user.username, 
        balance: user.balance,
        referralCode: user.referralCode
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sign In
router.post('/signin', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    if (user.isBlocked) {
      return res.status(400).json({ error: 'Account is blocked. Contact admin.' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    res.json({ 
      success: true, 
      token, 
      user: { 
        id: user._id, 
        username: user.username, 
        balance: user.balance 
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get User Profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { whatsapp } = req.body;
    await User.findByIdAndUpdate(req.userId, { whatsapp });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change Password
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);
    
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Old password is incorrect' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.userId, { password: hashedPassword });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
