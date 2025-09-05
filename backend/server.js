const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const bodyParser = require('body-parser');
app.use(bodyParser.json());
const PORT = process.env.PORT || 3000;

//Importing routes
const userRoutes = require('./routes/userRoutes');
const candidateRoutes = require('./routes/candidateRoute');


// CORS middleware
app.use(cors({
  origin: '*',  // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

//use the routes
app.use('/user', userRoutes);
app.use('/candidates',  candidateRoutes);

// Add a working health check endpoint for frontend connectivity
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version
    },
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    }
  });
});

// Fix static file serving path - frontend build directory is not inside backend
// Serve frontend in production (only for non-API routes)
const path = require('path');
const frontendPath = path.join(__dirname, '..', 'frontend', 'build');
app.use(express.static(frontendPath));

// Use a proper regex that won't cause syntax errors
app.get(/^(?!(\/api|\/user|\/candidates)).*$/, (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// MongoDB Connection
const connectDB = async () => {
  try {
    // Use MONGODB_URI from .env file
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voting_app';
    console.log('Attempting to connect to MongoDB Atlas at:', MONGODB_URI.replace(/:([^:@]+)@/, ':****@')); // Hide password in logs
    
    // Improved connection options
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      retryReads: true
    });
    
    console.log('MongoDB Atlas connected successfully!');
    return true;
  } catch (error) {
    console.error('MongoDB Atlas connection error:', error);
    return false;
  }
};

// Connect to MongoDB and then start the server
connectDB().then(connected => {
  if (!connected) {
    console.log('Warning: Running without database connection');
  }

  // Start the server regardless of DB connection status
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});