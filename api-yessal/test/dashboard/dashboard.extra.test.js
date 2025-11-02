const request = require('supertest');

// Mutable prisma mock used by the controller module at runtime
let prismaMock = {
  sitelavage: { findUnique: jest.fn() },
  commande: { findMany: jest.fn(), count: jest.fn() },
  abonnementpremiummensuel: { findMany: jest.fn(), count: jest.fn() },
  user: { count: jest.fn() }
};

jest.doMock('@prisma/client', () => ({
  PrismaClient: function () { return prismaMock; }
}));

// Mock the cache service
jest.doMock('../../src/services/cacheService', () => 
  require('../mocks/cacheService.mock')
);

const app = require('../../src/app');
const dashboardController = require('../../src/controllers/dashboardController');

describe('Dashboard extra routes and error branches', () => {
  afterEach(() => jest.clearAllMocks());

  test('GET /api/dashboard/:siteId/period - week period and offset uses week-start logic and sets abonnementsEnCours=0', async () => {
    const site = { id: 7, nom: 'WeekSite' };
    prismaMock.sitelavage.findUnique.mockResolvedValue(site);

    // periodOrders minimal
    const periodOrders = [ { id: 1, prixPaye: 100, masseVerifieeKg: 2, estEnLivraison: false, statut: 'Livre' } ];
    prismaMock.commande.findMany.mockResolvedValue(periodOrders);
    prismaMock.abonnementpremiummensuel.findMany.mockResolvedValue([]);
    prismaMock.user.count.mockResolvedValue(0);

    const res = await request(app).get('/api/dashboard/7/period?period=week&offset=1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { periodStats } = res.body.data;
    expect(periodStats.totalCommandes).toBe(1);
    // since period != month, abonnementsEnCours should be 0
    expect(periodStats.totalAbonnementsEnCours).toBe(0);
    // totalRevenue equals prixPaye (no abonnement)
    expect(periodStats.totalRevenue).toBeGreaterThanOrEqual(100);
  });

  test('GET /api/dashboard/:siteId/period - day period with offset triggers day-branch offset code', async () => {
    const site = { id: 8, nom: 'DaySite' };
    prismaMock.sitelavage.findUnique.mockResolvedValue(site);

    const periodOrders = [];
    prismaMock.commande.findMany.mockResolvedValue(periodOrders);
    prismaMock.abonnementpremiummensuel.findMany.mockResolvedValue([]);
    prismaMock.user.count.mockResolvedValue(0);

    const res = await request(app).get('/api/dashboard/8/period?period=day&offset=2');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { periodStats } = res.body.data;
    expect(periodStats.totalCommandes).toBe(0);
  });

  test('GET /api/dashboard/:siteId/today forwards DB errors (covers catch next in getTodayData)', async () => {
    // make commande.findMany throw to force catch
    prismaMock.sitelavage.findUnique.mockResolvedValue({ id: 9, nom: 'ErrSite' });
    prismaMock.commande.findMany.mockImplementation(() => { throw new Error('db fail today'); });

    const res = await request(app).get('/api/dashboard/9/today');
    expect(res.status).toBe(500);

    // Also directly invoke controller to assert next(error) is called
    const req = { params: { siteId: '9' } };
    const resMock = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await dashboardController.getTodayData(req, resMock, next);
    expect(next).toHaveBeenCalled();
  });

  test('GET /api/dashboard/:siteId/period forwards DB errors (covers catch next in getPeriodData)', async () => {
    prismaMock.sitelavage.findUnique.mockResolvedValue({ id: 11, nom: 'ErrPeriod' });
    prismaMock.commande.findMany.mockImplementation(() => { throw new Error('db fail period'); });

    const res = await request(app).get('/api/dashboard/11/period');
    expect(res.status).toBe(500);

    const req = { params: { siteId: '11' }, query: {} };
    const resMock = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await dashboardController.getPeriodData(req, resMock, next);
    expect(next).toHaveBeenCalled();
  });
});
