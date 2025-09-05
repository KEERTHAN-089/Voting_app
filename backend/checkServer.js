/**
 * Server Status Check Utility
 * Run with: node checkServer.js
 */
const http = require('http');

const ENDPOINTS_TO_CHECK = [
  { path: '/ping', method: 'GET', expectedStatus: 200 },
  { path: '/health', method: 'GET', expectedStatus: 200 },
  { path: '/user/signup', method: 'OPTIONS', expectedStatus: 204 },  // Changed to 204 to match your CORS setup
  { path: '/test-signup', method: 'OPTIONS', expectedStatus: 204 }   // Changed to 204 to match your CORS setup
];

const SERVER_PORT = process.env.PORT || 3000;
const SERVER_HOST = 'localhost';

function checkEndpoint(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data,
          success: res.statusCode === options.expectedStatus
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

async function checkServer() {
  console.log(`\n🔍 Checking server at http://${SERVER_HOST}:${SERVER_PORT}...\n`);
  
  let allSuccessful = true;
  
  for (const endpoint of ENDPOINTS_TO_CHECK) {
    const options = {
      host: SERVER_HOST,
      port: SERVER_PORT,
      path: endpoint.path,
      method: endpoint.method,
      expectedStatus: endpoint.expectedStatus,
      timeout: 3000
    };
    
    try {
      console.log(`Testing ${endpoint.method} ${endpoint.path}...`);
      const result = await checkEndpoint(options);
      
      if (result.success) {
        console.log(`✅ ${endpoint.method} ${endpoint.path} - Status: ${result.status} (Expected: ${endpoint.expectedStatus})`);
      } else {
        console.log(`❌ ${endpoint.method} ${endpoint.path} - Status: ${result.status} (Expected: ${endpoint.expectedStatus})`);
        allSuccessful = false;
      }
    } catch (error) {
      console.log(`❌ ${endpoint.method} ${endpoint.path} - Error: ${error.message}`);
      allSuccessful = false;
    }
  }
  
  console.log('\n📊 Summary:');
  if (allSuccessful) {
    console.log('✅ Server is running correctly and responding to all test endpoints');
  } else {
    console.log('❌ Server is not responding correctly to all endpoints');
    console.log('\nPossible issues:');
    console.log('1. Server is not running - try running: node server.js');
    console.log('2. Server is running on a different port - check your .env file');
    console.log('3. Routes are not properly defined - check your route files');
    console.log('4. Server has an error - check your server console for errors');
  }
  
  console.log('\nTo start the server, run:');
  console.log('cd backend && node server.js');
}

checkServer();
