const mongoose = require('mongoose');
require('dotenv').config();
const https = require('https');

// Get IP address
const getPublicIP = async () => {
  return new Promise((resolve, reject) => {
    https.get('https://api.ipify.org', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data.trim()));
    }).on('error', reject);
  });
};

// Test Atlas connection
async function testAtlasConnection() {
  try {
    const ip = await getPublicIP();
    console.log(`\n===== MongoDB Atlas Connection Test =====`);
    console.log(`Your current IP address: ${ip}`);
    console.log(`\n1. Whitelist this IP in MongoDB Atlas:`);
    console.log(`   a. Log in to https://cloud.mongodb.com/`);
    console.log(`   b. Select your project/cluster`);
    console.log(`   c. Go to "Network Access" in the left menu`);
    console.log(`   d. Click "Add IP Address" and enter: ${ip}`);
    console.log(`   e. Click "Confirm"\n`);
    
    console.log(`2. Testing connection with URI from .env file...`);
    
    // Try connecting without fallback
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // Longer timeout for testing
      connectTimeoutMS: 10000
    });
    
    console.log(`\n✅ SUCCESS! Connected to MongoDB Atlas`);
    console.log(`Database: ${mongoose.connection.db.databaseName}`);
    
    // Test write operation
    const TestSchema = new mongoose.Schema({ test: String, date: Date });
    const TestModel = mongoose.models.Test || mongoose.model('Test', TestSchema);
    await new TestModel({ test: 'Atlas connection successful', date: new Date() }).save();
    console.log(`✅ Write operation successful`);
    
    // Count existing test documents
    const count = await TestModel.countDocuments();
    console.log(`ℹ️ Found ${count} test documents in database`);
    
    console.log(`\nYou can now use MongoDB Atlas in your application!\n`);
  } catch (error) {
    console.error(`\n❌ CONNECTION FAILED: ${error.message}`);
    console.error(`\nTroubleshooting steps:`);
    console.error(`1. Verify your IP has been added to Atlas whitelist`);
    console.error(`2. Check your connection string in .env: ${process.env.MONGODB_URI?.substring(0, 35)}...`);
    console.error(`3. Make sure your username and password are correct`);
    console.error(`4. Ensure your MongoDB Atlas cluster is running\n`);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testAtlasConnection();
