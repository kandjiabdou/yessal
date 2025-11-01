const request = require('supertest');

// We'll use a mutable `prismaMock` so tests can change return values between tests.
// Use `jest.doMock` (runtime mock) so the factory can close over this variable safely.
let prismaMock = {
  sitelavage: { findUnique: jest.fn() },
  commande: { findMany: jest.fn(), count: jest.fn() },
  abonnementpremiummensuel: { findMany: jest.fn(), count: jest.fn() },
  user: { count: jest.fn() }
};

jest.doMock('@prisma/client', () => ({
  PrismaClient: function () {
    return prismaMock;
  }
}));

// Require app after we set up the runtime mock
const app = require('../../src/app');

describe('Dashboard routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/dashboard/:siteId/today - 404 when site not found', async () => {
    prismaMock.sitelavage.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/dashboard/123/today');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/dashboard/:siteId/today - returns computed today stats and recent orders', async () => {
    const site = { id: 1, nom: 'TestSite' };
    prismaMock.sitelavage.findUnique.mockResolvedValue(site);

    // todayOrders (first findMany) - minimal fields
    const now = new Date();
    const todayOrders = [
      { id: 10, prixPaye: 500, masseVerifieeKg: 2, estEnLivraison: true, statut: 'Livre' },
      { id: 11, prixPaye: 0, masseClientIndicativeKg: 3, estEnLivraison: false, statut: 'PrisEnCharge' }
    ];

    // recentOrders (second findMany)
    const recentOrders = [
      { id: 10, clientUser: { prenom: 'A', nom: 'B' }, prixPaye: 500, masseClientIndicativeKg: 2, statut: 'Livre', dateHeureCommande: now },
      { id: 11, clientInvite: { nom: 'Guest' }, prixPaye: 0, masseClientIndicativeKg: 3, statut: 'PrisEnCharge', dateHeureCommande: now }
    ];

    // Hook up the two findMany calls in order
    prismaMock.commande.findMany
      .mockResolvedValueOnce(todayOrders)
      .mockResolvedValueOnce(recentOrders);

    // subscriptions and users
    prismaMock.abonnementpremiummensuel.findMany.mockResolvedValue([{ montant: 15000 }]);
    prismaMock.user.count.mockResolvedValue(2);

    const res = await request(app).get('/api/dashboard/1/today');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { todayStats, recentOrders: recent, siteName } = res.body.data;
    expect(siteName).toBe(site.nom);
    expect(todayStats.totalCommandes).toBe(2);
    // totalRevenue includes abonnement montant
    expect(todayStats.totalRevenue).toBeGreaterThanOrEqual(500);
    expect(recent.length).toBe(2);
    expect(prismaMock.abonnementpremiummensuel.findMany).toHaveBeenCalled();
    expect(prismaMock.user.count).toHaveBeenCalled();
  });

  test('GET /api/dashboard/:siteId/period - 404 when site not found', async () => {
    prismaMock.sitelavage.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/dashboard/5/period');

    expect(res.status).toBe(404);
  });

  test('GET /api/dashboard/:siteId/period - returns period stats and periodInfo', async () => {
    const site = { id: 2, nom: 'PeriodSite' };
    prismaMock.sitelavage.findUnique.mockResolvedValue(site);

    const periodOrders = [{ id: 21, prixPaye: 200, masseVerifieeKg: 1, estEnLivraison: false, statut: 'Livre' }];
    prismaMock.commande.findMany.mockResolvedValue(periodOrders);
    prismaMock.commande.count.mockResolvedValue(1);
    prismaMock.abonnementpremiummensuel.findMany.mockResolvedValue([{ montant: 5000 }]);
    prismaMock.user.count.mockResolvedValue(3);
    prismaMock.abonnementpremiummensuel.count.mockResolvedValue(2);

    const res = await request(app).get('/api/dashboard/2/period?period=month');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { periodStats, periodInfo, siteName } = res.body.data;
    expect(siteName).toBe(site.nom);
    expect(periodStats.totalCommandes).toBe(1);
    expect(periodInfo.period).toBe('month');
    expect(periodStats.totalAbonnementsEnCours).toBeDefined();
  });
});
