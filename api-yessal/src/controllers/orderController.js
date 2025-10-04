const prisma = require('../utils/prismaClient');
const priceCalculator = require('../utils/priceCalculator');
const config = require('../config/config');
const { enrichClientWithPremiumData } = require('../utils/clientUtils');

/**
 * Enrichit les données client d'une commande avec l'abonnement premium uniforme
 * @param {Object} order - Commande avec clientUser
 * @returns {Object} - Commande avec clientUser enrichi
 */
const enrichOrderWithPremiumData = async (order) => {
  if (!order || !order.clientUser) {
    return order;
  }

  // Transformer les données client pour uniformiser
  const baseClient = {
    id: order.clientUser.id,
    nom: order.clientUser.nom,
    prenom: order.clientUser.prenom,
    email: order.clientUser.email,
    telephone: order.clientUser.telephone,
    typeClient: order.clientUser.typeClient,
    estEtudiant: order.clientUser.estEtudiant
  };

  // Enrichir avec l'abonnement premium uniforme
  const enrichedClient = await enrichClientWithPremiumData(baseClient);

  return {
    ...order,
    clientUser: enrichedClient
  };
};

/**
 * Enrichit une liste de commandes avec les données premium uniformes
 * @param {Array} orders - Liste des commandes
 * @returns {Promise<Array>} - Commandes enrichies
 */
const enrichOrdersWithPremiumData = async (orders) => {
  const enrichedOrders = await Promise.all(
    orders.map(order => enrichOrderWithPremiumData(order))
  );
  
  return enrichedOrders;
};

/**
 * Calculer le prix ajusté selon les paramètres d'ajustement
 */
