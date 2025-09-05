/**
 * MongoDB Atlas Connection Test
 * Run with: node atlas.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function testAtlasConnection() {
  try {
    console.log('Testing connection to MongoDB Atlas...');
    
    // Get connection string from environment variables
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    // Hide password in logs
    const redactedUri = MONGODB_URI.replace(/:([^:@]+)@/, ':****@');
    console.log(`Connecting to: ${redactedUri}`);
    
    // Connect to MongoDB Atlas
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB Atlas successfully!');
    
    // Get database information
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log('\nDatabase name:', db.databaseName);
    console.log('Available collections:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // Close the connection
    await mongoose.disconnect();
    console.log('\nConnection closed.');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\nTroubleshooting tips:');
    console.error('1. Check if your MongoDB Atlas cluster is running');
    console.error('2. Verify your IP address is whitelisted in Atlas Network Access');
    console.error('3. Confirm username and password are correct');
    console.error('4. Ensure your cluster name and database name are correct');
  }
}

testAtlasConnection();
