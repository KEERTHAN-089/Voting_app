const express = require('express');
const router = express.Router();
// Update import path if needed
const User = require('../models/User');
const { generateToken } = require('../jwt');
const auth = require('../middleware/auth');


// User signup route
router.post('/signup', async (req, res) => {
    try {
        console.log('Received signup request');
        const data = req.body;
        
        // Log the data for debugging but truncate large values
        console.log('Request body:', {
            ...data,
            password: data.password ? '********' : undefined,
            address: data.address ? (data.address.length > 100 ? data.address.substring(0, 100) + '...' : data.address) : undefined
        });
        
        // Validate required fields
        const requiredFields = ['username', 'age', 'email', 'mobile', 'address', 'aadharCardNumber', 'password'];
        const missingFields = requiredFields.filter(field => !data[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                message: 'Missing required fields',
                missingFields: missingFields
            });
        }

        // Validate data lengths to prevent oversized requests
        if (data.address && data.address.length > 500) {
            return res.status(400).json({
                message: 'Address too long (max 500 characters)'
            });
        }
        
        if (data.aadharCardNumber && data.aadharCardNumber.length !== 12) {
            return res.status(400).json({
                message: 'Aadhar card number must be 12 digits'
            });
        }
        
        // Create user with validated data
        const newUser = new User({
            username: data.username,
            age: parseInt(data.age, 10),
            email: data.email,
            mobile: data.mobile,
            address: data.address,
            aadharCardNumber: data.aadharCardNumber,
            password: data.password,
            role: 'voter'  // Default role
        });
        
        const response = await newUser.save();
        console.log('User saved successfully:', response._id);

        const payload = {
            id: response._id 
        };
        const token = generateToken(payload);
        
        // Return minimal user data to reduce response size
        const userData = {
            _id: response._id,
            username: response.username,
            email: response.email,
            role: response.role
        };
        
        res.status(201).json({
            user: userData,
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

// User login route
router.post('/login', async (req, res) => {
    try {
        const { aadharCardNumber, password } = req.body;
        const user = await User.findOne({ aadharCardNumber });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const payload = {
            id: user._id
        };
        const token = generateToken(payload);
        res.status(200).json({
            user,
            token
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get user profile route
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get user vote status - more accurate check
router.get('/vote/status', auth, async (req, res) => {
  try {
    console.log('Checking vote status for user ID:', req.user.id);
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Log the current status
    console.log('Vote status check:', {
      userId: user._id,
      hasVoted: !!user.hasVoted,
      isVoted: !!user.isVoted
    });
    
    const hasVoted = user.hasVoted === true || user.isVoted === true;
    
    res.json({
      hasVoted: hasVoted,
      votedFor: hasVoted ? user.votedFor : null,
      votedAt: hasVoted ? user.votedAt : null
    });
  } catch (err) {
    console.error('Error checking vote status:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;