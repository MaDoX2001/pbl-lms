const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Project = require('../models/Project.model');
const TeamSubmission = require('../models/TeamSubmission.model');
const Progress = require('../models/Progress.model');
const { normalizeProjectMilestones } = require('../utils/stagedSubmissionConfig');

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const projects = await Project.find({}).select('_id milestones');
    for (const project of projects) {
      project.milestones = normalizeProjectMilestones(project.milestones || []);
      await project.save();

      await Progress.updateMany(
        { project: project._id },
        {
          $set: {
            milestoneProgress: project.milestones.map((m) => ({
              milestoneId: m._id,
              completed: false,
              completedAt: null,
              tasksCompleted: []
            }))
          }
        }
      );
    }

    const deleted = await TeamSubmission.deleteMany({});

    console.log(`Projects normalized: ${projects.length}`);
    console.log(`Old team submissions deleted: ${deleted.deletedCount}`);
    console.log('Done');

    process.exit(0);
  } catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
};

run();
