import Redis from 'ioredis';

// Redis configuration with better error handling for development
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true, // Don't connect immediately
  connectTimeout: 10000,
};

// Create Redis client
export const redis = new Redis(redisConfig);

// Redis connection event handlers
redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('ready', () => {
  console.log('🚀 Redis is ready to use');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

redis.on('close', () => {
  console.log('🔌 Redis connection closed');
});

// Helper functions for common Redis operations
export class RedisCache {
  // Game data caching
  static async cacheGameData(gameId: string, gameData: any, ttlSeconds: number = 300) {
    try {
      const key = `game:${gameId}`;
      await redis.setex(key, ttlSeconds, JSON.stringify(gameData));
      console.log(`📦 Redis: Cached game data for ${gameId}`);
    } catch (error) {
      console.log(`⚠️ Redis not available, skipping cache for game ${gameId}`);
      return false;
    }
    return true;
  }

  static async getGameData(gameId: string) {
    try {
      const key = `game:${gameId}`;
      const cached = await redis.get(key);
      if (cached) {
        console.log(`🎯 Retrieved cached game data for ${gameId}`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Error retrieving cached game data:', error);
      return null;
    }
  }

  // Games list caching
  static async cacheGamesList(date: string, games: any[], ttlSeconds: number = 180) {
    try {
      const key = `games:${date}`;
      await redis.setex(key, ttlSeconds, JSON.stringify(games));
      console.log(`📦 Cached games list for ${date}`);
    } catch (error) {
      console.error('Error caching games list:', error);
    }
  }

  static async getGamesList(date: string) {
    try {
      const key = `games:${date}`;
      const cached = await redis.get(key);
      if (cached) {
        console.log(`🎯 Retrieved cached games list for ${date}`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Error retrieving cached games list:', error);
      return null;
    }
  }

  // Stream URL caching
  static async cacheStreamUrl(gameId: string, streamData: any, ttlSeconds: number = 600) {
    try {
      const key = `stream:${gameId}`;
      await redis.setex(key, ttlSeconds, JSON.stringify(streamData));
      console.log(`📺 Cached stream data for ${gameId}`);
    } catch (error) {
      console.error('Error caching stream data:', error);
    }
  }

  static async getStreamUrl(gameId: string) {
    try {
      const key = `stream:${gameId}`;
      const cached = await redis.get(key);
      if (cached) {
        console.log(`🎯 Retrieved cached stream data for ${gameId}`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Error retrieving cached stream data:', error);
      return null;
    }
  }

  // User session caching
  static async cacheUserSession(userId: string, sessionData: any, ttlSeconds: number = 3600) {
    try {
      const key = `user:session:${userId}`;
      await redis.setex(key, ttlSeconds, JSON.stringify(sessionData));
      console.log(`👤 Cached session for user ${userId}`);
    } catch (error) {
      console.error('Error caching user session:', error);
    }
  }

  static async getUserSession(userId: string) {
    try {
      const key = `user:session:${userId}`;
      const cached = await redis.get(key);
      if (cached) {
        console.log(`🎯 Retrieved cached session for user ${userId}`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Error retrieving cached user session:', error);
      return null;
    }
  }

  // Generic cache operations
  static async set(key: string, value: any, ttlSeconds?: number) {
    try {
      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, JSON.stringify(value));
      } else {
        await redis.set(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`Error setting cache key ${key}:`, error);
    }
  }

  static async get(key: string) {
    try {
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  static async del(key: string) {
    try {
      await redis.del(key);
      console.log(`🗑️ Deleted cache key: ${key}`);
    } catch (error) {
      console.error(`Error deleting cache key ${key}:`, error);
    }
  }

  // Clear all cache
  static async clearAll() {
    try {
      await redis.flushall();
      console.log('🧹 Cleared all Redis cache');
    } catch (error) {
      console.error('Error clearing Redis cache:', error);
    }
  }
}

export default redis;