const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('JWT_SECRET is not defined in environment variables!');
  process.exit(1);
}

// Generate token function - make sure it includes all necessary user info
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id,
      role: user.role,
      username: user.username
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Verify token function
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  generateToken,
  verifyToken
};