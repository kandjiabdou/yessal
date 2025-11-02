const cacheService = require('../../src/services/cacheService');
const { logger } = require('../../src/utils/logger');

// Mock Redis client
const mockRedisClient = {
  connect: jest.fn(),
  get: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  info: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
};

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }
}));

// Mock redis client creation
jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient)
}));

describe('CacheService - Chart Methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset cache service state
    cacheService.client = mockRedisClient;
    cacheService.isConnected = true;
    cacheService.isConnecting = false;
  });

  describe('Chart Cache Key Generation', () => {
    test('generates correct cache key for chart data', () => {
      const key = cacheService.generateCacheKey('chart', 123, 'week', 0);
      expect(key).toBe('dashboard:123:chart:week:0');
    });

    test('generates correct cache key for chart data with negative offset', () => {
      const key = cacheService.generateCacheKey('chart', 456, 'month', -2);
      expect(key).toBe('dashboard:456:chart:month:-2');
    });
  });

  describe('Chart TTL Determination', () => {
    test('determines correct TTL for current week chart data', () => {
      const ttl = cacheService.determineTTL('chart', 'week', 0);
      expect(ttl).toBe(3600); // 1 hour for current period
    });

    test('determines correct TTL for past week chart data', () => {
      const ttl = cacheService.determineTTL('chart', 'week', -1);
      expect(ttl).toBe(86400); // 24 hours for historical data
    });

    test('determines correct TTL for current month chart data', () => {
      const ttl = cacheService.determineTTL('chart', 'month', 0);
      expect(ttl).toBe(3600); // 1 hour for current period
    });

    test('determines correct TTL for past month chart data', () => {
      const ttl = cacheService.determineTTL('chart', 'month', -1);
      expect(ttl).toBe(86400); // 24 hours for historical data
    });

    test('determines correct TTL for future chart data', () => {
      const ttl = cacheService.determineTTL('chart', 'week', 1);
      expect(ttl).toBe(300); // 5 minutes for future data
    });

    test('uses environment variables for TTL configuration', () => {
      const originalEnv = process.env.CACHE_HISTORICAL_TTL;
      process.env.CACHE_HISTORICAL_TTL = '7200'; // 2 hours
      
      const ttl = cacheService.determineTTL('chart', 'week', -1);
      expect(ttl).toBe(7200);
      
      // Restore original env
      if (originalEnv) {
        process.env.CACHE_HISTORICAL_TTL = originalEnv;
      } else {
        delete process.env.CACHE_HISTORICAL_TTL;
      }
    });
  });

  describe('Chart Data Caching', () => {
    test('caches chart data successfully', async () => {
      const chartData = {
        chartData: [
          { date: '2025-11-01', dateLabel: 'Ven 01/11', revenue: 50000, orders: 10, newClients: 3 }
        ],
        siteName: 'Test Site',
        periodInfo: { startDate: '2025-11-01', endDate: '2025-11-08', offset: 0, period: 'week', isCurrentPeriod: true }
      };
      
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const result = await cacheService.cacheChartData(123, 'week', 0, chartData);
      
      expect(result).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'dashboard:123:chart:week:0',
        3600, // TTL for current period
        JSON.stringify(chartData)
      );
    });

    test('handles chart data caching errors gracefully', async () => {
      const chartData = { chartData: [], siteName: 'Test Site' };
      const error = new Error('Redis connection failed');
      
      mockRedisClient.setEx.mockRejectedValue(error);
      
      const result = await cacheService.cacheChartData(123, 'week', 0, chartData);
      
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Cache set error for key dashboard:123:chart:week:0:',
        error
      );
    });

    test('returns false when Redis is not connected for caching', async () => {
      cacheService.isConnected = false;
      
      const result = await cacheService.cacheChartData(123, 'week', 0, {});
      
      expect(result).toBe(false);
      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });
  });

  describe('Chart Data Retrieval', () => {
    test('retrieves chart data successfully from cache', async () => {
      const cachedData = {
        chartData: [
          { date: '2025-11-01', dateLabel: 'Ven 01/11', revenue: 50000, orders: 10, newClients: 3 }
        ],
        siteName: 'Test Site'
      };
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));
      
      const result = await cacheService.getChartData(123, 'week', 0);
      
      expect(result).toEqual(cachedData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('dashboard:123:chart:week:0');
    });

    test('returns null when no chart data is cached', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      
      const result = await cacheService.getChartData(123, 'week', 0);
      
      expect(result).toBeNull();
    });

    test('handles chart data retrieval errors gracefully', async () => {
      const error = new Error('Redis get failed');
      mockRedisClient.get.mockRejectedValue(error);
      
      const result = await cacheService.getChartData(123, 'week', 0);
      
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Cache get error for key dashboard:123:chart:week:0:',
        error
      );
    });

    test('returns null when Redis is not connected for retrieval', async () => {
      cacheService.isConnected = false;
      
      const result = await cacheService.getChartData(123, 'week', 0);
      
      expect(result).toBeNull();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    test('handles invalid JSON in cached chart data', async () => {
      mockRedisClient.get.mockResolvedValue('invalid-json');
      
      const result = await cacheService.getChartData(123, 'week', 0);
      
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Chart Cache Integration', () => {
    test('caches and retrieves chart data end-to-end', async () => {
      const chartData = {
        chartData: [
          { date: '2025-11-01', dateLabel: 'Ven 01/11', revenue: 50000, orders: 10, newClients: 3 },
          { date: '2025-11-02', dateLabel: 'Sam 02/11', revenue: 30000, orders: 6, newClients: 1 }
        ],
        siteName: 'Test Site',
        periodInfo: { startDate: '2025-11-01', endDate: '2025-11-08', offset: 0, period: 'week', isCurrentPeriod: true }
      };
      
      // Mock successful cache set
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      // Cache the data
      const cacheResult = await cacheService.cacheChartData(123, 'week', 0, chartData);
      expect(cacheResult).toBe(true);
      
      // Mock successful retrieval
      mockRedisClient.get.mockResolvedValue(JSON.stringify(chartData));
      
      // Retrieve the data
      const retrievedData = await cacheService.getChartData(123, 'week', 0);
      expect(retrievedData).toEqual(chartData);
    });

    test('invalidates chart data when invalidating site cache', async () => {
      mockRedisClient.keys.mockResolvedValue([
        'dashboard:123:chart:week:0',
        'dashboard:123:chart:month:-1',
        'dashboard:123:today',
        'dashboard:123:period:week:0'
      ]);
      mockRedisClient.del.mockResolvedValue(4);
      
      const result = await cacheService.invalidateSite(123);
      
      expect(result).toBe(true);
      expect(mockRedisClient.keys).toHaveBeenCalledWith('dashboard:123:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith([
        'dashboard:123:chart:week:0',
        'dashboard:123:chart:month:-1',
        'dashboard:123:today',
        'dashboard:123:period:week:0'
      ]);
    });

    test('handles connection management and error scenarios comprehensively', async () => {
      // Test connect method
      cacheService.client = null;
      cacheService.isConnected = false;
      cacheService.isConnecting = false;

      mockRedisClient.connect.mockResolvedValue();
      
      await cacheService.connect();
      
      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    test('covers additional cache service methods', async () => {
      cacheService.client = mockRedisClient;
      cacheService.isConnected = true;

      // Test isAvailable
      expect(cacheService.isAvailable()).toBe(mockRedisClient);

      // Test getStats
      mockRedisClient.info
        .mockResolvedValueOnce('memory_info')
        .mockResolvedValueOnce('keyspace_info');
      
      const stats = await cacheService.getStats();
      expect(stats).toEqual({
        available: true,
        memory: 'memory_info',
        keyspace: 'keyspace_info',
        connected: true
      });

      // Test disconnect
      mockRedisClient.disconnect.mockResolvedValue();
      await cacheService.disconnect();
      expect(mockRedisClient.disconnect).toHaveBeenCalled();
      expect(cacheService.isConnected).toBe(false);
    });

    test('covers today and period data cache methods', async () => {
      cacheService.client = mockRedisClient;
      cacheService.isConnected = true;

      const testData = { test: 'data' };

      // Today data methods
      mockRedisClient.setEx.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));

      await cacheService.cacheTodayData(123, testData);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith('dashboard:123:today', 900, JSON.stringify(testData));

      const todayResult = await cacheService.getTodayData(123);
      expect(todayResult).toEqual(testData);

      // Period data methods
      await cacheService.cachePeriodData(123, 'week', 0, testData);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith('dashboard:123:period:week:0', 3600, JSON.stringify(testData));

      const periodResult = await cacheService.getPeriodData(123, 'week', 0);
      expect(periodResult).toEqual(testData);
    });
  });
});