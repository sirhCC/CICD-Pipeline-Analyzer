/**
 * Enterprise Redis Cache Manager
 * High-performance caching with intelligent invalidation and monitoring
 */

import type { RedisClientType } from 'redis';
import { createClient } from 'redis';
import { configManager } from '@/config';
import { Logger } from '@/shared/logger';

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  memoryUsage: number;
  keyCount: number;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  namespace?: string;
}

export class RedisManager {
  private static instance: RedisManager;
  private client: RedisClientType | null = null;
  private logger: Logger;
  private stats: CacheStats;
  private connected: boolean = false;

  private constructor() {
    this.logger = new Logger('RedisManager');
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      memoryUsage: 0,
      keyCount: 0,
    };
  }

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  /**
   * Initialize Redis connection
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Redis connection...');

      const redisConfig = configManager.getRedis();

      this.client = createClient({
        url: `redis://${redisConfig.host}:${redisConfig.port}`,
        ...(redisConfig.password && { password: redisConfig.password }),
        database: redisConfig.db,

        // Connection configuration
        socket: {
          connectTimeout: 10000,
          reconnectStrategy: retries => {
            if (retries > 10) {
              this.logger.error('Redis reconnection failed after 10 attempts');
              return false;
            }
            return Math.min(retries * 100, 3000);
          },
        },

        // Performance configuration
        commandsQueueMaxLength: 1000,
      });

      // Event handlers
      this.client.on('connect', () => {
        this.logger.info('Redis connected');
        this.connected = true;
      });

      this.client.on('disconnect', () => {
        this.logger.warn('Redis disconnected');
        this.connected = false;
      });

      this.client.on('error', error => {
        this.logger.error('Redis error', error);
        this.connected = false;
      });

      this.client.on('reconnecting', () => {
        this.logger.info('Redis reconnecting...');
      });

      await this.client.connect();

      // Test connection
      await this.client.ping();

      this.logger.info('Redis connection established successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Redis', error);
      // Don't throw error - allow application to run without Redis
      this.connected = false;
    }
  }

  /**
   * Check if Redis is connected
   */
  public isConnected(): boolean {
    return this.connected && this.client?.isReady === true;
  }

  /**
   * Get a value from cache
   */
  public async get<T = string>(key: string, namespace?: string): Promise<T | null> {
    if (!this.isConnected()) {
      this.logger.debug('Redis not connected, cache miss');
      this.stats.misses++;
      return null;
    }

    try {
      const fullKey = this.buildKey(key, namespace);
      const value = await this.client!.get(fullKey);

      if (value === null) {
        this.stats.misses++;
        this.logger.logCacheOperation('miss', fullKey);
        return null;
      }

      this.stats.hits++;
      this.logger.logCacheOperation('hit', fullKey);

      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      this.logger.error('Cache get error', error, { key, namespace });
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  public async set(key: string, value: unknown, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isConnected()) {
      this.logger.debug('Redis not connected, cache set skipped');
      return false;
    }

    try {
      const fullKey = this.buildKey(key, options.namespace);
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

      const ttl = options.ttl || configManager.getRedis().ttl;

      if (ttl > 0) {
        await this.client!.setEx(fullKey, ttl, serializedValue);
      } else {
        await this.client!.set(fullKey, serializedValue);
      }

      // Handle tags if provided
      if (options.tags && options.tags.length > 0) {
        await this.addToTags(fullKey, options.tags);
      }

      this.stats.sets++;
      this.logger.logCacheOperation('set', fullKey, { ttl, tags: options.tags });

      return true;
    } catch (error) {
      this.logger.error('Cache set error', error, { key, options });
      return false;
    }
  }

  /**
   * Delete a value from cache
   */
  public async del(key: string, namespace?: string): Promise<boolean> {
    if (!this.isConnected()) {
      this.logger.debug('Redis not connected, cache delete skipped');
      return false;
    }

    try {
      const fullKey = this.buildKey(key, namespace);
      const result = await this.client!.del(fullKey);

      this.stats.deletes++;
      this.logger.logCacheOperation('del', fullKey);

      return result > 0;
    } catch (error) {
      this.logger.error('Cache delete error', error, { key, namespace });
      return false;
    }
  }

  /**
   * Check if a key exists
   */
  public async exists(key: string, namespace?: string): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, namespace);
      const result = await this.client!.exists(fullKey);
      return result > 0;
    } catch (error) {
      this.logger.error('Cache exists error', error, { key, namespace });
      return false;
    }
  }

  /**
   * Set TTL for a key
   */
  public async expire(key: string, ttl: number, namespace?: string): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, namespace);
      const result = await this.client!.expire(fullKey, ttl);
      return result;
    } catch (error) {
      this.logger.error('Cache expire error', error, { key, ttl, namespace });
      return false;
    }
  }

  /**
   * Get multiple values at once
   */
  public async mget<T = string>(keys: string[], namespace?: string): Promise<(T | null)[]> {
    if (!this.isConnected() || keys.length === 0) {
      return keys.map(() => null);
    }

    try {
      const fullKeys = keys.map(key => this.buildKey(key, namespace));
      const values = await this.client!.mGet(fullKeys);

      return values.map((value, index) => {
        if (value === null) {
          this.stats.misses++;
          this.logger.logCacheOperation('miss', fullKeys[index] || '');
          return null;
        }

        this.stats.hits++;
        this.logger.logCacheOperation('hit', fullKeys[index] || '');

        try {
          return JSON.parse(value) as T;
        } catch {
          return value as T;
        }
      });
    } catch (error) {
      this.logger.error('Cache mget error', error, { keys, namespace });
      return keys.map(() => null);
    }
  }

  /**
   * Clear all cache entries (use with caution)
   */
  public async clear(namespace?: string): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      if (namespace) {
        // Clear only keys in the namespace
        const pattern = this.buildKey('*', namespace);
        const keys = await this.client!.keys(pattern);

        if (keys.length > 0) {
          await this.client!.del(keys);
        }

        this.logger.info(`Cleared ${keys.length} cache entries in namespace: ${namespace}`);
      } else {
        // Clear all cache
        await this.client!.flushDb();
        this.logger.warn('Cleared entire Redis database');
      }

      return true;
    } catch (error) {
      this.logger.error('Cache clear error', error, { namespace });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    this.stats.hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  public resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      memoryUsage: 0,
      keyCount: 0,
    };
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConnected()) {
        this.logger.logHealthCheck('redis', 'unhealthy', undefined, { reason: 'not_connected' });
        return false;
      }

      const startTime = Date.now();
      await this.client!.ping();
      const responseTime = Date.now() - startTime;

      this.logger.logHealthCheck('redis', 'healthy', responseTime);
      return true;
    } catch (error) {
      this.logger.logHealthCheck('redis', 'unhealthy', undefined, { error });
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  public async close(): Promise<void> {
    try {
      if (this.client && this.client.isReady) {
        this.logger.info('Closing Redis connection...');
        await this.client.quit();
        this.connected = false;
        this.logger.info('Redis connection closed successfully');
      }
    } catch (error) {
      this.logger.error('Error closing Redis connection', error);
    }
  }

  // === Private Helper Methods ===

  private buildKey(key: string, namespace?: string): string {
    const prefix = 'cicd-analyzer';
    return namespace ? `${prefix}:${namespace}:${key}` : `${prefix}:${key}`;
  }

  private async addToTags(key: string, tags: string[]): Promise<void> {
    if (!this.isConnected()) return;

    try {
      const multi = this.client!.multi();

      for (const tag of tags) {
        const tagKey = this.buildKey(`tag:${tag}`, 'tags');
        multi.sAdd(tagKey, key);
        multi.expire(tagKey, configManager.getRedis().ttl);
      }

      await multi.exec();
    } catch (error) {
      this.logger.error('Error adding tags', error, { key, tags });
    }
  }

  /**
   * Delete keys by tag
   */
  public async deleteByTag(tag: string): Promise<number> {
    if (!this.isConnected()) {
      return 0;
    }

    try {
      const tagKey = this.buildKey(`tag:${tag}`, 'tags');
      const keys = await this.client!.sMembers(tagKey);

      if (keys.length === 0) {
        return 0;
      }

      await this.client!.del(keys);
      await this.client!.del(tagKey);

      this.logger.info(`Deleted ${keys.length} cache entries with tag: ${tag}`);
      return keys.length;
    } catch (error) {
      this.logger.error('Error deleting by tag', error, { tag });
      return 0;
    }
  }
}

// Export singleton instance
export const redisManager = RedisManager.getInstance();
