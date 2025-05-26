import express from 'express';
import { RedisCache, redis } from '../redis';

const router = express.Router();

// Simple Redis test endpoint
router.get('/test', async (req, res) => {
  try {
    // Test basic Redis operations
    const testKey = 'test:' + Date.now();
    const testValue = { message: 'Redis is working!', timestamp: new Date().toISOString() };
    
    // Set a value
    await RedisCache.set(testKey, testValue, 60); // 60 seconds TTL
    
    // Get the value back
    const retrieved = await RedisCache.get(testKey);
    
    // Test Redis connection directly
    const pingResult = await redis.ping();
    
    res.json({
      status: 'success',
      redis_connected: true,
      ping_result: pingResult,
      test_data: {
        stored: testValue,
        retrieved: retrieved,
        matches: JSON.stringify(testValue) === JSON.stringify(retrieved)
      },
      message: 'Redis is working perfectly with VeloPlay!'
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'error',
      redis_connected: false,
      error: error.message,
      message: 'Redis connection failed'
    });
  }
});

// Check cache status
router.get('/cache-status', async (req, res) => {
  try {
    const keys = await redis.keys('*');
    const info = await redis.info('memory');
    
    res.json({
      total_keys: keys.length,
      cache_keys: {
        games: keys.filter(k => k.startsWith('all-games:')).length,
        individual_games: keys.filter(k => k.startsWith('game:')).length,
        streams: keys.filter(k => k.startsWith('stream:')).length,
        users: keys.filter(k => k.startsWith('user:')).length
      },
      memory_info: info,
      sample_keys: keys.slice(0, 10)
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      message: 'Failed to get cache status'
    });
  }
});

export default router;