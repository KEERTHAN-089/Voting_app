const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

// Register user
router.post('/signup', async (req, res) => {
  try {
    // Extract user details from request body
    const { username, email, password, mobile, address, aadharCardNumber, age } = req.body;
    
    // Validation
    if (!username || !email || !password || !mobile || !address || !aadharCardNumber || !age) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Check if user already exists
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    existingUser = await User.findOne({ aadharCardNumber });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this Aadhar card number already exists' });
    }
    
    existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this mobile number already exists' });
    }
    
    // Create new user
    const user = new User({
      username,
      email,
      password,
      mobile,
      address,
      aadharCardNumber,
      age: parseInt(age),
      role: 'voter' // Default role
    });
    
    // Save user to database
    await user.save();
    
    // Create JWT token
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };
    
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1d' },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({ 
          message: 'Registration successful',
          token
        });
      }
    );
  } catch (err) {
    console.error('Registration Error:', err.message);
    res.status(500).json({ message: 'Server error during registration', error: err.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { aadharCardNumber, password } = req.body;
    
    // Validate input
    if (!aadharCardNumber || !password) {
      return res.status(400).json({ message: 'Please provide Aadhar card number and password' });
    }
    
    // Find user by Aadhar number
    const user = await User.findOne({ aadharCardNumber });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Create JWT token
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };
    
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1d' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            hasVoted: user.hasVoted
          }
        });
      }
    );
  } catch (err) {
    console.error('Login Error:', err.message);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    // Get user without password
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check voting status
router.get('/vote/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ hasVoted: user.hasVoted });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
