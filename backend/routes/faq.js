const express = require('express');
const FAQ = require('../models/FAQ');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all active FAQs
router.get('/', async (req, res) => {
  try {
    const faqs = await FAQ.find({ isActive: true }).sort({ order: 1, category: 1 });
    
    // Group by category
    const grouped = {};
    faqs.forEach(faq => {
      if (!grouped[faq.category]) grouped[faq.category] = [];
      grouped[faq.category].push(faq);
    });
    
    res.json({ faqs, grouped });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin routes (protected by secret key)
const adminAuth = (req, res, next) => {
  const token = req.headers['admin-key'];
  if (token !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Add FAQ (Admin)
router.post('/admin/add', adminAuth, async (req, res) => {
  try {
    const { category, question, answer, order } = req.body;
    const faq = await FAQ.create({ 
      category, 
      question, 
      answer, 
      order: order || 0 
    });
    res.json({ success: true, faq });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update FAQ (Admin)
router.put('/admin/update/:id', adminAuth, async (req, res) => {
  try {
    const { category, question, answer, isActive, order } = req.body;
    await FAQ.findByIdAndUpdate(req.params.id, { 
      category, 
      question, 
      answer, 
      isActive, 
      order,
      updatedAt: Date.now() 
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete FAQ (Admin)
router.delete('/admin/delete/:id', adminAuth, async (req, res) => {
  try {
    await FAQ.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
