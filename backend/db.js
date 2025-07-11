const mongoose = require('mongoose');
require('dotenv').config();

// Enhanced MongoDB connection function that prioritizes Atlas
const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    const atlasURI = process.env.MONGODB_URI;
    
    try {
      await mongoose.connect(atlasURI, {
        serverSelectionTimeoutMS: 10000 // 10 second timeout
      });
      console.log('✅ MongoDB Atlas connected successfully');
      return;
    } catch (atlasErr) {
      console.error('❌ MongoDB Atlas connection failed:', atlasErr.message);
      console.error('\nTo connect to MongoDB Atlas:');
      console.error('1. Run: node atlas-test.js');
      console.error('2. Follow the instructions to whitelist your IP');
      console.error('3. Make sure your connection string in .env is correct');
      console.error('4. Restart your server');
      
      // Ask if user wants to use local fallback
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      readline.question('Do you want to fall back to local MongoDB? (y/n): ', async (answer) => {
        if (answer.toLowerCase() === 'y') {
          try {
            console.log('Attempting to connect to local MongoDB...');
            await mongoose.connect('mongodb://localhost:27017/voting_app');
            console.log('✅ Connected to local MongoDB');
            console.log('NOTE: Using local database. Data will not be synced with production.');
            readline.close();
          } catch (localErr) {
            console.error('❌ Local MongoDB connection also failed:', localErr.message);
            process.exit(1);
          }
        } else {
          console.log('Exiting. Please fix MongoDB Atlas connection issues.');
          process.exit(1);
        }
      });
    }
  } catch (err) {
    console.error('Unexpected error during database connection:', err);
    process.exit(1);
  }
};

// Execute connection
connectDB();

module.exports = mongoose;
// This code connects to a MongoDB database using Mongoose.
// It uses the connection string from an environment variable or defaults to a local database.
