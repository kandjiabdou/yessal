// Mock cache service for testing
const mockCacheService = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  getTodayData: jest.fn().mockResolvedValue(null),
  cacheTodayData: jest.fn().mockResolvedValue(true),
  getPeriodData: jest.fn().mockResolvedValue(null),
  cachePeriodData: jest.fn().mockResolvedValue(true),
  invalidateSite: jest.fn().mockResolvedValue(true),
  isAvailable: jest.fn().mockReturnValue(false), // Default to cache disabled in tests
  getStats: jest.fn().mockResolvedValue({ available: false })
};

module.exports = mockCacheService;