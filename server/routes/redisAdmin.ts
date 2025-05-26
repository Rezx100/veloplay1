import express from 'express';
import { RedisCache, redis } from '../redis';
import { isAdmin } from '../adminMiddleware';

const router = express.Router();

// Get Redis status and info
router.get('/status', isAdmin, async (req, res) => {
  try {
    const info = await redis.info();
    const dbSize = await redis.dbsize();
    const memory = await redis.memory('usage');
    
    res.json({
      status: 'connected',
      dbSize,
      memoryUsage: memory,
      info: info.split('\n').reduce((acc: any, line) => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          acc[key] = value;
        }
        return acc;
      }, {})
    });
  } catch (error) {
    res.status(500).json({ error: 'Redis not connected', details: error });
  }
});

// Get all cache keys with their TTL
router.get('/keys', isAdmin, async (req, res) => {
  try {
    const keys = await redis.keys('*');
    const keysWithTtl = await Promise.all(
      keys.map(async (key) => {
        const ttl = await redis.ttl(key);
        const type = await redis.type(key);
        return { key, ttl, type };
      })
    );
    
    res.json({ keys: keysWithTtl, total: keys.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cache keys', details: error });
  }
});

// Get specific cache value
router.get('/key/:key', isAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const value = await redis.get(key);
    const ttl = await redis.ttl(key);
    
    if (value) {
      res.json({ 
        key, 
        value: JSON.parse(value), 
        ttl,
        raw: value 
      });
    } else {
      res.status(404).json({ error: 'Key not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cache value', details: error });
  }
});

// Delete specific cache key
router.delete('/key/:key', isAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const result = await redis.del(key);
    
    if (result > 0) {
      res.json({ message: 'Key deleted successfully', key });
    } else {
      res.status(404).json({ error: 'Key not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete cache key', details: error });
  }
});

// Clear all cache
router.post('/flush', isAdmin, async (req, res) => {
  try {
    await redis.flushall();
    res.json({ message: 'All cache cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cache', details: error });
  }
});

// Cache statistics
router.get('/stats', isAdmin, async (req, res) => {
  try {
    const keys = await redis.keys('*');
    const stats = {
      total: keys.length,
      games: keys.filter(k => k.startsWith('game:')).length,
      allGames: keys.filter(k => k.startsWith('all-games:')).length,
      streams: keys.filter(k => k.startsWith('stream:')).length,
      users: keys.filter(k => k.startsWith('user:')).length,
      other: keys.filter(k => !k.match(/^(game:|all-games:|stream:|user:)/)).length
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cache stats', details: error });
  }
});

export default router;