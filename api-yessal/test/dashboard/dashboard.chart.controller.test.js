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
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

// Mock cache service
jest.mock('../../src/services/cacheService', () => ({
  getChartData: jest.fn(),
  cacheChartData: jest.fn(),
}));

// Import after mocking
const dashboardController = require('../../src/controllers/dashboardController');
const cacheService = require('../../src/services/cacheService');

// Create test app
const app = express();
app.use(express.json());
app.get('/dashboard/:siteId/chart-data', dashboardController.getChartData);
app.use((error, req, res, next) => {
  res.status(500).json({ success: false, message: error.message });
});

describe('Dashboard Chart Controller', () => {
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

  describe('GET /dashboard/:siteId/chart-data', () => {
    const mockSite = { id: 123, nom: 'Test Site' };
    
    beforeEach(() => {
      mockPrisma.sitelavage.findUnique.mockResolvedValue(mockSite);
    });

    test('returns cached chart data when available', async () => {
      const cachedData = {
        chartData: [
          { date: '2025-11-01', dateLabel: 'Ven 01/11', revenue: 50000, orders: 10, newClients: 3 }
        ],
        siteName: 'Test Site',
        periodInfo: { startDate: '2025-11-01', endDate: '2025-11-08', offset: 0, period: 'week', isCurrentPeriod: true }
      };

      cacheService.getChartData.mockResolvedValue(cachedData);

      const response = await request(app)
        .get('/dashboard/123/chart-data?period=week&offset=0')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: cachedData
      });

      expect(cacheService.getChartData).toHaveBeenCalledWith(123, 'week', 0);
      expect(mockPrisma.sitelavage.findUnique).not.toHaveBeenCalled();
    });

    test('generates weekly chart data when cache miss', async () => {
      cacheService.getChartData.mockResolvedValue(null);
      cacheService.cacheChartData.mockResolvedValue(true);

      // Mock orders, clients, and subscriptions for each day
      const mockDayData = (dayOffset) => [
        // Orders for the day
        [
          { prixPaye: 10000 },
          { prixPaye: 15000 }
        ],
        // New clients count
        dayOffset === 0 ? 2 : 1,
        // Subscriptions for the day
        [
          { montant: 5000 }
        ]
      ];

      mockPrisma.commande.findMany.mockImplementation((query) => {
        const dayOffset = query.where.dateHeureCommande.gte.getDate() % 7;
        return Promise.resolve(mockDayData(dayOffset)[0]);
      });
      
      mockPrisma.user.count.mockImplementation((query) => {
        const dayOffset = query.where.createdAt.gte.getDate() % 7;
        return Promise.resolve(mockDayData(dayOffset)[1]);
      });
      
      mockPrisma.abonnementpremiummensuel.findMany.mockImplementation((query) => {
        const dayOffset = query.where.createdAt.gte.getDate() % 7;
        return Promise.resolve(mockDayData(dayOffset)[2]);
      });

      const response = await request(app)
        .get('/dashboard/123/chart-data?period=week&offset=0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chartData).toHaveLength(7);
      expect(response.body.data.siteName).toBe('Test Site');
      expect(response.body.data.periodInfo.period).toBe('week');
      expect(response.body.data.chartData[0]).toHaveProperty('date');
      expect(response.body.data.chartData[0]).toHaveProperty('dateLabel');
      expect(response.body.data.chartData[0]).toHaveProperty('revenue');
      expect(response.body.data.chartData[0]).toHaveProperty('orders');
      expect(response.body.data.chartData[0]).toHaveProperty('newClients');

      expect(cacheService.cacheChartData).toHaveBeenCalledWith(
        123,
        'week',
        0,
        expect.objectContaining({
          chartData: expect.arrayContaining([
            expect.objectContaining({
              revenue: expect.any(Number),
              orders: expect.any(Number),
              newClients: expect.any(Number)
            })
          ])
        })
      );
    });

    test('generates monthly chart data when cache miss', async () => {
      cacheService.getChartData.mockResolvedValue(null);
      cacheService.cacheChartData.mockResolvedValue(true);

      // Mock weekly data for the month
      mockPrisma.commande.findMany.mockResolvedValue([
        { prixPaye: 50000 },
        { prixPaye: 75000 }
      ]);
      mockPrisma.user.count.mockResolvedValue(5);
      mockPrisma.abonnementpremiummensuel.findMany.mockResolvedValue([
        { montant: 10000 }
      ]);

      const response = await request(app)
        .get('/dashboard/123/chart-data?period=month&offset=0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chartData.length).toBeGreaterThan(0);
      expect(response.body.data.siteName).toBe('Test Site');
      expect(response.body.data.periodInfo.period).toBe('month');
      
      // Check that data includes week labels
      expect(response.body.data.chartData[0].dateLabel).toMatch(/^S\d+/);
    });

    test('handles cache errors gracefully and continues with database query', async () => {
      const cacheError = new Error('Cache connection failed');
      cacheService.getChartData.mockRejectedValue(cacheError);
      cacheService.cacheChartData.mockResolvedValue(true);

      mockPrisma.commande.findMany.mockResolvedValue([{ prixPaye: 10000 }]);
      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.abonnementpremiummensuel.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/dashboard/123/chart-data?period=week&offset=0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(console.warn).toHaveBeenCalledWith('Cache get error for chart data:', 'Cache connection failed');
    });

    test('handles cache set errors gracefully', async () => {
      cacheService.getChartData.mockResolvedValue(null);
      cacheService.cacheChartData.mockRejectedValue(new Error('Cache set failed'));

      mockPrisma.commande.findMany.mockResolvedValue([{ prixPaye: 10000 }]);
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.abonnementpremiummensuel.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/dashboard/123/chart-data?period=week&offset=0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(console.warn).toHaveBeenCalledWith('Cache set error for chart data:', 'Cache set failed');
    });

    test('returns 400 for invalid siteId', async () => {
      const response = await request(app)
        .get('/dashboard/invalid/chart-data')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'ID de site invalide'
      });
    });

    test('returns 400 for invalid period', async () => {
      const response = await request(app)
        .get('/dashboard/123/chart-data?period=invalid')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Période invalide. Utilisez "week" ou "month"'
      });
    });

    test('returns 404 for non-existent site', async () => {
      cacheService.getChartData.mockResolvedValue(null);
      mockPrisma.sitelavage.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/dashboard/999/chart-data?period=week')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Site non trouvé'
      });
    });

    test('uses default parameters when not provided', async () => {
      cacheService.getChartData.mockResolvedValue(null);
      cacheService.cacheChartData.mockResolvedValue(true);

      mockPrisma.commande.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.abonnementpremiummensuel.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/dashboard/123/chart-data')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.periodInfo.period).toBe('week');
      expect(response.body.data.periodInfo.offset).toBe(0);

      expect(cacheService.getChartData).toHaveBeenCalledWith(123, 'week', 0);
    });

    test('handles database errors properly', async () => {
      cacheService.getChartData.mockResolvedValue(null);
      
      const dbError = new Error('Database connection failed');
      mockPrisma.commande.findMany.mockRejectedValue(dbError);

      const response = await request(app)
        .get('/dashboard/123/chart-data?period=week')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Database connection failed'
      });
    });

    test('validates siteId with helper function correctly', async () => {
      const response = await request(app)
        .get('/dashboard/abc/chart-data?period=week')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'ID de site invalide'
      });
    });

    test('validates period with helper function correctly', async () => {
      const response = await request(app)
        .get('/dashboard/123/chart-data?period=invalid')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Période invalide. Utilisez "week" ou "month"'
      });
    });

    test('calculates revenue correctly including subscriptions', async () => {
      cacheService.getChartData.mockResolvedValue(null);
      cacheService.cacheChartData.mockResolvedValue(true);

      // Mock first day with orders and subscriptions
      let callCount = 0;
      mockPrisma.commande.findMany.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve([{ prixPaye: 10000 }, { prixPaye: 15000 }]);
        }
        return Promise.resolve([]);
      });

      let userCallCount = 0;
      mockPrisma.user.count.mockImplementation(() => {
        userCallCount++;
        if (userCallCount === 1) {
          return Promise.resolve(2);
        }
        return Promise.resolve(0);
      });

      let subCallCount = 0;
      mockPrisma.abonnementpremiummensuel.findMany.mockImplementation(() => {
        subCallCount++;
        if (subCallCount === 1) {
          return Promise.resolve([{ montant: 5000 }]);
        }
        return Promise.resolve([]);
      });

      const response = await request(app)
        .get('/dashboard/123/chart-data?period=week&offset=0')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // First day should have combined revenue from orders (25000) + subscription (5000) = 30000
      const firstDay = response.body.data.chartData[0];
      expect(firstDay.revenue).toBe(30000);
      expect(firstDay.orders).toBe(2);
      expect(firstDay.newClients).toBe(2);

      // Other days should have zero values
      const otherDays = response.body.data.chartData.slice(1);
      for (const day of otherDays) {
        expect(day.revenue).toBe(0);
        expect(day.orders).toBe(0);
        expect(day.newClients).toBe(0);
      }
    });

    test('covers helper function boundaries in dashboard controller', async () => {
      cacheService.getChartData.mockResolvedValue(null);
      cacheService.cacheChartData.mockResolvedValue(true);

      // Test month period boundary logic in generateMonthlyChartData
      mockPrisma.commande.findMany.mockResolvedValue([{ prixPaye: 10000 }]);
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.abonnementpremiummensuel.findMany.mockResolvedValue([{ montant: 5000 }]);

      const response = await request(app)
        .get('/dashboard/123/chart-data?period=month&offset=-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.periodInfo.period).toBe('month');
      expect(response.body.data.periodInfo.offset).toBe(-1);
      expect(response.body.data.chartData.length).toBeGreaterThan(0);
      
      // Test that week labels are properly formatted
      expect(response.body.data.chartData[0].dateLabel).toMatch(/^S\d+/);
    });
  });
});