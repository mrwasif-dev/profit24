const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../backend/models/User');
const Plan = require('../backend/models/Plan');
const Setting = require('../backend/models/Setting');
const FAQ = require('../backend/models/FAQ');

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Seed Plans
        await Plan.initDefaultPlans();
        
        // Seed Settings
        await Setting.initDefaultSettings();
        
        // Seed FAQs
        await FAQ.initDefaultFAQs();
        
        console.log('✅ All data seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedData();
