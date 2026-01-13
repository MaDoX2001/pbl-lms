const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const projectRoutes = require('./routes/project.routes');
const progressRoutes = require('./routes/progress.routes');
const assessmentRoutes = require('./routes/assessment.routes');
const discussionRoutes = require('./routes/discussion.routes');
const adminRoutes = require('./routes/admin.routes');
const otpRoutes = require('./routes/otp.routes');
const invitationRequestRoutes = require('./routes/invitationRequest.routes');
const resourceRoutes = require('./routes/resource.routes');
const submissionRoutes = require('./routes/submission.routes');
const emailVerificationRoutes = require('./routes/emailVerification.routes');

// Import services
const cloudinaryService = require('./services/cloudinary.service');

// Import middleware
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');

// Import error handler
const { errorHandler } = require('./middleware/errorHandler');

// Initialize express app
const app = express();

// Trust proxy - MUST be before any middleware
app.set('trust proxy', 1);

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : [
    'http://localhost:3000',
    'https://pbl-lms-phi.vercel.app',
    'https://pbl-lms-psi.vercel.app'
  ],
  credentials: true
}));
app.use(compression()); // Compress responses
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Apply rate limiting
app.use('/api/', apiLimiter); // General API rate limit
app.use('/api/auth/login', authLimiter); // Strict auth rate limit
app.use('/api/auth/register', authLimiter); // Strict auth rate limit

// Database connection
mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
  console.log('✅ MongoDB متصل بنجاح');
  // Initialize Cloudinary service - non-blocking
  try {
    const initialized = await cloudinaryService.initialize();
    if (initialized) {
      console.log('✅ Cloudinary service ready for use');
    } else {
      console.warn('⚠️  Cloudinary service not available - file uploads will fail');
    }
  } catch (error) {
    console.error('⚠️  Failed to initialize Cloudinary service');
    console.error('Error:', error.message);
    console.warn('⚠️  Server will continue, but file uploads will not work');
  }
})
.catch((err) => {
  console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err);
  process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/invitations', invitationRequestRoutes);
app.use('/api/email', emailVerificationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    version: '1.0.1',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'الصفحة المطلوبة غير موجودة' 
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  console.log(`🌍 البيئة: ${process.env.NODE_ENV}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ خطأ غير معالج:', err);
  server.close(() => process.exit(1));
});

module.exports = app;
