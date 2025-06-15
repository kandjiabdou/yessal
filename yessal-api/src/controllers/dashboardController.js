const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Obtenir les données du dashboard pour un site
 */
const getDashboardData = async (req, res, next) => {
  try {
    const { siteId } = req.params;
    const siteIdInt = parseInt(siteId);

    // Vérifier si le site existe
    const site = await prisma.siteLavage.findUnique({
      where: { id: siteIdInt },
      select: { id: true, nom: true }
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site non trouvé'
      });
    }

    // Dates pour les calculs
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 7);

    // Statistiques du jour
    const todayOrders = await prisma.commande.findMany({
      where: {
        siteLavageId: siteIdInt,
        dateHeureCommande: {
          gte: startOfToday
        }
      },
      include: {
        clientUser: {
          select: { nom: true, prenom: true }
        },
        clientInvite: {
          select: { nom: true }
        }
      }
    });

    // Statistiques de la semaine
    const weekOrders = await prisma.commande.findMany({
      where: {
        siteLavageId: siteIdInt,
        dateHeureCommande: {
          gte: startOfWeek
        }
      }
    });

    // Commandes récentes (5 dernières)
    const recentOrders = await prisma.commande.findMany({
      where: {
        siteLavageId: siteIdInt
      },
      include: {
        clientUser: {
          select: { nom: true, prenom: true }
        },
        clientInvite: {
          select: { nom: true }
        }
      },
      orderBy: {
        dateHeureCommande: 'desc'
      },
      take: 5
    });

    // Calculer les statistiques du jour
    const todayStats = {
      totalCommandes: todayOrders.length,
      totalRevenue: todayOrders.reduce((sum, order) => sum + (order.prixTotal || 0), 0),
      totalPoidsKg: todayOrders.reduce((sum, order) => sum + (order.masseVerifieeKg || order.masseClientIndicativeKg), 0),
      totalLivraisons: todayOrders.filter(order => order.estEnLivraison && order.statut === 'Livre').length
    };

    // Calculer les statistiques de la semaine
    const weekStats = {
      totalCommandes: weekOrders.length,
      totalRevenue: weekOrders.reduce((sum, order) => sum + (order.prixTotal || 0), 0),
      totalPoidsKg: weekOrders.reduce((sum, order) => sum + (order.masseVerifieeKg || order.masseClientIndicativeKg), 0),
      totalLivraisons: weekOrders.filter(order => order.estEnLivraison && order.statut === 'Livre').length
    };

    // Formater les commandes récentes
    const formattedRecentOrders = recentOrders.map(order => {
      let clientName = 'Client inconnu';
      if (order.clientUser) {
        clientName = `${order.clientUser.prenom} ${order.clientUser.nom}`;
      } else if (order.clientInvite && order.clientInvite.nom) {
        clientName = order.clientInvite.nom;
      }

      return {
        id: order.id,
        clientName,
        prixTotal: order.prixTotal || 0,
        masseClientIndicativeKg: order.masseClientIndicativeKg,
        statut: order.statut,
        dateHeureCommande: order.dateHeureCommande.toISOString()
      };
    });

    res.status(200).json({
      success: true,
      data: {
        todayStats,
        weekStats,
        recentOrders: formattedRecentOrders,
        siteName: site.nom
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des données du dashboard:', error);
    next(error);
  }
};

module.exports = {
  getDashboardData
}; 