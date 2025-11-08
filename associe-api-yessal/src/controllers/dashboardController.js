const { PrismaClient } = require("@prisma/client");
const cacheService = require('../services/cacheService');

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
    const siteIdInt = Number.parseInt(siteId);
    
    // Validate siteId parameter
    if (Number.isNaN(siteIdInt)) {
      return res.status(400).json({ success: false, message: 'ID de site invalide' });
    }

    // Check cache first (gracefully handle cache errors)
    try {
      const cachedData = await cacheService.getTodayData(siteIdInt);
      if (cachedData) {
        return res.status(200).json({ success: true, data: cachedData });
      }
    } catch (cacheError) {
      // Cache errors should not stop the request, just log them
      console.warn('Cache get error for today data:', cacheError.message);
    }

    // verify site
    const site = await prisma.sitelavage.findUnique({ where: { id: siteIdInt, flag: true }, select: { id: true, nom: true } });
    if (!site) return res.status(404).json({ success: false, message: 'Site non trouvé' });

    const { startOfToday } = computePeriodRange('day', 0);

    // Fetch minimal order fields for today and recent orders in one go
    const [todayOrders, recentOrders] = await Promise.all([
      prisma.commande.findMany({
        where: { siteLavageId: siteIdInt, flag: true, dateHeureCommande: { gte: startOfToday } },
        select: { id: true, prixPaye: true, masseVerifieeKg: true, masseClientIndicativeKg: true, estEnLivraison: true, statut: true, montantReductionPoints: true }
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
      totalCreditUtilise: todayOrders.reduce((sum, o) => sum + (o.montantReductionPoints || 0), 0),
      totalAbonnementsCreated: 0,
      totalAbonnementMontant: 0,
      totalNewClients: 0
    };

    // subscriptions created today
    const todayAbonnements = await prisma.abonnementpremiummensuel.findMany({ 
      where: { 
        createdAt: { gte: startOfToday },
        siteLavageId: siteIdInt,
        flag: true
      }, 
      select: { montant: true } 
    });
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

    const responseData = { todayStats, recentOrders: formattedRecentOrders, siteName: site.nom };
    
    // Cache the result (gracefully handle cache errors)
    try {
      await cacheService.cacheTodayData(siteIdInt, responseData);
    } catch (cacheError) {
      console.warn('Cache set error for today data:', cacheError.message);
    }
    
    res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    next(error);
  }
};

// --- Period stats handler ---
const getPeriodData = async (req, res, next) => {
  try {
    const { siteId } = req.params;
    const { period = 'week', offset = '0' } = req.query;
    const siteIdInt = Number.parseInt(siteId);
    const offsetInt = Number.parseInt(offset);
    
    // Validate siteId parameter
    if (Number.isNaN(siteIdInt)) {
      return res.status(400).json({ success: false, message: 'ID de site invalide' });
    }

    // Check cache first (gracefully handle cache errors)
    try {
      const cachedData = await cacheService.getPeriodData(siteIdInt, period, offsetInt);
      if (cachedData) {
        return res.status(200).json({ success: true, data: cachedData });
      }
    } catch (cacheError) {
      // Cache errors should not stop the request, just log them
      console.warn('Cache get error for period data:', cacheError.message);
    }

    const site = await prisma.sitelavage.findUnique({ where: { id: siteIdInt, flag: true }, select: { id: true, nom: true } });
    if (!site) return res.status(404).json({ success: false, message: 'Site non trouvé' });

    const { periodStart, periodEnd } = computePeriodRange(period, offsetInt);

    const periodOrders = await prisma.commande.findMany({
      where: { siteLavageId: siteIdInt, flag: true, dateHeureCommande: { gte: periodStart, lt: periodEnd } },
      select: { id: true, prixPaye: true, masseVerifieeKg: true, masseClientIndicativeKg: true, estEnLivraison: true, statut: true, montantReductionPoints: true }
    });

    const periodStats = {
      totalCommandes: periodOrders.length,
      totalRevenue: periodOrders.reduce((s, o) => s + (o.prixPaye || 0), 0),
      totalPoidsKg: periodOrders.reduce((s, o) => s + (o.masseVerifieeKg ?? o.masseClientIndicativeKg ?? 0), 0),
      totalLivraisons: periodOrders.filter(o => o.estEnLivraison && o.statut === 'Livre').length,
      totalCreditUtilise: periodOrders.reduce((s, o) => s + (o.montantReductionPoints || 0), 0),
      totalAbonnementsCreated: 0,
      totalAbonnementMontant: 0,
      totalNewClients: 0
    };

    const periodAbonnements = await prisma.abonnementpremiummensuel.findMany({ 
      where: { 
        createdAt: { gte: periodStart, lt: periodEnd },
        siteLavageId: siteIdInt,
        flag: true
      }, 
      select: { montant: true } 
    });
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
      periodStats.totalAbonnementsEnCours = await prisma.abonnementpremiummensuel.count({ 
        where: { 
          annee: year, 
          mois: month, 
          siteLavageId: siteIdInt,
          flag: true 
        } 
      });
    } else {
      periodStats.totalAbonnementsEnCours = 0;
    }

    const responseData = { 
      periodStats, 
      siteName: site.nom, 
      periodInfo: { 
        startDate: periodStart.toISOString(), 
        endDate: periodEnd.toISOString(), 
        offset: offsetInt, 
        period, 
        isCurrentPeriod: offsetInt === 0 
      } 
    };

    // Cache the result (gracefully handle cache errors)
    try {
      await cacheService.cachePeriodData(siteIdInt, period, offsetInt, responseData);
    } catch (cacheError) {
      console.warn('Cache set error for period data:', cacheError.message);
    }

    res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    next(error);
  }
};

