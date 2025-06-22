const prisma = require('../utils/prismaClient');

/**
 * Service for delivery person-related operations
 */
class LivreurService {
  /**
   * Get all delivery personnel with filtering and pagination
   * @param {Object} filters - Filter conditions
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} - Delivery personnel and pagination info
   */
  async getLivreurs(filters, page, limit) {
    const { search, available } = filters;
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
    
    const skip = (page - 1) * limit;
    
    const [livreurs, total] = await Promise.all([
      prisma.livreur.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nom: 'asc' }
      }),
      prisma.livreur.count({ where })
    ]);
    
    return {
      livreurs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get a single delivery person by ID
   * @param {number} livreurId - Delivery person ID
   * @returns {Promise<Object>} - Delivery person
   */
  async getLivreurById(livreurId) {
    return prisma.livreur.findUnique({
      where: { id: Number(livreurId) }
    });
  }
  
  /**
   * Create a new delivery person
   * @param {Object} livreurData - Delivery person data
   * @param {number} adminUserId - Admin user ID
   * @returns {Promise<Object>} - Created delivery person
   */
  async createLivreur(livreurData, adminUserId) {
    const {
      nom,
      prenom,
      email,
      telephone,
      adresseText,
      moyenLivraison,
      statutDisponibilite = true
    } = livreurData;
    
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
        adminUserId,
        typeAction: 'CREATE',
        entite: 'Livreur',
        entiteId: newLivreur.id,
        description: `Delivery person ${nom} ${prenom} created by admin #${adminUserId}`
      }
    });
    
    return newLivreur;
  }
  
  /**
   * Update a delivery person
   * @param {number} livreurId - Delivery person ID
   * @param {Object} livreurData - Delivery person data to update
   * @param {number} adminUserId - Admin user ID
   * @returns {Promise<Object>} - Updated delivery person
   */
  async updateLivreur(livreurId, livreurData, adminUserId) {
    const {
      nom,
      prenom,
      email,
      telephone,
      adresseText,
      moyenLivraison,
      statutDisponibilite
    } = livreurData;
    
    // Check if delivery person exists
    const existingLivreur = await prisma.livreur.findUnique({
      where: { id: Number(livreurId) }
    });
    
    if (!existingLivreur) {
      return null;
    }
    
    // Update delivery person
    const updatedLivreur = await prisma.livreur.update({
      where: { id: Number(livreurId) },
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
        adminUserId,
        typeAction: 'UPDATE',
        entite: 'Livreur',
        entiteId: updatedLivreur.id,
        description: `Delivery person ${updatedLivreur.nom} ${updatedLivreur.prenom} updated by admin #${adminUserId}`
      }
    });
    
    return updatedLivreur;
  }
  
  /**
   * Delete a delivery person
   * @param {number} livreurId - Delivery person ID
   * @param {number} adminUserId - Admin user ID
   * @returns {Promise<boolean>} - Success flag
   */
  async deleteLivreur(livreurId, adminUserId) {
    try {
      // Check if delivery person exists
      const existingLivreur = await prisma.livreur.findUnique({
        where: { id: Number(livreurId) }
      });
      
      if (!existingLivreur) {
        return false;
      }
      
      // Check if delivery person has related records
      const relatedOrders = await prisma.commande.count({
        where: { livreurId: Number(livreurId) }
      });
      
      if (relatedOrders > 0) {
        throw new Error('Cannot delete delivery person with related orders');
      }
      
      // Delete delivery person
      await prisma.livreur.delete({
        where: { id: Number(livreurId) }
      });
      
      // Log admin action
      await prisma.logadminaction.create({
        data: {
          adminUserId,
          typeAction: 'DELETE',
          entite: 'Livreur',
          entiteId: Number(livreurId),
          description: `Delivery person ${existingLivreur.nom} ${existingLivreur.prenom} deleted by admin #${adminUserId}`
        }
      });
      
      return true;
    } catch (error) {
      console.log(`Failed to delete delivery person ${livreurId}:`, error);
      throw error;
    }
  }
  
  /**
   * Update availability status of a delivery person
   * @param {number} livreurId - Delivery person ID
   * @param {boolean} statutDisponibilite - Availability status
   * @param {number} adminUserId - Admin user ID
   * @returns {Promise<Object>} - Updated delivery person
   */
  async updateAvailability(livreurId, statutDisponibilite, adminUserId) {
    // Check if delivery person exists
    const existingLivreur = await prisma.livreur.findUnique({
      where: { id: Number(livreurId) }
    });
    
    if (!existingLivreur) {
      return null;
    }
    
    // Update availability
    const updatedLivreur = await prisma.livreur.update({
      where: { id: Number(livreurId) },
      data: { statutDisponibilite }
    });
    
    // Log admin action
    await prisma.logadminaction.create({
      data: {
        adminUserId,
        typeAction: 'UPDATE',
        entite: 'Livreur',
        entiteId: updatedLivreur.id,
        description: `Delivery person ${updatedLivreur.nom} ${updatedLivreur.prenom} availability updated to ${statutDisponibilite ? 'available' : 'unavailable'} by admin #${adminUserId}`
      }
    });
    
    return updatedLivreur;
  }
  
  /**
   * Get orders assigned to a delivery person
   * @param {number} livreurId - Delivery person ID
   * @param {string} status - Filter by order status
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} - Orders and pagination info
   */
  async getLivreurOrders(livreurId, status, page, limit) {
    // Check if delivery person exists
    const existingLivreur = await prisma.livreur.findUnique({
      where: { id: Number(livreurId) }
    });
    
    if (!existingLivreur) {
      return null;
    }
    
    // Build filter conditions
    const where = {
      livreurId: Number(livreurId)
    };
    
    if (status) {
      where.statut = status;
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
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
        take: limit,
        orderBy: { dateHeureCommande: 'desc' }
      }),
      prisma.commande.count({ where })
    ]);
    
    return {
      orders,
      livreur: existingLivreur,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Find available delivery personnel for a specific area
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {number} maxDistance - Maximum distance in km
   * @returns {Promise<Array>} - List of available delivery personnel
   */
  async findAvailableLivreurs(latitude, longitude, maxDistance = 10) {
    // Get all available delivery personnel
    const availableLivreurs = await prisma.livreur.findMany({
      where: {
        statutDisponibilite: true
      }
    });
    
    // Filter by current workload (optional enhancement)
    // Could implement logic to check current assigned orders
    
    return availableLivreurs;
  }
  
  /**
   * Send notification to delivery person (simulated)
   * @param {number} livreurId - Delivery person ID
   * @param {number} orderId - Order ID
   * @returns {Promise<boolean>} - Success flag
   */
  async sendNotification(livreurId, orderId) {
    try {
      // In a real implementation, this would call an SMS or push notification service
      console.log(`Sending notification to delivery person ${livreurId} for order ${orderId}`);
      
      // Get delivery person details
      const livreur = await prisma.livreur.findUnique({
        where: { id: Number(livreurId) }
      });
      
      if (!livreur) {
        throw new Error('Delivery person not found');
      }
      
      // Get order details
      const order = await prisma.commande.findUnique({
        where: { id: Number(orderId) },
        include: {
          clientUser: {
            select: {
              nom: true,
              prenom: true,
              telephone: true
            }
          },
          clientInvite: true,
          adresseLivraison: true
        }
      });
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      // Simulate notification
      const clientName = order.clientUser 
        ? `${order.clientUser.prenom} ${order.clientUser.nom}`
        : order.clientInvite
          ? order.clientInvite.nom
          : 'Unknown client';
      
      const clientPhone = order.clientUser 
        ? order.clientUser.telephone
        : order.clientInvite
          ? order.clientInvite.telephone
          : 'Unknown phone';
      
      const deliveryAddress = order.adresseLivraison
        ? order.adresseLivraison.adresseText
        : 'Unknown address';
      
      const message = `New delivery assigned: Order #${orderId} for ${clientName}, Phone: ${clientPhone}, Address: ${deliveryAddress}`;
      
      console.log(`SMS would be sent to ${livreur.telephone}: ${message}`);
      
      // In a real implementation, we would call an SMS API here
      // For now, just log the message and return success
      
      return true;
    } catch (error) {
      console.log(`Failed to send notification to delivery person ${livreurId}:`, error);
      return false;
    }
  }
}

module.exports = new LivreurService();
