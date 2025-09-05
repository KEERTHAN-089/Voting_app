const jwt = require('jsonwebtoken');

const jwtAuthMiddleware = (req, res, next) => {

    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).json({ message: 'Authorization header is missing' });
    }
    const token = authorization.split(' ')[1];
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

//Function to generate JWT token
const generateToken = (payload) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
}

// Make sure the exports are properly defined
module.exports = {
  jwtAuthMiddleware,
  generateToken
};