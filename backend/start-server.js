const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

console.log('Starting backend server with diagnostics...');

// Check if MongoDB is running
try {
  if (os.platform() === 'win32') {
    // Windows - check MongoDB service
    console.log('Checking MongoDB service on Windows...');
    try {
      const output = execSync('sc query MongoDB').toString();
      if (output.includes('RUNNING')) {
        console.log('✅ MongoDB service is running');
      } else {
        console.log('⚠️ MongoDB service is NOT running');
        console.log('Try starting it with: sc start MongoDB');
      }
    } catch (error) {
      console.log('⚠️ MongoDB service not found or not accessible');
      console.log('Please install MongoDB or start it manually');
    }
  } else {
    // Linux/Mac - use ps to check for mongod process
    console.log('Checking MongoDB process on Linux/Mac...');
    try {
      const output = execSync('ps aux | grep mongod').toString();
      if (output.includes('mongod')) {
        console.log('✅ MongoDB process is running');
      } else {
        console.log('⚠️ MongoDB process is NOT running');
        console.log('Try starting it with: sudo service mongod start');
      }
    } catch (error) {
      console.log('⚠️ Could not check MongoDB process');
    }
  }
} catch (error) {
  console.log('⚠️ Could not check MongoDB status');
}

// Check if port 3000 is already in use
try {
  console.log('Checking if port 3000 is in use...');
  if (os.platform() === 'win32') {
    const output = execSync('netstat -ano | findstr :3000').toString();
    if (output) {
      console.log('⚠️ Port 3000 is already in use by another process');
      console.log(output);
    } else {
      console.log('✅ Port 3000 is available');
    }
  } else {
    const output = execSync('lsof -i :3000').toString();
    if (output) {
      console.log('⚠️ Port 3000 is already in use by another process');
      console.log(output);
    } else {
      console.log('✅ Port 3000 is available');
    }
  }
} catch (error) {
  // If command fails, port is likely not in use
  console.log('✅ Port 3000 appears to be available');
}

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file found');
} else {
  console.log('⚠️ .env file not found, creating a default one...');
  const defaultEnv = `PORT=3000
MONGODB_URL=mongodb://localhost:27017/voting_app
JWT_SECRET=voting-app-secret-key-2025
NODE_ENV=development
`;
  fs.writeFileSync(envPath, defaultEnv);
  console.log('✅ Created default .env file');
}

// Start the server
console.log('Starting server...');
try {
  require('./server.js');
} catch (error) {
  console.error('❌ Failed to start server:', error);
}
