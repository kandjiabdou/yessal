const prisma = require('../utils/prismaClient');
const config = require('../config/config');

/**
 * Service for order-related operations
 */
class OrderService {
  /**
   * Create a new order
   * @param {Object} orderData - Order data with pre-calculated prices
   * @param {number} gerantId - Manager ID creating the order
   * @returns {Promise<Object>} - Created order
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
      options,
      prixCalcule // Prix calculés côté frontend
    } = orderData;
    
    // Validation basique de cohérence des prix
    this._validatePriceConsistency(prixCalcule, masseClientIndicativeKg);
    
    // Transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      let clientInviteId = null;
      
      // Create client invite if needed
      if (!clientUserId && clientInvite) {
        const newClientInvite = await tx.clientinvite.create({
          data: {
            nom: clientInvite.nom,
            telephone: clientInvite.telephone,
            email: clientInvite.email
          }
        });
        clientInviteId = newClientInvite.id;
      }
      
      // For premium clients, update monthly usage
      if (clientUserId && prixCalcule.formule === 'Premium') {
        await this._updatePremiumMonthlyUsage(tx, clientUserId, masseClientIndicativeKg);
      }
      
      // Create the order with calculated price
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
          modePaiement: orderData.modePaiement,
          prixTotal: prixCalcule.prixFinal, // Prix calculé côté frontend
          // Create options
          options: {
            create: {
              aOptionRepassage: options?.aOptionRepassage || false,
              aOptionSechage: options?.aOptionSechage || false,
              aOptionLivraison: options?.aOptionLivraison || false,
              aOptionExpress: options?.aOptionExpress || false
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
        await tx.adresselivraison.create({
          data: {
            commandeId: newOrder.id,
            adresseText: adresseLivraison.adresseText,
            latitude: adresseLivraison.latitude,
            longitude: adresseLivraison.longitude
          }
        });
      }
      
      // Update fidelity points if order has a client and is active (flag=true by default)
      if (clientUserId && newOrder.flag !== false) {
        await this._addFidelityPoints(tx, newOrder);
      }
      
      return newOrder;
    });
    
    // Get complete order with all relations
    const completeOrder = await prisma.commande.findUnique({
      where: { id: result.id },
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
        options: true,
        adresseLivraison: true
      }
    });
    
    return {
      order: completeOrder,
      priceDetails: prixCalcule // Retourner les prix calculés côté frontend
    };
  }
  
  /**
   * Validate price consistency (basic checks)
   * @param {Object} prixCalcule - Calculated prices from frontend
   * @param {number} poids - Weight in kg
   * @private
   */
  _validatePriceConsistency(prixCalcule, poids) {
    const { prixBase, prixOptions, prixSousTotal, prixFinal } = prixCalcule;
    
    // Check basic arithmetic consistency
    if (Math.abs((prixBase + prixOptions) - prixSousTotal) > 1) {
      throw new Error('Prix incohérent: base + options ≠ sous-total');
    }
    
    // Check reasonable price ranges (security check)
    const minPrixParKg = 200; // Prix minimum raisonnable par kg
    const maxPrixParKg = 1000; // Prix maximum raisonnable par kg
    
    if (prixFinal < (poids * minPrixParKg) || prixFinal > (poids * maxPrixParKg)) {
      throw new Error(`Prix suspect: ${prixFinal} FCFA pour ${poids} kg`);
    }
    
    // For premium clients with no charge, final price should be very low
    if (prixCalcule.formule === 'Premium' && prixCalcule.premiumDetails?.estCouvertParAbonnement && prixFinal > 2000) {
      throw new Error('Prix premium incohérent: commande couverte mais prix élevé');
    }
  }
  
  /**
   * Update premium client monthly usage
   * @param {Object} tx - Prisma transaction
   * @param {number} clientUserId - Client user ID
   * @param {number} poids - Weight to add
   * @private
   */
  async _updatePremiumMonthlyUsage(tx, clientUserId, poids) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    
    // Find or create premium subscription for current month
    const abonnement = await tx.abonnementpremiummensuel.findFirst({
      where: {
        clientUserId,
        annee: currentYear,
        mois: currentMonth
      }
    });
    
