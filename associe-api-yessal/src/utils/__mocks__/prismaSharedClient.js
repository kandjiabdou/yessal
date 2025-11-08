const mockPrismaShared = {
  fluxFinancier: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn()
  },
  $disconnect: jest.fn()
};

module.exports = mockPrismaShared;
