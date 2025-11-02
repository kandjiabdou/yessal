const mockCacheService = require('../mocks/cacheService.mock');

// Mock Redis client
const mockRedisClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  setEx: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
  info: jest.fn().mockResolvedValue('memory info'),
  on: jest.fn()
};

jest.doMock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient)
}));

// Mock logger
jest.doMock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

const CacheService = require('../../src/services/cacheService');

describe('CacheService', () => {
  let originalEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton instance state
    CacheService.isConnected = false;
    CacheService.isConnecting = false;
    CacheService.client = null;
    // Store original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Connection Management', () => {
    test('should connect to Redis successfully', async () => {
      mockRedisClient.connect.mockResolvedValueOnce(undefined);
      
      await CacheService.connect();
      
      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    test('should handle Redis connection events', async () => {
      mockRedisClient.connect.mockResolvedValueOnce(undefined);
      let errorHandler, connectHandler, disconnectHandler;

      mockRedisClient.on.mockImplementation((event, handler) => {
        if (event === 'error') errorHandler = handler;
        if (event === 'connect') connectHandler = handler;
        if (event === 'disconnect') disconnectHandler = handler;
      });

      await CacheService.connect();

      // Test error event handler
      expect(CacheService.isConnected).toBe(false);
      errorHandler(new Error('Redis connection error'));
      expect(CacheService.isConnected).toBe(false);

      // Test connect event handler  
      connectHandler();
      expect(CacheService.isConnected).toBe(true);

      // Test disconnect event handler
      disconnectHandler();
      expect(CacheService.isConnected).toBe(false);
    });

    test('should handle connection errors gracefully', async () => {
      mockRedisClient.connect.mockRejectedValueOnce(new Error('Connection failed'));
      
      // Should not throw
      await expect(CacheService.connect()).resolves.not.toThrow();
      expect(CacheService.isConnected).toBe(false);
    });

    test('should not connect if already connected', async () => {
      CacheService.isConnected = true;
      
      await CacheService.connect();
      
      expect(mockRedisClient.connect).not.toHaveBeenCalled();
    });

    test('should not connect if already connecting', async () => {
      CacheService.isConnecting = true;
      
      await CacheService.connect();
      
      expect(mockRedisClient.connect).not.toHaveBeenCalled();
    });

    test('should configure reconnect strategy correctly', async () => {
      const { createClient } = require('redis');
      let reconnectStrategy;

      createClient.mockImplementation((config) => {
        reconnectStrategy = config.socket.reconnectStrategy;
        return mockRedisClient;
      });

      await CacheService.connect();

      // Test reconnect strategy with retries < 3
      expect(reconnectStrategy(0)).toBe(0);
      expect(reconnectStrategy(1)).toBe(50);
      expect(reconnectStrategy(2)).toBe(100);

      // Test reconnect strategy with retries >= 3
      const result = reconnectStrategy(3);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Max retry attempts reached');
    });

    test('should use custom Redis URL from environment', async () => {
      const { createClient } = require('redis');
      process.env.REDIS_URL = 'redis://custom-host:6379';
      
      await CacheService.connect();
      
      expect(createClient).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'redis://custom-host:6379'
        })
      );
    });

    test('should use default Redis URL when no environment variable', async () => {
      const { createClient } = require('redis');
      delete process.env.REDIS_URL;
      
      await CacheService.connect();
      
      expect(createClient).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'redis://localhost:6379'
        })
      );
    });

    test('should disconnect properly', async () => {
      CacheService.isConnected = true;
      CacheService.client = mockRedisClient;
      
      await CacheService.disconnect();
      
      expect(mockRedisClient.disconnect).toHaveBeenCalled();
    });

    test('should handle disconnect errors gracefully', async () => {
      CacheService.isConnected = true;
      CacheService.client = mockRedisClient;
      mockRedisClient.disconnect.mockRejectedValueOnce(new Error('Disconnect error'));
      
      // Should not throw
      await expect(CacheService.disconnect()).resolves.not.toThrow();
    });

    test('should not disconnect if not connected', async () => {
      CacheService.isConnected = false;
      CacheService.client = null;
      
      await CacheService.disconnect();
      
      expect(mockRedisClient.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('Key Generation and TTL', () => {
    test('should generate correct cache key for today data', () => {
      const key = CacheService.generateCacheKey('today', 123);
      expect(key).toBe('dashboard:123:today');
    });

    test('should generate correct cache key for period data', () => {
      const key = CacheService.generateCacheKey('period', 123, 'week', -1);
      expect(key).toBe('dashboard:123:period:week:-1');
    });

    test('should determine correct TTL for today data', () => {
      const ttl = CacheService.determineTTL('today');
      expect(ttl).toBe(15 * 60); // 15 minutes
    });

    test('should determine correct TTL for past periods', () => {
      const ttl = CacheService.determineTTL('period', 'week', -1);
      expect(ttl).toBe(24 * 60 * 60); // 24 hours
    });

    test('should determine correct TTL for current week period', () => {
      const ttl = CacheService.determineTTL('period', 'week', 0);
      expect(ttl).toBe(60 * 60); // 1 hour
    });

    test('should determine correct TTL for current day period', () => {
      const ttl = CacheService.determineTTL('period', 'day', 0);
      expect(ttl).toBe(15 * 60); // 15 minutes
    });

    test('should determine correct TTL for future periods', () => {
      const ttl = CacheService.determineTTL('period', 'month', 1);
      expect(ttl).toBe(5 * 60); // 5 minutes
    });

    test('should use default TTL for unknown type', () => {
      const ttl = CacheService.determineTTL('unknown');
      expect(ttl).toBe(30 * 60); // 30 minutes default
    });

    test('should respect environment variables for TTL', () => {
      const originalEnv = process.env;
      
      // Mock environment variables
      process.env.CACHE_DAILY_TTL = '1800';
      process.env.CACHE_CURRENT_PERIOD_TTL = '7200';
      process.env.CACHE_HISTORICAL_TTL = '172800';
      process.env.CACHE_FUTURE_TTL = '600';

      expect(CacheService.determineTTL('today')).toBe(1800);
      expect(CacheService.determineTTL('period', 'week', 0)).toBe(7200);
      expect(CacheService.determineTTL('period', 'month', -1)).toBe(172800);
      expect(CacheService.determineTTL('period', 'week', 1)).toBe(600);

      // Restore original environment
      process.env = originalEnv;
    });
  });

  describe('Cache Operations', () => {
    beforeEach(() => {
      CacheService.isConnected = true;
      CacheService.client = mockRedisClient;
    });

    test('should get cached data successfully', async () => {
      const testData = { test: 'data' };
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(testData));
      
      const result = await CacheService.get('test-key');
      
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
      expect(result).toEqual(testData);
    });

    test('should return null when cache miss', async () => {
      mockRedisClient.get.mockResolvedValueOnce(null);
      
      const result = await CacheService.get('test-key');
      
      expect(result).toBeNull();
    });

    test('should handle get errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValueOnce(new Error('Redis error'));
      
      const result = await CacheService.get('test-key');
      
      expect(result).toBeNull();
    });

    test('should set cached data successfully', async () => {
      const testData = { test: 'data' };
      
      const result = await CacheService.set('test-key', testData, 300);
      
      expect(mockRedisClient.setEx).toHaveBeenCalledWith('test-key', 300, JSON.stringify(testData));
      expect(result).toBe(true);
    });

    test('should handle set errors gracefully', async () => {
      mockRedisClient.setEx.mockRejectedValueOnce(new Error('Redis error'));
      
      const result = await CacheService.set('test-key', {}, 300);
      
      expect(result).toBe(false);
    });

    test('should delete cached data successfully', async () => {
      const result = await CacheService.delete('test-key');
      
      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
      expect(result).toBe(true);
    });

    test('should delete pattern successfully', async () => {
      mockRedisClient.keys.mockResolvedValueOnce(['key1', 'key2']);
      
      const result = await CacheService.deletePattern('dashboard:*');
      
      expect(mockRedisClient.keys).toHaveBeenCalledWith('dashboard:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(['key1', 'key2']);
      expect(result).toBe(true);
    });

    test('should handle delete pattern with no keys', async () => {
      mockRedisClient.keys.mockResolvedValueOnce([]);
      
      const result = await CacheService.deletePattern('nonexistent:*');
      
      expect(mockRedisClient.keys).toHaveBeenCalledWith('nonexistent:*');
      expect(mockRedisClient.del).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should handle delete pattern errors', async () => {
      mockRedisClient.keys.mockRejectedValueOnce(new Error('Redis keys error'));
      
      const result = await CacheService.deletePattern('error:*');
      
      expect(result).toBe(false);
    });

    test('should handle delete errors gracefully', async () => {
      mockRedisClient.del.mockRejectedValueOnce(new Error('Redis del error'));
      
      const result = await CacheService.delete('error-key');
      
      expect(result).toBe(false);
    });

    test('should invalidate site cache', async () => {
      mockRedisClient.keys.mockResolvedValueOnce(['dashboard:123:today', 'dashboard:123:period:week:0']);
      
      const result = await CacheService.invalidateSite(123);
      
      expect(mockRedisClient.keys).toHaveBeenCalledWith('dashboard:123:*');
      expect(result).toBe(true);
    });
  });

  describe('High-level Cache Methods', () => {
    beforeEach(() => {
      CacheService.isConnected = true;
      CacheService.client = mockRedisClient;
    });

    test('should cache and retrieve today data', async () => {
      const testData = { todayStats: { totalCommandes: 5 } };
      
      // Cache data
      const cacheResult = await CacheService.cacheTodayData(123, testData);
      expect(cacheResult).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'dashboard:123:today',
        15 * 60,
        JSON.stringify(testData)
      );
      
      // Retrieve data
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(testData));
      const retrievedData = await CacheService.getTodayData(123);
      expect(retrievedData).toEqual(testData);
    });

    test('should cache and retrieve period data', async () => {
      const testData = { periodStats: { totalCommandes: 10 } };
      
      // Cache data
      const cacheResult = await CacheService.cachePeriodData(123, 'week', -1, testData);
      expect(cacheResult).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'dashboard:123:period:week:-1',
        24 * 60 * 60, // past period = 24 hours TTL
        JSON.stringify(testData)
      );
      
      // Retrieve data
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(testData));
      const retrievedData = await CacheService.getPeriodData(123, 'week', -1);
      expect(retrievedData).toEqual(testData);
    });
  });

  describe('Cache when disconnected', () => {
    beforeEach(() => {
      CacheService.isConnected = false;
      CacheService.client = null;
    });

    test('should return null for get when disconnected', async () => {
      const result = await CacheService.get('test-key');
      expect(result).toBeNull();
    });

    test('should return false for set when disconnected', async () => {
      const result = await CacheService.set('test-key', {}, 300);
      expect(result).toBe(false);
    });

    test('should return false for delete when disconnected', async () => {
      const result = await CacheService.delete('test-key');
      expect(result).toBe(false);
    });

    test('should return false for deletePattern when disconnected', async () => {
      const result = await CacheService.deletePattern('test:*');
      expect(result).toBe(false);
    });

    test('should indicate cache is not available', () => {
      expect(CacheService.isAvailable()).toBe(false);
    });

    test('should indicate cache is not available when connected but no client', () => {
      CacheService.isConnected = true;
      CacheService.client = null;
      expect(CacheService.isAvailable()).toBeFalsy();
    });

    test('should indicate cache is not available when client exists but not connected', () => {
      CacheService.isConnected = false;
      CacheService.client = mockRedisClient;
      expect(CacheService.isAvailable()).toBeFalsy();
    });

    test('should indicate cache is available when both connected and client exist', () => {
      CacheService.isConnected = true;
      CacheService.client = mockRedisClient;
      expect(CacheService.isAvailable()).toBeTruthy();
    });
  });

  describe('Cache Statistics', () => {
    test('should return stats when connected', async () => {
      CacheService.isConnected = true;
      CacheService.client = mockRedisClient;
      mockRedisClient.info.mockResolvedValueOnce('memory info').mockResolvedValueOnce('keyspace info');
      
      const stats = await CacheService.getStats();
      
      expect(stats.available).toBe(true);
      expect(stats.connected).toBe(true);
      expect(stats.memory).toBe('memory info');
      expect(stats.keyspace).toBe('keyspace info');
    });

    test('should return unavailable stats when disconnected', async () => {
      CacheService.isConnected = false;
      CacheService.client = null;
      
      const stats = await CacheService.getStats();
      
      expect(stats.available).toBe(false);
    });

    test('should handle stats errors gracefully', async () => {
      CacheService.isConnected = true;
      CacheService.client = mockRedisClient;
      mockRedisClient.info.mockRejectedValueOnce(new Error('Redis info error'));
      
      const stats = await CacheService.getStats();
      
      expect(stats.available).toBe(false);
      expect(stats.error).toBe('Redis info error');
    });
  });
});