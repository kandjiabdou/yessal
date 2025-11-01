// Ensure mocks are set up before requiring the module under test
jest.resetModules();

// Mock prisma client used by clientUtils
const mockFindFirst = jest.fn();
jest.mock('../../src/utils/prismaClient', () => ({
  abonnementpremiummensuel: {
    findFirst: mockFindFirst
  }
}));

// Provide a mocked reconcileTypeClientForUser before loading clientUtils
jest.mock('../../src/controllers/userController', () => ({
  reconcileTypeClientForUser: jest.fn(async (client) => {
    // default mock will not change the type unless test overrides
    return client;
  })
}));

const {
  getCurrentPremiumSubscription,
  enrichClientWithPremiumData,
  enrichClientsWithPremiumData
} = require('../../src/utils/clientUtils');

const { reconcileTypeClientForUser } = require('../../src/controllers/userController');

describe('clientUtils', () => {
  afterEach(() => {
    mockFindFirst.mockReset();
    jest.clearAllMocks();
  });

  test('getCurrentPremiumSubscription returns abonnement when found', async () => {
    const fakeAbonnement = { id: 1, annee: 2025, mois: 11, limiteKg: 40 };
    mockFindFirst.mockResolvedValueOnce(fakeAbonnement);

    const res = await getCurrentPremiumSubscription(123);
    expect(mockFindFirst).toHaveBeenCalled();
    expect(res).toBe(fakeAbonnement);
  });

  test('enrichClientWithPremiumData returns abonnementPremium when client reconciled to Premium', async () => {
    const client = { id: 42, typeClient: 'Standard' };
    const fakeAbonnement = { id: 2 };
    mockFindFirst.mockResolvedValueOnce(fakeAbonnement);

    // make reconcile modify client to Premium
    reconcileTypeClientForUser.mockImplementationOnce(async (c) => { c.typeClient = 'Premium'; return c; });

    const res = await enrichClientWithPremiumData(client);
    expect(reconcileTypeClientForUser).toHaveBeenCalled();
    expect(res.abonnementPremium).toBe(fakeAbonnement);
    expect(res.typeClient).toBe('Premium');
  });

  test('enrichClientWithPremiumData returns null abonnement when still not Premium', async () => {
    const client = { id: 43, typeClient: 'Standard' };
    mockFindFirst.mockResolvedValueOnce({ id: 3 });

    // reconcile leaves typeClient as Standard
    reconcileTypeClientForUser.mockImplementationOnce(async (c) => c);

    const res = await enrichClientWithPremiumData(client);
    expect(reconcileTypeClientForUser).toHaveBeenCalled();
    expect(res.abonnementPremium).toBeNull();
  });

  test('enrichClientsWithPremiumData maps list correctly', async () => {
    const clients = [{ id: 1, typeClient: 'Standard' }, { id: 2, typeClient: 'Standard' }];
    mockFindFirst.mockResolvedValue(null);

    // ensure reconcile doesn't convert them to Premium
    reconcileTypeClientForUser.mockImplementation(async (c) => c);

    const res = await enrichClientsWithPremiumData(clients);
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(2);
    expect(res[0].abonnementPremium).toBeNull();
  });
});
