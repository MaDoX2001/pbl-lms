const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Project = require('../models/Project.model');
const TeamSubmission = require('../models/TeamSubmission.model');

dotenv.config();

const run = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGO_URI or MONGODB_URI is required');

    await mongoose.connect(mongoUri);

    const projects = await Project.countDocuments();
    const withStageKey = await Project.countDocuments({ 'milestones.stageKey': { $exists: true } });
    const invalidCount = await Project.countDocuments({
      $or: [
        { milestones: { $size: 0 } },
        { 'milestones.4.stageKey': { $ne: 'final_delivery' } }
      ]
    });
    const teamSubmissions = await TeamSubmission.countDocuments();

    console.log(JSON.stringify({
      projects,
      withStageKey,
      invalidCount,
      teamSubmissions
    }, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Verify failed:', error.message);
    process.exit(1);
  }
};

run();
