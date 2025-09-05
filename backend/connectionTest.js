const mongoose = require('mongoose');
const http = require('http');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({ origin: '*' }));

// Basic route for connection testing
app.get('/', (req, res) => {
  res.json({ message: 'Connection test server is running' });
});

// Database connection status endpoint
app.get('/db-status', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const statusMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    res.json({
      status: statusMap[dbStatus] || 'unknown',
      dbName: mongoose.connection.name,
      host: mongoose.connection.host,
      connected: dbStatus === 1
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Network diagnostics endpoint
app.get('/network-test', (req, res) => {
  res.json({
    clientIP: req.ip,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Test MongoDB connection
const testDbConnection = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URL || 'mongodb://localhost:27017/voting_app';
    console.log('Testing connection to MongoDB at:', MONGODB_URI);
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Short timeout for quick testing
    });
    
    console.log('✅ MongoDB connection successful!');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
};

// Start the server
const PORT = process.env.TEST_PORT || 5000;
const server = http.createServer(app);

// Run the test server
const runTestServer = async () => {
  const dbConnected = await testDbConnection();
  
  server.listen(PORT, () => {
    console.log(`
=============================================
🔌 CONNECTION TEST SERVER RUNNING
=============================================
Server: http://localhost:${PORT}
Database: ${dbConnected ? 'Connected ✅' : 'Failed to connect ❌'}
---------------------------------------------
Test endpoints:
1. Basic test: http://localhost:${PORT}/
2. DB status: http://localhost:${PORT}/db-status
3. Network test: http://localhost:${PORT}/network-test
=============================================
Press Ctrl+C to stop
    `);
  });
  
  // Auto-shutdown after 5 minutes
  setTimeout(() => {
    console.log('Auto-shutting down test server after 5 minutes');
    server.close();
    process.exit(0);
  }, 5 * 60 * 1000);
};

runTestServer().catch(error => {
  console.error('Failed to start test server:', error);
});
