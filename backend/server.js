const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const depositRoutes = require('./routes/deposit');
const withdrawRoutes = require('./routes/withdraw');
const plansRoutes = require('./routes/plans');
const teamRoutes = require('./routes/team');
const leaderboardRoutes = require('./routes/leaderboard');
const faqRoutes = require('./routes/faq');
const transactionRoutes = require('./routes/transactions');
const adminRoutes = require('./routes/admin');

const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.'
});
app.use('/api/', limiter);

// Static files
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/deposit', depositRoutes);
app.use('/api/withdraw', withdrawRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});
app.get('/plans', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/plans.html'));
});
app.get('/deposit', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/deposit.html'));
});
app.get('/withdraw', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/withdraw.html'));
});
app.get('/my-plan', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/my-plan.html'));
});
app.get('/deposit-logs', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/deposit-logs.html'));
});
app.get('/withdraw-logs', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/withdraw-logs.html'));
});
app.get('/transaction-history', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/transaction-history.html'));
});
app.get('/my-team', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/my-team.html'));
});
app.get('/leaderboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/leaderboard.html'));
});
app.get('/faq', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/faq.html'));
});
app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/profile.html'));
});

// Daily profit distribution cron job (12:00 AM)
cron.schedule('0 0 * * *', async () => {
  console.log('💰 Running daily profit distribution...');
  const Deposit = require('./models/Deposit');
  const User = require('./models/User');
  const Profit = require('./models/Profit');
  const Transaction = require('./models/Transaction');
  
  const activeDeposits = await Deposit.find({ 
    status: 'approved',
    profitStartDate: { $exists: true }
  });
  
  let totalDistributed = 0;
  
  for (const deposit of activeDeposits) {
    const daysActive = Math.floor((Date.now() - deposit.profitStartDate) / (24 * 60 * 60 * 1000));
    
    if (daysActive <= 60 && daysActive > 0) {
      const profitAmount = deposit.amount * 0.11;
      const dayNumber = daysActive;
      
      // Check if profit for this day already given
      const existingProfit = await Profit.findOne({
        depositId: deposit._id,
        dayNumber: dayNumber
      });
      
      if (!existingProfit) {
        await User.updateOne(
          { _id: deposit.userId },
          { $inc: { balance: profitAmount, totalProfit: profitAmount } }
        );
        
        await Profit.create({
          userId: deposit.userId,
          depositId: deposit._id,
          amount: profitAmount,
          dayNumber: dayNumber
        });
        
        await Transaction.create({
          userId: deposit.userId,
          type: 'profit',
          amount: profitAmount,
          status: 'completed',
          description: `Daily profit for day ${dayNumber} of 60`
        });
        
        totalDistributed += profitAmount;
      }
    }
  }
  
  console.log(`✅ Daily profit distribution completed. Total: ${totalDistributed} PKR`);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Website: http://localhost:${PORT}`);
});
