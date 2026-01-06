/**
 * Jest Test Setup
 * Configure environment variables and mocks for testing
 */

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Mock environment variables for tests
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests
process.env.SERVER_HOST = 'localhost';
process.env.SERVER_PORT = '3000';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long-for-security';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CORS_ORIGIN = 'http://localhost:3000';
// Ensure refresh/API secrets exist for auth tests
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  'test-refresh-secret-abcdefghijklmnopqrstuvwxyz-1234567890-THIS-IS-LONG';
process.env.API_KEY_SECRET =
  process.env.API_KEY_SECRET ||
  'test-api-key-secret-abcdefghijklmnopqrstuvwxyz-1234567890-THIS-IS-LONG';

// Database test config - Use PostgreSQL for testing when available, SQLite as fallback
process.env.DB_TYPE = 'postgres';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'cicd_analyzer_test';
process.env.DB_USERNAME = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_SSL = 'false';
process.env.DB_SYNCHRONIZE = 'true';
process.env.DB_DROP_SCHEMA = 'true';
process.env.DB_LOGGING = 'false';

// Redis test config - Mock Redis for tests
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = 'test-redis-password';
process.env.REDIS_DB = '1';
process.env.REDIS_KEY_PREFIX = 'test:';
process.env.REDIS_MOCK = 'true'; // Enable Redis mocking

// Provider test config
process.env.GITHUB_APP_ID = 'test-github-app-id';
process.env.GITHUB_PRIVATE_KEY = 'test-github-private-key';
process.env.GITHUB_WEBHOOK_SECRET = 'test-github-webhook-secret';

// Feature flags for tests
process.env.FEATURE_CACHING = 'false';
process.env.FEATURE_RATE_LIMITING = 'false';
process.env.FEATURE_COMPRESSION = 'false';
process.env.FEATURE_HELMET_SECURITY = 'false';

// Disable performance monitoring in tests
process.env.ENABLE_METRICS = 'false';
process.env.PERFORMANCE_MONITORING = 'false';

// Global test timeout
jest.setTimeout(30000);

// Global test hooks
beforeAll(async () => {
  // Global setup
});

afterAll(async () => {
  // Global cleanup - fix memory leaks by cleaning up timers and resources
  try {
    // Import services to clean up
    const { memoizationService } = await import('@/services/memoization.service');
    const { advancedCache } = await import('@/services/advanced-cache.service');
    const { advancedDataProcessingService } = await import(
      '@/services/advanced-data-processing.service'
    );

    // Clean up all services that have timers
    memoizationService.destroy();
    advancedCache.shutdown();
    advancedDataProcessingService.destroy();

    // Give a small delay for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch {
    // Ignore cleanup errors in tests
  }
});

beforeEach(async () => {
  // Reset before each test
});

afterEach(async () => {
  // Cleanup after each test
});

export {};
