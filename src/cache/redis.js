const Redis = require("ioredis");
const { createLogger } = require("../utils/logger");

const logger = createLogger("Redis");

const {
  REDIS_HOST = "127.0.0.1",
  REDIS_PORT = "6379",
  REDIS_USERNAME = "",
  REDIS_PASSWORD = "",
  REDIS_RETRY = "5",
  REDIS_RETRY_INTERVAL = "2000",
} = process.env;

const redisConfig = {
  host: REDIS_HOST,
  port: Number(REDIS_PORT),
  username: REDIS_USERNAME || undefined,
  password: REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    if (times > Number(REDIS_RETRY)) {
      return null;
    }
    return Number(REDIS_RETRY_INTERVAL);
  },
};

let redisClient = null;

const createRedisClient = () => {
  const client = new Redis(redisConfig);

  client.on("error", (err) => {
    logger.error(`REDIS ERROR: ${err.message}`);
  });

  client.on("connect", () => {
    logger.info("REDIS CONNECTION ESTABLISHED");
  });

  client.on("close", () => {
    logger.info("REDIS CONNECTION CLOSED");
  });

  return client;
};

const initializeRedis = async () => {
  if (redisClient) return redisClient;

  try {
    redisClient = createRedisClient();
    await redisClient.ping();
    logger.info("REDIS CONNECTION SUCCESSFUL");
    return redisClient;
  } catch (err) {
    logger.error(`REDIS INITIALIZATION FAILED: ${err.message}`);
    process.exit(1);
  }
};

const setCache = async (key, value, expiration = 3600) => {
  if (!redisClient) await initializeRedis();
  try {
    return await redisClient.set(key, JSON.stringify(value), "EX", expiration);
  } catch (error) {
    logger.error("Failed to set cache:", error.message);
  }
};

const getCache = async (key) => {
  if (!redisClient) await initializeRedis();
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error("Failed to get cache:", error.message);
    return null;
  }
};

const deleteCache = async (key) => {
  if (!redisClient) await initializeRedis();
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.error("Failed to delete cache:", error.message);
  }
};

const getCacheKeys = async (pattern = "*") => {
  if (!redisClient) await initializeRedis();
  try {
    const keys = await redisClient.keys(pattern);
    return keys;
  } catch (error) {
    logger.error(`Failed to get cache keys:${error.message}`);
    return [];
  }
};

const smembersCache = async (key) => {
  if (!redisClient) await initializeRedis();
  try {
    return await redisClient.smembers(key); // gets all members of the set
  } catch (error) {
    logger.error(`Failed to get set members: ${error.message}`);
    return [];
  }
};

const incrementCache = async (key, amount = 1) => {
  if (!redisClient) await initializeRedis();
  try {
    return await redisClient.incrby(key, amount);
  } catch (error) {
    logger.error("Failed to increment cache:", error.message);
    return null;
  }
};

const clearRedisCache = async () => {
  if (!redisClient) await initializeRedis();
  try {
    await redisClient.flushall();
    logger.info("Redis cache cleared");
  } catch (error) {
    logger.error("Failed to clear Redis cache:", error.message);
  }
};

// Add a value to a Redis Set
const saddCache = async (key, value) => {
  if (!redisClient) await initializeRedis();
  try {
    return await redisClient.sadd(key, value);
  } catch (error) {
    logger.error(`Failed to add to set cache: ${error.message}`);
    return null;
  }
};

module.exports = {
  initializeRedis,
  setCache,
  getCache,
  deleteCache,
  incrementCache,
  clearRedisCache,
  getCacheKeys,
  saddCache,
  smembersCache
};
