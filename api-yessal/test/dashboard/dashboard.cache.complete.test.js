const cacheService = require('../../src/services/cacheService');
const { logger } = require('../../src/utils/logger');
const { createClient } = require('redis');

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }
}));

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

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient)
}));

describe('CacheService - Complete Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset cache service state
    cacheService.client = null;
    cacheService.isConnected = false;
    cacheService.isConnecting = false;
  });

  describe('Connection Management', () => {
    test('connects to Redis successfully', async () => {
      mockRedisClient.connect.mockResolvedValue();
      
      await cacheService.connect();
      
      expect(createClient).toHaveBeenCalledWith({
        url: 'redis://localhost:6379',
        socket: {
          connectTimeout: 5000,
          lazyConnect: true,
          reconnectStrategy: expect.any(Function)
        }
      });
      
      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    test('uses Redis URL from environment variable', async () => {
      const originalUrl = process.env.REDIS_URL;
      process.env.REDIS_URL = 'redis://custom-host:6380';
      
      mockRedisClient.connect.mockResolvedValue();
      
      await cacheService.connect();
      
      expect(createClient).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'redis://custom-host:6380'
        })
      );
      
      // Restore original env
      if (originalUrl) {
        process.env.REDIS_URL = originalUrl;
      } else {
        delete process.env.REDIS_URL;
      }
    });

    test('does not connect if already connected', async () => {
      cacheService.isConnected = true;
      
      await cacheService.connect();
      
      expect(mockRedisClient.connect).not.toHaveBeenCalled();
    });

    test('does not connect if already connecting', async () => {
      cacheService.isConnecting = true;
      
      await cacheService.connect();
      
      expect(mockRedisClient.connect).not.toHaveBeenCalled();
    });

    test('handles connection errors gracefully', async () => {
      const connectionError = new Error('Connection refused');
      mockRedisClient.connect.mockRejectedValue(connectionError);
      
      await cacheService.connect();
      
      expect(logger.error).toHaveBeenCalledWith('Failed to connect to Redis:', connectionError);
      expect(cacheService.isConnecting).toBe(false);
    });

    test('handles Redis error events', async () => {
      mockRedisClient.connect.mockResolvedValue();
      
      await cacheService.connect();
      
      // Simulate error event
      const errorHandler = mockRedisClient.on.mock.calls.find(call => call[0] === 'error')[1];
      const redisError = new Error('Redis error');
      
      errorHandler(redisError);
      
      expect(logger.error).toHaveBeenCalledWith('Redis Client Error:', redisError);
      expect(cacheService.isConnected).toBe(false);
    });

    test('handles Redis connect events', async () => {
      mockRedisClient.connect.mockResolvedValue();
      
      await cacheService.connect();
      
      // Simulate connect event
      const connectHandler = mockRedisClient.on.mock.calls.find(call => call[0] === 'connect')[1];
      
      connectHandler();
      
      expect(logger.info).toHaveBeenCalledWith('Redis client connected');
      expect(cacheService.isConnected).toBe(true);
    });

    test('handles Redis disconnect events', async () => {
      mockRedisClient.connect.mockResolvedValue();
      
      await cacheService.connect();
      
      // Simulate disconnect event
      const disconnectHandler = mockRedisClient.on.mock.calls.find(call => call[0] === 'disconnect')[1];
      
      disconnectHandler();
      
      expect(logger.info).toHaveBeenCalledWith('Redis client disconnected');
      expect(cacheService.isConnected).toBe(false);
    });

    test('tests reconnect strategy', async () => {
      mockRedisClient.connect.mockResolvedValue();
      
      await cacheService.connect();
      
      const reconnectStrategy = createClient.mock.calls[0][0].socket.reconnectStrategy;
      
      // Test retries < 3
      expect(reconnectStrategy(0)).toBe(0);
      expect(reconnectStrategy(1)).toBe(50);
      expect(reconnectStrategy(2)).toBe(100);
      
      // Test retries >= 3
      const result = reconnectStrategy(3);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Max retry attempts reached');
    });
  });

  describe('Cache Key Generation', () => {
    test('generates cache key without period', () => {
      const key = cacheService.generateCacheKey('today', 123);
      expect(key).toBe('dashboard:123:today');
    });

    test('generates cache key with period and offset', () => {
      const key = cacheService.generateCacheKey('period', 456, 'week', -1);
      expect(key).toBe('dashboard:456:period:week:-1');
    });
  });

  describe('TTL Determination', () => {
    test('uses environment variables for TTL values', () => {
      const originalEnvs = {
        CACHE_DAILY_TTL: process.env.CACHE_DAILY_TTL,
        CACHE_HISTORICAL_TTL: process.env.CACHE_HISTORICAL_TTL,
        CACHE_CURRENT_PERIOD_TTL: process.env.CACHE_CURRENT_PERIOD_TTL,
        CACHE_FUTURE_TTL: process.env.CACHE_FUTURE_TTL
      };

      // Set custom env values
      process.env.CACHE_DAILY_TTL = '1800'; // 30 minutes
      process.env.CACHE_HISTORICAL_TTL = '172800'; // 48 hours
      process.env.CACHE_CURRENT_PERIOD_TTL = '7200'; // 2 hours
      process.env.CACHE_FUTURE_TTL = '600'; // 10 minutes

      expect(cacheService.determineTTL('today')).toBe(1800);
      expect(cacheService.determineTTL('period', 'week', -1)).toBe(172800);
      expect(cacheService.determineTTL('period', 'week', 0)).toBe(7200);
      expect(cacheService.determineTTL('period', 'week', 1)).toBe(600);

      // Restore original env values
      Object.keys(originalEnvs).forEach(key => {
        if (originalEnvs[key]) {
          process.env[key] = originalEnvs[key];
        } else {
          delete process.env[key];
        }
      });
    });

    test('handles day period for current offset', () => {
      const ttl = cacheService.determineTTL('period', 'day', 0);
      expect(ttl).toBe(900); // Default daily TTL
    });

    test('uses default TTL for unknown type', () => {
      const ttl = cacheService.determineTTL('unknown');
      expect(ttl).toBe(1800); // 30 minutes default
    });
  });

  describe('Basic Cache Operations', () => {
    beforeEach(() => {
      cacheService.client = mockRedisClient;
      cacheService.isConnected = true;
    });

    test('gets cached data successfully', async () => {
      const testData = { test: 'value' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));
      
      const result = await cacheService.get('test-key');
      
      expect(result).toEqual(testData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
    });

    test('returns null when no cached data', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      
      const result = await cacheService.get('test-key');
      
      expect(result).toBeNull();
    });

    test('handles JSON parse errors in get', async () => {
      mockRedisClient.get.mockResolvedValue('invalid-json');
      
      const result = await cacheService.get('test-key');
      
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Cache get error for key test-key:',
        expect.any(SyntaxError)
      );
    });

    test('handles Redis errors in get', async () => {
      const redisError = new Error('Redis get failed');
      mockRedisClient.get.mockRejectedValue(redisError);
      
      const result = await cacheService.get('test-key');
      
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Cache get error for key test-key:', redisError);
    });

    test('returns null when not connected for get', async () => {
      cacheService.isConnected = false;
      
      const result = await cacheService.get('test-key');
      
      expect(result).toBeNull();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    test('sets cached data successfully', async () => {
      const testData = { test: 'value' };
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const result = await cacheService.set('test-key', testData, 3600);
      
      expect(result).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith('test-key', 3600, JSON.stringify(testData));
    });

    test('handles Redis errors in set', async () => {
      const redisError = new Error('Redis set failed');
      mockRedisClient.setEx.mockRejectedValue(redisError);
      
      const result = await cacheService.set('test-key', { test: 'value' }, 3600);
      
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Cache set error for key test-key:', redisError);
    });

    test('returns false when not connected for set', async () => {
      cacheService.isConnected = false;
      
      const result = await cacheService.set('test-key', { test: 'value' }, 3600);
      
      expect(result).toBe(false);
      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });

    test('deletes cached data successfully', async () => {
      mockRedisClient.del.mockResolvedValue(1);
      
      const result = await cacheService.delete('test-key');
      
      expect(result).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });

    test('handles Redis errors in delete', async () => {
      const redisError = new Error('Redis delete failed');
      mockRedisClient.del.mockRejectedValue(redisError);
      
      const result = await cacheService.delete('test-key');
      
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Cache delete error for key test-key:', redisError);
    });

    test('returns false when not connected for delete', async () => {
      cacheService.isConnected = false;
      
      const result = await cacheService.delete('test-key');
      
      expect(result).toBe(false);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('Pattern Operations', () => {
    beforeEach(() => {
      cacheService.client = mockRedisClient;
      cacheService.isConnected = true;
    });

    test('deletes pattern successfully with keys found', async () => {
      const matchedKeys = ['dashboard:123:today', 'dashboard:123:period:week:0'];
      mockRedisClient.keys.mockResolvedValue(matchedKeys);
      mockRedisClient.del.mockResolvedValue(2);
      
      const result = await cacheService.deletePattern('dashboard:123:*');
      
      expect(result).toBe(true);
      expect(mockRedisClient.keys).toHaveBeenCalledWith('dashboard:123:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(matchedKeys);
    });

    test('deletes pattern successfully with no keys found', async () => {
      mockRedisClient.keys.mockResolvedValue([]);
      
      const result = await cacheService.deletePattern('dashboard:999:*');
      
      expect(result).toBe(true);
      expect(mockRedisClient.keys).toHaveBeenCalledWith('dashboard:999:*');
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    test('handles Redis errors in deletePattern', async () => {
      const redisError = new Error('Redis keys failed');
      mockRedisClient.keys.mockRejectedValue(redisError);
      
      const result = await cacheService.deletePattern('dashboard:123:*');
      
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Cache delete pattern error for pattern dashboard:123:*:',
        redisError
      );
    });

    test('returns false when not connected for deletePattern', async () => {
      cacheService.isConnected = false;
      
      const result = await cacheService.deletePattern('dashboard:123:*');
      
      expect(result).toBe(false);
      expect(mockRedisClient.keys).not.toHaveBeenCalled();
    });
  });

  describe('Site Invalidation', () => {
    beforeEach(() => {
      cacheService.client = mockRedisClient;
      cacheService.isConnected = true;
    });

    test('invalidates site cache successfully', async () => {
      const matchedKeys = ['dashboard:123:today', 'dashboard:123:period:week:0'];
      mockRedisClient.keys.mockResolvedValue(matchedKeys);
      mockRedisClient.del.mockResolvedValue(2);
      
      const result = await cacheService.invalidateSite(123);
      
      expect(result).toBe(true);
      expect(mockRedisClient.keys).toHaveBeenCalledWith('dashboard:123:*');
    });
  });

  describe('Today Data Cache Methods', () => {
    beforeEach(() => {
      cacheService.client = mockRedisClient;
      cacheService.isConnected = true;
    });

    test('caches today data successfully', async () => {
      const todayData = { todayStats: {}, recentOrders: [] };
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const result = await cacheService.cacheTodayData(123, todayData);
      
      expect(result).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'dashboard:123:today',
        900, // Default daily TTL
        JSON.stringify(todayData)
      );
    });

    test('gets today data successfully', async () => {
      const todayData = { todayStats: {}, recentOrders: [] };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(todayData));
      
      const result = await cacheService.getTodayData(123);
      
      expect(result).toEqual(todayData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('dashboard:123:today');
    });
  });

  describe('Period Data Cache Methods', () => {
    beforeEach(() => {
      cacheService.client = mockRedisClient;
      cacheService.isConnected = true;
    });

    test('caches period data successfully', async () => {
      const periodData = { periodStats: {}, siteName: 'Test' };
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const result = await cacheService.cachePeriodData(123, 'week', 0, periodData);
      
      expect(result).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'dashboard:123:period:week:0',
        3600, // Current period TTL
        JSON.stringify(periodData)
      );
    });

    test('gets period data successfully', async () => {
      const periodData = { periodStats: {}, siteName: 'Test' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(periodData));
      
      const result = await cacheService.getPeriodData(123, 'week', 0);
      
      expect(result).toEqual(periodData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('dashboard:123:period:week:0');
    });
  });

  describe('Utility Methods', () => {
    test('disconnects successfully when connected', async () => {
      cacheService.client = mockRedisClient;
      cacheService.isConnected = true;
      mockRedisClient.disconnect.mockResolvedValue();
      
      await cacheService.disconnect();
      
      expect(mockRedisClient.disconnect).toHaveBeenCalled();
      expect(cacheService.isConnected).toBe(false);
    });

    test('handles disconnect errors', async () => {
      cacheService.client = mockRedisClient;
      cacheService.isConnected = true;
      const disconnectError = new Error('Disconnect failed');
      mockRedisClient.disconnect.mockRejectedValue(disconnectError);
      
      await cacheService.disconnect();
      
      expect(logger.error).toHaveBeenCalledWith('Error disconnecting from Redis:', disconnectError);
    });

    test('does not disconnect when not connected', async () => {
      cacheService.client = null;
      cacheService.isConnected = false;
      
      await cacheService.disconnect();
      
      expect(mockRedisClient.disconnect).not.toHaveBeenCalled();
    });

    test('isAvailable returns true when connected', () => {
      cacheService.client = mockRedisClient;
      cacheService.isConnected = true;
      
      expect(cacheService.isAvailable()).toBe(mockRedisClient);
    });

    test('isAvailable returns false when not connected', () => {
      cacheService.client = null;
      cacheService.isConnected = false;
      
      expect(cacheService.isAvailable()).toBe(false);
    });

    test('isAvailable returns false when client exists but not connected', () => {
      cacheService.client = mockRedisClient;
      cacheService.isConnected = false;
      
      expect(cacheService.isAvailable()).toBe(false);
    });

    test('getStats returns stats when connected', async () => {
      cacheService.client = mockRedisClient;
      cacheService.isConnected = true;
      
      const memoryInfo = 'used_memory:1024';
      const keyspaceInfo = 'db0:keys=10';
      
      mockRedisClient.info
        .mockResolvedValueOnce(memoryInfo)
        .mockResolvedValueOnce(keyspaceInfo);
      
      const stats = await cacheService.getStats();
      
      expect(stats).toEqual({
        available: true,
        memory: memoryInfo,
        keyspace: keyspaceInfo,
        connected: true
      });
      
      expect(mockRedisClient.info).toHaveBeenCalledWith('memory');
      expect(mockRedisClient.info).toHaveBeenCalledWith('keyspace');
    });

    test('getStats returns unavailable when not connected', async () => {
      cacheService.client = null;
      cacheService.isConnected = false;
      
      const stats = await cacheService.getStats();
      
      expect(stats).toEqual({ available: false });
    });

    test('getStats handles Redis errors', async () => {
      cacheService.client = mockRedisClient;
      cacheService.isConnected = true;
      
      const redisError = new Error('Redis info failed');
      mockRedisClient.info.mockRejectedValue(redisError);
      
      const stats = await cacheService.getStats();
      
      expect(stats).toEqual({ 
        available: false, 
        error: 'Redis info failed' 
      });
      expect(logger.error).toHaveBeenCalledWith('Error getting cache stats:', redisError);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    test('handles null client in operations', async () => {
      cacheService.client = null;
      cacheService.isConnected = false;
      
      expect(await cacheService.get('key')).toBeNull();
      expect(await cacheService.set('key', {}, 100)).toBe(false);
      expect(await cacheService.delete('key')).toBe(false);
      expect(await cacheService.deletePattern('pattern')).toBe(false);
    });

    test('handles missing client property', async () => {
      // Simulate undefined client
      delete cacheService.client;
      cacheService.isConnected = false;
      
      expect(await cacheService.get('key')).toBeNull();
      expect(await cacheService.set('key', {}, 100)).toBe(false);
      expect(await cacheService.delete('key')).toBe(false);
    });
  });
});