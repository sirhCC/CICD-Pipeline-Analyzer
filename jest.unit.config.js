/**
 * Jest Configuration for Unit Tests Only (No Infrastructure)
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Preset for TypeScript
  preset: 'ts-jest',

  // Root directories
  roots: ['<rootDir>/src'],

  // Test file patterns - exclude database tests
  testMatch: [
    '**/__tests__/**/*.(ts|js)',
    '**/?(*.)+(spec|test).(ts|js)',
  ],

  // Ignore database-dependent tests
  testPathIgnorePatterns: [
    '/node_modules/',
    'database.test.ts',
    'database-unit.test.ts',
    'auth.test.ts',
    'foundation.test.ts',
    'enhanced-analytics-integration.test.ts',
    'provider-factory.test.ts',
    'error-handler.test.ts',
    'statistical-analytics.test.ts',
    'request-validation.test.ts',
    'rate-limiter.test.ts',
    'rate-limiter-basic.test.ts'
  ],

  // File extensions to consider
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Transform files with ts-jest
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },

  // Module name mapping for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/test/setup-unit.ts'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Report formats
  coverageReporters: ['text', 'html', 'lcov'],

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Run tests in parallel
  maxWorkers: '50%',

  // Test timeout
  testTimeout: 10000,
};
