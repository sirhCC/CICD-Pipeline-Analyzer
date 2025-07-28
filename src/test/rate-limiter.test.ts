import {
  MemoryRateLimitStore,
  RateLimitStrategy,
  RateLimiterService
} from '../middleware/rate-limiter';

describe('Rate Limiter Core Tests', () => {
  test('MemoryRateLimitStore basic functionality', async () => {
    const store = new MemoryRateLimitStore({
      max: 3,
      windowMs: 60000,
      strategy: RateLimitStrategy.FIXED_WINDOW
    });

    const result1 = await store.incr('test-key');
    expect(result1.current).toBe(1);
    expect(result1.remaining).toBe(2);
    expect(result1.limit).toBe(3);

    const result2 = await store.incr('test-key');
    expect(result2.current).toBe(2);
    expect(result2.remaining).toBe(1);

    const result3 = await store.incr('test-key');
    expect(result3.current).toBe(3);
    expect(result3.remaining).toBe(0);
  });

  test('RateLimiterService can be instantiated', () => {
    const service = new RateLimiterService();
    expect(service).toBeInstanceOf(RateLimiterService);
  });

  test('Should create limiter middleware function', () => {
    const service = new RateLimiterService();
    const limiter = service.createLimiter({ max: 5, windowMs: 60000 });
    expect(typeof limiter).toBe('function');
  });
});
