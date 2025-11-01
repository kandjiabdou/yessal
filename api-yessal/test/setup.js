// Test setup: set test environment and provide lightweight mocks
process.env.NODE_ENV = 'test';

// Mock Prisma client used across the app to avoid real DB connections
jest.mock('../src/utils/prismaClient', () => {
  const fn = () => jest.fn();
  return {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn()
    },
    fidelite: {
      findUnique: jest.fn(),
      create: jest.fn()
    },
    abonnementpremiummensuel: {
      findFirst: jest.fn()
    },
    commande: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn()
    },
    clientinvite: {
      create: jest.fn()
    },
    $on: jest.fn(),
    $disconnect: jest.fn()
  };
});

// Replace authentication middleware so tests can set a test user via header
jest.mock('../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    const header = req.headers['x-test-user'];
    if (header) {
      try {
        req.user = JSON.parse(header);
      } catch (e) {
        // ignore parse error
      }
    }
    return next();
  },
  authorize: (roles = []) => (req, res, next) => next()
}));

// Helpful global for clearing mocks between tests
afterEach(() => {
  jest.clearAllMocks();
});
