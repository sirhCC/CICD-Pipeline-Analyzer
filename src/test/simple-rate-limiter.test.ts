import express from 'express';
import request from 'supertest';
import {
  MemoryRateLimitStore,
  RateLimitStrategy,
  RateLimiterService,
  createRateLimiter
} from '../middleware/rate-limiter';

describe('Simple Rate Limiter Tests', () => {
  let app: express.Application;
  let rateLimiterService: RateLimiterService;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    rateLimiterService = new RateLimiterService();
  });

  describe('MemoryRateLimitStore', () => {
    test('should allow requests within limit', async () => {
      const store = new MemoryRateLimitStore({
        max: 5,
        windowMs: 60000,
        strategy: RateLimitStrategy.FIXED_WINDOW
      });

      const result1 = await store.incr('test-key');
      expect(result1.current).toBe(1);
      expect(result1.remaining).toBe(4);
      expect(result1.limit).toBe(5);

      const result2 = await store.incr('test-key');
      expect(result2.current).toBe(2);
      expect(result2.remaining).toBe(3);
    });

    test('should handle decrement correctly', async () => {
      const store = new MemoryRateLimitStore({
        max: 5,
        windowMs: 60000,
        strategy: RateLimitStrategy.FIXED_WINDOW
      });

      await store.incr('test-key');
      await store.incr('test-key');
      await store.decrement('test-key');

      const result = await store.incr('test-key');
      expect(result.current).toBe(2);
    });

    test('should reset key correctly', async () => {
      const store = new MemoryRateLimitStore({
        max: 5,
        windowMs: 60000,
        strategy: RateLimitStrategy.FIXED_WINDOW
      });

      await store.incr('test-key');
      await store.incr('test-key');
      await store.resetKey('test-key');

      const result = await store.incr('test-key');
      expect(result.current).toBe(1);
      expect(result.remaining).toBe(4);
    });
  });

  describe('RateLimiterService Middleware', () => {
    test('should allow requests within rate limit', async () => {
      const limiter = rateLimiterService.createLimiter({
        max: 5,
        windowMs: 60000
      });

      app.use(limiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
      expect(response.headers['x-ratelimit-limit']).toBe('5');
      expect(response.headers['x-ratelimit-remaining']).toBe('4');
    });

    test('should block requests when rate limit exceeded', async () => {
      const limiter = rateLimiterService.createLimiter({
        max: 2,
        windowMs: 60000
      });

      app.use(limiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      // First two requests should succeed
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);

      // Third request should be rate limited
      const response = await request(app).get('/test');
      expect(response.status).toBe(429);
      expect(response.body.error).toContain('Rate limit exceeded');
    });

    test('should use custom message', async () => {
      const customMessage = 'Custom rate limit message';
      const limiter = rateLimiterService.createLimiter({
        max: 1,
        windowMs: 60000,
        message: customMessage
      });

      app.use(limiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      await request(app).get('/test').expect(200);
      
      const response = await request(app).get('/test');
      expect(response.status).toBe(429);
      expect(response.body.error).toBe(customMessage);
    });
  });

  describe('Convenience Functions', () => {
    test('createRateLimiter should work', async () => {
      const limiter = createRateLimiter({ max: 1, windowMs: 60000 });
      
      app.use(limiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(429);
    });
  });
});
