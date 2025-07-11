const mongoose = require('mongoose');
const https = require('https');
require('dotenv').config();

// Get current public IP address
const getPublicIP = async () => {
  return new Promise((resolve, reject) => {
    https.get('https://api.ipify.org', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data.trim()));
    }).on('error', reject);
  });
};

// Test MongoDB Atlas connection
const testAtlasConnection = async () => {
  console.log('\n===== MongoDB Atlas Connection Test =====\n');
  
  try {
    // Get connection string from environment
    const connectionString = process.env.MONGODB_URI;
    if (!connectionString) {
      console.error('❌ Error: MONGODB_URI is not defined in your .env file');
      return;
    }
    
    console.log('Connection string found in .env file');
    
    // Get public IP
    const ip = await getPublicIP();
    console.log(`\nYour current public IP address: ${ip}\n`);
    
    console.log('Attempting to connect to MongoDB Atlas...');
    
    // Connect with increased timeout
    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000
    });
    
    console.log('\n✅ SUCCESS: Connected to MongoDB Atlas!');
    
    // Test simple operation
    const testSchema = new mongoose.Schema({
      name: String,
      createdAt: { type: Date, default: Date.now }
    });
    
    // Use a model that won't conflict with existing ones
    const TestModel = mongoose.models.AtlasTest || mongoose.model('AtlasTest', testSchema);
    
    // Create test document
    const testDoc = new TestModel({ name: 'Connection test' });
    await testDoc.save();
    console.log('✅ Database write operation successful');
    
    // Retrieve the document to test read operations
    const retrievedDoc = await TestModel.findOne({ name: 'Connection test' });
    console.log('✅ Database read operation successful');
    console.log(`Retrieved document: ${retrievedDoc.name}, created at ${retrievedDoc.createdAt}`);
    
    console.log('\n🎉 Your MongoDB Atlas connection is working correctly!\n');
    
  } catch (error) {
    console.error('\n❌ CONNECTION ERROR:', error.message);
    console.error('\nTroubleshooting steps:');
    console.error('1. Whitelist your IP address in MongoDB Atlas');
    console.error('   - Log in to MongoDB Atlas');
    console.error('   - Go to Network Access');
    console.error('   - Click "Add IP Address"');
    console.error('   - Enter your IP or select "Allow Access From Anywhere"');
    console.error('2. Check your connection string in .env file');
    console.error('3. Ensure your MongoDB Atlas username and password are correct');
    console.error('4. Check if MongoDB Atlas is operational: https://status.mongodb.com/\n');
  } finally {
    // Close the connection
    await mongoose.connection.close();
  }
};

// Run the test
testAtlasConnection().catch(console.error);
