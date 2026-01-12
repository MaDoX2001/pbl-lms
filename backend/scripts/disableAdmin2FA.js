require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');

async function disableAdmin2FA() {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const admin = await User.findOne({ email: 'admin@pbl-lms.com' });
    
    if (!admin) {
      console.log('Admin not found');
      process.exit(1);
    }

    admin.twoFactorEnabled = false;
    admin.twoFactorSecret = undefined;
    await admin.save();

    console.log('✅ 2FA disabled for admin account');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

disableAdmin2FA();
