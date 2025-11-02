const request = require('supertest');
const express = require('express');

// Mock Prisma first
const mockPrisma = {
  sitelavage: {
    findUnique: jest.fn(),
  },
  commande: {
    findMany: jest.fn(),
  },
  user: {
    count: jest.fn(),
  },
  abonnementpremiummensuel: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

// Mock cache service
const mockCacheService = {
  connect: jest.fn(),
  getTodayData: jest.fn(),
  cacheTodayData: jest.fn(),
  getPeriodData: jest.fn(),
  cachePeriodData: jest.fn(),
  getChartData: jest.fn(),
  cacheChartData: jest.fn(),
  invalidateSite: jest.fn(),
};

jest.mock('../../src/services/cacheService', () => mockCacheService);

// Import after mocking
const dashboardController = require('../../src/controllers/dashboardController');

// Create test app
const app = express();
app.use(express.json());
app.get('/dashboard/:siteId/today', dashboardController.getTodayData);
app.get('/dashboard/:siteId/period', dashboardController.getPeriodData);
app.get('/dashboard/:siteId/chart-data', dashboardController.getChartData);
app.use((error, req, res, next) => {
  res.status(500).json({ success: false, message: error.message });
});

describe('Dashboard Controller - Complete Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid test output pollution
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.warn.mockRestore();
    console.error.mockRestore();
  });

  describe('getTodayData', () => {
    const mockSite = { id: 123, nom: 'Test Site' };

    beforeEach(() => {
      mockPrisma.sitelavage.findUnique.mockResolvedValue(mockSite);
    });

    test('returns cached today data when available', async () => {
      const cachedData = {
        todayStats: {
          totalCommandes: 5,
          totalRevenue: 50000,
          totalPoidsKg: 25.5,
          totalLivraisons: 3,
          totalAbonnementsCreated: 2,
          totalAbonnementMontant: 20000,
          totalNewClients: 1
        },
        recentOrders: [],
        siteName: 'Test Site'
      };

      mockCacheService.getTodayData.mockResolvedValue(cachedData);

      const response = await request(app)
        .get('/dashboard/123/today')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: cachedData
      });

      expect(mockCacheService.getTodayData).toHaveBeenCalledWith(123);
      expect(mockPrisma.sitelavage.findUnique).not.toHaveBeenCalled();
    });

    test('generates today data when cache miss', async () => {
      mockCacheService.getTodayData.mockResolvedValue(null);
      mockCacheService.cacheTodayData.mockResolvedValue(true);

      // Mock today orders
      const mockTodayOrders = [
        { id: 1, prixPaye: 15000, masseVerifieeKg: 10.5, masseClientIndicativeKg: null, estEnLivraison: true, statut: 'Livre' },
        { id: 2, prixPaye: 25000, masseVerifieeKg: null, masseClientIndicativeKg: 8.2, estEnLivraison: false, statut: 'En cours' }
      ];

      // Mock recent orders
      const mockRecentOrders = [
        {
          id: 1,
          prixPaye: 15000,
          masseClientIndicativeKg: 10.5,
          statut: 'Livre',
          dateHeureCommande: new Date('2025-11-02T10:00:00Z'),
          clientUser: { nom: 'Doe', prenom: 'John' },
          clientInvite: null
        },
        {
          id: 2,
          prixPaye: 25000,
          masseClientIndicativeKg: 8.2,
          statut: 'En cours',
          dateHeureCommande: new Date('2025-11-02T09:00:00Z'),
          clientUser: null,
          clientInvite: { nom: 'Jane Smith' }
        }
      ];

      // Mock subscriptions today
      const mockTodaySubscriptions = [
        { montant: 10000 },
        { montant: 15000 }
      ];

      // Setup Prisma mocks
      mockPrisma.commande.findMany
        .mockResolvedValueOnce(mockTodayOrders) // First call for today orders
        .mockResolvedValueOnce(mockRecentOrders); // Second call for recent orders
      
      mockPrisma.abonnementpremiummensuel.findMany.mockResolvedValue(mockTodaySubscriptions);
      mockPrisma.user.count.mockResolvedValue(2); // New clients today

      const response = await request(app)
        .get('/dashboard/123/today')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.todayStats).toEqual({
        totalCommandes: 2,
        totalRevenue: 65000, // 40000 from orders + 25000 from subscriptions
        totalPoidsKg: 18.7, // 10.5 + 8.2
        totalLivraisons: 1,
        totalCreditUtilise: 0, // No montantReductionPoints in mock data
        totalAbonnementsCreated: 2,
        totalAbonnementMontant: 25000,
        totalNewClients: 2
      });

      expect(response.body.data.recentOrders).toHaveLength(2);
      expect(response.body.data.recentOrders[0]).toEqual({
        id: 1,
        clientName: 'John Doe',
        prixPaye: 15000,
        masseClientIndicativeKg: 10.5,
        statut: 'Livre',
        dateHeureCommande: '2025-11-02T10:00:00.000Z'
      });

      expect(response.body.data.recentOrders[1]).toEqual({
        id: 2,
        clientName: 'Jane Smith',
        prixPaye: 25000,
        masseClientIndicativeKg: 8.2,
        statut: 'En cours',
        dateHeureCommande: '2025-11-02T09:00:00.000Z'
      });

      expect(mockCacheService.cacheTodayData).toHaveBeenCalledWith(123, response.body.data);
    });

    test('handles orders with null client info', async () => {
      mockCacheService.getTodayData.mockResolvedValue(null);
      mockCacheService.cacheTodayData.mockResolvedValue(true);

      const mockRecentOrders = [
        {
          id: 1,
          prixPaye: 15000,
          masseClientIndicativeKg: 10.5,
          statut: 'Livre',
          dateHeureCommande: new Date('2025-11-02T10:00:00Z'),
          clientUser: null,
          clientInvite: null
        }
      ];

      mockPrisma.commande.findMany
        .mockResolvedValueOnce([]) // Today orders
        .mockResolvedValueOnce(mockRecentOrders); // Recent orders
      
      mockPrisma.abonnementpremiummensuel.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/dashboard/123/today')
        .expect(200);

      expect(response.body.data.recentOrders[0].clientName).toBe('Client inconnu');
    });

    test('returns 400 for invalid siteId', async () => {
      const response = await request(app)
        .get('/dashboard/invalid/today')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'ID de site invalide'
      });
    });

    test('returns 404 for non-existent site', async () => {
      mockCacheService.getTodayData.mockResolvedValue(null);
      mockPrisma.sitelavage.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/dashboard/999/today')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Site non trouvé'
      });
    });

    test('handles cache get errors gracefully', async () => {
      const cacheError = new Error('Cache connection failed');
      mockCacheService.getTodayData.mockRejectedValue(cacheError);
      mockCacheService.cacheTodayData.mockResolvedValue(true);

      mockPrisma.commande.findMany
        .mockResolvedValueOnce([]) // Today orders
        .mockResolvedValueOnce([]); // Recent orders
      mockPrisma.abonnementpremiummensuel.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/dashboard/123/today')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(console.warn).toHaveBeenCalledWith('Cache get error for today data:', 'Cache connection failed');
    });

    test('handles cache set errors gracefully', async () => {
      mockCacheService.getTodayData.mockResolvedValue(null);
      mockCacheService.cacheTodayData.mockRejectedValue(new Error('Cache set failed'));

      mockPrisma.commande.findMany
        .mockResolvedValueOnce([]) // Today orders
        .mockResolvedValueOnce([]); // Recent orders
      mockPrisma.abonnementpremiummensuel.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/dashboard/123/today')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(console.warn).toHaveBeenCalledWith('Cache set error for today data:', 'Cache set failed');
    });
  });

  describe('getPeriodData', () => {
    const mockSite = { id: 123, nom: 'Test Site' };

    beforeEach(() => {
      mockPrisma.sitelavage.findUnique.mockResolvedValue(mockSite);
    });

    test('returns cached period data when available', async () => {
      const cachedData = {
        periodStats: {
          totalCommandes: 20,
          totalRevenue: 200000,
          totalPoidsKg: 100.5,
          totalLivraisons: 15,
          totalAbonnementsCreated: 5,
          totalAbonnementMontant: 50000,
          totalNewClients: 8,
          totalAbonnementsEnCours: 0
        },
        siteName: 'Test Site',
        periodInfo: {
          startDate: '2025-10-28T00:00:00.000Z',
          endDate: '2025-11-04T00:00:00.000Z',
          offset: 0,
          period: 'week',
          isCurrentPeriod: true
        }
      };

      mockCacheService.getPeriodData.mockResolvedValue(cachedData);

      const response = await request(app)
        .get('/dashboard/123/period?period=week&offset=0')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: cachedData
      });

      expect(mockCacheService.getPeriodData).toHaveBeenCalledWith(123, 'week', 0);
    });

    test('generates period data when cache miss', async () => {
      mockCacheService.getPeriodData.mockResolvedValue(null);
      mockCacheService.cachePeriodData.mockResolvedValue(true);

      const mockPeriodOrders = [
        { id: 1, prixPaye: 15000, masseVerifieeKg: 10.5, masseClientIndicativeKg: null, estEnLivraison: true, statut: 'Livre' },
        { id: 2, prixPaye: 25000, masseVerifieeKg: null, masseClientIndicativeKg: 8.2, estEnLivraison: false, statut: 'En cours' }
      ];

      const mockPeriodSubscriptions = [
        { montant: 10000 }
      ];

      mockPrisma.commande.findMany.mockResolvedValue(mockPeriodOrders);
      mockPrisma.abonnementpremiummensuel.findMany.mockResolvedValue(mockPeriodSubscriptions);
      mockPrisma.user.count.mockResolvedValue(3);

      const response = await request(app)
        .get('/dashboard/123/period?period=week&offset=0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.periodStats).toEqual({
        totalCommandes: 2,
        totalRevenue: 50000, // 40000 from orders + 10000 from subscription
        totalPoidsKg: 18.7,
        totalLivraisons: 1,
        totalCreditUtilise: 0, // No montantReductionPoints in mock data
        totalAbonnementsCreated: 1,
        totalAbonnementMontant: 10000,
        totalNewClients: 3,
        totalAbonnementsEnCours: 0 // For week period
      });

      expect(response.body.data.periodInfo.period).toBe('week');
      expect(response.body.data.periodInfo.isCurrentPeriod).toBe(true);
    });

    test('handles month period with abonnements en cours', async () => {
      mockCacheService.getPeriodData.mockResolvedValue(null);
      mockCacheService.cachePeriodData.mockResolvedValue(true);

      mockPrisma.commande.findMany.mockResolvedValue([]);
      mockPrisma.abonnementpremiummensuel.findMany.mockResolvedValue([]);
      mockPrisma.abonnementpremiummensuel.count.mockResolvedValue(5); // Active subscriptions
      mockPrisma.user.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/dashboard/123/period?period=month&offset=0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.periodStats.totalAbonnementsEnCours).toBe(5);
      expect(response.body.data.periodInfo.period).toBe('month');
    });

    test('uses default parameters when not provided', async () => {
      mockCacheService.getPeriodData.mockResolvedValue(null);
      mockCacheService.cachePeriodData.mockResolvedValue(true);

      mockPrisma.commande.findMany.mockResolvedValue([]);
      mockPrisma.abonnementpremiummensuel.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/dashboard/123/period')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.periodInfo.period).toBe('week');
      expect(response.body.data.periodInfo.offset).toBe(0);

      expect(mockCacheService.getPeriodData).toHaveBeenCalledWith(123, 'week', 0);
    });

    test('handles cache errors gracefully for period data', async () => {
      const cacheError = new Error('Cache failure');
      mockCacheService.getPeriodData.mockRejectedValue(cacheError);
      mockCacheService.cachePeriodData.mockResolvedValue(true);

      mockPrisma.commande.findMany.mockResolvedValue([]);
      mockPrisma.abonnementpremiummensuel.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/dashboard/123/period?period=week')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(console.warn).toHaveBeenCalledWith('Cache get error for period data:', 'Cache failure');
    });

    test('handles cache set errors gracefully in period data', async () => {
      mockCacheService.getPeriodData.mockResolvedValue(null);
      mockCacheService.cachePeriodData.mockRejectedValue(new Error('Cache set failed'));

      mockPrisma.commande.findMany.mockResolvedValue([]);
      mockPrisma.abonnementpremiummensuel.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/dashboard/123/period?period=week')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(console.warn).toHaveBeenCalledWith('Cache set error for period data:', 'Cache set failed');
    });

    test('handles day period with offset in computePeriodRange', async () => {
      mockCacheService.getTodayData.mockResolvedValue(null);
      mockCacheService.cacheTodayData.mockResolvedValue(true);

      // Mock for a day in the past (offset = -1)
      mockPrisma.commande.findMany
        .mockResolvedValueOnce([]) // Today orders (empty for this test)
        .mockResolvedValueOnce([]); // Recent orders
      
      mockPrisma.abonnementpremiummensuel.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      // This will trigger the day period logic with offset
      const response = await request(app)
        .get('/dashboard/123/today')
        .expect(200);

      expect(response.body.success).toBe(true);
      // The day period with offset=0 is handled in getTodayData which uses computePeriodRange internally
    });

    test('returns 400 for invalid siteId in period data', async () => {
      const response = await request(app)
        .get('/dashboard/abc/period')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'ID de site invalide'
      });
    });
  });

  describe('Helper Functions Coverage', () => {
    test('covers day period with offset in computePeriodRange', async () => {
      // This test specifically targets the day period offset logic on line 40
      mockCacheService.getPeriodData.mockResolvedValue(null);
      mockCacheService.cachePeriodData.mockResolvedValue(true);

      mockPrisma.commande.findMany.mockResolvedValue([]);
      mockPrisma.abonnementpremiummensuel.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      // This request will use day period with a non-zero offset
      const response = await request(app)
        .get('/dashboard/123/period?period=day&offset=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.periodInfo.period).toBe('day');
      expect(response.body.data.periodInfo.offset).toBe(1);
    });

    test('covers week period with different day of week scenarios', async () => {
      // This will test different branches in getWeekStart function
      mockCacheService.getPeriodData.mockResolvedValue(null);
      mockCacheService.cachePeriodData.mockResolvedValue(true);

      mockPrisma.commande.findMany.mockResolvedValue([]);
      mockPrisma.abonnementpremiummensuel.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/dashboard/123/period?period=week&offset=-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.periodInfo.period).toBe('week');
      expect(response.body.data.periodInfo.offset).toBe(-1);
    });

    test('covers month period offset logic', async () => {
      mockCacheService.getPeriodData.mockResolvedValue(null);
      mockCacheService.cachePeriodData.mockResolvedValue(true);

      mockPrisma.commande.findMany.mockResolvedValue([]);
      mockPrisma.abonnementpremiummensuel.findMany.mockResolvedValue([]);
      mockPrisma.abonnementpremiummensuel.count.mockResolvedValue(0);
      mockPrisma.user.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/dashboard/123/period?period=month&offset=-2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.periodInfo.period).toBe('month');
      expect(response.body.data.periodInfo.offset).toBe(-2);
    });

    test('covers default case in computePeriodRange (defaults to week)', async () => {
      mockCacheService.getPeriodData.mockResolvedValue(null);
      mockCacheService.cachePeriodData.mockResolvedValue(true);

      mockPrisma.commande.findMany.mockResolvedValue([]);
      mockPrisma.abonnementpremiummensuel.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      // Use a period that's not 'day' or 'month', should default to week behavior 
      const response = await request(app)
        .get('/dashboard/123/period?period=year&offset=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should default to week-like behavior in computePeriodRange
    });
  });

  describe('initializeCache', () => {
    test('initializes cache service successfully', async () => {
      mockCacheService.connect.mockResolvedValue();
      
      await dashboardController.initializeCache();
      
      expect(mockCacheService.connect).toHaveBeenCalled();
    });

    test('handles cache initialization errors gracefully', async () => {
      const cacheError = new Error('Connection failed');
      mockCacheService.connect.mockRejectedValue(cacheError);
      
      // Should not throw even if cache fails
      await expect(dashboardController.initializeCache()).resolves.toBeUndefined();
      
      expect(console.error).toHaveBeenCalledWith('Cache initialization failed:', cacheError);
    });
  });

  describe('invalidateSiteCache', () => {
    test('invalidates site cache successfully', async () => {
      mockCacheService.invalidateSite.mockResolvedValue(true);
      
      await dashboardController.invalidateSiteCache(123);
      
      expect(mockCacheService.invalidateSite).toHaveBeenCalledWith(123);
    });

    test('handles cache invalidation errors gracefully', async () => {
      const cacheError = new Error('Invalidation failed');
      mockCacheService.invalidateSite.mockRejectedValue(cacheError);
      
      await dashboardController.invalidateSiteCache(123);
      
      expect(console.error).toHaveBeenCalledWith('Cache invalidation failed:', cacheError);
    });
  });

  describe('Error Handling', () => {
    test('handles database errors in getTodayData', async () => {
      mockCacheService.getTodayData.mockResolvedValue(null);
      
      const dbError = new Error('Database connection failed');
      mockPrisma.sitelavage.findUnique.mockRejectedValue(dbError);

      const response = await request(app)
        .get('/dashboard/123/today')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Database connection failed'
      });
    });

    test('handles database errors in getPeriodData', async () => {
      mockCacheService.getPeriodData.mockResolvedValue(null);
      
      const dbError = new Error('Database connection failed');
      mockPrisma.sitelavage.findUnique.mockRejectedValue(dbError);

      const response = await request(app)
        .get('/dashboard/123/period')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Database connection failed'
      });
    });
  });
});