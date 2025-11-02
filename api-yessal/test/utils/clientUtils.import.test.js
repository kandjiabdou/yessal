// Test for clientUtils error handling when import fails
jest.resetModules();

// Mock console.warn to capture the warning
const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

// Mock prisma client
const mockFindFirst = jest.fn();
jest.mock('../../src/utils/prismaClient', () => ({
  abonnementpremiummensuel: {
    findFirst: mockFindFirst
  }
}));

// Mock the userController to throw an error during import
jest.mock('../../src/controllers/userController', () => {
  throw new Error('Module import failed');
});

describe('clientUtils import error handling', () => {
  beforeAll(() => {
    // Clear the module cache to ensure fresh import
    delete require.cache[require.resolve('../../src/utils/clientUtils')];
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  afterEach(() => {
    mockFindFirst.mockReset();
    jest.clearAllMocks();
  });

  test('should handle import error gracefully and warn', async () => {
    // Import the module after setting up the error mock
    const {
      enrichClientWithPremiumData
    } = require('../../src/utils/clientUtils');

    const client = { id: 99, typeClient: 'Premium' };
    const fakeAbonnement = { id: 99 };
    mockFindFirst.mockResolvedValueOnce(fakeAbonnement);

    const res = await enrichClientWithPremiumData(client);

    // Should warn about import failure
    expect(consoleSpy).toHaveBeenCalledWith(
      'Could not import reconcileTypeClientForUser, will skip reconciliation:', 
      'Module import failed'
    );

    // Should still work but skip reconciliation
    expect(res.abonnementPremium).toBe(fakeAbonnement);
    expect(res.typeClient).toBe('Premium');
  });

  test('should handle client reconciliation gracefully when reconcileTypeClientForUser is null', async () => {
    const {
      enrichClientWithPremiumData
    } = require('../../src/utils/clientUtils');

    const client = { id: 100, typeClient: 'Standard' };
    const fakeAbonnement = { id: 100 };
    mockFindFirst.mockResolvedValueOnce(fakeAbonnement);

    const res = await enrichClientWithPremiumData(client);

    // Should not call reconcile function (it's null due to import error)
    // Should return null abonnement because typeClient is Standard
    expect(res.abonnementPremium).toBeNull();
    expect(res.typeClient).toBe('Standard');
  });
});