const mongoose = require('mongoose');
const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

// Define PORT variable with a fallback value
const PORT = process.env.PORT || 3000;

// MongoDB Connection
const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URL || 'mongodb://localhost:27017/voting_app';
    console.log('Attempting to connect to MongoDB at:', MONGODB_URI);
    
    // Improved connection options
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Increased timeout to 30s
      socketTimeoutMS: 60000, // Close sockets after 60 seconds of inactivity
      connectTimeoutMS: 30000, // Timeout for initial connection
      retryWrites: true, // Enable retry for write operations
      retryReads: true   // Enable retry for read operations
    });
    
    console.log('MongoDB connected successfully!');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    if (error.name === 'MongoNetworkError') {
      console.error('Cannot connect to MongoDB. Is MongoDB running?');
      console.error('Run these commands to check:');
      console.error('1. On Windows: Check if MongoDB service is running');
      console.error('2. Try mongodb://127.0.0.1:27017/voting_app instead of localhost');
    }
    return false;
  }
};

// Connect to MongoDB before loading models and setup fallback
connectDB().then((connected) => {
  if (connected) {
    // Load models only after successful connection
    require('./models/modelIndex');
    
    // Only start the server after successful database connection
    mongoose.connection.once('open', () => {
      app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });
    });
  } else {
    console.error('Failed to connect to MongoDB. Starting server in limited mode...');
    
    // Start server in limited mode - will return error responses for database operations
    app.use('/api', (req, res) => {
      res.status(503).json({
        error: 'Database connection failed',
        message: 'The application is running in limited mode due to database connection issues'
      });
    });
    
    app.listen(PORT, () => {
      console.log(`Server running in LIMITED MODE on port ${PORT} - database unavailable`);
    });
  }
});

// Monitor connection status
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
});

// Import routes - import early to avoid issues
const userRoutes = require('./routes/userRoutes');
const candidateRoutes = require('./routes/candidateRoute');

// More comprehensive CORS middleware
app.use(cors({
  origin: '*',  // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Add extra CORS headers as a fallback
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Ensure the body parser is set up correctly
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Log request body for non-GET requests
  if (req.method !== 'GET') {
    console.log('Request body:', req.body);
  }
  
  next();
});

// Add a test route at the root level
app.get('/', (req, res) => {
  res.json({
    message: 'API server is running',
    availableRoutes: [
      { path: '/user/signup', method: 'POST', description: 'Register a new user' },
      { path: '/user/login', method: 'POST', description: 'Login with existing credentials' },
      { path: '/health', method: 'GET', description: 'Health check endpoint' }
    ]
  });
});

// Test signup route directly in server.js for debugging
app.post('/test-signup', async (req, res) => {
  console.log('Test signup route hit, body:', req.body);
  res.json({
    message: 'Test signup route working',
    receivedData: req.body
  });
});

// Register routes - BEFORE catch-all and error handlers
app.use('/user', userRoutes);
app.use('/candidates', candidateRoutes);
// API prefixed routes
app.use('/api/user', userRoutes);
app.use('/api/candidates', candidateRoutes);

// Move these important test endpoints BEFORE the catch-all route
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Improve health check endpoint with more diagnostics
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version
    },
    database: {
      status: dbStatus,
      name: mongoose.connection.name || 'Not connected',
      host: mongoose.connection.host || 'Not connected'
    }
  });
});

// Now add the catch-all route AFTER the specific routes
app.use('*', (req, res) => {
  const missingRoute = `${req.method} ${req.originalUrl}`;
  console.error(`Route not found: ${missingRoute}`);
  
  res.status(404).json({
    error: 'Not Found',
    message: `The requested endpoint (${missingRoute}) does not exist`,
    availableEndpoints: [
      'GET /health',
      'POST /user/signup',
      'POST /user/login',
      'GET /user/profile',
      'GET /candidates',
      'POST /candidates'
    ],
    tip: 'Try checking the URL and HTTP method'
  });
});

// Serve frontend in production (only for non-API routes)
const path = require('path');
app.use(express.static(path.join(__dirname, 'frontend', 'build')));
app.get(/^\/(?!api|user|candidates).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'build', 'index.html'));
});

// Add middleware to serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug logging for image requests
app.use('/uploads', (req, res, next) => {
  console.log(`Image requested: ${req.url}`);
  next();
});

// Enhance error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  console.error('Request URL:', req.originalUrl);
  console.error('Request Method:', req.method);
  console.error('Request Body:', req.body);
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Fix the module exports - we need to export both app and a function to start the server
module.exports = {
  app,
  startServer: () => {
    return app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  }
};

