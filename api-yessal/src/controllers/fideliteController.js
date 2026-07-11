const prisma = require('../utils/prismaClient');
const config = require('../config/config');
const { getClientByNumeroCarteFidelite: getClientByNumeroCarteFideliteService, FIDELITY_CONSTANTS } = require("../services/fidelityService");

const { validerFormatNumeroCarte } = require('../utils/fideliteUtils');

/**
 * Get loyalty information for a client
 */
const getClientFidelite = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    
    // Check if user exists and is a client
    const user = await prisma.user.findUnique({
      where: { 
        id: Number(clientId),
        role: 'CLIENT'
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    
    // Clients can only see their own loyalty info
    if (req.user.role === 'CLIENT' && req.user.id !== Number(clientId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this information'
      });
    }
    
    // Get loyalty information
    const fidelite = await prisma.fidelite.findUnique({
      where: { clientUserId: Number(clientId) }
    });
    
    if (!fidelite) {
      return res.status(404).json({
        success: false,
        message: 'Loyalty information not found'
      });
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
        pointsDisponible: fidelite.pointsDisponible || 0,
        pointsFraction: fidelite.pointsFraction || 0,
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
    
    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get client's loyalty history (for managers)
 */
const getClientFideliteHistory = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    
    // Only managers can view detailed loyalty history
    if (req.user.role !== 'MANAGER') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can view detailed loyalty history'
      });
    }
    
    // Check if client exists
    const client = await prisma.user.findUnique({
      where: { 
        id: Number(clientId),
        role: 'CLIENT'
      }
    });
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    
    // Get loyalty information
    const fidelite = await prisma.fidelite.findUnique({
      where: { clientUserId: Number(clientId) }
    });
    
    if (!fidelite) {
      return res.status(404).json({
        success: false,
        message: 'Loyalty information not found'
      });
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
    
    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Manually adjust client's loyalty points (for managers)
 */
const adjustFidelitePoints = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { 
      nombreLavageTotal, 
      poidsTotalLaveKg,
      prixTotalPaye,
      pointsDisponible,
      pointsFraction,
      reason 
    } = req.body;
    
    // Only managers can adjust loyalty points
    if (req.user.role !== 'MANAGER') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can adjust loyalty points'
      });
    }
    
    // Check if client exists
    const client = await prisma.user.findUnique({
      where: { 
        id: Number(clientId),
        role: 'CLIENT'
      }
    });
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    
    // Get current loyalty information
    const currentFidelite = await prisma.fidelite.findUnique({
      where: { clientUserId: Number(clientId) }
    });
    
    if (!currentFidelite) {
      return res.status(404).json({
        success: false,
        message: 'Loyalty information not found'
      });
    }
    
    // Prepare update data
    const updateData = {};
    
    if (nombreLavageTotal !== undefined) {
      updateData.nombreLavageTotal = nombreLavageTotal;
    }
    
    if (poidsTotalLaveKg !== undefined) {
      updateData.poidsTotalLaveKg = poidsTotalLaveKg;
    }
    
    if (prixTotalPaye !== undefined) {
      updateData.prixTotalPaye = prixTotalPaye;
    }
    
    if (pointsDisponible !== undefined) {
      updateData.pointsDisponible = pointsDisponible;
    }
    
    if (pointsFraction !== undefined) {
      updateData.pointsFraction = pointsFraction;
    }
    
    // Update loyalty information
    const updatedFidelite = await prisma.fidelite.update({
      where: { clientUserId: Number(clientId) },
      data: updateData
    });
    
    // Log admin action
    await prisma.logadminaction.create({
      data: {
        adminUserId: req.user.id,
        typeAction: 'UPDATE',
        entite: 'Fidelite',
        entiteId: updatedFidelite.id,
        description: `Loyalty points adjusted for client ${client.nom} ${client.prenom} by ${req.user.nom} ${req.user.prenom}. Reason: ${reason || 'Not specified'}`
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Loyalty points adjusted successfully',
      data: updatedFidelite
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update premium subscription for a client
 */
const managePremiumSubscription = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { annee, mois, limiteKg, kgUtilises, aOptionRepassageIncluse } = req.body;
    
    // Only managers can manage premium subscriptions
    if (req.user.role !== 'MANAGER') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can manage premium subscriptions'
      });
    }
    
    // Check if client exists and is premium
    const client = await prisma.user.findUnique({
      where: { 
        id: Number(clientId)
      }
    });
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
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
      const updateData = {
        limiteKg,
        kgUtilises: kgUtilises === undefined ? existingSubscription.kgUtilises : kgUtilises
      };
      
      // Update ironing option and montant if specified
      if (aOptionRepassageIncluse !== undefined) {
        updateData.aOptionRepassageIncluse = aOptionRepassageIncluse;
        
        // Recalculate montant based on student status and ironing option
        const baseMontant = 16000;
        const optionRepassageMontant = aOptionRepassageIncluse ? 5000 : 0;
        updateData.montant = client.estEtudiant 
          ? Math.round((baseMontant + optionRepassageMontant) * 0.9)
          : baseMontant + optionRepassageMontant;
      }
      
      subscription = await prisma.abonnementpremiummensuel.update({
        where: { id: existingSubscription.id },
        data: updateData
      });
    } else {
      // Create new subscription
      const baseMontant = 16000;
      const hasIroningOption = aOptionRepassageIncluse || false;
      const optionRepassageMontant = hasIroningOption ? 5000 : 0;
      const montant = client.estEtudiant 
        ? Math.round((baseMontant + optionRepassageMontant) * 0.9)
        : baseMontant + optionRepassageMontant;

      subscription = await prisma.abonnementpremiummensuel.create({
        data: {
          clientUserId: Number(clientId),
          annee,
          mois,
          limiteKg,
          kgUtilises: kgUtilises || 0,
          montant,
          aOptionRepassageIncluse: hasIroningOption
        }
      });
    }
    
    // Log admin action
    await prisma.logadminaction.create({
      data: {
        adminUserId: req.user.id,
        typeAction: existingSubscription ? 'UPDATE' : 'CREATE',
        entite: 'AbonnementPremiumMensuel',
        entiteId: subscription.id,
        description: `Premium subscription ${existingSubscription ? 'updated' : 'created'} for client ${client.nom} ${client.prenom} by ${req.user.nom} ${req.user.prenom} for ${mois}/${annee}`
      }
    });
    
    res.status(200).json({
      success: true,
      message: `Premium subscription ${existingSubscription ? 'updated' : 'created'} successfully`,
      data: subscription
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all premium subscriptions (for managers)
 */
const getAllPremiumSubscriptions = async (req, res, next) => {
  try {
    // Only managers can view all premium subscriptions
    if (req.user.role !== 'MANAGER') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can view all premium subscriptions'
      });
    }
    
    const { annee, mois, page = 1, limit = 10 } = req.query;
    
    // Build filter conditions
    const where = {};
    
    if (annee) {
      where.annee = Number(annee);
    }
    
    if (mois) {
      where.mois = Number(mois);
    }
    
    // Calculate pagination
    const skip = (page - 1) * Number(limit);
    
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
        take: Number(limit),
        orderBy: [
          { annee: 'desc' },
          { mois: 'desc' }
        ]
      }),
      prisma.abonnementpremiummensuel.count({ where })
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / Number(limit));
    
    // Add remaining quota to each subscription
    const subscriptionsWithRemaining = subscriptions.map(sub => ({
      ...sub,
      remainingKg: sub.limiteKg - sub.kgUtilises
    }));
    
    res.status(200).json({
      success: true,
      data: subscriptionsWithRemaining,
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
 * Get current user's loyalty information
 */
const getMyFidelite = async (req, res, next) => {
  try {
    // Check if user is a client
    if (req.user.role !== 'CLIENT') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can access their loyalty information'
      });
    }
    
    const clientId = req.user.id;
    
    // Get loyalty information
    const fidelite = await prisma.fidelite.findUnique({
      where: { clientUserId: clientId }
    });
    
    if (!fidelite) {
      return res.status(404).json({
        success: false,
        message: 'Loyalty information not found'
      });
    }
    
    // Get premium subscription if applicable
    let premiumSubscription = null;
    if (req.user.typeClient === 'Premium') {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      
      premiumSubscription = await prisma.abonnementpremiummensuel.findFirst({
        where: {
          clientUserId: clientId,
          annee: currentYear,
          mois: currentMonth
        }
      });
    }
    
    // Get recent orders
    const recentOrders = await prisma.commande.findMany({
      where: {
        clientUserId: clientId,
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
      },
      take: 5
    });
    
    // Progression de fidélité alignée sur le système réel (points -> crédit) :
    // le client accumule des points (1 point = 500 FCFA payés) et, tous les
    // 40 points, gagne automatiquement 2000 FCFA de crédit directement
    // déductible de ses prochaines commandes.
    const pointsDisponible = fidelite.pointsDisponible || 0;
    const pointsAvantProchainCredit = Math.max(0, FIDELITY_CONSTANTS.POINTS_FOR_CONVERSION - pointsDisponible);

    const progression = {
      systeme: 'points-credit',
      pointsDisponible,
      pointsFraction: fidelite.pointsFraction || 0,
      creditDisponible: fidelite.creditDisponible || 0, // FCFA immédiatement déductibles
      fcfaParPoint: FIDELITY_CONSTANTS.POINTS_PER_FCFA, // 500
      pointsParPalier: FIDELITY_CONSTANTS.POINTS_FOR_CONVERSION, // 40
      creditParPalier: FIDELITY_CONSTANTS.CREDIT_PER_PACK, // 2000
      pointsAvantProchainCredit, // points restants avant +2000 FCFA
      montantAvantProchainCredit: pointsAvantProchainCredit * FIDELITY_CONSTANTS.POINTS_PER_FCFA, // FCFA à dépenser
      progressionPourcentage: Math.min(
        100,
        Math.round((pointsDisponible / FIDELITY_CONSTANTS.POINTS_FOR_CONVERSION) * 100)
      )
    };

    // Response data
    const responseData = {
      fidelite: {
        ...fidelite,
        // Champs historiques conservés pour rétro-compatibilité
        pointsFidelite: fidelite.nombreLavageTotal % config.business.fidelityStandardFreeWashEvery,
        pointsRequiredForNextReward: config.business.fidelityStandardFreeWashEvery
      },
      progression,
      recentOrders
    };

    // Add premium data if applicable
    if (premiumSubscription) {
      const remainingKg = Math.max(0, premiumSubscription.limiteKg - premiumSubscription.kgUtilises);
      responseData.premium = {
        ...premiumSubscription,
        remainingKg,
        utilisationPourcentage: premiumSubscription.limiteKg > 0
          ? Math.min(100, Math.round((premiumSubscription.kgUtilises / premiumSubscription.limiteKg) * 100))
          : 0
      };
    }
    
    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Rechercher un client par numéro de carte de fidélité
 */
const getClientByNumeroCarteFidelite = async (req, res, next) => {
  try {
    const { numeroCarteFidelite } = req.params;
    
    // Valider le format du numéro de carte
    if (!validerFormatNumeroCarte(numeroCarteFidelite)) {
      return res.status(400).json({
        success: false,
        message: 'Format de numéro de carte de fidélité invalide. Format attendu: TH + 5 chiffres + 3 lettres (ex: TH23468KASS)'
      });
    }
    
    // Rechercher le client
    const result = await getClientByNumeroCarteFideliteService(
      numeroCarteFidelite
    );
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Aucun client trouvé avec ce numéro de carte de fidélité'
      });
    }
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClientFidelite,
  getClientFideliteHistory,
  adjustFidelitePoints,
  managePremiumSubscription,
  getAllPremiumSubscriptions,
  getMyFidelite,
  getClientByNumeroCarteFidelite
};
