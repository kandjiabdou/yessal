const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn()
  },
  sitelavage: {
    findUnique: jest.fn(),
    findMany: jest.fn()
  },
  $disconnect: jest.fn()
};

module.exports = mockPrisma;
