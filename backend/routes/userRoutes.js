const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Make sure this path is correct
const { jwtAuthMiddleware, generateToken } = require('../jwt');

// Log every request to debug route issues
router.use((req, res, next) => {
  console.log(`[UserRoutes] ${req.method} ${req.originalUrl} - Body:`, req.body);
  next();
});

// Basic test route to confirm router is working
router.get('/test', (req, res) => {
  res.json({ message: 'User routes are working' });
});

// Signup route - simplified for reliability
router.post('/signup', async (req, res) => {
  try {
    console.log('Processing signup request:', req.body);
    
    // Basic validation
    const { username, age, email, mobile, address, aadharCardNumber, password, role } = req.body;
    
    if (!username || !age || !email || !mobile || !address || !aadharCardNumber || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Create new user with mongoose directly
    const newUser = new User({
      username,
      age,
      email,
      mobile,
      address,
      aadharCardNumber,
      password,
      role: role || 'voter'
    });
    
    // Save the user
    const savedUser = await newUser.save();
    
    // Generate token
    const token = generateToken({ id: savedUser._id });
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: savedUser._id,
        username: savedUser.username,
        role: savedUser.role
      }
    });
  } catch (error) {
    console.error('Error in signup route:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ message: `User with this ${field} already exists` });
    }
    
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt with:', req.body);
    const { aadharCardNumber, password } = req.body;

    if (!aadharCardNumber || !password) {
      return res.status(400).json({ message: 'Aadhar card number and password are required' });
    }

    // Find user by aadhar card number
    const user = await User.findOne({ aadharCardNumber });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken({ id: user._id });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        hasVoted: user.isVoted
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user profile route
router.get('/profile', jwtAuthMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            isVoted: user.isVoted,
            hasVoted: user.hasVoted,
            votedFor: user.votedFor
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Update password route
router.put('/profile/password', jwtAuthMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;
        
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Old password and new password are required' });
        }
        
        const user = await User.findById(userId); 
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const isMatch = await user.comparePassword(oldPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Old password is incorrect' });
        }
        
        user.password = newPassword;
        await user.save();
        
        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

module.exports = router;