const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const Project = require('../models/Project.model');
const TeamSubmission = require('../models/TeamSubmission.model');
const Progress = require('../models/Progress.model');
const TeamProject = require('../models/TeamProject.model');
const Team = require('../models/Team.model');

dotenv.config();

const run = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI or MONGODB_URI is required');
    }

    await mongoose.connect(mongoUri);

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '..', '..', 'backups', `pre-stage-reset-${stamp}`);
    fs.mkdirSync(backupDir, { recursive: true });

    const [projects, teamSubmissions, progress, teamProjects, teams] = await Promise.all([
      Project.find({}).lean(),
      TeamSubmission.find({}).lean(),
      Progress.find({}).lean(),
      TeamProject.find({}).lean(),
      Team.find({}).lean()
    ]);

    fs.writeFileSync(path.join(backupDir, 'projects.json'), JSON.stringify(projects, null, 2));
    fs.writeFileSync(path.join(backupDir, 'team-submissions.json'), JSON.stringify(teamSubmissions, null, 2));
    fs.writeFileSync(path.join(backupDir, 'progress.json'), JSON.stringify(progress, null, 2));
    fs.writeFileSync(path.join(backupDir, 'team-projects.json'), JSON.stringify(teamProjects, null, 2));
    fs.writeFileSync(path.join(backupDir, 'teams.json'), JSON.stringify(teams, null, 2));

    console.log(`Backup created: ${backupDir}`);
    console.log(`projects: ${projects.length}`);
    console.log(`teamSubmissions: ${teamSubmissions.length}`);
    console.log(`progress: ${progress.length}`);
    console.log(`teamProjects: ${teamProjects.length}`);
    console.log(`teams: ${teams.length}`);

    process.exit(0);
  } catch (error) {
    console.error('Backup failed:', error.message);
    process.exit(1);
  }
};

run();
