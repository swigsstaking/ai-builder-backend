import { cache } from '../config/redis.js';

export const cacheMiddleware = (keyPrefix, ttl = 3600) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `${keyPrefix}:${req.originalUrl}`;

    try {
      const cachedData = await cache.get(cacheKey);

      if (cachedData) {
        console.log(`Cache HIT: ${cacheKey}`);
        return res.json(cachedData);
      }

      console.log(`Cache MISS: ${cacheKey}`);

      const originalJson = res.json.bind(res);
      res.json = (data) => {
        cache.set(cacheKey, data, ttl);
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Erreur cache middleware:', error.message);
      next();
    }
  };
};

export const invalidateCache = async (pattern) => {
  try {
    const deleted = await cache.deletePattern(pattern);
    console.log(`Cache invalide: ${deleted} cles supprimees (${pattern})`);
    return deleted;
  } catch (error) {
    console.error('Erreur invalidation cache:', error.message);
    return 0;
  }
};
