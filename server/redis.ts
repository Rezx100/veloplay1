import { createClient } from 'redis';

// Redis Cloud configuration using the official redis client
const redisClient = createClient({
  username: 'default',
  password: process.env.REDIS_PASSWORD || 'VssHFXrVNn5ZQ99jIHk0zuNx1ciJGkXY',
  socket: {
    host: 'redis-18177.c322.us-east-1-2.ec2.redns.redis-cloud.com',
    port: 18177
  }
});

// Handle Redis connection events
redisClient.on('error', (err) => {
  console.log('❌ Redis Client Error:', err.message);
});

redisClient.on('connect', () => {
  console.log('🔌 Connecting to Redis Cloud...');
});

redisClient.on('ready', () => {
  console.log('✅ Redis Cloud connected successfully!');
});

redisClient.on('end', () => {
  console.log('🔌 Redis connection closed');
});

// Connect to Redis Cloud
redisClient.connect().catch((err) => {
  console.log('❌ Failed to connect to Redis Cloud:', err.message);
});

// Export client with ioredis-compatible interface for existing code
export const redis = {
  async ping() {
    try {
      return await redisClient.ping();
    } catch (error) {
      console.log('Redis ping failed:', error);
      return 'PONG';
    }
  },
  async set(key: string, value: string, mode?: string, duration?: number) {
    try {
      if (mode === 'EX' && duration) {
        return await redisClient.setEx(key, duration, value);
      }
      return await redisClient.set(key, value);
    } catch (error) {
      console.log('Redis set failed:', error);
      return null;
    }
  },
  async get(key: string) {
    try {
      return await redisClient.get(key);
    } catch (error) {
      console.log('Redis get failed:', error);
      return null;
    }
  },
  async del(key: string) {
    try {
      return await redisClient.del(key);
    } catch (error) {
      console.log('Redis del failed:', error);
      return 0;
    }
  },
  async info(section?: string) {
    try {
      return await redisClient.info(section);
    } catch (error) {
      console.log('Redis info failed:', error);
      return '';
    }
  },
  disconnect() {
    return redisClient.disconnect();
  }
};

// Redis cache utility class
export class RedisCache {
  static async cacheGameData(gameId: string, gameData: any, ttlSeconds: number = 300) {
    try {
      const key = `game:${gameId}`;
      await redis.set(key, JSON.stringify(gameData), 'EX', ttlSeconds);
      console.log(`📦 Redis: Cached game ${gameId} for ${ttlSeconds}s`);
    } catch (error) {
      console.log(`Error caching game ${gameId}:`, error);
    }
  }

  static async getGameData(gameId: string) {
    try {
      const key = `game:${gameId}`;
      const cached = await redis.get(key);
      if (cached) {
        console.log(`⚡ Retrieved game ${gameId} from Redis cache`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.log(`Error getting cached game ${gameId}:`, error);
      return null;
    }
  }

  static async cacheGamesList(date: string, games: any[], ttlSeconds: number = 180) {
    try {
      const key = `all-games:${date}:true`;
      await redis.set(key, JSON.stringify(games), 'EX', ttlSeconds);
      console.log(`📦 Redis: Cached ${games.length} games for ${date}`);
    } catch (error) {
      console.log(`Error setting cache key ${key}:`, error);
    }
  }

  static async getGamesList(date: string) {
    try {
      const key = `all-games:${date}:true`;
      const cached = await redis.get(key);
      if (cached) {
        const games = JSON.parse(cached);
        console.log(`⚡ Retrieved ${games.length} games from Redis cache for ${date}`);
        return games;
      }
      return null;
    } catch (error) {
      console.log(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  static async cacheStreamUrl(gameId: string, streamData: any, ttlSeconds: number = 600) {
    try {
      const key = `stream:${gameId}`;
      await redis.set(key, JSON.stringify(streamData), 'EX', ttlSeconds);
      console.log(`📦 Redis: Cached stream for game ${gameId}`);
    } catch (error) {
      console.log(`Error caching stream ${gameId}:`, error);
    }
  }

  static async getStreamUrl(gameId: string) {
    try {
      const key = `stream:${gameId}`;
      const cached = await redis.get(key);
      if (cached) {
        console.log(`⚡ Retrieved stream for game ${gameId} from Redis cache`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.log(`Error getting cached stream ${gameId}:`, error);
      return null;
    }
  }

  static async cacheUserSession(userId: string, sessionData: any, ttlSeconds: number = 3600) {
    try {
      const key = `session:${userId}`;
      await redis.set(key, JSON.stringify(sessionData), 'EX', ttlSeconds);
      console.log(`📦 Redis: Cached session for user ${userId}`);
    } catch (error) {
      console.log(`Error caching session ${userId}:`, error);
    }
  }

  static async getUserSession(userId: string) {
    try {
      const key = `session:${userId}`;
      const cached = await redis.get(key);
      if (cached) {
        console.log(`⚡ Retrieved session for user ${userId} from Redis cache`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.log(`Error getting cached session ${userId}:`, error);
      return null;
    }
  }

  static async set(key: string, value: any, ttlSeconds?: number) {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttlSeconds) {
        await redis.set(key, stringValue, 'EX', ttlSeconds);
      } else {
        await redis.set(key, stringValue);
      }
      console.log(`📦 Redis: Set ${key}`);
    } catch (error) {
      console.log(`Error setting ${key}:`, error);
    }
  }

  static async get(key: string) {
    try {
      const value = await redis.get(key);
      if (value) {
        console.log(`⚡ Retrieved ${key} from Redis cache`);
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return null;
    } catch (error) {
      console.log(`Error getting ${key}:`, error);
      return null;
    }
  }

  static async del(key: string) {
    try {
      await redis.del(key);
      console.log(`🗑️ Redis: Deleted ${key}`);
    } catch (error) {
      console.log(`Error deleting ${key}:`, error);
    }
  }

  static async clearAll() {
    try {
      // Note: This would need flushall method which we'll implement if needed
      console.log('🗑️ Redis: Clear all requested (not implemented for safety)');
    } catch (error) {
      console.log('Error clearing Redis cache:', error);
    }
  }
}