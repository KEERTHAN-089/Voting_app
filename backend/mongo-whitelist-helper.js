const mongoose = require('mongoose');
const https = require('https');
require('dotenv').config();

// Function to get public IP address
const getPublicIP = () => {
  return new Promise((resolve, reject) => {
    https.get('https://api.ipify.org', (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data.trim());
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

// Test MongoDB connection
const testConnection = async () => {
  try {
    console.log("Testing MongoDB connection...");
    
    // Get public IP address
    const publicIP = await getPublicIP();
    console.log(`Your public IP address is: ${publicIP}`);
    console.log("Make sure this IP is added to your MongoDB Atlas whitelist!");
    console.log("\nWhitelist instructions:");
    console.log("1. Log in to MongoDB Atlas");
    console.log("2. Navigate to Network Access");
    console.log("3. Click 'Add IP Address'");
    console.log(`4. Enter your IP: ${publicIP}`);
    console.log("5. Click 'Confirm'");
    
    console.log("\nAttempting connection to MongoDB Atlas...");
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout
    });
    
    console.log("✅ Successfully connected to MongoDB Atlas!");
    
    // Test creating a document
    const TestSchema = new mongoose.Schema({ test: String, date: { type: Date, default: Date.now } });
    const TestModel = mongoose.models.Test || mongoose.model('Test', TestSchema);
    
    const testDoc = new TestModel({ test: 'Connection successful' });
    await testDoc.save();
    console.log("✅ Test document created!");
    
    console.log("\nYour MongoDB connection is working correctly.");
  } catch (error) {
    console.error("\n❌ MongoDB Connection Failed!");
    console.error("Error details:", error.message);
    console.error("\nTroubleshooting steps:");
    console.error("1. Check if your IP address is whitelisted in MongoDB Atlas");
    console.error("2. Verify your connection string in .env file");
    console.error("3. Make sure your MongoDB Atlas username and password are correct");
    console.error("4. Check your network connection");
  } finally {
    process.exit();
  }
};

testConnection();
