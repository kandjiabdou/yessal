const prisma = require('../utils/prismaClient');
const priceCalculator = require('../utils/priceCalculator');
const config = require('../config/config');

/**
 * Create a new order
 */
const createOrder = async (req, res, next) => {
  try {
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
      modePaiement,
      options,
      prixCalcule // Prix calculés côté frontend
    } = req.body;
    
    // Transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      let clientInviteId = null;
      
      // Create client invite if needed
      if (!clientUserId && clientInvite) {
        const newClientInvite = await tx.clientinvite.create({
          data: {
            nom: clientInvite.nom,
            prenom: clientInvite.prenom,
            telephone: clientInvite.telephone,
            email: clientInvite.email,
            adresseText: clientInvite.adresseText
          }
        });
        clientInviteId = newClientInvite.id;
      }
      
      // Create the order with calculated price from frontend
      const newOrder = await tx.commande.create({
        data: {
          clientUserId,
          clientInviteId,
          siteLavageId,
          gerantCreationUserId: req.user.id,
          dateHeureCommande: new Date(),
          dateDernierStatutChange: new Date(),
          statut: 'PrisEnCharge',
          masseClientIndicativeKg,
          masseVerifieeKg,
          estEnLivraison,
          formuleCommande,
          typeReduction,
          modePaiement,
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
      
      // Store machine repartition if available (formule de base)
      if (prixCalcule.repartitionMachines) {
        const { machine20kg, machine6kg } = prixCalcule.repartitionMachines;
        
        if (machine20kg > 0) {
          await tx.repartitionmachine.create({
            data: {
              commandeId: newOrder.id,
              typeMachine: 'Machine20kg',
              quantite: machine20kg,
              prixUnitaire: 4000 // Prix fixe machine 20kg
            }
          });
        }
        
        if (machine6kg > 0) {
          await tx.repartitionmachine.create({
            data: {
              commandeId: newOrder.id,
              typeMachine: 'Machine6kg',
              quantite: machine6kg,
              prixUnitaire: 2000 // Prix fixe machine 6kg
            }
          });
        }
      }
      
      // Incrémenter kgUtilises pour les clients Premium
      if (clientUserId && prixCalcule.premiumDetails) {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        // Récupérer l'abonnement premium du mois actuel
        const abonnementPremium = await tx.abonnementpremiummensuel.findFirst({
          where: { 
            clientUserId,
            annee: currentYear,
            mois: currentMonth
          }
        });
        
        if (abonnementPremium) {
          await tx.abonnementpremiummensuel.update({
            where: { id: abonnementPremium.id },
            data: {
              kgUtilises: {
                increment: masseClientIndicativeKg
              }
            }
          });
        }
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
            typeClient: true,
            abonnementsPremium: {
              where: {
                annee: new Date().getFullYear(),
                mois: new Date().getMonth() + 1
              },
              select: {
                id: true,
                annee: true,
                mois: true,
                limiteKg: true,
                kgUtilises: true
              },
              take: 1
            }
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
        adresseLivraison: true,
        repartitionMachines: true
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order: completeOrder,
        priceDetails: prixCalcule // Retourner les prix calculés côté frontend
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all orders with filtering options
 */
const getOrders = async (req, res, next) => {
  try {
    const {
      status,
      clientId,
      siteLavageId,
      gerantId,
      livreurId,
      dateFrom,
      dateTo,
      estEnLivraison,
      search,
      page = 1,
      limit = 10
    } = req.query;
    
    // Build filter conditions
    const where = {};
    
    if (status) {
      where.statut = status;
    }
    
    if (clientId) {
      where.clientUserId = Number(clientId);
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
    
    // Restrict client to only see their own orders
    if (req.user.role === 'Client') {
      where.clientUserId = req.user.id;
    }
    
    // Restrict manager to only see orders from their assigned site
    if (req.user.role === 'Manager' && req.user.siteLavagePrincipalGerantId) {
      where.siteLavageId = req.user.siteLavagePrincipalGerantId;
    }
    
    // Search filter
    if (search) {
      const searchTerm = search.trim();
      const searchConditions = [];
      
      // Search by order ID (if numeric)
      if (!isNaN(searchTerm)) {
        searchConditions.push({
          id: Number(searchTerm)
        });
      }
      
      // Search in clientUser name/prenom
      searchConditions.push({
        clientUser: {
          OR: [
            {
              nom: {
                contains: searchTerm
              }
            },
            {
              prenom: {
                contains: searchTerm
              }
            }
          ]
        }
      });
      
      // Search in clientInvite nom/prenom
      searchConditions.push({
        clientInvite: {
          OR: [
            {
              nom: {
                contains: searchTerm
              }
            },
            {
              prenom: {
                contains: searchTerm
              }
            }
          ]
        }
      });
      
      // Combine with existing where conditions using AND
      if (Object.keys(where).length > 0) {
        where.AND = [
          { ...where },
          { OR: searchConditions }
        ];
        // Remove individual where conditions as they're now in AND
        Object.keys(where).forEach(key => {
          if (key !== 'AND') {
            delete where[key];
          }
        });
      } else {
        where.OR = searchConditions;
      }
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
              email: true,
              telephone: true
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
          paiements: true
        },
        skip,
        take: Number(limit),
        orderBy: { dateHeureCommande: 'desc' }
      }),
      prisma.commande.count({ where })
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / Number(limit));
    
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
          console.log(`Failed to calculate price for order ${order.id}:`, error);
        }
      }
      
      return {
        ...order,
        priceDetails
      };
    });
    
    res.status(200).json({
      success: true,
      data: ordersWithPrices,
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
 * Get a single order by ID
 */
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orderId = Number(id);
    
    // Get the order
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
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check permissions - clients can only see their own orders
    if (req.user.role === 'Client' && order.clientUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this order'
      });
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
        console.log(`Failed to calculate price for order ${order.id}:`, error);
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        ...order,
        priceDetails
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an order
 */
const updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orderId = Number(id);
    
    // Only managers can update orders
    if (req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can update orders'
      });
    }
    
    const {
      masseVerifieeKg,
      statut,
      livreurId,
      gerantReceptionUserId,
      modePaiement,
      typeReduction,
      options
    } = req.body;
    
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
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Prepare update data for order
    const updateData = {};
    
    if (masseVerifieeKg !== undefined) {
      updateData.masseVerifieeKg = masseVerifieeKg;
    }
    
    if (livreurId !== undefined) {
      updateData.livreurId = livreurId;
    }
    
    if (gerantReceptionUserId !== undefined) {
      updateData.gerantReceptionUserId = gerantReceptionUserId;
    }
    
    if (modePaiement !== undefined) {
      updateData.modePaiement = modePaiement;
    }
    
    if (typeReduction !== undefined) {
      updateData.typeReduction = typeReduction;
    }
    
    // Update status if provided
    let statusChanged = false;
    if (statut && statut !== existingOrder.statut) {
      updateData.statut = statut;
      updateData.dateDernierStatutChange = new Date();
      statusChanged = true;
    }
    
    // Transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // Update order
      const updatedOrder = await tx.commande.update({
        where: { id: orderId },
        data: updateData,
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
      
      // Add status history if status changed
      if (statusChanged) {
        await tx.historiquestatutcommande.create({
          data: {
            commandeId: orderId,
            statut,
            dateHeureChangement: new Date()
          }
        });
        
        // Handle specific status changes
        
        // If status is 'Livre' (delivered), update client fidelity
        if (statut === 'Livre' && existingOrder.clientUserId && existingOrder.masseVerifieeKg) {
          // Get client fidelity
          const fidelite = await tx.fidelite.findUnique({
            where: { clientUserId: existingOrder.clientUserId }
          });
          
          if (fidelite) {
            // Calculate new values
            const newTotal = fidelite.nombreLavageTotal + 1;
            const newPoidsTotal = fidelite.poidsTotalLaveKg + existingOrder.masseVerifieeKg;
            
            // Update based on formule
            if (existingOrder.formuleCommande === 'Standard') {
              // For Standard formula: every 10th wash is free (6kg machine)
              const newGratuits6kg = newTotal % config.business.fidelityStandardFreeWashEvery === 0 
                ? fidelite.lavagesGratuits6kgRestants + 1 
                : fidelite.lavagesGratuits6kgRestants;
              
              await tx.fidelite.update({
                where: { id: fidelite.id },
                data: {
                  nombreLavageTotal: newTotal,
                  poidsTotalLaveKg: newPoidsTotal,
                  lavagesGratuits6kgRestants: newGratuits6kg
                }
              });
            } else if (existingOrder.formuleCommande === 'Detail') {
              // For Detail formula: 6kg free for every 70kg washed
              const kgMilestone = config.business.fidelityDetailedFreeKgEvery;
              const freeAmount = config.business.fidelityDetailedFreeKgAmount;
              
              // Check if milestone reached
              const previousMilestones = Math.floor(fidelite.poidsTotalLaveKg / kgMilestone);
              const newMilestones = Math.floor(newPoidsTotal / kgMilestone);
              const extraMilestones = newMilestones - previousMilestones;
              
              if (extraMilestones > 0) {
                const newGratuits6kg = fidelite.lavagesGratuits6kgRestants + extraMilestones;
                
                await tx.fidelite.update({
                  where: { id: fidelite.id },
                  data: {
                    nombreLavageTotal: newTotal,
                    poidsTotalLaveKg: newPoidsTotal,
                    lavagesGratuits6kgRestants: newGratuits6kg
                  }
                });
              } else {
                // Just update totals
                await tx.fidelite.update({
                  where: { id: fidelite.id },
                  data: {
                    nombreLavageTotal: newTotal,
                    poidsTotalLaveKg: newPoidsTotal
                  }
                });
              }
            } else {
              // For other formulas, just update totals
              await tx.fidelite.update({
                where: { id: fidelite.id },
                data: {
                  nombreLavageTotal: newTotal,
                  poidsTotalLaveKg: newPoidsTotal
                }
              });
            }
          }
        }
        
        // If livreur assigned and status changed to 'Livraison', send SMS notification (simulated)
        if (statut === 'Livraison' && livreurId && existingOrder.estEnLivraison) {
          console.log('SMS notification would be sent to delivery person here');
          // In a real implementation, this would call an SMS service
        }
      }
      
      return updatedOrder;
    });
    
    // Get the updated order with all relations
    const completeOrder = await prisma.commande.findUnique({
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
    
    // Calculate price details
    let priceDetails = null;
    if (completeOrder.masseVerifieeKg) {
      try {
        priceDetails = priceCalculator.calculateOrderPrice({
          formuleCommande: completeOrder.formuleCommande,
          masseVerifieeKg: completeOrder.masseVerifieeKg,
          typeReduction: completeOrder.typeReduction,
          typeClient: completeOrder.clientUser?.typeClient,
          estEnLivraison: completeOrder.estEnLivraison,
          options: completeOrder.options
        });
      } catch (error) {
        console.log(`Failed to calculate price for order ${completeOrder.id}:`, error);
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: {
        ...completeOrder,
        priceDetails
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add payment to an order
 */
const addPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orderId = Number(id);
    
    // Only managers can add payments
    if (req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can add payments'
      });
    }
    
    const { montant, mode, statut = 'Paye' } = req.body;
    
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
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
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
        console.log(`Failed to calculate price for order ${order.id}:`, error);
        return res.status(400).json({
          success: false,
          message: 'Failed to calculate order price'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Order has no verified weight'
      });
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
    
    res.status(201).json({
      success: true,
      message: 'Payment added successfully',
      data: {
        payment,
        totalOrderPrice: totalPrice,
        totalPaid,
        remainingAmount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an order (for managers only)
 */
const deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orderId = Number(id);
    
    // Only managers can delete orders
    if (req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can delete orders'
      });
    }
    
    // Check if order exists
    const order = await prisma.commande.findUnique({
      where: { id: orderId }
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Delete order and all related records in a transaction
    await prisma.$transaction([
      // Delete address
      prisma.adresselivraison.deleteMany({
        where: { commandeId: orderId }
      }),
      // Delete payments
      prisma.paiement.deleteMany({
        where: { commandeId: orderId }
      }),
      // Delete status history
      prisma.historiquestatutcommande.deleteMany({
        where: { commandeId: orderId }
      }),
      // Delete options
      prisma.commandeoptions.deleteMany({
        where: { commandeId: orderId }
      }),
      // Delete order
      prisma.commande.delete({
        where: { id: orderId }
      })
    ]);
    
    // Log admin action
    await prisma.logadminaction.create({
      data: {
        adminUserId: req.user.id,
        typeAction: 'DELETE',
        entite: 'Commande',
        entiteId: orderId,
        description: `Order #${orderId} deleted by ${req.user.nom} ${req.user.prenom}`
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get orders for current client
 */
const getMyOrders = async (req, res, next) => {
  try {
    const clientId = req.user.id;
    
    // Check if user is a client
    if (req.user.role !== 'Client') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can access their orders'
      });
    }
    
    const {
      status,
      page = 1,
      limit = 10
    } = req.query;
    
    // Build filter conditions
    const where = {
      clientUserId: clientId
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
          siteLavage: {
            select: {
              id: true,
              nom: true,
              adresseText: true,
              ville: true
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
          historiqueStatuts: {
            orderBy: { dateHeureChangement: 'desc' }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { dateHeureCommande: 'desc' }
      }),
      prisma.commande.count({ where })
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / Number(limit));
    
    // Calculate prices for each order
    const ordersWithPrices = orders.map(order => {
      let priceDetails = null;
      
      if (order.masseVerifieeKg) {
        try {
          priceDetails = priceCalculator.calculateOrderPrice({
            formuleCommande: order.formuleCommande,
            masseVerifieeKg: order.masseVerifieeKg,
            typeReduction: order.typeReduction,
            typeClient: req.user.typeClient,
            estEnLivraison: order.estEnLivraison,
            options: order.options
          });
        } catch (error) {
          console.log(`Failed to calculate price for order ${order.id}:`, error);
        }
      }
      
      return {
        ...order,
        priceDetails
      };
    });
    
    res.status(200).json({
      success: true,
      data: ordersWithPrices,
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
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  addPayment,
  deleteOrder,
  getMyOrders
};