/**
 * Initialize cache service connection
 */
const initializeCache = async () => {
  try {
    await cacheService.connect();
  } catch (error) {
    // Cache initialization failure shouldn't crash the app
    console.error('Cache initialization failed:', error);
  }
};

// --- Helper: fetch period data for a date range ---
const fetchPeriodData = async (siteIdInt, startDate, endDate) => {
  const [orders, clients, subscriptions] = await Promise.all([
    prisma.commande.findMany({
      where: { 
        siteLavageId: siteIdInt, 
        flag: true, 
        dateHeureCommande: { gte: startDate, lt: endDate } 
      },
      select: { prixPaye: true }
    }),
    prisma.user.count({
      where: { 
        createdAt: { gte: startDate, lt: endDate }, 
        flag: true 
      }
    }),
    prisma.abonnementpremiummensuel.findMany({
      where: { 
        createdAt: { gte: startDate, lt: endDate },
        siteLavageId: siteIdInt,
        flag: true
      },
      select: { montant: true }
    })
  ]);

  const revenue = orders.reduce((sum, o) => sum + (o.prixPaye || 0), 0) + 
                  subscriptions.reduce((sum, a) => sum + (a.montant || 0), 0);

  return {
    revenue,
    orders: orders.length,
    newClients: clients
  };
};

// --- Helper: generate weekly chart data ---
const generateWeeklyChartData = async (siteIdInt, periodStart) => {
  const chartData = [];
  
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(periodStart);
    dayStart.setDate(dayStart.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayData = await fetchPeriodData(siteIdInt, dayStart, dayEnd);

    chartData.push({
      date: dayStart.toISOString().split('T')[0],
      dateLabel: dayStart.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      ...dayData
    });
  }
  
  return chartData;
};

