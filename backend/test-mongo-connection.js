const mongoose = require('mongoose');
const https = require('https');
const dns = require('dns');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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

// Test DNS resolution for MongoDB Atlas
const testDNS = async (connectionString) => {
  try {
    // Extract hostname from connection string
    const match = connectionString.match(/mongodb\+srv:\/\/[^:]+:[^@]+@([^/]+)/);
    if (!match) {
      console.log('❌ Could not extract hostname from connection string');
      return false;
    }
    
    const hostname = match[1];
    console.log(`Testing DNS resolution for: ${hostname}`);
    
    return new Promise((resolve) => {
      dns.resolve(hostname, (err, addresses) => {
        if (err) {
          console.log(`❌ DNS resolution failed: ${err.message}`);
          resolve(false);
        } else {
          console.log('✅ DNS resolved successfully:', addresses);
          resolve(true);
        }
      });
    });
  } catch (err) {
    console.log('❌ Error during DNS test:', err.message);
    return false;
  }
};

// Test MongoDB connection
const testMongoConnection = async () => {
  try {
    console.log('\n=== MONGODB CONNECTION DIAGNOSTICS ===\n');
    
    // Get connection string from environment
    const connectionString = process.env.MONGODB_URI;
    if (!connectionString) {
      console.log('❌ MONGODB_URI is not defined in your .env file');
      return;
    }
    
    // Check connection string format
    if (!connectionString.startsWith('mongodb+srv://') && !connectionString.startsWith('mongodb://')) {
      console.log('❌ Connection string format is invalid');
      return;
    }
    
    // Get public IP address
    console.log('Checking your public IP address...');
    const publicIP = await getPublicIP();
    console.log(`Your public IP address is: ${publicIP}`);
    console.log(`Make sure this IP is added to your MongoDB Atlas whitelist!`);
    
    // Test DNS resolution
    console.log('\nTesting DNS resolution...');
    const dnsResolved = await testDNS(connectionString);
    
    if (!dnsResolved) {
      console.log('\n❌ DNS resolution failed. This may indicate network issues or incorrect hostname.');
      return;
    }
    
    // Try connecting to MongoDB
    console.log('\nAttempting to connect to MongoDB Atlas...');
    try {
      await mongoose.connect(connectionString, {
        serverSelectionTimeoutMS: 10000, // 10 seconds timeout
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000
      });
      
      console.log('\n✅ Successfully connected to MongoDB Atlas!');
      
      // Test creating a document
      console.log('\nTesting database operations...');
      const TestSchema = new mongoose.Schema({ 
        test: String, 
        date: { type: Date, default: Date.now } 
      });
      
      const TestModel = mongoose.models.Test || mongoose.model('Test', TestSchema);
      const testDoc = new TestModel({ test: 'Connection successful' });
      await testDoc.save();
      console.log('✅ Test document created successfully!');
      console.log('\n🟢 YOUR MONGODB CONNECTION IS WORKING CORRECTLY 🟢');
      
    } catch (error) {
      console.error('\n❌ MongoDB Connection Failed!');
      console.error('Error details:', error.message);
      
      if (error.message.includes('ENOTFOUND')) {
        console.error('\n👉 Could not resolve the hostname in your connection string. Please check it for typos.');
      } else if (error.message.includes('Authentication failed')) {
        console.error('\n👉 Authentication failed. Your username or password is incorrect.');
      } else if (error.message.includes('timed out')) {
        console.error('\n👉 Connection timed out. Your IP may not be whitelisted or there could be network issues.');
      }
    }
  } catch (error) {
    console.error('\n❌ An unexpected error occurred:', error);
  } finally {
    console.log('\n=== TROUBLESHOOTING STEPS ===');
    console.log('1. Whitelist your IP in MongoDB Atlas:');
    console.log('   - Log in to MongoDB Atlas');
    console.log('   - Go to Network Access');
    console.log('   - Click "Add IP Address"');
    console.log('   - Add your IP address or select "Allow Access From Anywhere" for development');
    console.log('2. Verify your connection string:');
    console.log('   - Check username and password');
    console.log('   - Ensure cluster name is correct');
    console.log('   - Make sure database name is specified');
    console.log('3. Try local MongoDB:');
    console.log('   - Install MongoDB Community Edition');
    console.log('   - Set MONGODB_URI=mongodb://localhost:27017/voting_app');
    
    rl.question('\nWould you like to try connecting to a local MongoDB instead? (yes/no): ', async (answer) => {
      if (answer.toLowerCase() === 'yes') {
        try {
          console.log('\nAttempting to connect to local MongoDB...');
          await mongoose.connect('mongodb://localhost:27017/voting_app');
          console.log('✅ Connected to local MongoDB successfully!');
          console.log('You can now use a local database for development.');
        } catch (err) {
          console.error('❌ Could not connect to local MongoDB:', err.message);
          console.log('Make sure MongoDB is installed and running locally.');
        }
      }
      
      mongoose.disconnect();
      rl.close();
    });
  }
};

testMongoConnection();