const calculateAdjustedPrice = (prixBase, ajustementType, ajustementMethode, ajustementValeur) => {
  if (!ajustementType || !ajustementMethode || !ajustementValeur) {
    return prixBase;
  }

  let prixAjuste = prixBase;

  if (ajustementMethode === 'Pourcentage') {
    const pourcentage = ajustementValeur / 100;
    if (ajustementType === 'Augmentation') {
      prixAjuste = prixBase * (1 + pourcentage);
    } else if (ajustementType === 'Diminution') {
      prixAjuste = prixBase * (1 - pourcentage);
    }
  } else if (ajustementMethode === 'Absolu') {
    if (ajustementType === 'Augmentation') {
      prixAjuste = prixBase + ajustementValeur;
    } else if (ajustementType === 'Diminution') {
      prixAjuste = prixBase - ajustementValeur;
    }
  }

  // S'assurer que le prix ne devient pas négatif
  return Math.max(0, prixAjuste);
};

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
      prixCalcule, // Prix calculés côté frontend
      ajustementType,
      ajustementMethode,
      ajustementValeur,
      ajustementRaison
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
      
      // Calculer le prix final avec l'ajustement si fourni
      const prixFinal = calculateAdjustedPrice(
        prixCalcule.prixFinal,
        ajustementType,
        ajustementMethode,
        ajustementValeur
      );

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
          prixTotal: prixCalcule.prixFinal, // Prix de base sans ajustement
          prixPaye: prixFinal, // Prix final avec ajustement
          ajustementType,
          ajustementMethode,
          ajustementValeur,
          ajustementRaison,
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
            estEtudiant: true
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
        adresseLivraison: {
          where: { flag: true }
        },
        repartitionMachines: {
          where: { flag: true }
        }
      }
    });

    // Enrichir avec les données premium uniformes
    const enrichedOrder = await enrichOrderWithPremiumData(completeOrder);
    console.log('Enriched Order:', enrichedOrder);
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order: enrichedOrder,
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
              telephone: true,
              typeClient: true,
              estEtudiant: true
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
          adresseLivraison: {
            where: { flag: true }
          },
          paiements: {
            where: { flag: true }
          },
          repartitionMachines: {
            where: { flag: true }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { dateHeureCommande: 'desc' }
      }),
      prisma.commande.count({ where })
    ]);

    // Enrichir les commandes avec les données premium uniformes
    const enrichedOrders = await enrichOrdersWithPremiumData(orders);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / Number(limit));
    
    // Calculate prices for each order
    const ordersWithPrices = enrichedOrders.map(order => {
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
    where: { 
      id: orderId,
      flag: true // Only get active orders
    },
    include: {
      clientUser: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          typeClient: true,
          estEtudiant: true
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
        adresseLivraison: {
          where: { flag: true }
        },
        paiements: {
          where: { flag: true }
        },
        historiqueStatuts: {
          where: { flag: true },
          orderBy: { dateHeureChangement: 'desc' }
        }
      }
    });

    // Enrichir avec les données premium uniformes
    const enrichedOrder = await enrichOrderWithPremiumData(order);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check permissions - clients can only see their own orders
    if (req.user.role === 'Client' && enrichedOrder.clientUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this order'
      });
    }
    
    // Calculate price details
    let priceDetails = null;
    if (enrichedOrder.masseVerifieeKg) {
      try {
        priceDetails = priceCalculator.calculateOrderPrice({
          formuleCommande: enrichedOrder.formuleCommande,
          masseVerifieeKg: enrichedOrder.masseVerifieeKg,
          typeReduction: enrichedOrder.typeReduction,
          typeClient: enrichedOrder.clientUser?.typeClient,
          estEnLivraison: enrichedOrder.estEnLivraison,
          options: enrichedOrder.options
        });
      } catch (error) {
        console.log(`Failed to calculate price for order ${enrichedOrder.id}:`, error);
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        ...enrichedOrder,
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
      formuleCommande, // NOUVEAU: Ajout de la formule
      options,
      estEnLivraison,
      ajustementType,
      ajustementMethode,
      ajustementValeur,
      ajustementRaison,
      prixCalcule // NOUVEAU: Prix calculés côté frontend
    } = req.body;
    
    // Check if order exists
    const existingOrder = await prisma.commande.findUnique({
      where: { 
        id: orderId,
        flag: true // Only get active orders
      },
      include: {
        options: true,
        clientUser: {
          select: {
            id: true,
            typeClient: true,
            estEtudiant: true
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

    // Check if the current manager is the one who created the order
    if (existingOrder.gerantCreationUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the manager who created this order can modify it'
      });
    }
    
    // Prepare update data for order
    const updateData = {};
    
    // Store old weight for Premium subscription adjustment
    const oldWeight = existingOrder.masseVerifieeKg || existingOrder.masseClientIndicativeKg || 0;
    let newWeight = oldWeight;
    
    if (masseVerifieeKg !== undefined) {
      updateData.masseVerifieeKg = masseVerifieeKg;
      // Mettre à jour aussi le poids indicatif pour garder la cohérence
      updateData.masseClientIndicativeKg = masseVerifieeKg;
      newWeight = masseVerifieeKg;
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
    
    if (formuleCommande !== undefined) {
      updateData.formuleCommande = formuleCommande;
    }
    
    // Extract formule from prixCalcule if not explicitly provided
    if (formuleCommande === undefined && prixCalcule && prixCalcule.formule) {
      updateData.formuleCommande = prixCalcule.formule;
      console.log('🔄 Formule extraite de prixCalcule:', {
        orderId,
        ancienneFormule: existingOrder.formuleCommande,
        nouvelleFormule: prixCalcule.formule
      });
    } else if (formuleCommande !== undefined) {
      console.log('🔄 Formule mise à jour explicitement:', {
        orderId,
        ancienneFormule: existingOrder.formuleCommande,
        nouvelleFormule: formuleCommande
      });
    }
    
    if (estEnLivraison !== undefined) {
      updateData.estEnLivraison = estEnLivraison;
    }
    
    // Update adjustment fields if provided
    if (ajustementType !== undefined) {
      updateData.ajustementType = ajustementType;
    }
    
    if (ajustementMethode !== undefined) {
      updateData.ajustementMethode = ajustementMethode;
    }
    
    if (ajustementValeur !== undefined) {
      updateData.ajustementValeur = ajustementValeur;
    }
    
    if (ajustementRaison !== undefined) {
      updateData.ajustementRaison = ajustementRaison;
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
      
      // Update Premium subscription if weight changed and client is Premium
      if (masseVerifieeKg !== undefined && 
          existingOrder.clientUser && 
          existingOrder.clientUser.typeClient === 'Premium' && 
          oldWeight !== newWeight) {
        
        const weightDifference = newWeight - oldWeight;
        
        console.log('🔄 Ajustement abonnement Premium détecté:', {
          clientId: existingOrder.clientUserId,
          typeClient: existingOrder.clientUser.typeClient,
          orderId: orderId,
          ancienPoids: oldWeight,
          nouveauPoids: newWeight,
          difference: weightDifference
        });
        
        // Find current month's subscription
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        const subscription = await tx.abonnementpremiummensuel.findUnique({
          where: {
            clientUserId_annee_mois: {
              clientUserId: existingOrder.clientUserId,
              annee: currentYear,
              mois: currentMonth
            }
          }
        });
        
        if (subscription) {
          // Calculate new kgUtilises
          const newKgUtilises = Math.max(0, subscription.kgUtilises + weightDifference);
          
          await tx.abonnementpremiummensuel.update({
            where: { id: subscription.id },
            data: {
              kgUtilises: newKgUtilises
            }
          });
          
          console.log('✅ Abonnement Premium mis à jour avec succès:', {
            clientId: existingOrder.clientUserId,
            subscriptionId: subscription.id,
            periode: `${currentMonth}/${currentYear}`,
            ancienKgUtilises: subscription.kgUtilises,
            nouveauKgUtilises: newKgUtilises,
            differenceAppliquee: weightDifference,
            limiteKg: subscription.limiteKg,
            kgRestants: subscription.limiteKg - newKgUtilises
          });
        } else {
          console.log('⚠️  Aucun abonnement Premium trouvé pour la période actuelle:', {
            clientId: existingOrder.clientUserId,
            periode: `${currentMonth}/${currentYear}`
          });
        }
      }
      
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
                : existingOrder.options.aOptionSechage,
              aOptionLivraison: options.aOptionLivraison !== undefined 
                ? options.aOptionLivraison 
                : existingOrder.options.aOptionLivraison,
              aOptionExpress: options.aOptionExpress !== undefined 
                ? options.aOptionExpress 
                : existingOrder.options.aOptionExpress
            }
          });
        } else {
          await tx.commandeoptions.create({
            data: {
              commandeId: orderId,
              aOptionRepassage: options.aOptionRepassage || false,
              aOptionSechage: options.aOptionSechage || false,
              aOptionLivraison: options.aOptionLivraison || false,
              aOptionExpress: options.aOptionExpress || false
            }
          });
        }
      }
      
      // Update machine distribution if provided in prixCalcule
      if (prixCalcule && prixCalcule.repartitionMachines) {
        // First, delete existing machine distribution
        await tx.repartitionmachine.deleteMany({
          where: { commandeId: orderId }
        });
        
        // Create new machine distribution
        const { machine20kg, machine6kg } = prixCalcule.repartitionMachines;
        
        if (machine20kg > 0) {
          await tx.repartitionmachine.create({
            data: {
              commandeId: orderId,
              typeMachine: 'Machine20kg',
              quantite: machine20kg,
              prixUnitaire: 4000 // Prix fixe machine 20kg
            }
          });
        }
        
        if (machine6kg > 0) {
          await tx.repartitionmachine.create({
            data: {
              commandeId: orderId,
              typeMachine: 'Machine6kg',
              quantite: machine6kg,
              prixUnitaire: 2000 // Prix fixe machine 6kg
            }
          });
        }
        
        console.log('✅ Répartition des machines mise à jour:', {
          orderId,
          machine20kg,
          machine6kg
        });
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
      where: { 
        id: orderId,
        flag: true // Only get active orders
      },
      include: {
        clientUser: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
            typeClient: true,
            estEtudiant: true
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
        adresseLivraison: {
          where: { flag: true }
        },
        paiements: {
          where: { flag: true }
        },
        repartitionMachines: {
          where: { flag: true }
        },
        historiqueStatuts: {
          where: { flag: true },
          orderBy: { dateHeureChangement: 'desc' }
        }
      }
    });

    // Enrichir avec les données premium uniformes
    const enrichedOrder = await enrichOrderWithPremiumData(completeOrder);
    
    // Utiliser les prix calculés côté frontend si fournis
    let priceDetails = null;
    let finalOrderData = enrichedOrder;

    if (prixCalcule) {
      // Utiliser UNIQUEMENT les prix envoyés par le frontend - PAS de recalcul côté backend
      priceDetails = prixCalcule;
      const prixTotal = prixCalcule.prixFinal || prixCalcule.prixSousTotal;
      const prixPaye = prixCalcule.prixPaye || prixTotal;
      
      console.log('Utilisation des prix calculés côté frontend:', {
        prixTotal,
        prixPaye,
        priceDetails: prixCalcule
      });

      // Mettre à jour les prix dans la base de données SEULEMENT si différents
      if (prixTotal !== enrichedOrder.prixTotal || prixPaye !== enrichedOrder.prixPaye) {
        await prisma.commande.update({
          where: { id: orderId },
          data: {
            prixTotal: prixTotal,
            prixPaye: prixPaye
          }
        });
        
        // Re-enrichir la commande mise à jour avec les nouveaux prix
        finalOrderData = await enrichOrderWithPremiumData({
          ...enrichedOrder,
          prixTotal: prixTotal,
          prixPaye: prixPaye
        });
      }
    }
    // Note: Si pas de prixCalcule fourni, on garde les prix existants (pas de recalcul automatique)

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: {
        ...finalOrderData,
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
      where: { 
        id: orderId,
        flag: true // Only get active orders
      },
      include: {
        options: true,
        clientUser: {
          select: {
            id: true,
            typeClient: true,
            estEtudiant: true
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
    
    // Apply automatic points pack conversion if client has enough points
    let payment;
    let appliedPointsReduction = 0;
    let pointsConverted = 0;

    if (order.clientUser && order.clientUser.id) {
      const fidelity = await prisma.fidelite.findUnique({ where: { clientUserId: order.clientUser.id } });
      if (fidelity && fidelity.pointsDisponible >= config.business.fidelityPointsPerPack) {
        // Apply exactly one pack per rules
        pointsConverted = config.business.fidelityPointsPerPack;
        appliedPointsReduction = config.business.fidelityDiscountPerPack;

        // Deduct points from fidelity
        await prisma.fidelite.update({
          where: { id: fidelity.id },
          data: { pointsDisponible: fidelity.pointsDisponible - pointsConverted }
        });

        // Compute payment amount after reduction
        const montantAfterReduction = Math.max(0, montant - appliedPointsReduction);

        payment = await prisma.paiement.create({
          data: {
            commandeId: orderId,
            montant: montantAfterReduction,
            mode,
            datePaiement: new Date(),
            statut
          }
        });

        // Update commande to reflect points used and reduction applied and adjust prixPaye
        const newMontantReduction = (order.montantReductionPoints || 0) + appliedPointsReduction;
        const prixTotalStored = order.prixTotal || totalPrice;
        const newPrixPaye = Math.max(0, (order.prixPaye || prixTotalStored) - appliedPointsReduction);

        await prisma.commande.update({
          where: { id: orderId },
          data: {
            pointsUtilises: (order.pointsUtilises || 0) + pointsConverted,
            montantReductionPoints: newMontantReduction,
            prixPaye: newPrixPaye
          }
        });
      }
    }

    // If no automatic points applied, create normal payment
    if (!payment) {
      payment = await prisma.paiement.create({
        data: {
          commandeId: orderId,
          montant,
          mode,
          datePaiement: new Date(),
          statut
        }
      });
    }
    
    // Update order mode of payment if not set
    if (!order.modePaiement) {
      await prisma.commande.update({
        where: { id: orderId },
        data: {
          modePaiement: mode
        }
      });
    }
    
    // Get total payments for this order (only money payments)
    const payments = await prisma.paiement.findMany({
      where: {
        commandeId: orderId,
        statut: 'Paye',
        flag: true // Only get active payments
      }
    });

    const totalPaid = payments.reduce((sum, payment) => sum + payment.montant, 0);
    const remainingAmount = (order.prixTotal || totalPrice) - totalPaid - (order.montantReductionPoints || 0);

    // Update commande.prixPaye to the total money actually paid (exclude reductions applied via points)
    await prisma.commande.update({
      where: { id: orderId },
      data: {
        prixPaye: totalPaid
      }
    });

    res.status(201).json({
      success: true,
      message: 'Payment added successfully',
      data: {
        payment,
        totalOrderPrice: order.prixTotal || totalPrice,
        totalPaid,
        remainingAmount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivate an order (for managers only)
 */
const deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orderId = Number(id);
    
    // Only managers can deactivate orders
    if (req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can deactivate orders'
      });
    }
    
    // Check if order exists
    const order = await prisma.commande.findUnique({
      where: { 
        id: orderId,
        flag: true // Only get active orders
      }
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if the current manager is the one who created the order
    if (order.gerantCreationUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the manager who created this order can deactivate it'
      });
    }
    
    // Check if order can be deactivated (24h limit)
    const orderDate = new Date(order.dateHeureCommande);
    const now = new Date();
    const timeDiff = now.getTime() - orderDate.getTime();
    const hoursDiff = timeDiff / (1000 * 3600); // Convert to hours
    
    if (hoursDiff >= 24) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate order: orders can only be deactivated within 24 hours of creation',
        error: `Order was created ${Math.floor(hoursDiff)} hours ago`
      });
    }
    
    // Deactivate order and all related records by setting flag to false
    try {
      await prisma.$transaction([
        // Deactivate machine repartition
        prisma.repartitionmachine.updateMany({
          where: { commandeId: orderId },
          data: { flag: false }
        }),
        // Deactivate address
        prisma.adresselivraison.updateMany({
          where: { commandeId: orderId },
          data: { flag: false }
        }),
        // Deactivate payments
        prisma.paiement.updateMany({
          where: { commandeId: orderId },
          data: { flag: false }
        }),
        // Deactivate status history
        prisma.historiquestatutcommande.updateMany({
          where: { commandeId: orderId },
          data: { flag: false }
        }),
        // Deactivate order (commande model has flag but commandeoptions doesn't have flag field)
        prisma.commande.update({
          where: { id: orderId },
          data: { flag: false }
        })
      ]);
    } catch (transactionError) {
      console.error('Error during order deactivation transaction:', transactionError);
      return res.status(400).json({
        success: false,
        message: 'Failed to deactivate order due to database constraints',
        error: transactionError.message
      });
    }
    
    // Log admin action
    await prisma.logadminaction.create({
      data: {
        adminUserId: req.user.id,
        typeAction: 'DELETE',
        entite: 'Commande',
        entiteId: orderId,
        description: `Order #${orderId} deactivated by ${req.user.nom} ${req.user.prenom}`
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Order deactivated successfully'
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
      clientUserId: clientId,
      flag: true // Only show active orders
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
              email: true,
              telephone: true,
              typeClient: true,
              estEtudiant: true
            }
          },
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
          adresseLivraison: {
            where: { flag: true }
          },
          historiqueStatuts: {
            where: { flag: true },
            orderBy: { dateHeureChangement: 'desc' }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { dateHeureCommande: 'desc' }
      }),
      prisma.commande.count({ where })
    ]);

    // Enrichir les commandes avec les données premium uniformes
    const enrichedOrders = await enrichOrdersWithPremiumData(orders);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / Number(limit));
    
    // Calculate prices for each order
    const ordersWithPrices = enrichedOrders.map(order => {
      let priceDetails = null;
      
      if (order.masseVerifieeKg) {
        try {
          priceDetails = priceCalculator.calculateOrderPrice({
            formuleCommande: order.formuleCommande,
            masseVerifieeKg: order.masseVerifieeKg,
            typeReduction: order.typeReduction,
            typeClient: order.clientUser?.typeClient || req.user.typeClient,
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

