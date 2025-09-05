require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  try {
    const MONGODB_URI = process.env.MONGODB_URL || 'mongodb://localhost:27017/voting_app';
    console.log('Testing connection to MongoDB at:', MONGODB_URI);
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log('✅ MongoDB connection successful!');
    
    // Try a simple database operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    mongoose.disconnect();
    console.log('Connection closed successfully');
  } catch (error) {
    console.error('❌ MongoDB connection test failed:', error);
    console.error('Error details:', error);
  }
}

testConnection();
