const mongoose = require('mongoose');
const User = require('../models/User.model');
require('dotenv').config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const existingAdmin = await User.findOne({ email: 'admin@pbl-lms.com' });
    if (existingAdmin) {
      // Update admin to disable 2FA
      existingAdmin.twoFactorEnabled = false;
      existingAdmin.twoFactorSetupRequired = false;
      existingAdmin.twoFactorSecret = undefined;
      await existingAdmin.save();
      console.log('✅ Admin updated - 2FA disabled');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      console.log('2FA Enabled:', existingAdmin.twoFactorEnabled);
      process.exit(0);
    }

    const admin = await User.create({
      name: 'Aisha Elmahdy',
      email: 'admin@pbl-lms.com',
      password: 'Admin@123456',
      role: 'admin',
      isActive: true,
      isApproved: true,
      approvalStatus: 'approved',
      twoFactorSetupRequired: true,
      twoFactorEnabled: false
    });

    console.log('✅ Admin account created successfully!');
    console.log('📧 Email:', admin.email);
    console.log('👤 Name:', admin.name);
    console.log('🔑 Role:', admin.role);
    console.log('\n⚠️  IMPORTANT: You MUST set up 2FA when you first login!');
    console.log('🔐 Login at: https://pbl-lms-phi.vercel.app/login');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();
