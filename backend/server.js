const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
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
const resourceRoutes = require('./routes/resource.routes');
const submissionRoutes = require('./routes/submission.routes');
const emailVerificationRoutes = require('./routes/emailVerification.routes');
const chatRoutes = require('./routes/chat.routes');
const lectureRoutes = require('./routes/lecture.routes');
const teamRoutes = require('./routes/team.routes');
const teamProjectRoutes = require('./routes/teamProject.routes');
const teamSubmissionRoutes = require('./routes/teamSubmission.routes');
const aiRoutes = require('./routes/ai.routes');
const notificationRoutes = require('./routes/notification.routes');

// Import services
const cloudinaryService = require('./services/cloudinary.service');
const keepAliveService = require('./utils/keepAlive');

// Import middleware
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');

// Import error handler
const { errorHandler } = require('./middleware/errorHandler');

// Initialize express app
const app = express();

const defaultAllowedOrigins = [
  'http://localhost:3000',
  'https://pbl-lms-phi.vercel.app',
  'https://pbl-lms-psi.vercel.app'
];

const parsedClientOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([
  ...defaultAllowedOrigins,
  ...parsedClientOrigins
]));

// Trust proxy - MUST be before any middleware
app.set('trust proxy', 1);

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: allowedOrigins,
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
  // Initialize storage service (Cloudflare R2) - non-blocking
  try {
    const initialized = await cloudinaryService.initialize();
    if (initialized) {
      console.log('✅ Storage service ready for use');
    } else {
      console.warn('⚠️  Storage service not available - file uploads will fail');
    }
  } catch (error) {
    console.error('⚠️  Failed to initialize storage service');
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
app.use('/api/assessment', assessmentRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/email', emailVerificationRoutes);
app.use('/api/lectures', lectureRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/team-projects', teamProjectRoutes);
app.use('/api/team-submissions', teamSubmissionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);

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
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIO(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// Make io accessible from express controllers.
app.set('io', io);

// Socket.IO authentication middleware
const Message = require('./models/Message.model');
const Conversation = require('./models/Conversation.model');
const jwt = require('jsonwebtoken');

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`🔗 User connected: ${socket.userId}`);

  // Join user's own room
  socket.join(socket.userId);

  // Join conversation room
  socket.on('join-conversation', (conversationId) => {
    socket.join(`conversation-${conversationId}`);
    console.log(`💬 User ${socket.userId} joined conversation ${conversationId}`);
  });

  // Leave conversation room
  socket.on('leave-conversation', (conversationId) => {
    socket.leave(`conversation-${conversationId}`);
  });

  // Handle new message
  socket.on('send-message', async (data) => {
    try {
      const { conversationId, content, type, attachment } = data;
      
      // Broadcast to conversation room
      socket.to(`conversation-${conversationId}`).emit('new-message', {
        conversationId,
        content,
        type,
        attachment,
        sender: socket.userId,
        timestamp: new Date()
      });
    } catch (error) {
      socket.emit('error', { message: 'خطأ في إرسال الرسالة' });
    }
  });

    // Handle typing indicator (for real-time UI feedback)
  socket.on('typing', (conversationId) => {
    socket.to(`conversation-${conversationId}`).emit('user-typing', {
      userId: socket.userId,
      conversationId
    });
  });

  socket.on('stop-typing', (conversationId) => {
    socket.to(`conversation-${conversationId}`).emit('user-stop-typing', {
      userId: socket.userId,
      conversationId
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.userId}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  console.log(`🌍 البيئة: ${process.env.NODE_ENV}`);
  
  // Start keep-alive service in production
  const serverUrl = process.env.SERVER_URL || `http://localhost:${PORT}`;
  keepAliveService.start(serverUrl);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ خطأ غير معالج:', err);
  server.close(() => process.exit(1));
});

module.exports = app;
