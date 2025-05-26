import Redis from 'ioredis';

// Test Redis connection
async function testRedis() {
  console.log('🧪 Testing Redis Cloud connection...');
  
  const redis = new Redis({
    host: 'redis-18177.c322.us-east-1-2.ec2.redns.redis-cloud.com',
    port: 18177,
    password: process.env.REDIS_PASSWORD,
    tls: {
      rejectUnauthorized: false
    },
    connectTimeout: 10000,
    maxRetriesPerRequest: 1
  });

  try {
    // Test basic ping
    const pong = await redis.ping();
    console.log('✅ Redis PING:', pong);
    
    // Test set/get
    await redis.set('test-key', 'Hello VeloPlay!');
    const value = await redis.get('test-key');
    console.log('✅ Redis SET/GET:', value);
    
    // Clean up
    await redis.del('test-key');
    console.log('✅ Redis test completed successfully!');
    
    redis.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.log('❌ Redis test failed:', error.message);
    redis.disconnect();
    process.exit(1);
  }
}

testRedis();