const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const prisma = require('../utils/prismaClient');
const config = require('../config/config');

// Google OAuth client
const googleClient = new OAuth2Client(config.google.clientId);

/**
 * Generate JWT tokens
 */
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
  
  const refreshToken = jwt.sign(
    { userId },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
  
  return { accessToken, refreshToken };
};

/**
 * Register a new user
 */
const register = async (req, res, next) => {
  try {
    const { 
      role, 
      nom,
      prenom, 
      email, 
      telephone, 
      password, 
      adresseText,
      latitude,
      longitude,
      typeClient,
      siteLavagePrincipalGerantId
    } = req.body;
    
    // Validate that at least one contact method is provided
    if (!email && !telephone) {
      return res.status(400).json({
        success: false,
        message: 'Either email or telephone is required'
      });
    }
    
    // Check if user already exists with the same email or phone
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email || null },
          { telephone: telephone || null }
        ]
      }
    });
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email or telephone'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = await prisma.user.create({
      data: {
        role,
        nom,
        prenom,
        email,
        telephone,
        motDePasseHash: hashedPassword,
        adresseText,
        latitude,
        longitude,
        aGeolocalisationEnregistree: !!(latitude && longitude),
        typeClient,
        siteLavagePrincipalGerantId
      }
    });
    
    // If user is a client, create fidelity record
    if (role === 'Client') {
      await prisma.fidelite.create({
        data: {
          clientUserId: newUser.id,
          nombreLavageTotal: 0,
          poidsTotalLaveKg: 0,
          lavagesGratuits6kgRestants: 0,
          lavagesGratuits20kgRestants: 0
        }
      });
    }
    
    // Generate JWT tokens
    const tokens = generateTokens(newUser.id);
    
    // Remove sensitive information
    const { motDePasseHash, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userWithoutPassword,
        ...tokens
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login with email/telephone and password
 */
const login = async (req, res, next) => {
  try {
    const { email, telephone, password } = req.body;
    
    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email || null },
          { telephone: telephone || null }
        ]
      }
    });
    
    // Check if user exists and password is correct
    if (!user || !user.motDePasseHash || !(await bcrypt.compare(password, user.motDePasseHash))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Generate JWT tokens
    const tokens = generateTokens(user.id);
    
    // Remove sensitive information
    const { motDePasseHash, ...userWithoutPassword } = user;
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        ...tokens
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login or register with Google
 */
const googleAuth = async (req, res, next) => {
  try {
    const { googleToken } = req.body;
    
    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: config.google.clientId
    });
    
    const payload = ticket.getPayload();
    const { email, given_name, family_name, sub: googleId } = payload;
    
    // Check if user already exists
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { loginGoogleId: googleId }
        ]
      }
    });
    
    // If user doesn't exist, create a new one
    if (!user) {
      user = await prisma.user.create({
        data: {
          role: 'Client', // Default role for Google sign-ups
          nom: family_name || 'Unknown',
          prenom: given_name || 'Unknown',
          email,
          loginGoogleId: googleId,
          typeClient: 'Standard' // Default client type
        }
      });
      
      // Create fidelity record for new client
      await prisma.fidelite.create({
        data: {
          clientUserId: user.id,
          nombreLavageTotal: 0,
          poidsTotalLaveKg: 0,
          lavagesGratuits6kgRestants: 0,
          lavagesGratuits20kgRestants: 0
        }
      });
    } else if (!user.loginGoogleId) {
      // Update existing user with Google ID if not already set
      user = await prisma.user.update({
        where: { id: user.id },
        data: { loginGoogleId: googleId }
      });
    }
    
    // Generate JWT tokens
    const tokens = generateTokens(user.id);
    
    // Remove sensitive information
    const { motDePasseHash, ...userWithoutPassword } = user;
    
    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      data: {
        user: userWithoutPassword,
        ...tokens
      }
    });
  } catch (error) {
    console.log('Google authentication error:', error);
    next(error);
  }
};

/**
 * Refresh access token using refresh token
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
    
    // Generate new access token
    const accessToken = jwt.sign(
      { userId: user.id },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: { accessToken }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }
    next(error);
  }
};

/**
 * Change user password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    // Check if user has password (not Google login only)
    if (!user.motDePasseHash) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change password for accounts without password authentication'
      });
    }
    
    // Check current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.motDePasseHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { motDePasseHash: hashedPassword }
    });
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  googleAuth,
  refreshToken,
  changePassword
};
