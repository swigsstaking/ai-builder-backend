import Redis from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};

const redis = new Redis(redisConfig);

redis.on('connect', () => {
  console.log('Redis connecte');
});

redis.on('error', (err) => {
  console.error('Erreur Redis:', err.message);
});

redis.on('ready', () => {
  console.log('Redis pret');
});

export const cache = {
  async get(key) {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Erreur cache.get(${key}):`, error.message);
      return null;
    }
  },

  async set(key, value, ttl = 3600) {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Erreur cache.set(${key}):`, error.message);
      return false;
    }
  },

  async del(key) {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error(`Erreur cache.del(${key}):`, error.message);
      return false;
    }
  },

  async deletePattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.error(`Erreur cache.deletePattern(${pattern}):`, error.message);
      return 0;
    }
  },

  async flush() {
    try {
      await redis.flushdb();
      return true;
    } catch (error) {
      console.error('Erreur cache.flush():', error.message);
      return false;
    }
  },

  async exists(key) {
    try {
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error(`Erreur cache.exists(${key}):`, error.message);
      return false;
    }
  },

  async ttl(key) {
    try {
      return await redis.ttl(key);
    } catch (error) {
      console.error(`Erreur cache.ttl(${key}):`, error.message);
      return -1;
    }
  },
};

export default redis;
