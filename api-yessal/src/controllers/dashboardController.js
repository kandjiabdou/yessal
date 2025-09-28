const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * Obtenir les données du dashboard pour un site
 */
const getDashboardData = async (req, res, next) => {
  try {
    const { siteId } = req.params;
    // support period (day|week|month) and offset for pagination
    const { period = 'week', offset = '0' } = req.query; // offset: 0 current, -1 previous, etc.
    const siteIdInt = parseInt(siteId);
    const offsetInt = parseInt(offset);

    // Vérifier si le site existe
    const site = await prisma.sitelavage.findUnique({
      where: {
        id: siteIdInt,
        flag: true, // Only get active sites
      },
      select: { id: true, nom: true },
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site non trouvé",
      });
    }

    // Dates pour les calculs
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Helpers to compute period start/end
    const getWeekStart = (off = 0) => {
      const date = new Date();
      const dayOfWeek = date.getDay(); // 0=Sun ... 6=Sat
      const daysToGoBack = dayOfWeek === 6 ? 0 : dayOfWeek + 1; // target Saturday
      date.setDate(date.getDate() - daysToGoBack + off * 7);
      date.setHours(0,0,0,0);
      return date;
    };

    const getMonthStart = (off = 0) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() + off);
      date.setHours(0,0,0,0);
      return date;
    };

    let periodStart, periodEnd;
    if (period === 'day') {
      periodStart = new Date(startOfToday);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 1);
    } else if (period === 'month') {
      periodStart = getMonthStart(offsetInt);
      periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      // default week
      periodStart = getWeekStart(offsetInt);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 7);
    }

    // Statistiques du jour (always compute)
    const todayOrders = await prisma.commande.findMany({
      where: {
        siteLavageId: siteIdInt,
        flag: true,
        dateHeureCommande: { gte: startOfToday }
      },
      include: {
        clientUser: { select: { nom: true, prenom: true } },
        clientInvite: { select: { nom: true } }
      }
    });

    // Statistiques de la période demandée (week or month or day)
    const periodOrders = await prisma.commande.findMany({
      where: {
        siteLavageId: siteIdInt,
        flag: true,
        dateHeureCommande: {
          gte: periodStart,
          lt: periodEnd
        }
      }
    });

  // Commandes récentes (5 dernières)
    const recentOrders = await prisma.commande.findMany({
      where: {
        siteLavageId: siteIdInt,
        flag: true, // Only get active orders
      },
      include: {
        clientUser: {
          select: { nom: true, prenom: true },
        },
        clientInvite: {
          select: { nom: true },
        },
      },
      orderBy: {
        dateHeureCommande: "desc",
      },
      take: 5,
    });

    // Calculer les statistiques du jour
    const todayStats = {
      totalCommandes: todayOrders.length,
      totalRevenue: todayOrders.reduce((sum, order) => sum + (order.prixPaye || 0), 0),
      totalPoidsKg: todayOrders.reduce((sum, order) => sum + (order.masseVerifieeKg || order.masseClientIndicativeKg), 0),
      totalLivraisons: todayOrders.filter(order => order.estEnLivraison && order.statut === 'Livre').length,
      totalAbonnementsCreated: 0,
      totalAbonnementMontant: 0,
      totalNewClients: 0
    };

    // Count abonnements created today
    const todayAbonnements = await prisma.abonnementpremiummensuel.findMany({
      where: {
        createdAt: { gte: startOfToday }
      }
    });
    if (todayAbonnements && todayAbonnements.length > 0) {
      todayStats.totalAbonnementsCreated = todayAbonnements.length;
      todayStats.totalAbonnementMontant = todayAbonnements.reduce((s, a) => s + (a.montant || 0), 0);
    }

    // Nouveaux clients aujourd'hui
    const todayNewClientsCount = await prisma.user.count({
      where: {
        createdAt: { gte: startOfToday },
        flag: true
      }
    });
    todayStats.totalNewClients = todayNewClientsCount;

    // Calculer les statistiques de la période demandée (week/month/day)
    const periodStats = {
      totalCommandes: periodOrders.length,
      totalRevenue: periodOrders.reduce((sum, order) => sum + (order.prixPaye || 0), 0),
      totalPoidsKg: periodOrders.reduce((sum, order) => sum + (order.masseVerifieeKg || order.masseClientIndicativeKg), 0),
      totalLivraisons: periodOrders.filter(order => order.estEnLivraison && order.statut === 'Livre').length,
      totalAbonnementsCreated: 0,
      totalAbonnementMontant: 0,
      totalNewClients: 0
    };

    // Abonnements created in the period
    const periodAbonnements = await prisma.abonnementpremiummensuel.findMany({
      where: {
        createdAt: { gte: periodStart, lt: periodEnd }
      }
    });
    if (periodAbonnements && periodAbonnements.length > 0) {
      periodStats.totalAbonnementsCreated = periodAbonnements.length;
      periodStats.totalAbonnementMontant = periodAbonnements.reduce((s, a) => s + (a.montant || 0), 0);
    }

    // Nouveaux clients pour la période demandée (day/week/month)
    const periodNewClientsCount = await prisma.user.count({
      where: {
        createdAt: { gte: periodStart, lt: periodEnd },
        flag: true
      }
    });
    periodStats.totalNewClients = periodNewClientsCount;

    // Abonnements en cours pour le mois (nombre d'abonnements actifs durant le mois donné)
    // Le modèle `abonnementpremiummensuel` contient `annee` et `mois` (1-12). Nous comptons les abonnements
    // dont l'annee/mois correspondent à la période demandée. Ceci n'est calculé que pour la période 'month'.
    let abonnementsEnCoursCount = 0;
    if (period === 'month') {
      const month = periodStart.getMonth() + 1; // getMonth() -> 0-11, DB stores 1-12
      const year = periodStart.getFullYear();
      abonnementsEnCoursCount = await prisma.abonnementpremiummensuel.count({
        where: {
          annee: year,
          mois: month,
          flag: true
        }
      });
      // expose in periodStats
      periodStats.totalAbonnementsEnCours = abonnementsEnCoursCount;
    } else {
      periodStats.totalAbonnementsEnCours = 0;
    }

    // Formater les commandes récentes
    const formattedRecentOrders = recentOrders.map((order) => {
      let clientName = "Client inconnu";
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
        dateHeureCommande: order.dateHeureCommande.toISOString(),
      };
    });

    res.status(200).json({
      success: true,
      data: {
        todayStats,
        periodStats,
        recentOrders: formattedRecentOrders,
        siteName: site.nom,
        periodInfo: {
          startDate: periodStart.toISOString(),
          endDate: periodEnd.toISOString(),
          offset: offsetInt,
          period: period,
          isCurrentPeriod: offsetInt === 0
        }
      }
    });
  } catch (error) {
    console.log(
      "Erreur lors de la récupération des données du dashboard:",
      error
    );
    next(error);
  }
};

module.exports = {
  getDashboardData,
};
