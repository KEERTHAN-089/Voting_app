/**
 * MongoDB Atlas Setup Guide
 * 
 * Run this file with: node mongodb-atlas-setup.js
 * It will help you troubleshoot your MongoDB Atlas connection
 */

const https = require('https');
const mongoose = require('mongoose');
require('dotenv').config();

// Get the current public IP address
const getPublicIP = () => {
  return new Promise((resolve, reject) => {
    https.get('https://api.ipify.org', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data.trim()));
    }).on('error', reject);
  });
};

// Main function to check MongoDB Atlas connection
const checkAtlasConnection = async () => {
  console.log('\n===== MongoDB Atlas Connection Troubleshooter =====\n');
  
  try {
    // 1. Get current IP
    const ip = await getPublicIP();
    console.log(`Your current public IP address is: ${ip}`);
    console.log(`\nTo whitelist this IP in MongoDB Atlas:\n`);
    console.log(`1. Log in to MongoDB Atlas: https://cloud.mongodb.com`);
    console.log(`2. Select your project and cluster`);
    console.log(`3. Click "Network Access" in the left sidebar`);
    console.log(`4. Click "Add IP Address"`);
    console.log(`5. Enter your IP: ${ip}`);
    console.log(`6. Add a description like "My Development Machine"`);
    console.log(`7. Click "Confirm"\n`);
    
    console.log('After adding your IP to the whitelist, restart your application');
  } catch (error) {
    console.error('Error getting IP address:', error.message);
  }
  
  console.log('\nYour application is currently using a local MongoDB database.');
  console.log('This is fine for development, but for production:');
  console.log('- User data will only be stored locally');
  console.log('- Data will not be backed up automatically');
  console.log('- You will not have access to MongoDB Atlas features\n');
};

checkAtlasConnection();
