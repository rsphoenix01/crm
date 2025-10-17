// server.js - Updated for React Native compatibility
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIO = require('socket.io');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Enhanced Socket.IO configuration for React Native
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["*"],
    credentials: false
  },
  // Enable multiple transports (polling first, then websocket)
  transports: ['polling', 'websocket'],
  
  // Allow upgrade from polling to websocket
  allowUpgrades: true,
  
  // Increase timeouts for mobile networks
  pingTimeout: 60000,
  pingInterval: 25000,
  
  // Connection settings
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e6
});

// Enhanced CORS configuration
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: false
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    server: 'Field Sales CRM Backend'
  });
});

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const customerRoutes = require('./routes/customers');
const enquiryRoutes = require('./routes/enquiries');
const orderRoutes = require('./routes/orders');
const taskRoutes = require('./routes/tasks');
const productRoutes = require('./routes/products');
const checkInRoutes = require('./routes/checkins');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leaves');
const reportRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/products', productRoutes);
app.use('/api/checkins', checkInRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);


// Enhanced Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id} [${socket.conn.transport.name}]`);
  
  // Join user to their room for personalized notifications
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} joined room [Socket: ${socket.id}]`);
    
    // Send confirmation back to client
    socket.emit('joined', { userId, socketId: socket.id });
  });
  
  // Handle transport upgrades
  socket.conn.on('upgrade', () => {
    console.log(`⬆️ Socket ${socket.id} upgraded to ${socket.conn.transport.name}`);
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`❌ User disconnected: ${socket.id} - Reason: ${reason}`);
  });
  
  socket.on('error', (error) => {
    console.log(`🔴 Socket error for ${socket.id}:`, error);
  });
});

// Make io accessible to routes
app.set('io', io);


// MongoDB connection with better error handling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fieldsalescrm', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Global error handler - FIXED
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Server accessible at: http://localhost:${PORT}`);
  console.log(`📡 Socket.io server ready`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    mongoose.connection.close();
  });
});

module.exports = { app, io };