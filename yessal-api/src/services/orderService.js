const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const priceCalculator = require('../utils/priceCalculator');
const config = require('../config/config');

/**
 * Service for order-related operations
 */
class OrderService {
  /**
   * Create a new order
   * @param {Object} orderData - Order data
   * @param {number} gerantId - Manager ID creating the order
   * @returns {Promise<Object>} - Created order and price details
   */
  async createOrder(orderData, gerantId) {
    // Extract order data
    const {
      clientUserId,
      clientInvite,
      siteLavageId,
      estEnLivraison,
      adresseLivraison,
      masseClientIndicativeKg,
      masseVerifieeKg,
      formuleCommande,
      typeReduction,
      options
    } = orderData;
    
    // Transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      let clientInviteId = null;
      
      // Create client invite if needed
      if (!clientUserId && clientInvite) {
        const newClientInvite = await tx.clientInvite.create({
          data: {
            nom: clientInvite.nom,
            telephone: clientInvite.telephone,
            email: clientInvite.email
          }
        });
        clientInviteId = newClientInvite.id;
      }
      
      // Create the order
      const newOrder = await tx.commande.create({
        data: {
          clientUserId,
          clientInviteId,
          siteLavageId,
          gerantCreationUserId: gerantId,
          dateHeureCommande: new Date(),
          dateDernierStatutChange: new Date(),
          statut: 'PrisEnCharge',
          masseClientIndicativeKg,
          masseVerifieeKg,
          estEnLivraison,
          formuleCommande,
          typeReduction,
          // Create options
          options: {
            create: {
              aOptionRepassage: options?.aOptionRepassage || false,
              aOptionSechage: options?.aOptionSechage || false
            }
          },
          // Create initial status history
          historiqueStatuts: {
            create: {
              statut: 'PrisEnCharge',
              dateHeureChangement: new Date()
            }
          }
        },
        include: {
          options: true
        }
      });
      
      // Create delivery address if needed
      if (estEnLivraison && adresseLivraison) {
        await tx.adresseLivraison.create({
          data: {
            commandeId: newOrder.id,
            adresseText: adresseLivraison.adresseText,
            latitude: adresseLivraison.latitude,
            longitude: adresseLivraison.longitude
          }
        });
      }
      
      // If order has verified weight, calculate price and handle premium quota
      let priceDetails = null;
      if (masseVerifieeKg) {
        // Check if client is premium and has remaining quota
        let premiumExceeded = false;
        
        if (clientUserId && formuleCommande === 'Premium') {
          await this._handlePremiumQuota(tx, clientUserId, masseVerifieeKg);
        }
        
        // Get client type for pricing
        let clientType = null;
        if (clientUserId) {
          const client = await tx.user.findUnique({
            where: { id: clientUserId },
            select: { typeClient: true }
          });
          clientType = client?.typeClient;
        }
        
        // Calculate price
        priceDetails = priceCalculator.calculateOrderPrice({
          formuleCommande: premiumExceeded ? 'AuKilo' : formuleCommande,
          masseVerifieeKg: masseVerifieeKg,
          typeReduction,
          typeClient: clientType,
          estEnLivraison,
          options: newOrder.options
        });
      }
      
      return { newOrder, priceDetails };
    });
    
    // Get complete order with all relations
    const completeOrder = await prisma.commande.findUnique({
      where: { id: result.newOrder.id },
      include: {
        clientUser: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true
          }
        },
        clientInvite: true,
        siteLavage: true,
        gerantCreation: {
          select: {
            id: true,
            nom: true,
            prenom: true
          }
        },
        options: true,
        adresseLivraison: true
      }
    });
    
    return {
      order: completeOrder,
      priceDetails: result.priceDetails
    };
  }
  
  /**
   * Handle premium client quota
   * @param {Object} tx - Prisma transaction
   * @param {number} clientUserId - Client user ID
   * @param {number} masseVerifieeKg - Verified weight in kg
   * @returns {Promise<Object>} - Premium subscription with updated stats
   * @private
   */
  async _handlePremiumQuota(tx, clientUserId, masseVerifieeKg) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    
    // Find or create premium subscription for current month
    let premiumSubscription = await tx.abonnementPremiumMensuel.findFirst({
      where: {
        clientUserId,
        annee: currentYear,
        mois: currentMonth
      }
    });
    
    if (!premiumSubscription) {
      premiumSubscription = await tx.abonnementPremiumMensuel.create({
        data: {
          clientUserId,
          annee: currentYear,
          mois: currentMonth,
          limiteKg: config.business.premium.monthlyLimitKg,
          kgUtilises: 0
        }
      });
    }
    
    // Calculate available quota
    const remainingQuota = premiumSubscription.limiteKg - premiumSubscription.kgUtilises;
    const weightToCharge = masseVerifieeKg > remainingQuota ? masseVerifieeKg - remainingQuota : 0;
    
    // Update used quota
    const updatedSubscription = await tx.abonnementPremiumMensuel.update({
      where: { id: premiumSubscription.id },
      data: {
        kgUtilises: premiumSubscription.kgUtilises + Math.min(masseVerifieeKg, remainingQuota)
      }
    });
    
    return {
      subscription: updatedSubscription,
      quotaExceeded: weightToCharge > 0,
      excessWeight: weightToCharge
    };
  }
  
  /**
   * Get orders with filtering and pagination
   * @param {Object} filters - Filter conditions
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {number} clientId - Client ID (for client-specific queries)
   * @returns {Promise<Object>} - Orders, price details, and pagination info
   */
  async getOrders(filters, page, limit, clientId = null) {
    const {
      status,
      clientId: filterClientId,
      siteLavageId,
      gerantId,
      livreurId,
      dateFrom,
      dateTo,
      estEnLivraison
    } = filters;
    
    // Build filter conditions
    const where = {};
    
    if (status) {
      where.statut = status;
    }
    
    // If clientId is provided, restrict to that client
    if (clientId) {
      where.clientUserId = clientId;
    } else if (filterClientId) {
      where.clientUserId = Number(filterClientId);
    }
    
    if (siteLavageId) {
      where.siteLavageId = Number(siteLavageId);
    }
    
    if (gerantId) {
      where.OR = [
        { gerantCreationUserId: Number(gerantId) },
        { gerantReceptionUserId: Number(gerantId) }
      ];
    }
    
    if (livreurId) {
      where.livreurId = Number(livreurId);
    }
    
    if (estEnLivraison !== undefined) {
      where.estEnLivraison = estEnLivraison === 'true';
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      where.dateHeureCommande = {};
      
      if (dateFrom) {
        where.dateHeureCommande.gte = new Date(dateFrom);
      }
      
      if (dateTo) {
        where.dateHeureCommande.lte = new Date(dateTo);
      }
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
              email: true,
              telephone: true,
              typeClient: true
            }
          },
          clientInvite: true,
          siteLavage: {
            select: {
              id: true,
              nom: true,
              adresseText: true,
              ville: true
            }
          },
          gerantCreation: {
            select: {
              id: true,
              nom: true,
              prenom: true
            }
          },
          gerantReception: {
            select: {
              id: true,
              nom: true,
              prenom: true
            }
          },
          livreur: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              telephone: true,
              moyenLivraison: true
            }
          },
          options: true,
          adresseLivraison: true,
          paiements: true,
          historiqueStatuts: {
            orderBy: { dateHeureChangement: 'desc' }
          }
        },
        skip,
        take: limit,
        orderBy: { dateHeureCommande: 'desc' }
      }),
      prisma.commande.count({ where })
    ]);
    
    // Calculate prices for each order
    const ordersWithPrices = orders.map(order => {
      let priceDetails = null;
      
      if (order.masseVerifieeKg) {
        try {
          priceDetails = priceCalculator.calculateOrderPrice({
            formuleCommande: order.formuleCommande,
            masseVerifieeKg: order.masseVerifieeKg,
            typeReduction: order.typeReduction,
            typeClient: order.clientUser?.typeClient,
            estEnLivraison: order.estEnLivraison,
            options: order.options
          });
        } catch (error) {
          logger.error(`Failed to calculate price for order ${order.id}:`, error);
        }
      }
      
      return {
        ...order,
        priceDetails
      };
    });
    
    return {
      orders: ordersWithPrices,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get order by ID
   * @param {number} orderId - Order ID
   * @returns {Promise<Object>} - Order with price details
   */
  async getOrderById(orderId) {
    const order = await prisma.commande.findUnique({
      where: { id: orderId },
      include: {
        clientUser: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
            typeClient: true
          }
        },
        clientInvite: true,
        siteLavage: true,
        gerantCreation: {
          select: {
            id: true,
            nom: true,
            prenom: true
          }
        },
        gerantReception: {
          select: {
            id: true,
            nom: true,
            prenom: true
          }
        },
        livreur: true,
        options: true,
        adresseLivraison: true,
        paiements: true,
        historiqueStatuts: {
          orderBy: { dateHeureChangement: 'desc' }
        }
      }
    });
    
    if (!order) {
      return null;
    }
    
    // Calculate price details
    let priceDetails = null;
    if (order.masseVerifieeKg) {
      try {
        priceDetails = priceCalculator.calculateOrderPrice({
          formuleCommande: order.formuleCommande,
          masseVerifieeKg: order.masseVerifieeKg,
          typeReduction: order.typeReduction,
          typeClient: order.clientUser?.typeClient,
          estEnLivraison: order.estEnLivraison,
          options: order.options
        });
      } catch (error) {
        logger.error(`Failed to calculate price for order ${order.id}:`, error);
      }
    }
    
    return {
      ...order,
      priceDetails
    };
  }
  
  /**
   * Update order
   * @param {number} orderId - Order ID
   * @param {Object} updateData - Data to update
   * @param {number} adminUserId - Admin user ID
   * @returns {Promise<Object>} - Updated order
   */
  async updateOrder(orderId, updateData, adminUserId) {
    const {
      masseVerifieeKg,
      statut,
      livreurId,
      gerantReceptionUserId,
      modePaiement,
      typeReduction,
      options
    } = updateData;
    
    // Check if order exists
    const existingOrder = await prisma.commande.findUnique({
      where: { id: orderId },
      include: {
        options: true,
        clientUser: {
          select: {
            id: true,
            typeClient: true
          }
        }
      }
    });
    
    if (!existingOrder) {
      return null;
    }
    
    // Prepare update data for order
    const orderUpdateData = {};
    
    if (masseVerifieeKg !== undefined) {
      orderUpdateData.masseVerifieeKg = masseVerifieeKg;
    }
    
    if (livreurId !== undefined) {
      orderUpdateData.livreurId = livreurId;
    }
    
    if (gerantReceptionUserId !== undefined) {
      orderUpdateData.gerantReceptionUserId = gerantReceptionUserId;
    }
    
    if (modePaiement !== undefined) {
      orderUpdateData.modePaiement = modePaiement;
    }
    
    if (typeReduction !== undefined) {
      orderUpdateData.typeReduction = typeReduction;
    }
    
    // Update status if provided
    let statusChanged = false;
    if (statut && statut !== existingOrder.statut) {
      orderUpdateData.statut = statut;
      orderUpdateData.dateDernierStatutChange = new Date();
      statusChanged = true;
    }
    
    // Transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // Update order
      const updatedOrder = await tx.commande.update({
        where: { id: orderId },
        data: orderUpdateData,
        include: {
          options: true
        }
      });
      
      // Update options if provided
      if (options) {
        if (existingOrder.options) {
          await tx.commandeOptions.update({
            where: { commandeId: orderId },
            data: {
              aOptionRepassage: options.aOptionRepassage !== undefined 
                ? options.aOptionRepassage 
                : existingOrder.options.aOptionRepassage,
              aOptionSechage: options.aOptionSechage !== undefined 
                ? options.aOptionSechage 
                : existingOrder.options.aOptionSechage
            }
          });
        } else {
          await tx.commandeOptions.create({
            data: {
              commandeId: orderId,
              aOptionRepassage: options.aOptionRepassage || false,
              aOptionSechage: options.aOptionSechage || false
            }
          });
        }
      }
      
      // Add status history if status changed
      if (statusChanged) {
        await tx.historiqueStatutCommande.create({
          data: {
            commandeId: orderId,
            statut,
            dateHeureChangement: new Date()
          }
        });
        
        // Handle specific status changes
        
        // If status is 'Livre' (delivered), update client fidelity
        if (statut === 'Livre' && existingOrder.clientUserId && existingOrder.masseVerifieeKg) {
          await this._updateClientFidelity(tx, existingOrder);
        }
        
        // If livreur assigned and status changed to 'Livraison', send SMS notification (simulated)
        if (statut === 'Livraison' && livreurId && existingOrder.estEnLivraison) {
          logger.info(`SMS notification would be sent to delivery person ${livreurId} for order ${orderId}`);
          // In a real implementation, this would call an SMS service
        }
      }
      
      return updatedOrder;
    });
    
    // Get the updated order with all relations
    const completeOrder = await this.getOrderById(orderId);
    
    return completeOrder;
  }
  
  /**
   * Update client fidelity based on completed order
   * @param {Object} tx - Prisma transaction
   * @param {Object} order - Order being completed
   * @returns {Promise<Object>} - Updated fidelity record
   * @private
   */
  async _updateClientFidelity(tx, order) {
    // Get client fidelity
    const fidelite = await tx.fidelite.findUnique({
      where: { clientUserId: order.clientUserId }
    });
    
    if (!fidelite) {
      logger.warn(`No fidelity record found for client ${order.clientUserId}`);
      return null;
    }
    
    // Calculate new values
    const newTotal = fidelite.nombreLavageTotal + 1;
    const newPoidsTotal = fidelite.poidsTotalLaveKg + order.masseVerifieeKg;
    
    // Update based on formule
    if (order.formuleCommande === 'Standard') {
      // For Standard formula: every 10th wash is free (6kg machine)
      const newGratuits6kg = newTotal % config.business.fidelityStandardFreeWashEvery === 0 
        ? fidelite.lavagesGratuits6kgRestants + 1 
        : fidelite.lavagesGratuits6kgRestants;
      
      return await tx.fidelite.update({
        where: { id: fidelite.id },
        data: {
          nombreLavageTotal: newTotal,
          poidsTotalLaveKg: newPoidsTotal,
          lavagesGratuits6kgRestants: newGratuits6kg
        }
      });
    } else if (order.formuleCommande === 'Detail') {
      // For Detail formula: 6kg free for every 70kg washed
      const kgMilestone = config.business.fidelityDetailedFreeKgEvery;
      const freeAmount = config.business.fidelityDetailedFreeKgAmount;
      
      // Check if milestone reached
      const previousMilestones = Math.floor(fidelite.poidsTotalLaveKg / kgMilestone);
      const newMilestones = Math.floor(newPoidsTotal / kgMilestone);
      const extraMilestones = newMilestones - previousMilestones;
      
      if (extraMilestones > 0) {
        const newGratuits6kg = fidelite.lavagesGratuits6kgRestants + extraMilestones;
        
        return await tx.fidelite.update({
          where: { id: fidelite.id },
          data: {
            nombreLavageTotal: newTotal,
            poidsTotalLaveKg: newPoidsTotal,
            lavagesGratuits6kgRestants: newGratuits6kg
          }
        });
      } else {
        // Just update totals
        return await tx.fidelite.update({
          where: { id: fidelite.id },
          data: {
            nombreLavageTotal: newTotal,
            poidsTotalLaveKg: newPoidsTotal
          }
        });
      }
    } else {
      // For other formulas, just update totals
      return await tx.fidelite.update({
        where: { id: fidelite.id },
        data: {
          nombreLavageTotal: newTotal,
          poidsTotalLaveKg: newPoidsTotal
        }
      });
    }
  }
  
  /**
   * Add payment to order
   * @param {number} orderId - Order ID
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} - Payment details
   */
  async addPayment(orderId, paymentData) {
    const { montant, mode, statut = 'Paye' } = paymentData;
    
    // Check if order exists
    const order = await prisma.commande.findUnique({
      where: { id: orderId },
      include: {
        options: true,
        clientUser: {
          select: {
            id: true,
            typeClient: true
          }
        }
      }
    });
    
    if (!order) {
      return null;
    }
    
    // Calculate total order price
    let totalPrice = 0;
    if (order.masseVerifieeKg) {
      try {
        const priceDetails = priceCalculator.calculateOrderPrice({
          formuleCommande: order.formuleCommande,
          masseVerifieeKg: order.masseVerifieeKg,
          typeReduction: order.typeReduction,
          typeClient: order.clientUser?.typeClient,
          estEnLivraison: order.estEnLivraison,
          options: order.options
        });
        totalPrice = priceDetails.totalPrice;
      } catch (error) {
        logger.error(`Failed to calculate price for order ${order.id}:`, error);
        throw new Error('Failed to calculate order price');
      }
    } else {
      throw new Error('Order has no verified weight');
    }
    
    // Create payment
    const payment = await prisma.paiement.create({
      data: {
        commandeId: orderId,
        montant,
        mode,
        datePaiement: new Date(),
        statut
      }
    });
    
    // Update order mode of payment if not set
    if (!order.modePaiement) {
      await prisma.commande.update({
        where: { id: orderId },
        data: {
          modePaiement: mode
        }
      });
    }
    
    // Get total payments for this order
    const payments = await prisma.paiement.findMany({
      where: {
        commandeId: orderId,
        statut: 'Paye'
      }
    });
    
    const totalPaid = payments.reduce((sum, payment) => sum + payment.montant, 0);
    const remainingAmount = totalPrice - totalPaid;
    
    return {
      payment,
      totalOrderPrice: totalPrice,
      totalPaid,
      remainingAmount
    };
  }
  
  /**
   * Delete order
   * @param {number} orderId - Order ID
   * @param {number} adminUserId - Admin user ID
   * @returns {Promise<boolean>} - Success flag
   */
  async deleteOrder(orderId, adminUserId) {
    try {
      // Check if order exists
      const order = await prisma.commande.findUnique({
        where: { id: orderId }
      });
      
      if (!order) {
        return false;
      }
      
      // Delete order and all related records in a transaction
      await prisma.$transaction([
        // Delete address
        prisma.adresseLivraison.deleteMany({
          where: { commandeId: orderId }
        }),
        // Delete payments
        prisma.paiement.deleteMany({
          where: { commandeId: orderId }
        }),
        // Delete status history
        prisma.historiqueStatutCommande.deleteMany({
          where: { commandeId: orderId }
        }),
        // Delete options
        prisma.commandeOptions.deleteMany({
          where: { commandeId: orderId }
        }),
        // Delete order
        prisma.commande.delete({
          where: { id: orderId }
        })
      ]);
      
      // Log admin action
      await prisma.logAdminAction.create({
        data: {
          adminUserId,
          typeAction: 'DELETE',
          entite: 'Commande',
          entiteId: orderId,
          description: `Order #${orderId} deleted by admin #${adminUserId}`
        }
      });
      
      return true;
    } catch (error) {
      logger.error(`Failed to delete order ${orderId}:`, error);
      return false;
    }
  }
}

module.exports = new OrderService();
