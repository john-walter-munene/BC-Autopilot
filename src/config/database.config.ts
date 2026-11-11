/**
 * Database & Redis Connection Configuration
 * Mirrors Overlay (CognitronTechnologies / john-walter-munene) configuration pattern
 */

export interface DatabaseConfig {
  url: string;
  maxConnections: number;
  idleTimeoutMs: number;
  ssl: boolean;
}

export interface RedisConfig {
  url: string;
  tls: boolean;
  maxRetriesPerRequest: number;
}

export const databaseConfig: DatabaseConfig = {
  url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/alchemy365?schema=public',
  maxConnections: Number(process.env.DB_MAX_CONNECTIONS || 20),
  idleTimeoutMs: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
  ssl: process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL?.includes('localhost')
};

export const redisConfig: RedisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  tls: process.env.NODE_ENV === 'production' && Boolean(process.env.REDIS_TLS),
  maxRetriesPerRequest: 3
};
