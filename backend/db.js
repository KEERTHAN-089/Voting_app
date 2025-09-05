const mongoose = require('mongoose');
require('dotenv').config();     
const dbURI = process.env.MONGODB_URI;

// Add connection options to help with connection issues
const connectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
  retryWrites: true
};

// Log which database we're connecting to
console.log(`Attempting to connect to MongoDB at: ${dbURI ? 'MongoDB Atlas' : 'Missing connection string!'}`);

// Connect with more detailed error handling
mongoose.connect(dbURI, connectionOptions)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('\nTo fix this issue:');
    console.log('1. Log into your MongoDB Atlas account at https://cloud.mongodb.com');
    console.log('2. Navigate to Network Access under Security in the left sidebar');
    console.log('3. Click "Add IP Address"');
    console.log('4. Click "Add Current IP Address" or use "0.0.0.0/0" to allow access from anywhere (not secure for production)');
    console.log('5. Click "Confirm"');
    console.log('6. Wait a few minutes for the changes to take effect\n');
  });

module.exports = mongoose;
// This code connects to a MongoDB database using Mongoose.
// It uses the connection string from an environment variable or defaults to a local database.
