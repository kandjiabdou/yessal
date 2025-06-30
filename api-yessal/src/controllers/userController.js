const prisma = require('../utils/prismaClient');

/**
 * Get all users with optional filtering
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, search, typeClient, siteLavageId, page = 1, limit = 10 } = req.query;
    
    // Build filter conditions
    const where = {};
    
    if (role) {
      where.role = role;
    }
    
    if (search) {
      where.OR = [
        { nom: { contains: search } },
        { prenom: { contains: search } },
        { email: { contains: search } },
        { telephone: { contains: search } }
      ];
    }
    
    // Filter by client type
    if (typeClient) {
      where.typeClient = typeClient;
    }
    
    // Filter by site
    if (siteLavageId) {
      where.siteLavagePrincipalGerantId = Number(siteLavageId);
    }
    
    // Calculate pagination
    const skip = (page - 1) * Number(limit);
    
    // Get users
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          role: true,
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          adresseText: true,
          latitude: true,
          longitude: true,
          aGeolocalisationEnregistree: true,
          typeClient: true,
          siteLavagePrincipalGerantId: true,
          createdAt: true,
          updatedAt: true
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / Number(limit));
    
    res.status(200).json({
      success: true,
      data: users,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single user by ID
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        role: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        adresseText: true,
        latitude: true,
        longitude: true,
        aGeolocalisationEnregistree: true,
        typeClient: true,
        siteLavagePrincipalGerantId: true,
        createdAt: true,
        updatedAt: true,
        // Include related info for clients
        fidelite: req.user.role === 'Manager' ? {
          select: {
            nombreLavageTotal: true,
            poidsTotalLaveKg: true,
            lavagesGratuits6kgRestants: true,
            lavagesGratuits20kgRestants: true
          }
        } : false
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        adresseText: true,
        latitude: true,
        longitude: true,
        aGeolocalisationEnregistree: true,
        typeClient: true,
        siteLavagePrincipalGerantId: true,
        createdAt: true,
        updatedAt: true,
        // Include fidelity info for clients
        fidelite: req.user.role === 'Client' ? {
          select: {
            nombreLavageTotal: true,
            poidsTotalLaveKg: true,
            lavagesGratuits6kgRestants: true,
            lavagesGratuits20kgRestants: true
          }
        } : false,
        // Include premium subscription info for premium clients
        abonnementsPremium: req.user.role === 'Client' && req.user.typeClient === 'Premium' ? {
          where: {
            // Get current month subscription
            AND: [
              { annee: new Date().getFullYear() },
              { mois: new Date().getMonth() + 1 }
            ]
          },
          select: {
            limiteKg: true,
            kgUtilises: true
          }
        } : false
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = Number(id);
    
    // Check permissions - only managers can update other users
    if (req.user.role !== 'Manager' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this user'
      });
    }
    
    // Extract updatable fields
    const {
      nom,
      prenom,
      email,
      telephone,
      adresseText,
      latitude,
      longitude,
      typeClient,
      siteLavagePrincipalGerantId
    } = req.body;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Only managers can update typeClient and siteLavagePrincipalGerantId
    const updateData = {
      nom,
      prenom,
      email,
      telephone,
      adresseText,
      latitude,
      longitude,
      aGeolocalisationEnregistree: !!(latitude && longitude)
    };
    
    if (req.user.role === 'Manager') {
      if (typeClient !== undefined) {
        updateData.typeClient = typeClient;
      }
      
      if (siteLavagePrincipalGerantId !== undefined) {
        updateData.siteLavagePrincipalGerantId = siteLavagePrincipalGerantId;
      }
    }
    
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        role: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        adresseText: true,
        latitude: true,
        longitude: true,
        aGeolocalisationEnregistree: true,
        typeClient: true,
        siteLavagePrincipalGerantId: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = Number(id);
    
    // Only managers can delete users
    if (req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can delete users'
      });
    }
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Delete user
    await prisma.user.delete({
      where: { id: userId }
    });
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user geolocation
 */
const updateUserGeolocation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, adresseText, saveAsDefault } = req.body;
    
    // Update user's geolocation
    const updateData = {
      latitude,
      longitude,
      adresseText
    };
    
    if (saveAsDefault) {
      updateData.aGeolocalisationEnregistree = true;
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        adresseText: true,
        aGeolocalisationEnregistree: true
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Geolocation updated successfully',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get guest clients (clients invités)
 */
const getGuestClients = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    
    // Build filter conditions
    const where = {};
    
    if (search) {
      where.OR = [
        { nom: { contains: search } },
        { prenom: { contains: search } },
        { email: { contains: search } },
        { telephone: { contains: search } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * Number(limit);
    
    // Get guest clients
    const [guestClients, total] = await Promise.all([
      prisma.clientinvite.findMany({
        where,
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          adresseText: true
        },
        skip,
        take: Number(limit),
        orderBy: { id: 'desc' }
      }),
      prisma.clientinvite.count({ where })
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / Number(limit));
    
    res.status(200).json({
      success: true,
      data: guestClients,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  getCurrentUser,
  updateUser,
  deleteUser,
  updateUserGeolocation,
  getGuestClients
};
