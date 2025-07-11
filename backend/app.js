// Import necessary modules
const express = require('express');
const cors = require('cors');

// Create an instance of the Express application
const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3001', // Allow your frontend origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // Allow cookies to be sent
}));

// ...existing code for your backend server...

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});