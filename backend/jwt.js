const jwt = require('jsonwebtoken');

const readToken = (req) => {
    const authorization = req.headers.authorization;
    if (!authorization) return null;
    return authorization.split(' ')[1] || null;
}

const jwtAuthMiddleware = (req, res, next) => {

    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).json({ message: 'Authorization header is missing' });
    }
    const token = readToken(req);
    if (!token) {
        return res.status(401).json({ message: 'Token is missing' });
    }
    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}

// For routes that work signed out but show more when signed in
const optionalAuth = (req, res, next) => {
    const token = readToken(req);
    if (token) {
        try {
            req.user = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            // Treat a bad or expired token as signed out
        }
    }
    next();
}

//Function to generate JWT token
const generateToken = (payload) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '12h' }
    );
}

// Make sure the exports are properly defined
module.exports = {
  jwtAuthMiddleware,
  optionalAuth,
  generateToken
};
