/**
 * Simplified MongoDB Atlas Connection Test
 * Uses only the mongodb driver without mongoose
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testAtlasConnection() {
  // Get connection string from environment variables
  const MONGODB_URI = process.env.MONGODB_URI;
  
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable is not set');
    return;
  }
  
  // Hide password in logs
  const redactedUri = MONGODB_URI.replace(/:([^:@]+)@/, ':****@');
  console.log(`Connecting to: ${redactedUri}`);
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('Attempting to connect to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas successfully!');
    
    // Get database information
    const db = client.db();
    const collections = await db.listCollections().toArray();
    
    console.log('\nDatabase name:', db.databaseName);
    console.log('Available collections:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // Test write operation
    console.log('\nAttempting to write test data...');
    const testCollection = db.collection('connection_tests');
    const result = await testCollection.insertOne({
      test: 'Atlas connection test',
      timestamp: new Date()
    });
    
    console.log(`✅ Write operation successful (inserted ID: ${result.insertedId})`);
    
    // Count documents
    const count = await testCollection.countDocuments();
    console.log(`Total test documents: ${count}`);
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\nTroubleshooting tips:');
    console.error('1. Check if your MongoDB Atlas cluster is running');
    console.error('2. Verify your IP address is whitelisted in Atlas Network Access');
    console.error('3. Confirm username and password are correct');
    console.error('4. Ensure your cluster name and database name are correct');
  } finally {
    await client.close();
    console.log('\nConnection closed.');
  }
}

// Create a simpler package.json
const fs = require('fs');
const path = require('path');

const packageJson = {
  "name": "voting-app-backend",
  "version": "1.0.0",
  "description": "Backend for Voting Application",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "dotenv": "^16.0.3",
    "mongodb": "^5.0.0"
  },
  "author": "",
  "license": "ISC"
};

// Write the minimal package.json to disk
fs.writeFileSync(
  path.join(__dirname, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);

console.log('Created minimal package.json for testing');
console.log('Run "npm install" and then try this script again');

// Only run the test if we have the mongodb package
try {
  require('mongodb');
  testAtlasConnection();
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    console.log('\nPlease install dependencies first:');
    console.log('npm install mongodb dotenv');
  } else {
    console.error('Error:', err);
  }
}
