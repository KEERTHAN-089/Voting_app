const express = require('express');
const router = express.Router();
const User = require('../models/user'); // Corrected path to lowercase
const { jwtAuthMiddleware, generateToken } = require('../jwt'); // Fixed path to jwt.js

router.get('/test', (req, res) => {
  res.json({ message: 'User routes are working' });
});

router.post('/signup', async (req, res) => {
    try {
        const data = req.body;
        
        // Validate required fields
        const requiredFields = ['username', 'age', 'email', 'mobile', 'address', 'aadharCardNumber', 'password'];
        const missingFields = requiredFields.filter(field => !data[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                message: 'Missing required fields',
                missingFields: missingFields
            });
        }
        
        const newUser = new User(data);
        const response = await newUser.save();

        const payload = {
            id: response._id 
        };
        const token = generateToken(payload);
        res.status(201).json({
            user: response,
            token
        });
    } catch (error) {
        console.error('Error during signup:', error);
        
        // Handle validation errors specifically
        if (error.name === 'ValidationError') {
            const validationErrors = Object.keys(error.errors).map(key => ({
                field: key,
                message: error.errors[key].message
            }));
            return res.status(400).json({
                message: 'Validation failed',
                errors: validationErrors
            });
        }
        
        // Handle duplicate key errors
        if (error.code === 11000) {
            const duplicateField = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                message: `${duplicateField} already exists`
            });
        }
        
        res.status(500).json({ message: 'Internal server error' });
    }
});
//login route
// This route allows users to log in using their Aadhar card number and password.

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


router.put('/profile/password', jwtAuthMiddleware, async (req, res) => {
    try {
        const userId= req.user.id;
        const { oldPassword, newPassword } = req.body;
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
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;