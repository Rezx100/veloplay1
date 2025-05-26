import { Router } from 'express';
import { redis } from '../redis.js';

const router = Router();

// Simple Redis test endpoint
router.get('/redis-test', async (req, res) => {
  try {
    console.log('🧪 Testing Redis connection via API endpoint...');
    
    // Test 1: Ping
    const pingResult = await redis.ping();
    console.log('✅ Redis PING result:', pingResult);
    
    // Test 2: Set and Get
    const testKey = `test-${Date.now()}`;
    await redis.set(testKey, 'VeloPlay Redis Test!', 'EX', 60); // Expires in 60 seconds
    const getValue = await redis.get(testKey);
    console.log('✅ Redis SET/GET result:', getValue);
    
    // Test 3: Check Redis info
    const info = await redis.info('server');
    console.log('✅ Redis server info available');
    
    res.json({
      success: true,
      message: 'Redis is working perfectly!',
      tests: {
        ping: pingResult,
        setGet: getValue,
        serverInfo: 'Available'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.log('❌ Redis test failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Redis connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;