    if (abonnement) {
      // Update existing subscription
      await tx.abonnementpremiummensuel.update({
        where: { id: abonnement.id },
        data: {
          kgUtilises: abonnement.kgUtilises + poids
        }
      });
    } else {
      // Create new monthly subscription
      // Determine montant with potential student discount
      const user = await tx.user.findUnique({ where: { id: clientUserId }, select: { estEtudiant: true } });
      const baseMontant = 15000;
      const montant = user && user.estEtudiant ? Math.round(baseMontant * 0.9) : baseMontant;

      await tx.abonnementpremiummensuel.create({
        data: {
          clientUserId,
          annee: currentYear,
          mois: currentMonth,
          limiteKg: 40, // Quota premium standard
          kgUtilises: poids,
          montant
        }
      });
    }
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
      // Prix déjà calculé et stocké lors de la création
      const priceDetails = {
        totalPrice: order.prixTotal || 0,
        formuleCommande: order.formuleCommande,
        typeReduction: order.typeReduction
      };
      
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
    if (order.prixTotal) {
      // Prix déjà calculé et stocké
      priceDetails = {
        totalPrice: order.prixTotal,
        formuleCommande: order.formuleCommande,
        typeReduction: order.typeReduction
      };
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
      options,
      flag
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
    
    // Handle flag change (order cancellation/restoration)
    let flagChanged = false;
    if (flag !== undefined && flag !== existingOrder.flag) {
      orderUpdateData.flag = flag;
      flagChanged = true;
    }
    
    // Update status if provided
    let statusChanged = false;
    let previousStatus = existingOrder.statut;
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
          await tx.commandeoptions.update({
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
          await tx.commandeoptions.create({
            data: {
              commandeId: orderId,
              aOptionRepassage: options.aOptionRepassage || false,
              aOptionSechage: options.aOptionSechage || false
            }
          });
        }
      }
      
      // Handle flag change (cancellation/restoration)
      if (flagChanged && existingOrder.clientUserId) {
        if (flag === false && existingOrder.flag === true) {
          // Annulation: retirer les points de fidélité
          await this._removeFidelityPoints(tx, existingOrder);
        } else if (flag === true && existingOrder.flag === false) {
          // Restauration: ré-ajouter les points
          await this._addFidelityPoints(tx, existingOrder);
        }
      }
      
      // Add status history if status changed
      if (statusChanged) {
        await tx.historiquestatutcommande.create({
          data: {
            commandeId: orderId,
            statut,
            dateHeureChangement: new Date()
          }
        });
        
        // If livreur assigned and status changed to 'Livraison', send SMS notification (simulated)
        if (statut === 'Livraison' && livreurId && existingOrder.estEnLivraison) {
          console.log(`SMS notification would be sent to delivery person ${livreurId} for order ${orderId}`);
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
   * Add fidelity points for a completed order
   * @param {Object} tx - Prisma transaction
   * @param {Object} order - Order being completed
   * @returns {Promise<Object>} - Updated fidelity record
   * @private
   */
  async _addFidelityPoints(tx, order) {
    // Get client fidelity
    const fidelite = await tx.fidelite.findUnique({
      where: { clientUserId: order.clientUserId }
    });
    
    if (!fidelite) {
      console.log(`No fidelity record found for client ${order.clientUserId}`);
      return null;
    }

    // Incrémentation basée sur les règles de fidélité
    const poids = order.masseVerifieeKg || order.masseClientIndicativeKg || 0;
    const montantPaye = order.prixPaye || order.prixTotal || 0;

    // Points calculation: 1 point = 500 FCFA
    const pointsExacts = montantPaye / (config.business.fidelityCurrencyPerPoint || 500);
    const pointsEntiers = Math.floor(pointsExacts);
    const fraction = pointsExacts - pointsEntiers;

    // Mise à jour incrémentale
    const updatedPointsDisponible = (fidelite.pointsDisponible || 0) + pointsEntiers;
    const updatedFraction = (fidelite.pointsFraction || 0) + fraction;

    // Convertir les fractions accumulées en points entiers
    const extraFromFraction = Math.floor(updatedFraction);
    const finalFraction = updatedFraction - extraFromFraction;
    const finalPointsDisponible = updatedPointsDisponible + extraFromFraction;

    const updatePayload = {
      nombreLavageTotal: fidelite.nombreLavageTotal + 1,
      poidsTotalLaveKg: fidelite.poidsTotalLaveKg + poids,
      prixTotalPaye: fidelite.prixTotalPaye + montantPaye,
      pointsDisponible: finalPointsDisponible,
      pointsFraction: finalFraction
    };

    // Logique lavages gratuits (backward compatibility)
    if (order.formuleCommande === 'BaseMachine') {
      const newTotal = fidelite.nombreLavageTotal + 1;
      const newGratuits6kg = newTotal % (config.business.fidelityStandardFreeWashEvery || 10) === 0 
        ? fidelite.lavagesGratuits6kgRestants + 1 
        : fidelite.lavagesGratuits6kgRestants;
      updatePayload.lavagesGratuits6kgRestants = newGratuits6kg;
    } else if (order.formuleCommande === 'Detail') {
      const kgMilestone = config.business.fidelityDetailedFreeKgEvery || 100;
      const previousMilestones = Math.floor(fidelite.poidsTotalLaveKg / kgMilestone);
      const newPoidsTotal = fidelite.poidsTotalLaveKg + poids;
      const newMilestones = Math.floor(newPoidsTotal / kgMilestone);
      const extraMilestones = newMilestones - previousMilestones;
      if (extraMilestones > 0) {
        updatePayload.lavagesGratuits6kgRestants = fidelite.lavagesGratuits6kgRestants + extraMilestones;
      }
    }

    return await tx.fidelite.update({
      where: { id: fidelite.id },
      data: updatePayload
    });
  }

  /**
   * Remove fidelity points when canceling an order
   * @param {Object} tx - Prisma transaction
   * @param {Object} order - Order being canceled
   * @returns {Promise<Object>} - Updated fidelity record
   * @private
   */
  async _removeFidelityPoints(tx, order) {
    // Get client fidelity
    const fidelite = await tx.fidelite.findUnique({
      where: { clientUserId: order.clientUserId }
    });
    
    if (!fidelite) {
      console.log(`No fidelity record found for client ${order.clientUserId}`);
      return null;
    }

    // Décrémentation basée sur les règles de fidélité
    const poids = order.masseVerifieeKg || order.masseClientIndicativeKg || 0;
    const montantPaye = order.prixPaye || order.prixTotal || 0;

    // Points calculation: retirer les points qui avaient été ajoutés
    const pointsExacts = montantPaye / (config.business.fidelityCurrencyPerPoint || 500);
    const pointsEntiers = Math.floor(pointsExacts);
    const fraction = pointsExacts - pointsEntiers;

    // Mise à jour décrémentale
    let updatedPointsDisponible = (fidelite.pointsDisponible || 0) - pointsEntiers;
    let updatedFraction = (fidelite.pointsFraction || 0) - fraction;

    // Gérer les fractions négatives
    if (updatedFraction < 0) {
      updatedPointsDisponible -= 1;
      updatedFraction += 1;
    }

    // S'assurer que les points ne deviennent pas négatifs
    updatedPointsDisponible = Math.max(0, updatedPointsDisponible);
    updatedFraction = Math.max(0, updatedFraction);

    const updatePayload = {
      nombreLavageTotal: Math.max(0, fidelite.nombreLavageTotal - 1),
      poidsTotalLaveKg: Math.max(0, fidelite.poidsTotalLaveKg - poids),
      prixTotalPaye: Math.max(0, fidelite.prixTotalPaye - montantPaye),
      pointsDisponible: updatedPointsDisponible,
      pointsFraction: updatedFraction
    };

    return await tx.fidelite.update({
      where: { id: fidelite.id },
      data: updatePayload
    });
  }
  
  /**
   * Add payment to order
   * @param {number} orderId - Order ID
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} - Payment details
   */
  async addPayment(orderId, paymentData) {
    const { montant, mode, statut = 'Paye' } = paymentData;
    
    // Check if order exists and get stored price
    const order = await prisma.commande.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        prixTotal: true,
        modePaiement: true
      }
    });
    
    if (!order) {
      return null;
    }
    
    // Use stored price (calculated by frontend)
    const totalPrice = order.prixTotal;
    
    if (!totalPrice || totalPrice <= 0) {
      throw new Error('Commande sans prix total - impossible d\'ajouter un paiement');
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
        where: { id: orderId },
        include: {
          clientUser: {
            select: { id: true }
          }
        }
      });
      
      if (!order) {
        return false;
      }
      
      // Delete order and all related records in a transaction
      await prisma.$transaction(async (tx) => {
        // Remove fidelity points if order has a client and is not already canceled
        if (order.clientUserId && order.flag) {
          await this._removeFidelityPoints(tx, order);
        }

        // Delete address
        await tx.adresselivraison.deleteMany({
          where: { commandeId: orderId }
        });
        
        // Delete payments
        await tx.paiement.deleteMany({
          where: { commandeId: orderId }
        });
        
        // Delete status history
        await tx.historiquestatutcommande.deleteMany({
          where: { commandeId: orderId }
        });
        
        // Delete options
        await tx.commandeoptions.deleteMany({
          where: { commandeId: orderId }
        });
        
        // Delete repartition machines
        await tx.repartitionmachine.deleteMany({
          where: { commandeId: orderId }
        });
        
        // Delete order
        await tx.commande.delete({
          where: { id: orderId }
        });
      });
      
      // Log admin action
      await prisma.logadminaction.create({
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
      console.log(`Failed to delete order ${orderId}:`, error);
      return false;
    }
  }
}

module.exports = new OrderService();
