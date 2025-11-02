const request = require('supertest');

// Mutable prisma mock
let prismaMock = {
  sitelavage: { findUnique: jest.fn() },
  commande: { findMany: jest.fn(), count: jest.fn() },
  abonnementpremiummensuel: { findMany: jest.fn(), count: jest.fn() },
  user: { count: jest.fn() }
};

// Mutable cache mock
let cacheMock = {
  connect: jest.fn().mockResolvedValue(undefined),
  getTodayData: jest.fn(),
  cacheTodayData: jest.fn().mockResolvedValue(true),
  getPeriodData: jest.fn(),
  cachePeriodData: jest.fn().mockResolvedValue(true),
  invalidateSite: jest.fn().mockResolvedValue(true)
};

jest.doMock('@prisma/client', () => ({
  PrismaClient: function () { return prismaMock; }
}));

jest.doMock('../../src/services/cacheService', () => cacheMock);

const app = require('../../src/app');
const dashboardController = require('../../src/controllers/dashboardController');

describe('Dashboard Controller with Cache Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cache Hit Scenarios', () => {
    test('GET /api/dashboard/:siteId/today - should return cached data when available', async () => {
      const cachedTodayData = {
        todayStats: {
          totalCommandes: 3,
          totalRevenue: 1500,
          totalPoidsKg: 7,
          totalLivraisons: 2,
          totalAbonnementsCreated: 1,
          totalAbonnementMontant: 10000,
          totalNewClients: 2
        },
        recentOrders: [
          {
            id: 1,
            clientName: 'John Doe',
            prixPaye: 500,
            masseClientIndicativeKg: 2,
            statut: 'Livre',
            dateHeureCommande: '2025-11-02T10:00:00.000Z'
          }
        ],
        siteName: 'Test Site Cache'
      };
      
      cacheMock.getTodayData.mockResolvedValueOnce(cachedTodayData);

      const res = await request(app).get('/api/dashboard/1/today');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(cachedTodayData);
      expect(cacheMock.getTodayData).toHaveBeenCalledWith(1);
      // Should not call prisma since cache hit
      expect(prismaMock.sitelavage.findUnique).not.toHaveBeenCalled();
    });

    test('GET /api/dashboard/:siteId/period - should return cached period data when available', async () => {
      const cachedPeriodData = {
        periodStats: {
          totalCommandes: 10,
          totalRevenue: 5000,
          totalPoidsKg: 25,
          totalLivraisons: 8,
          totalAbonnementsCreated: 2,
          totalAbonnementMontant: 20000,
          totalNewClients: 5,
          totalAbonnementsEnCours: 15
        },
        siteName: 'Test Site Cache',
        periodInfo: {
          startDate: '2025-10-28T00:00:00.000Z',
          endDate: '2025-11-04T00:00:00.000Z',
          offset: 0,
          period: 'week',
          isCurrentPeriod: true
        }
      };
      
      cacheMock.getPeriodData.mockResolvedValueOnce(cachedPeriodData);

      const res = await request(app).get('/api/dashboard/1/period?period=week&offset=0');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(cachedPeriodData);
      expect(cacheMock.getPeriodData).toHaveBeenCalledWith(1, 'week', 0);
      // Should not call prisma since cache hit
      expect(prismaMock.sitelavage.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('Cache Miss Scenarios', () => {
    test('GET /api/dashboard/:siteId/today - should fetch from DB and cache when cache miss', async () => {
      cacheMock.getTodayData.mockResolvedValueOnce(null); // Cache miss
      
      const site = { id: 1, nom: 'TestSite' };
      prismaMock.sitelavage.findUnique.mockResolvedValue(site);

      const now = new Date();
      const todayOrders = [
        { id: 10, prixPaye: 500, masseVerifieeKg: 2, estEnLivraison: true, statut: 'Livre' },
        { id: 11, prixPaye: 300, masseClientIndicativeKg: 3, estEnLivraison: false, statut: 'PrisEnCharge' }
      ];

      const recentOrders = [
        { id: 10, clientUser: { prenom: 'A', nom: 'B' }, prixPaye: 500, masseClientIndicativeKg: 2, statut: 'Livre', dateHeureCommande: now }
      ];

      prismaMock.commande.findMany
        .mockResolvedValueOnce(todayOrders)
        .mockResolvedValueOnce(recentOrders);

      prismaMock.abonnementpremiummensuel.findMany.mockResolvedValue([{ montant: 15000 }]);
      prismaMock.user.count.mockResolvedValue(2);

      const res = await request(app).get('/api/dashboard/1/today');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(cacheMock.getTodayData).toHaveBeenCalledWith(1);
      expect(prismaMock.sitelavage.findUnique).toHaveBeenCalled();
      expect(prismaMock.commande.findMany).toHaveBeenCalledTimes(2);
      expect(cacheMock.cacheTodayData).toHaveBeenCalledWith(1, expect.objectContaining({
        todayStats: expect.any(Object),
        recentOrders: expect.any(Array),
        siteName: site.nom
      }));
    });

    test('GET /api/dashboard/:siteId/period - should fetch from DB and cache when cache miss', async () => {
      cacheMock.getPeriodData.mockResolvedValueOnce(null); // Cache miss
      
      const site = { id: 2, nom: 'PeriodSite' };
      prismaMock.sitelavage.findUnique.mockResolvedValue(site);

      const periodOrders = [{ id: 21, prixPaye: 200, masseVerifieeKg: 1, estEnLivraison: false, statut: 'Livre' }];
      prismaMock.commande.findMany.mockResolvedValue(periodOrders);
      prismaMock.abonnementpremiummensuel.findMany.mockResolvedValue([{ montant: 5000 }]);
      prismaMock.abonnementpremiummensuel.count.mockResolvedValue(2);
      prismaMock.user.count.mockResolvedValue(3);

      const res = await request(app).get('/api/dashboard/2/period?period=month&offset=-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(cacheMock.getPeriodData).toHaveBeenCalledWith(2, 'month', -1);
      expect(prismaMock.sitelavage.findUnique).toHaveBeenCalled();
      expect(prismaMock.commande.findMany).toHaveBeenCalled();
      expect(cacheMock.cachePeriodData).toHaveBeenCalledWith(2, 'month', -1, expect.objectContaining({
        periodStats: expect.any(Object),
        siteName: site.nom,
        periodInfo: expect.any(Object)
      }));
    });
  });

  describe('Cache Error Handling', () => {
    test('should handle cache get errors gracefully for today data', async () => {
      // Mock console.warn to avoid test output pollution
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      cacheMock.getTodayData.mockRejectedValueOnce(new Error('Cache error'));
      
      const site = { id: 1, nom: 'TestSite' };
      prismaMock.sitelavage.findUnique.mockResolvedValue(site);
      prismaMock.commande.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prismaMock.abonnementpremiummensuel.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      const res = await request(app).get('/api/dashboard/1/today');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Should still work even if cache fails
      expect(prismaMock.sitelavage.findUnique).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Cache get error for today data:', 'Cache error');
      
      consoleSpy.mockRestore();
    });

    test('should handle cache set errors gracefully', async () => {
      // Mock console.warn to avoid test output pollution
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      cacheMock.getTodayData.mockResolvedValueOnce(null);
      cacheMock.cacheTodayData.mockRejectedValueOnce(new Error('Cache set error'));
      
      const site = { id: 1, nom: 'TestSite' };
      prismaMock.sitelavage.findUnique.mockResolvedValue(site);
      prismaMock.commande.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prismaMock.abonnementpremiummensuel.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      const res = await request(app).get('/api/dashboard/1/today');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Should still return data even if caching fails
      expect(consoleSpy).toHaveBeenCalledWith('Cache set error for today data:', 'Cache set error');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Controller Helper Methods', () => {
    test('initializeCache should call cache service connect', async () => {
      await dashboardController.initializeCache();
      expect(cacheMock.connect).toHaveBeenCalled();
    });

    test('initializeCache should handle cache connection errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      cacheMock.connect.mockRejectedValueOnce(new Error('Connection failed'));
      // Should not throw
      await expect(dashboardController.initializeCache()).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Cache initialization failed:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    test('invalidateSiteCache should call cache service invalidate', async () => {
      await dashboardController.invalidateSiteCache(123);
      expect(cacheMock.invalidateSite).toHaveBeenCalledWith(123);
    });

    test('invalidateSiteCache should handle cache errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      cacheMock.invalidateSite.mockRejectedValueOnce(new Error('Invalidation failed'));
      // Should not throw
      await expect(dashboardController.invalidateSiteCache(123)).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Cache invalidation failed:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    test('should handle site not found with cache miss', async () => {
      cacheMock.getTodayData.mockResolvedValueOnce(null);
      prismaMock.sitelavage.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/dashboard/999/today');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(cacheMock.getTodayData).toHaveBeenCalledWith(999);
      expect(prismaMock.sitelavage.findUnique).toHaveBeenCalled();
      expect(cacheMock.cacheTodayData).not.toHaveBeenCalled();
    });

    test('should handle invalid siteId parsing', async () => {
      const res = await request(app).get('/api/dashboard/invalid/today');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      // Could be either our custom message or a validation error from middleware
      expect(res.body.message).toMatch(/invalide|Validation error/i);
      // Cache should not be called for invalid siteId
      expect(cacheMock.getTodayData).not.toHaveBeenCalled();
    });
  });
});