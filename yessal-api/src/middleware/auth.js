const jwt = require('jsonwebtoken');
const config = require('../config/config');
const prisma = require('../utils/prismaClient');

/**
 * Check if the request has a valid JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required. No token provided.' 
      });
    }

    // Verify token
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    // Find user by id
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User belonging to this token no longer exists' 
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom
    };

    next();
  } catch (error) {
    console.log('Authentication error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired. Please log in again.' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token. Please log in again.' 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication failed. Please log in again.' 
    });
  }
};

/**
 * Check if the user has the required role
 * @param {Array} roles - Array of allowed roles
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }

    // Make sure roles is an array
    const roleArray = Array.isArray(roles) ? roles : [roles];
    
    if (roleArray.length > 0 && !roleArray.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access forbidden. You do not have permission to access this resource.' 
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize
};
