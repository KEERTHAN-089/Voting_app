const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Create Express app
const app = express();

// Increased limits for request size
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// CORS configuration with increased header limits
app.use(cors({
  origin: 'http://localhost:3001', // Your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // Cache preflight requests for 1 day
}));

// Enhanced MongoDB connection with fallback
const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000 // 5 second timeout
    });
    console.log('✅ MongoDB Atlas connected successfully');
  } catch (err) {
    console.error('❌ MongoDB Atlas connection failed:', err.message);
    
    // Try connecting to local MongoDB if Atlas fails
    try {
      console.log('Attempting to connect to local MongoDB...');
      await mongoose.connect('mongodb://localhost:27017/voting_app');
      console.log('✅ Connected to local MongoDB');
      console.log('NOTE: Using local database. Data will not be synced with production.');
    } catch (localErr) {
      console.error('❌ Local MongoDB connection also failed:', localErr.message);
      console.error('\nPlease follow these steps to resolve MongoDB connection issues:');
      console.error('1. Make sure your IP address (212.8.253.139) is whitelisted in MongoDB Atlas');
      console.error('2. Verify your connection string in the .env file');
      console.error('3. Check if MongoDB Atlas is operational: https://status.mongodb.com/');
      console.error('4. For local development, install MongoDB: https://www.mongodb.com/try/download/community\n');
      process.exit(1);
    }
  }
};

// Call the connection function
connectDB();

// Import routes
const userRoutes = require('./routes/userRoutes');
const candidateRoutes = require('./routes/candidateRoute');

// Middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cors());

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Mount routes with correct prefixes
app.use('/user', userRoutes);
app.use('/api/candidates', candidateRoutes); // Make sure this uses /api/candidates

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Voting API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});