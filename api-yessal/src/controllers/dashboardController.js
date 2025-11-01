const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * Obtenir les données du dashboard pour un site
 */
// --- Helper: compute period start/end ---
const computePeriodRange = (period = 'week', offsetInt = 0) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const getWeekStart = (off = 0) => {
    const date = new Date();
    const dayOfWeek = date.getDay(); // 0 = dimanche, 1 = lundi, ..., 6 = samedi

    // Décalage pour atteindre lundi
    const daysToGoBack = (dayOfWeek + 6) % 7;
    // Exemple :
    // si dimanche (0) -> (0+6)%7 = 6 → recule 6 jours → lundi précédent

    date.setDate(date.getDate() - daysToGoBack + off * 7);
    date.setHours(0, 0, 0, 0);
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
    if (offsetInt && !Number.isNaN(offsetInt)) {
      periodStart.setDate(periodStart.getDate() + offsetInt);
    }
    periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 1);
  } else if (period === 'month') {
    periodStart = getMonthStart(offsetInt);
    periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    periodStart = getWeekStart(offsetInt);
    periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 7);
  }

  return { periodStart, periodEnd, startOfToday };
};

// --- Today stats handler ---
const getTodayData = async (req, res, next) => {
  try {
    const { siteId } = req.params;
    const siteIdInt = parseInt(siteId);

    // verify site
    const site = await prisma.sitelavage.findUnique({ where: { id: siteIdInt, flag: true }, select: { id: true, nom: true } });
    if (!site) return res.status(404).json({ success: false, message: 'Site non trouvé' });

    const { startOfToday } = computePeriodRange('day', 0);

    // Fetch minimal order fields for today and recent orders in one go
    const [todayOrders, recentOrders] = await Promise.all([
      prisma.commande.findMany({
        where: { siteLavageId: siteIdInt, flag: true, dateHeureCommande: { gte: startOfToday } },
        select: { id: true, prixPaye: true, masseVerifieeKg: true, masseClientIndicativeKg: true, estEnLivraison: true, statut: true }
      }),
      prisma.commande.findMany({
        where: { siteLavageId: siteIdInt, flag: true },
        include: { clientUser: { select: { nom: true, prenom: true } }, clientInvite: { select: { nom: true } } },
        orderBy: { dateHeureCommande: 'desc' },
        take: 5
      })
    ]);

    const todayStats = {
      totalCommandes: todayOrders.length,
      totalRevenue: todayOrders.reduce((sum, o) => sum + (o.prixPaye || 0), 0),
      totalPoidsKg: todayOrders.reduce((sum, o) => sum + (o.masseVerifieeKg ?? o.masseClientIndicativeKg ?? 0), 0),
      totalLivraisons: todayOrders.filter(o => o.estEnLivraison && o.statut === 'Livre').length,
      totalAbonnementsCreated: 0,
      totalAbonnementMontant: 0,
      totalNewClients: 0
    };

    // subscriptions created today
    const todayAbonnements = await prisma.abonnementpremiummensuel.findMany({ where: { createdAt: { gte: startOfToday } }, select: { montant: true } });
    if (todayAbonnements.length) {
      todayStats.totalAbonnementsCreated = todayAbonnements.length;
      todayStats.totalAbonnementMontant = todayAbonnements.reduce((s, a) => s + (a.montant || 0), 0);
      todayStats.totalRevenue += todayStats.totalAbonnementMontant; // merge into revenue
    }

    // New clients today
    todayStats.totalNewClients = await prisma.user.count({ where: { createdAt: { gte: startOfToday }, flag: true } });

    // Format recent orders
    const formattedRecentOrders = recentOrders.map(order => {
      let clientName = 'Client inconnu';
      if (order.clientUser) clientName = `${order.clientUser.prenom} ${order.clientUser.nom}`;
      else if (order.clientInvite && order.clientInvite.nom) clientName = order.clientInvite.nom;

      return {
        id: order.id,
        clientName,
        prixPaye: order.prixPaye || 0,
        masseClientIndicativeKg: order.masseClientIndicativeKg,
        statut: order.statut,
        dateHeureCommande: order.dateHeureCommande.toISOString()
      };
    });

    res.status(200).json({ success: true, data: { todayStats, recentOrders: formattedRecentOrders, siteName: site.nom } });
  } catch (error) {
    next(error);
  }
};

// --- Period stats handler ---
const getPeriodData = async (req, res, next) => {
  try {
    const { siteId } = req.params;
    const { period = 'week', offset = '0' } = req.query;
    const siteIdInt = parseInt(siteId);
    const offsetInt = parseInt(offset);

    const site = await prisma.sitelavage.findUnique({ where: { id: siteIdInt, flag: true }, select: { id: true, nom: true } });
    if (!site) return res.status(404).json({ success: false, message: 'Site non trouvé' });

    const { periodStart, periodEnd } = computePeriodRange(period, offsetInt);

    const periodOrders = await prisma.commande.findMany({
      where: { siteLavageId: siteIdInt, flag: true, dateHeureCommande: { gte: periodStart, lt: periodEnd } },
      select: { id: true, prixPaye: true, masseVerifieeKg: true, masseClientIndicativeKg: true, estEnLivraison: true, statut: true }
    });

    const periodStats = {
      totalCommandes: periodOrders.length,
      totalRevenue: periodOrders.reduce((s, o) => s + (o.prixPaye || 0), 0),
      totalPoidsKg: periodOrders.reduce((s, o) => s + (o.masseVerifieeKg ?? o.masseClientIndicativeKg ?? 0), 0),
      totalLivraisons: periodOrders.filter(o => o.estEnLivraison && o.statut === 'Livre').length,
      totalAbonnementsCreated: 0,
      totalAbonnementMontant: 0,
      totalNewClients: 0
    };

    const periodAbonnements = await prisma.abonnementpremiummensuel.findMany({ where: { createdAt: { gte: periodStart, lt: periodEnd } }, select: { montant: true } });
    if (periodAbonnements.length) {
      periodStats.totalAbonnementsCreated = periodAbonnements.length;
      periodStats.totalAbonnementMontant = periodAbonnements.reduce((s, a) => s + (a.montant || 0), 0);
      periodStats.totalRevenue += periodStats.totalAbonnementMontant; // merge into revenue
    }

    // New clients in period
    periodStats.totalNewClients = await prisma.user.count({ where: { createdAt: { gte: periodStart, lt: periodEnd }, flag: true } });

    // Abonnements en cours for month
    if (period === 'month') {
      const month = periodStart.getMonth() + 1;
      const year = periodStart.getFullYear();
      periodStats.totalAbonnementsEnCours = await prisma.abonnementpremiummensuel.count({ where: { annee: year, mois: month, flag: true } });
    } else {
      periodStats.totalAbonnementsEnCours = 0;
    }

    res.status(200).json({ success: true, data: { periodStats, siteName: site.nom, periodInfo: { startDate: periodStart.toISOString(), endDate: periodEnd.toISOString(), offset: offsetInt, period, isCurrentPeriod: offsetInt === 0 } } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTodayData,
  getPeriodData,
};
