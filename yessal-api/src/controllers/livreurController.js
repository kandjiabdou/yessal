const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

/**
 * Get all delivery personnel with optional filtering
 */
const getLivreurs = async (req, res, next) => {
  try {
    const { search, available, page = 1, limit = 10 } = req.query;
    
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
    
    if (available !== undefined) {
      where.statutDisponibilite = available === 'true';
    }
    
    // Calculate pagination
    const skip = (page - 1) * Number(limit);
    
    // Get delivery personnel
    const [livreurs, total] = await Promise.all([
      prisma.livreur.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { nom: 'asc' }
      }),
      prisma.livreur.count({ where })
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / Number(limit));
    
    res.status(200).json({
      success: true,
      data: livreurs,
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
 * Get a single delivery person by ID
 */
const getLivreurById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const livreur = await prisma.livreur.findUnique({
      where: { id: Number(id) }
    });
    
    if (!livreur) {
      return res.status(404).json({
        success: false,
        message: 'Delivery person not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: livreur
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new delivery person
 */
const createLivreur = async (req, res, next) => {
  try {
    // Only managers can create delivery personnel
    if (req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can create delivery personnel'
      });
    }
    
    const {
      nom,
      prenom,
      email,
      telephone,
      adresseText,
      moyenLivraison,
      statutDisponibilite = true
    } = req.body;
    
    const newLivreur = await prisma.livreur.create({
      data: {
        nom,
        prenom,
        email,
        telephone,
        adresseText,
        moyenLivraison,
        statutDisponibilite
      }
    });
    
    // Log admin action
    await prisma.logadminaction.create({
      data: {
        adminUserId: req.user.id,
        typeAction: 'CREATE',
        entite: 'Livreur',
        entiteId: newLivreur.id,
        description: `Delivery person ${nom} ${prenom} created by ${req.user.nom} ${req.user.prenom}`
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Delivery person created successfully',
      data: newLivreur
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a delivery person
 */
const updateLivreur = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Only managers can update delivery personnel
    if (req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can update delivery personnel'
      });
    }
    
    const {
      nom,
      prenom,
      email,
      telephone,
      adresseText,
      moyenLivraison,
      statutDisponibilite
    } = req.body;
    
    // Check if delivery person exists
    const existingLivreur = await prisma.livreur.findUnique({
      where: { id: Number(id) }
    });
    
    if (!existingLivreur) {
      return res.status(404).json({
        success: false,
        message: 'Delivery person not found'
      });
    }
    
    // Update delivery person
    const updatedLivreur = await prisma.livreur.update({
      where: { id: Number(id) },
      data: {
        nom,
        prenom,
        email,
        telephone,
        adresseText,
        moyenLivraison,
        statutDisponibilite
      }
    });
    
    // Log admin action
    await prisma.logadminaction.create({
      data: {
        adminUserId: req.user.id,
        typeAction: 'UPDATE',
        entite: 'Livreur',
        entiteId: updatedLivreur.id,
        description: `Delivery person ${updatedLivreur.nom} ${updatedLivreur.prenom} updated by ${req.user.nom} ${req.user.prenom}`
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Delivery person updated successfully',
      data: updatedLivreur
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a delivery person
 */
const deleteLivreur = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Only managers can delete delivery personnel
    if (req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can delete delivery personnel'
      });
    }
    
    // Check if delivery person exists
    const existingLivreur = await prisma.livreur.findUnique({
      where: { id: Number(id) }
    });
    
    if (!existingLivreur) {
      return res.status(404).json({
        success: false,
        message: 'Delivery person not found'
      });
    }
    
    // Check if delivery person has related records
    const relatedOrders = await prisma.commande.count({
      where: { livreurId: Number(id) }
    });
    
    if (relatedOrders > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete delivery person with related orders'
      });
    }
    
    // Delete delivery person
    await prisma.livreur.delete({
      where: { id: Number(id) }
    });
    
    // Log admin action
    await prisma.logadminaction.create({
      data: {
        adminUserId: req.user.id,
        typeAction: 'DELETE',
        entite: 'Livreur',
        entiteId: Number(id),
        description: `Delivery person ${existingLivreur.nom} ${existingLivreur.prenom} deleted by ${req.user.nom} ${req.user.prenom}`
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Delivery person deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update availability status of a delivery person
 */
const updateAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { statutDisponibilite } = req.body;
    
    // Only managers can update availability
    if (req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can update delivery personnel availability'
      });
    }
    
    // Check if delivery person exists
    const existingLivreur = await prisma.livreur.findUnique({
      where: { id: Number(id) }
    });
    
    if (!existingLivreur) {
      return res.status(404).json({
        success: false,
        message: 'Delivery person not found'
      });
    }
    
    // Update availability
    const updatedLivreur = await prisma.livreur.update({
      where: { id: Number(id) },
      data: { statutDisponibilite }
    });
    
    // Log admin action
    await prisma.logadminaction.create({
      data: {
        adminUserId: req.user.id,
        typeAction: 'UPDATE',
        entite: 'Livreur',
        entiteId: updatedLivreur.id,
        description: `Delivery person ${updatedLivreur.nom} ${updatedLivreur.prenom} availability updated to ${statutDisponibilite ? 'available' : 'unavailable'} by ${req.user.nom} ${req.user.prenom}`
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Availability updated successfully',
      data: updatedLivreur
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get orders assigned to a delivery person
 */
const getLivreurOrders = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    
    // Check if delivery person exists
    const existingLivreur = await prisma.livreur.findUnique({
      where: { id: Number(id) }
    });
    
    if (!existingLivreur) {
      return res.status(404).json({
        success: false,
        message: 'Delivery person not found'
      });
    }
    
    // Build filter conditions
    const where = {
      livreurId: Number(id)
    };
    
    if (status) {
      where.statut = status;
    }
    
    // Calculate pagination
    const skip = (page - 1) * Number(limit);
    
    // Get orders
    const [orders, total] = await Promise.all([
      prisma.commande.findMany({
        where,
        include: {
          clientUser: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              telephone: true
            }
          },
          clientInvite: true,
          siteLavage: {
            select: {
              id: true,
              nom: true,
              adresseText: true
            }
          },
          adresseLivraison: true
        },
        skip,
        take: Number(limit),
        orderBy: { dateHeureCommande: 'desc' }
      }),
      prisma.commande.count({ where })
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / Number(limit));
    
    res.status(200).json({
      success: true,
      data: orders,
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
  getLivreurs,
  getLivreurById,
  createLivreur,
  updateLivreur,
  deleteLivreur,
  updateAvailability,
  getLivreurOrders
};
