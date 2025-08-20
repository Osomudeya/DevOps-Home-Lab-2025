// Redis Connection and Caching Utilities
// Handles caching for leaderboard, user stats, and game sessions

const redis = require('redis');

const client = redis.createClient({
  host: process.env.REDIS_HOST || 'redis', // Kubernetes service name, not localhost
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0,
  retry_strategy: function (options) {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      // End server refused the connection, retry with exponential backoff
      return Math.min(options.attempt * 100, 3000);
    }
    // Reconnect after
    return Math.min(options.attempt * 100, 3000);
  }
});

// Redis event handlers
client.on('error', (err) => {
  console.error('❌ Redis Client Error:', err);
});

client.on('connect', () => {
  console.log('🔗 Redis: Connecting...');
});

client.on('ready', () => {
  console.log('✅ Redis: Connected and ready!');
});

client.on('end', () => {
  console.log('🔌 Redis: Connection ended');
});

client.on('reconnecting', () => {
  console.log('🔄 Redis: Reconnecting...');
});

// ========================================
// REDIS UTILITY CLASS
// ========================================

class RedisCache {
  constructor() {
    this.client = client;
    this.defaultTTL = parseInt(process.env.REDIS_TTL) || 3600; // 1 hour default
  }

  /**
   * Connect to Redis
   * @returns {Promise<void>}
   */
  async connect() {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Ping Redis to test connection
   * @returns {Promise<string>} PONG response
   */
  async ping() {
    try {
      return await this.client.ping();
    } catch (error) {
      console.error('❌ Redis ping failed:', error);
      throw error;
    }
  }

  /**
   * Set a key-value pair with optional TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache (will be JSON stringified)
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<string>} OK response
   */
  async set(key, value, ttl = null) {
    try {
      const serializedValue = JSON.stringify(value);
      const options = {};

      if (ttl) {
        options.EX = ttl;
      } else if (this.defaultTTL) {
        options.EX = this.defaultTTL;
      }

      const result = await this.client.set(key, serializedValue, options);
      console.log(`📦 Cached: ${key} (TTL: ${ttl || this.defaultTTL}s)`);
      return result;
    } catch (error) {
      console.error(`❌ Redis set error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a value by key
   * @param {string} key - Cache key
   * @returns {Promise<any>} Parsed value or null if not found
   */
  async get(key) {
    try {
      const value = await this.client.get(key);
      if (value === null) {
        console.log(`🔍 Cache miss: ${key}`);
        return null;
      }

      console.log(`✅ Cache hit: ${key}`);
      return JSON.parse(value);
    } catch (error) {
      console.error(`❌ Redis get error for key ${key}:`, error);
      return null; // Return null instead of throwing to allow fallback to database
    }
  }

  /**
   * Delete a key
   * @param {string} key - Cache key to delete
   * @returns {Promise<number>} Number of keys deleted
   */
  async del(key) {
    try {
      const result = await this.client.del(key);
      console.log(`🗑️  Deleted cache key: ${key}`);
      return result;
    } catch (error) {
      console.error(`❌ Redis del error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if a key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if key exists
   */
  async exists(key) {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`❌ Redis exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set TTL for an existing key
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<number>} 1 if successful, 0 if key doesn't exist
   */
  async expire(key, ttl) {
    try {
      return await this.client.expire(key, ttl);
    } catch (error) {
      console.error(`❌ Redis expire error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get multiple keys at once
   * @param {Array<string>} keys - Array of cache keys
   * @returns {Promise<Array>} Array of values (null for missing keys)
   */
  async mGet(keys) {
    try {
      const values = await this.client.mGet(keys);
      return values.map((value) => (value ? JSON.parse(value) : null));
    } catch (error) {
      console.error('❌ Redis mGet error:', error);
      throw error;
    }
  }

  /**
   * Increment a numeric value
   * @param {string} key - Cache key
   * @param {number} increment - Amount to increment (default: 1)
   * @returns {Promise<number>} New value after incrementing
   */
  async incr(key, increment = 1) {
    try {
      if (increment === 1) {
        return await this.client.incr(key);
      } else {
        return await this.client.incrBy(key, increment);
      }
    } catch (error) {
      console.error(`❌ Redis incr error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all keys matching a pattern
   * @param {string} pattern - Pattern to match (e.g., 'user:*')
   * @returns {Promise<Array<string>>} Array of matching keys
   */
  async keys(pattern) {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error(`❌ Redis keys error for pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Close Redis connection
   * @returns {Promise<void>}
   */
  async quit() {
    try {
      await this.client.quit();
      console.log('🔌 Redis connection closed');
    } catch (error) {
      console.error('❌ Error closing Redis connection:', error);
      throw error;
    }
  }

  /**
   * Get Redis info and statistics
   * @returns {Promise<Object>} Redis server info
   */
  async getInfo() {
    try {
      const info = await this.client.info();
      return info;
    } catch (error) {
      console.error('❌ Redis info error:', error);
      throw error;
    }
  }
}

// ========================================
// GAME-SPECIFIC CACHE HELPERS
// ========================================

class GameCache extends RedisCache {
  /**
   * Cache leaderboard data
   * @param {Array} leaderboard - Leaderboard array
   * @param {number} ttl - Cache TTL in seconds
   * @returns {Promise<string>}
   */
  async cacheLeaderboard(leaderboard, ttl = 300) {
    // 5 minutes default
    return await this.set('leaderboard:top', leaderboard, ttl);
  }

  /**
   * Get cached leaderboard
   * @returns {Promise<Array|null>} Cached leaderboard or null
   */
  async getCachedLeaderboard() {
    return await this.get('leaderboard:top');
  }

  /**
   * Cache user statistics
   * @param {string} username - User's username
   * @param {Object} stats - User statistics object
   * @param {number} ttl - Cache TTL in seconds
   * @returns {Promise<string>}
   */
  async cacheUserStats(username, stats, ttl = 1800) {
    // 30 minutes default
    return await this.set(`user:stats:${username}`, stats, ttl);
  }

  /**
   * Get cached user statistics
   * @param {string} username - User's username
   * @returns {Promise<Object|null>} Cached user stats or null
   */
  async getCachedUserStats(username) {
    return await this.get(`user:stats:${username}`);
  }

  /**
   * Cache recent game matches for real-time features
   * @param {string} gameId - Game ID
   * @param {Array} matches - Array of matches
   * @param {number} ttl - Cache TTL in seconds
   * @returns {Promise<string>}
   */
  async cacheGameMatches(gameId, matches, ttl = 600) {
    // 10 minutes default
    return await this.set(`game:matches:${gameId}`, matches, ttl);
  }

  /**
   * Get cached game matches
   * @param {string} gameId - Game ID
   * @returns {Promise<Array|null>} Cached matches or null
   */
  async getCachedGameMatches(gameId) {
    return await this.get(`game:matches:${gameId}`);
  }

  /**
   * Cache active game session data
   * @param {string} gameId - Game ID
   * @param {Object} gameData - Game session data
   * @param {number} ttl - Cache TTL in seconds
   * @returns {Promise<string>}
   */
  async cacheGameSession(gameId, gameData, ttl = 3600) {
    // 1 hour default
    return await this.set(`game:session:${gameId}`, gameData, ttl);
  }

  /**
   * Get cached game session
   * @param {string} gameId - Game ID
   * @returns {Promise<Object|null>} Cached game data or null
   */
  async getCachedGameSession(gameId) {
    return await this.get(`game:session:${gameId}`);
  }

  /**
   * Increment daily game counter for analytics
   * @param {string} date - Date string (YYYY-MM-DD)
   * @returns {Promise<number>} New game count for the day
   */
  async incrementDailyGames(date = null) {
    const dateKey = date || new Date().toISOString().split('T')[0];
    const key = `analytics:daily_games:${dateKey}`;

    // Set TTL to 7 days for analytics data
    await this.expire(key, 7 * 24 * 3600);
    return await this.incr(key);
  }

  /**
   * Track user activity (for rate limiting and analytics)
   * @param {string} username - User's username
   * @param {string} action - Action performed (e.g., 'game_start', 'match_made')
   * @returns {Promise<number>} Activity count for this hour
   */
  async trackUserActivity(username, action) {
    const hour = new Date().toISOString().substring(0, 13); // YYYY-MM-DDTHH
    const key = `activity:${username}:${action}:${hour}`;

    // Set TTL to 24 hours for activity data
    await this.expire(key, 24 * 3600);
    return await this.incr(key);
  }

  /**
   * Cache funny jokes or messages for the game
   * @param {Array} jokes - Array of jokes/messages
   * @param {number} ttl - Cache TTL in seconds
   * @returns {Promise<string>}
   */
  async cacheFunnyContent(jokes, ttl = 86400) {
    // 24 hours default
    return await this.set('game:funny_content', jokes, ttl);
  }

  /**
   * Get cached funny content
   * @returns {Promise<Array|null>} Cached jokes/messages or null
   */
  async getCachedFunnyContent() {
    return await this.get('game:funny_content');
  }

  /**
   * Clear all game-related cache (useful for testing or manual refresh)
   * @returns {Promise<void>}
   */
  async clearGameCache() {
    try {
      const patterns = [
        'leaderboard:*',
        'user:stats:*',
        'game:*',
        'analytics:*',
        'activity:*',
      ];

      for (const pattern of patterns) {
        const keys = await this.keys(pattern);
        if (keys.length > 0) {
          await Promise.all(keys.map((key) => this.del(key)));
          console.log(`🗑️  Cleared ${keys.length} keys matching ${pattern}`);
        }
      }

      console.log('✅ Game cache cleared successfully!');
    } catch (error) {
      console.error('❌ Error clearing game cache:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics for monitoring
   * @returns {Promise<Object>} Cache statistics
   */
  async getCacheStats() {
    try {
      const patterns = {
        leaderboard: 'leaderboard:*',
        userStats: 'user:stats:*',
        gameSessions: 'game:session:*',
        gameMatches: 'game:matches:*',
        analytics: 'analytics:*',
        activity: 'activity:*',
      };

      const stats = {};

      for (const [category, pattern] of Object.entries(patterns)) {
        const keys = await this.keys(pattern);
        stats[category] = {
          keyCount: keys.length,
          sampleKeys: keys.slice(0, 5), // Show first 5 keys as examples
        };
      }

      // Add Redis server info
      const redisInfo = await this.getInfo();
      stats.redisInfo = {
        connected: this.client.isReady,
        uptime: redisInfo.match(/uptime_in_seconds:(\d+)/)?.[1] || 'unknown',
        usedMemory:
          redisInfo.match(/used_memory_human:([^\r\n]+)/)?.[1] || 'unknown',
        connectedClients:
          redisInfo.match(/connected_clients:(\d+)/)?.[1] || 'unknown',
      };

      return stats;
    } catch (error) {
      console.error('❌ Error getting cache stats:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const gameCache = new GameCache();

// Helper function to ensure connection before operations
async function ensureConnection() {
  if (!gameCache.client.isOpen) {
    await gameCache.connect();
  }
}

// Wrapper functions to ensure connection
const wrappedCache = new Proxy(gameCache, {
  get(target, prop) {
    const value = target[prop];

    // If it's a method that interacts with Redis, wrap it to ensure connection
    if (
      typeof value === 'function' &&
      prop !== 'connect' &&
      prop !== 'constructor'
    ) {
      return async function (...args) {
        await ensureConnection();
        return value.apply(target, args);
      };
    }

    return value;
  },
});

module.exports = wrappedCache;
