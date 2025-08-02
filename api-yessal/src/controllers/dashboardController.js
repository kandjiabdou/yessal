const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Obtenir les données du dashboard pour un site
 */
const getDashboardData = async (req, res, next) => {
  try {
    const { siteId } = req.params;
    const { weekOffset = 0 } = req.query; // Pagination pour les semaines (0 = semaine courante, -1 = semaine précédente, etc.)
    const siteIdInt = parseInt(siteId);
    const weekOffsetInt = parseInt(weekOffset);

    // Vérifier si le site existe
    const site = await prisma.sitelavage.findUnique({
      where: { 
        id: siteIdInt,
        flag: true // Only get active sites
      },
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
    
    // Calculer le début de la semaine (samedi) pour la semaine courante ou décalée
    const getCurrentWeekStart = (offset = 0) => {
      const date = new Date(today);
      const dayOfWeek = date.getDay(); // 0 = dimanche, 1 = lundi, etc.
      
      // Calculer les jours à reculer pour arriver au samedi de la semaine courante
      // Si on est dimanche (0), on recule de 1 jour pour arriver au samedi
      // Si on est lundi (1), on recule de 2 jours, etc.
      // Si on est samedi (6), on ne recule pas
      const daysToGoBack = dayOfWeek === 0 ? 1 : dayOfWeek + 1;
      date.setDate(date.getDate() - daysToGoBack);
      
      // Appliquer le décalage de semaines
      date.setDate(date.getDate() + (offset * 7));
      
      // Définir à minuit
      date.setHours(0, 0, 0, 0);
      
      return date;
    };
    
    const startOfWeek = getCurrentWeekStart(weekOffsetInt);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7); // Fin de la semaine (samedi suivant)

    // Statistiques du jour
    const todayOrders = await prisma.commande.findMany({
      where: {
        siteLavageId: siteIdInt,
        flag: true, // Only get active orders
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
        flag: true, // Only get active orders
        dateHeureCommande: {
          gte: startOfWeek,
          lt: endOfWeek
        }
      }
    });

    // Commandes récentes (5 dernières)
    const recentOrders = await prisma.commande.findMany({
      where: {
        siteLavageId: siteIdInt,
        flag: true // Only get active orders
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
      totalRevenue: todayOrders.reduce((sum, order) => sum + (order.prixPaye || 0), 0),
      totalPoidsKg: todayOrders.reduce((sum, order) => sum + (order.masseVerifieeKg || order.masseClientIndicativeKg), 0),
      totalLivraisons: todayOrders.filter(order => order.estEnLivraison && order.statut === 'Livre').length
    };

    // Calculer les statistiques de la semaine
    const weekStats = {
      totalCommandes: weekOrders.length,
      totalRevenue: weekOrders.reduce((sum, order) => sum + (order.prixPaye || 0), 0),
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
        prixPaye: order.prixPaye || 0,
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
        siteName: site.nom,
        weekInfo: {
          startDate: startOfWeek.toISOString(),
          endDate: endOfWeek.toISOString(),
          weekOffset: weekOffsetInt,
          isCurrentWeek: weekOffsetInt === 0
        }
      }
    });

  } catch (error) {
    console.log('Erreur lors de la récupération des données du dashboard:', error);
    next(error);
  }
};

module.exports = {
  getDashboardData
}; 