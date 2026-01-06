/**
 * Redis Mock for Testing
 */

export class MockRedis {
  private data: Map<string, any> = new Map();
  private expirations: Map<string, number> = new Map();

  async get(key: string): Promise<string | null> {
    this.cleanupExpired();
    return this.data.get(key) || null;
  }

  async set(key: string, value: any, options?: { EX?: number }): Promise<string> {
    this.data.set(key, value);
    if (options?.EX) {
      const expiration = Date.now() + options.EX * 1000;
      this.expirations.set(key, expiration);
    }
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const existed = this.data.has(key);
    this.data.delete(key);
    this.expirations.delete(key);
    return existed ? 1 : 0;
  }

  async exists(key: string): Promise<number> {
    this.cleanupExpired();
    return this.data.has(key) ? 1 : 0;
  }

  async flushall(): Promise<string> {
    this.data.clear();
    this.expirations.clear();
    return 'OK';
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async quit(): Promise<string> {
    return 'OK';
  }

  async disconnect(): Promise<void> {
    // Mock disconnect
  }

  // Cleanup expired keys
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, expiration] of this.expirations.entries()) {
      if (expiration <= now) {
        this.data.delete(key);
        this.expirations.delete(key);
      }
    }
  }

  // Additional Redis methods that might be used
  async hget(key: string, field: string): Promise<string | null> {
    const hash = this.data.get(key);
    if (hash && typeof hash === 'object') {
      return hash[field] || null;
    }
    return null;
  }

  async hset(key: string, field: string, value: any): Promise<number> {
    let hash = this.data.get(key);
    if (!hash || typeof hash !== 'object') {
      hash = {};
      this.data.set(key, hash);
    }
    const wasNew = !(field in hash);
    hash[field] = value;
    return wasNew ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    const current = parseInt(this.data.get(key) || '0', 10);
    const newValue = current + 1;
    this.data.set(key, newValue.toString());
    return newValue;
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (this.data.has(key)) {
      const expiration = Date.now() + seconds * 1000;
      this.expirations.set(key, expiration);
      return 1;
    }
    return 0;
  }
}

/**
 * Mock Redis Manager for Tests
 */
export class MockRedisManager {
  private mockRedis = new MockRedis();
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  getClient(): MockRedis {
    return this.mockRedis;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async healthCheck(): Promise<{ status: string; latency: number }> {
    return {
      status: this.connected ? 'connected' : 'disconnected',
      latency: 1,
    };
  }
}
