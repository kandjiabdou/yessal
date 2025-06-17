const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const config = require('../config/config');
const { genererNumeroCarteFidelite } = require('../utils/fideliteUtils');

/**
 * Service for loyalty program-related operations
 */
class FideliteService {
  /**
   * Get loyalty information for a client
   * @param {number} clientId - Client user ID
   * @returns {Promise<Object>} - Loyalty information
   */
  async getClientFidelite(clientId) {
    // Check if user exists and is a client
    const user = await prisma.user.findUnique({
      where: { 
        id: Number(clientId),
        role: 'Client'
      }
    });
    
    if (!user) {
      return null;
    }
    
    // Get loyalty information
    const fidelite = await prisma.fidelite.findUnique({
      where: { clientUserId: Number(clientId) }
    });
    
    if (!fidelite) {
      return null;
    }
    
    // Get premium subscription if applicable
    let premiumSubscription = null;
    if (user.typeClient === 'Premium') {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      
      premiumSubscription = await prisma.abonnementpremiummensuel.findFirst({
        where: {
          clientUserId: Number(clientId),
          annee: currentYear,
          mois: currentMonth
        }
      });
    }
    
    // Get order history summary
    const completedOrders = await prisma.commande.count({
      where: {
        clientUserId: Number(clientId),
        statut: 'Livre'
      }
    });
    
    // Response data
    const responseData = {
      clientInfo: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        typeClient: user.typeClient
      },
      fidelite: {
        ...fidelite,
        pointsFidelite: fidelite.nombreLavageTotal % config.business.fidelityStandardFreeWashEvery,
        pointsRequiredForNextReward: config.business.fidelityStandardFreeWashEvery
      },
      orderStats: {
        completedOrders
      }
    };
    
    // Add premium data if applicable
    if (premiumSubscription) {
      responseData.premium = {
        ...premiumSubscription,
        remainingKg: premiumSubscription.limiteKg - premiumSubscription.kgUtilises
      };
    }
    
