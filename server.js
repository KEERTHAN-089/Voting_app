const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import routes
const candidateRoutes = require('./routes/candidates');
const userRoutes = require('./routes/users');

// Initialize app
const app = express();

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Atlas connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors({
  origin: 'http://localhost:3001', // Your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/api/candidates', candidateRoutes);
app.use('/user', userRoutes);  // Match the endpoint your frontend is using

// Root route for API health check
app.get('/', (req, res) => {
  res.send('Voting Application API is running');
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  
  // Return detailed error in development, generic message in production
  const error = process.env.NODE_ENV === 'production' 
    ? { message: 'Internal server error' }
    : { message: err.message, stack: err.stack };
  
  res.status(500).json(error);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
