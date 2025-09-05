/**
 * This file helps test routes directly with Node.js
 * Run with: node testRoutes.js
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testRoutes() {
  console.log('Testing routes...');
  
  try {
    // Test 1: GET /health
    console.log('\n1. Testing Health Endpoint');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check status:', healthResponse.status);
    
    // Test 2: POST /user/signup
    console.log('\n2. Testing User Signup');
    try {
      const signupResponse = await axios.post(`${BASE_URL}/user/signup`, {
        username: `testuser${Date.now()}`,
        age: 25,
        email: `test${Date.now()}@example.com`,
        mobile: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        address: '123 Test St',
        aadharCardNumber: Math.floor(100000000000 + Math.random() * 900000000000),
        password: 'password123'
      });
      console.log('✅ Signup status:', signupResponse.status);
      console.log('User created:', signupResponse.data.user);
    } catch (signupError) {
      console.error('❌ Signup failed:', signupError.response?.status, signupError.response?.data || signupError.message);
    }
    
  } catch (error) {
    console.error('Error testing routes:', error.message);
  }
}

testRoutes();