    return responseData;
  }
  
  /**
   * Get client's loyalty history
   * @param {number} clientId - Client user ID
   * @returns {Promise<Object>} - Loyalty history
   */
  async getClientFideliteHistory(clientId) {
    // Check if client exists
    const client = await prisma.user.findUnique({
      where: { 
        id: Number(clientId),
        role: 'Client'
      }
    });
    
    if (!client) {
      return null;
    }
    
    // Get loyalty information
    const fidelite = await prisma.fidelite.findUnique({
      where: { clientUserId: Number(clientId) }
    });
    
    if (!fidelite) {
      return null;
    }
    
    // Get order history with detailed information
    const orders = await prisma.commande.findMany({
      where: {
        clientUserId: Number(clientId),
        statut: 'Livre'
      },
      select: {
        id: true,
        dateHeureCommande: true,
        formuleCommande: true,
        masseVerifieeKg: true,
        siteLavage: {
          select: {
            id: true,
            nom: true
          }
        }
      },
      orderBy: {
        dateHeureCommande: 'desc'
      }
    });
    
    // Get premium subscription history if applicable
    const premiumHistory = await prisma.abonnementpremiummensuel.findMany({
      where: {
        clientUserId: Number(clientId)
      },
      orderBy: [
        { annee: 'desc' },
        { mois: 'desc' }
      ]
    });
    
    // Response data
    const responseData = {
      clientInfo: {
        id: client.id,
        nom: client.nom,
        prenom: client.prenom,
        email: client.email,
        telephone: client.telephone,
        typeClient: client.typeClient
      },
      fidelite,
      orders,
      premiumHistory: client.typeClient === 'Premium' ? premiumHistory : []
    };
    
    return responseData;
  }
  
  /**
   * Adjust client's loyalty points
   * @param {number} clientId - Client user ID
   * @param {Object} pointsData - Points data to update
   * @param {number} adminUserId - Admin user ID
   * @returns {Promise<Object>} - Updated loyalty information
   */
  async adjustFidelitePoints(clientId, pointsData, adminUserId) {
    const { 
      nombreLavageTotal, 
      poidsTotalLaveKg, 
      lavagesGratuits6kgRestants, 
      lavagesGratuits20kgRestants,
      reason 
    } = pointsData;
    
    // Check if client exists
    const client = await prisma.user.findUnique({
      where: { 
        id: Number(clientId),
        role: 'Client'
      }
    });
    
    if (!client) {
      return null;
    }
    
    // Get current loyalty information
    const currentFidelite = await prisma.fidelite.findUnique({
      where: { clientUserId: Number(clientId) }
    });
    
    if (!currentFidelite) {
      return null;
    }
    
    // Prepare update data
    const updateData = {};
    
    if (nombreLavageTotal !== undefined) {
      updateData.nombreLavageTotal = nombreLavageTotal;
    }
    
    if (poidsTotalLaveKg !== undefined) {
      updateData.poidsTotalLaveKg = poidsTotalLaveKg;
    }
    
    if (lavagesGratuits6kgRestants !== undefined) {
      updateData.lavagesGratuits6kgRestants = lavagesGratuits6kgRestants;
    }
    
    if (lavagesGratuits20kgRestants !== undefined) {
      updateData.lavagesGratuits20kgRestants = lavagesGratuits20kgRestants;
    }
    
    // Update loyalty information
    const updatedFidelite = await prisma.fidelite.update({
      where: { clientUserId: Number(clientId) },
      data: updateData
    });
    
    // Log admin action
    await prisma.logadminaction.create({
      data: {
        adminUserId,
        typeAction: 'UPDATE',
        entite: 'Fidelite',
        entiteId: updatedFidelite.id,
        description: `Loyalty points adjusted for client ${client.nom} ${client.prenom} by admin #${adminUserId}. Reason: ${reason || 'Not specified'}`
      }
    });
    
    return updatedFidelite;
  }
  
  /**
   * Create or update premium subscription for a client
   * @param {number} clientId - Client user ID
   * @param {Object} subscriptionData - Subscription data
   * @param {number} adminUserId - Admin user ID
   * @returns {Promise<Object>} - Created or updated subscription
   */
  async managePremiumSubscription(clientId, subscriptionData, adminUserId) {
    const { annee, mois, limiteKg, kgUtilises } = subscriptionData;
    
    // Check if client exists
    const client = await prisma.user.findUnique({
      where: { 
        id: Number(clientId)
      }
    });
    
    if (!client) {
      return null;
    }
    
    // If client is not premium, update their type
    if (client.typeClient !== 'Premium') {
      await prisma.user.update({
        where: { id: Number(clientId) },
        data: { typeClient: 'Premium' }
      });
    }
    
    // Check if subscription already exists
    const existingSubscription = await prisma.abonnementpremiummensuel.findFirst({
      where: {
        clientUserId: Number(clientId),
        annee,
        mois
      }
    });
    
    let subscription;
    
    if (existingSubscription) {
      // Update existing subscription
      subscription = await prisma.abonnementpremiummensuel.update({
        where: { id: existingSubscription.id },
        data: {
          limiteKg,
          kgUtilises: kgUtilises !== undefined ? kgUtilises : existingSubscription.kgUtilises
        }
      });
    } else {
      // Create new subscription
      subscription = await prisma.abonnementpremiummensuel.create({
        data: {
          clientUserId: Number(clientId),
          annee,
          mois,
          limiteKg,
          kgUtilises: kgUtilises || 0
        }
      });
    }
    
    // Log admin action
    await prisma.logadminaction.create({
      data: {
        adminUserId,
        typeAction: existingSubscription ? 'UPDATE' : 'CREATE',
        entite: 'AbonnementPremiumMensuel',
        entiteId: subscription.id,
        description: `Premium subscription ${existingSubscription ? 'updated' : 'created'} for client ${client.nom} ${client.prenom} by admin #${adminUserId} for ${mois}/${annee}`
      }
    });
    
    return subscription;
  }
  
  /**
   * Get all premium subscriptions
   * @param {Object} filters - Filter conditions
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} - Premium subscriptions and pagination info
   */
  async getAllPremiumSubscriptions(filters, page, limit) {
    const { annee, mois } = filters;
    
    // Build filter conditions
    const where = {};
    
    if (annee) {
      where.annee = Number(annee);
    }
    
    if (mois) {
      where.mois = Number(mois);
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get subscriptions with client info
    const [subscriptions, total] = await Promise.all([
      prisma.abonnementpremiummensuel.findMany({
        where,
        include: {
          clientUser: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              email: true,
              telephone: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: [
          { annee: 'desc' },
          { mois: 'desc' }
        ]
      }),
      prisma.abonnementpremiummensuel.count({ where })
    ]);
    
    // Add remaining quota to each subscription
    const subscriptionsWithRemaining = subscriptions.map(sub => ({
      ...sub,
      remainingKg: sub.limiteKg - sub.kgUtilises
    }));
    
    return {
      subscriptions: subscriptionsWithRemaining,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Initialize loyalty record for new client
   * @param {number} clientId - Client user ID
   * @returns {Promise<Object>} - Created loyalty record
   */
  async initializeClientFidelite(clientId) {
    try {
      // Check if client exists
      const client = await prisma.user.findUnique({
        where: { 
          id: Number(clientId),
          role: 'Client'
        }
      });
      
      if (!client) {
        throw new Error('Client not found');
      }
      
      // Check if loyalty record already exists
      const existingFidelite = await prisma.fidelite.findUnique({
        where: { clientUserId: Number(clientId) }
      });
      
      if (existingFidelite) {
        return existingFidelite;
      }
      
      // Générer le numéro de carte de fidélité
      const numeroCarteFidelite = await genererNumeroCarteFidelite(client.nom);
      
      // Create new loyalty record
      const newFidelite = await prisma.fidelite.create({
        data: {
          clientUserId: Number(clientId),
          numeroCarteFidelite,
          nombreLavageTotal: 0,
          poidsTotalLaveKg: 0,
          lavagesGratuits6kgRestants: 0,
          lavagesGratuits20kgRestants: 0
        }
      });
      
      logger.info(`Loyalty card created for client ${client.nom} ${client.prenom} with number: ${numeroCarteFidelite}`);
      
      return newFidelite;
    } catch (error) {
      logger.error(`Failed to initialize loyalty for client ${clientId}:`, error);
      throw error;
    }
  }
  
  /**
   * Apply free wash to an order if client has available rewards
   * @param {number} orderId - Order ID
   * @param {number} clientId - Client user ID
   * @returns {Promise<Object>} - Updated order and loyalty info
   */
  async applyFreeWashDiscount(orderId, clientId) {
    try {
      // Get order details
      const order = await prisma.commande.findUnique({
        where: { id: Number(orderId) },
        include: {
          options: true
        }
      });
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      // Get client loyalty info
      const fidelite = await prisma.fidelite.findUnique({
        where: { clientUserId: Number(clientId) }
      });
      
      if (!fidelite) {
        throw new Error('Loyalty record not found');
      }
      
      let discountApplied = false;
      let updateData = {};
      
      // Check if client has free 6kg washes available
      if (fidelite.lavagesGratuits6kgRestants > 0) {
        // Apply discount logic here
        // This would involve creating a special discount record or updating the order
        
        // Update loyalty record
        updateData.lavagesGratuits6kgRestants = fidelite.lavagesGratuits6kgRestants - 1;
        discountApplied = true;
      }
      // Check if client has free 20kg washes available
      else if (fidelite.lavagesGratuits20kgRestants > 0) {
        // Apply discount logic for 20kg
        
        // Update loyalty record
        updateData.lavagesGratuits20kgRestants = fidelite.lavagesGratuits20kgRestants - 1;
        discountApplied = true;
      }
      
      if (discountApplied) {
        // Update loyalty record
        const updatedFidelite = await prisma.fidelite.update({
          where: { clientUserId: Number(clientId) },
          data: updateData
        });
        
        // Here you would also update the order to apply the discount
        
        return {
          order,
          fidelite: updatedFidelite,
          discountApplied
        };
      }
      
      return {
        order,
        fidelite,
        discountApplied: false
      };
    } catch (error) {
      logger.error(`Failed to apply free wash discount for order ${orderId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get client usage statistics for business reporting
   * @param {Date} startDate - Start date for filtering
   * @param {Date} endDate - End date for filtering
   * @returns {Promise<Object>} - Usage statistics
   */
  async getClientUsageStats(startDate, endDate) {
    try {
      // Get all clients
      const clients = await prisma.user.findMany({
        where: { role: 'Client' }
      });
      
      // Get completed orders within date range
      const where = {
        statut: 'Livre'
      };
      
      if (startDate || endDate) {
        where.dateHeureCommande = {};
        
        if (startDate) {
          where.dateHeureCommande.gte = new Date(startDate);
        }
        
        if (endDate) {
          where.dateHeureCommande.lte = new Date(endDate);
        }
      }
      
      const orders = await prisma.commande.findMany({
        where,
        include: {
          clientUser: {
            select: {
              id: true,
              typeClient: true
            }
          }
        }
      });
      
      // Calculate statistics
      const stats = {
        totalClients: clients.length,
        totalOrders: orders.length,
        clientTypeBreakdown: {
          Standard: clients.filter(c => c.typeClient === 'Standard').length,
          Premium: clients.filter(c => c.typeClient === 'Premium').length,
          Etudiant: clients.filter(c => c.typeClient === 'Etudiant').length
        },
        orderTypeBreakdown: {
          Standard: orders.filter(o => o.formuleCommande === 'Standard').length,
          Abonnement: orders.filter(o => o.formuleCommande === 'Abonnement').length,
          AuKilo: orders.filter(o => o.formuleCommande === 'AuKilo').length,
          Premium: orders.filter(o => o.formuleCommande === 'Premium').length,
          Detail: orders.filter(o => o.formuleCommande === 'Detail').length
        }
      };
      
      return stats;
    } catch (error) {
      logger.error('Failed to get client usage statistics:', error);
      throw error;
    }
  }
  /**
   * Rechercher un client par numéro de carte de fidélité
   * @param {string} numeroCarteFidelite - Numéro de carte de fidélité
   * @returns {Promise<Object|null>} - Client avec informations de fidélité
   */
  async getClientByNumeroCarteFidelite(numeroCarteFidelite) {
    try {
      const fidelite = await prisma.fidelite.findUnique({
        where: { numeroCarteFidelite },
        include: {
          clientUser: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              email: true,
              telephone: true,
              typeClient: true,
              estEtudiant: true,
              adresseText: true
            }
          }
        }
      });

      if (!fidelite) {
        return null;
      }

      return {
        client: fidelite.clientUser,
        fidelite: {
          id: fidelite.id,
          numeroCarteFidelite: fidelite.numeroCarteFidelite,
          nombreLavageTotal: fidelite.nombreLavageTotal,
          poidsTotalLaveKg: fidelite.poidsTotalLaveKg,
          lavagesGratuits6kgRestants: fidelite.lavagesGratuits6kgRestants,
          lavagesGratuits20kgRestants: fidelite.lavagesGratuits20kgRestants,
          createdAt: fidelite.createdAt,
          updatedAt: fidelite.updatedAt
        }
      };
    } catch (error) {
      logger.error(`Failed to find client by loyalty card number ${numeroCarteFidelite}:`, error);
      throw error;
    }
  }
}

module.exports = new FideliteService();