// --- Helper: generate monthly chart data ---
const generateMonthlyChartData = async (siteIdInt, periodStart, periodEnd) => {
  const chartData = [];
  const weekCount = Math.ceil((periodEnd - periodStart) / (7 * 24 * 60 * 60 * 1000));
  
  for (let i = 0; i < weekCount; i++) {
    const weekStart = new Date(periodStart);
    weekStart.setDate(weekStart.getDate() + (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    // Don't exceed the month boundary
    if (weekEnd > periodEnd) {
      weekEnd.setTime(periodEnd.getTime());
    }

    const weekData = await fetchPeriodData(siteIdInt, weekStart, weekEnd);

    chartData.push({
      date: weekStart.toISOString().split('T')[0],
      dateLabel: `S${i + 1} (${weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })})`,
      ...weekData
    });
  }
  
  return chartData;
};

// --- Helper: validate chart request parameters ---
const validateChartRequest = (siteId, period) => {
  const siteIdInt = Number.parseInt(siteId);
  
  if (Number.isNaN(siteIdInt)) {
    return { isValid: false, error: 'ID de site invalide', siteIdInt: null };
  }

  if (!['week', 'month'].includes(period)) {
    return { isValid: false, error: 'Période invalide. Utilisez "week" ou "month"', siteIdInt };
  }

  return { isValid: true, siteIdInt };
};

// --- Helper: attempt to get cached chart data ---
const getCachedChartData = async (siteIdInt, period, offsetInt) => {
  try {
    return await cacheService.getChartData(siteIdInt, period, offsetInt);
  } catch (cacheError) {
    console.warn('Cache get error for chart data:', cacheError.message);
    return null;
  }
};

// --- Helper: attempt to cache chart data ---
const setCachedChartData = async (siteIdInt, period, offsetInt, responseData) => {
  try {
    await cacheService.cacheChartData(siteIdInt, period, offsetInt, responseData);
  } catch (cacheError) {
    console.warn('Cache set error for chart data:', cacheError.message);
  }
};

// --- Helper: build chart response data ---
const buildChartResponse = (chartData, siteName, periodStart, periodEnd, offsetInt, period) => {
  return {
    chartData,
    siteName,
    periodInfo: {
      startDate: periodStart.toISOString(),
      endDate: periodEnd.toISOString(),
      offset: offsetInt,
      period,
      isCurrentPeriod: offsetInt === 0
    }
  };
};

// --- Chart data handler ---
const getChartData = async (req, res, next) => {
  try {
    const { siteId } = req.params;
    const { period = 'week', offset = '0' } = req.query;
    const offsetInt = Number.parseInt(offset);

    // Validate request parameters
    const validation = validateChartRequest(siteId, period);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.error });
    }
    const { siteIdInt } = validation;

    // Check cache first
    const cachedData = await getCachedChartData(siteIdInt, period, offsetInt);
    if (cachedData) {
      return res.status(200).json({ success: true, data: cachedData });
    }

    // Verify site exists
    const site = await prisma.sitelavage.findUnique({ 
      where: { id: siteIdInt, flag: true }, 
      select: { id: true, nom: true } 
    });
    if (!site) {
      return res.status(404).json({ success: false, message: 'Site non trouvé' });
    }

    // Generate chart data
    const { periodStart, periodEnd } = computePeriodRange(period, offsetInt);
    const chartData = period === 'week' 
      ? await generateWeeklyChartData(siteIdInt, periodStart)
      : await generateMonthlyChartData(siteIdInt, periodStart, periodEnd);

    // Build response
    const responseData = buildChartResponse(
      chartData, 
      site.nom, 
      periodStart, 
      periodEnd, 
      offsetInt, 
      period
    );

    // Cache the result
    await setCachedChartData(siteIdInt, period, offsetInt, responseData);

    res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    next(error);
  }
};

/**
 * Invalidate cache for a site (useful for cache management)
 */
const invalidateSiteCache = async (siteId) => {
  try {
    await cacheService.invalidateSite(siteId);
  } catch (error) {
    console.error('Cache invalidation failed:', error);
  }
};

module.exports = {
  getTodayData,
  getPeriodData,
  getChartData,
  initializeCache,
  invalidateSiteCache,
};
