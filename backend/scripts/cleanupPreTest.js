// Database cleanup script to remove pre-assessment data
// Run this once to clean up the database after reverting pre-assessment feature

const mongoose = require('mongoose');
const User = require('../models/User.model');
require('dotenv').config();

async function cleanupPreTestData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Remove preTestCompleted field from all users
    const userUpdateResult = await User.updateMany(
      {},
      { $unset: { preTestCompleted: '' } }
    );
    console.log(`✅ Removed preTestCompleted field from ${userUpdateResult.modifiedCount} users`);

    // 2. Drop the pretests collection if it exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const preTestCollectionExists = collections.some(col => col.name === 'pretests');
    
    if (preTestCollectionExists) {
      await mongoose.connection.db.dropCollection('pretests');
      console.log('✅ Dropped pretests collection');
    } else {
      console.log('ℹ️  No pretests collection found');
    }

    console.log('\n✅ Database cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning up database:', error);
    process.exit(1);
  }
}

cleanupPreTestData();
