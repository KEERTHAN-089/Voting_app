const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT secret key with fallback
const JWT_SECRET = process.env.JWT_SECRET || 'voting-app-secure-key-2025';

// Middleware for admin-only routes
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if the user exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Add user information to request
    req.user = {
      id: user._id,
      username: user.username,
      role: user.role
    };
    
    // For admin-only routes, check role
    if (req.originalUrl.includes('/admin') && user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = authMiddleware;
