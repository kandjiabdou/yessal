const { createClient } = require('redis');
const { logger } = require('../utils/logger');

/**
 * Redis Cache Service for Dashboard Statistics
 * 
 * Caching Strategy:
 * - Daily stats: Short TTL (15 min) - can change during the day
 * - Past periods: Long TTL (24 hours) - historical data doesn't change
 * - Current week/month: Medium TTL (1 hour) - changes but not frequently
 */
class CacheService {
  client = null;
  isConnected = false;
  isConnecting = false;

  /**
   * Initialize Redis connection
   */
  async connect() {
    if (this.isConnected || this.isConnecting) return;
    
    try {
      this.isConnecting = true;
      
      // Use environment variables with fallback to localhost
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true,
          reconnectStrategy: (retries) => {
            if (retries < 3) {
              return Math.min(retries * 50, 500);
            }
            return new Error('Max retry attempts reached');
          }
        }
      });

      // Handle connection events
      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        logger.info('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      this.isConnecting = false;
      
    } catch (error) {
      this.isConnecting = false;
      logger.error('Failed to connect to Redis:', error);
      // Don't throw - allow app to work without Redis
    }
  }

  /**
   * Generate cache key for dashboard data
   */
  generateCacheKey(type, siteId, period = null, offset = 0) {
    const baseKey = `dashboard:${siteId}:${type}`;
    if (period) {
      return `${baseKey}:${period}:${offset}`;
    }
    return baseKey;
  }

  /**
   * Determine appropriate TTL based on data type and timing
   */
  determineTTL(type, period = null, offset = 0) {
    // Daily stats - can change during current day
    if (type === 'today') {
      return Number.parseInt(process.env.CACHE_DAILY_TTL || '900'); // 15 minutes default
    }

    // Chart data follows same logic as period data
    if (type === 'chart' || period) {
      // Past periods don't change
      if (offset < 0) {
        return Number.parseInt(process.env.CACHE_HISTORICAL_TTL || '86400'); // 24 hours default
      }
      
      // Current period (offset = 0) can still change
      if (offset === 0) {
        if (period === 'day') {
          return Number.parseInt(process.env.CACHE_DAILY_TTL || '900'); // 15 minutes default
        }
        return Number.parseInt(process.env.CACHE_CURRENT_PERIOD_TTL || '3600'); // 1 hour default
      }
      
      // Future periods (offset > 0) - short cache as they might be calculated incorrectly
      return Number.parseInt(process.env.CACHE_FUTURE_TTL || '300'); // 5 minutes default
    }

    // Default fallback
    return 30 * 60; // 30 minutes
  }

  /**
   * Get cached data
   */
  async get(key) {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const cachedData = await this.client.get(key);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      return null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  async set(key, data, ttlSeconds) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(data));
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete cached data
   */
  async delete(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      logger.error(`Cache delete pattern error for pattern ${pattern}:`, error);
      return false;
    }
  }

  /**
   * Invalidate cache for a specific site (useful when site data changes)
   */
  async invalidateSite(siteId) {
    const pattern = `dashboard:${siteId}:*`;
    return this.deletePattern(pattern);
  }

  /**
   * Cache dashboard today data
   */
  async cacheTodayData(siteId, data) {
    const key = this.generateCacheKey('today', siteId);
    const ttl = this.determineTTL('today');
    return this.set(key, data, ttl);
  }

  /**
   * Get cached today data
   */
  async getTodayData(siteId) {
    const key = this.generateCacheKey('today', siteId);
    return this.get(key);
  }

  /**
   * Cache dashboard period data
   */
  async cachePeriodData(siteId, period, offset, data) {
    const key = this.generateCacheKey('period', siteId, period, offset);
    const ttl = this.determineTTL('period', period, offset);
    return this.set(key, data, ttl);
  }

  /**
   * Get cached period data
   */
  async getPeriodData(siteId, period, offset) {
    const key = this.generateCacheKey('period', siteId, period, offset);
    return this.get(key);
  }

  /**
   * Cache dashboard chart data
   */
  async cacheChartData(siteId, period, offset, data) {
    const key = this.generateCacheKey('chart', siteId, period, offset);
    const ttl = this.determineTTL('chart', period, offset);
    return this.set(key, data, ttl);
  }

  /**
   * Get cached chart data
   */
  async getChartData(siteId, period, offset) {
    const key = this.generateCacheKey('chart', siteId, period, offset);
    return this.get(key);
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.disconnect();
        this.isConnected = false;
      } catch (error) {
        logger.error('Error disconnecting from Redis:', error);
      }
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable() {
    return this.isConnected && this.client;
  }

  /**
   * Get cache statistics (useful for monitoring)
   */
  async getStats() {
    if (!this.isConnected || !this.client) {
      return { available: false };
    }

    try {
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      
      return {
        available: true,
        memory: info,
        keyspace: keyspace,
        connected: this.isConnected
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return { available: false, error: error.message };
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;