/**
 * Jest Configuration for CI/CD Pipeline Analyzer
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Preset for TypeScript
  preset: 'ts-jest',

  // Root directories
  roots: ['<rootDir>/src'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.(ts|js)',
    '**/?(*.)+(spec|test).(ts|js)',
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
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],

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
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],

  // Coverage directory
  coverageDirectory: 'coverage',

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Timeout for tests
  testTimeout: 10000,

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
  ],

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(@babel/runtime)/)',
  ],

  // Global setup/teardown
  // globalSetup: '<rootDir>/src/test/global-setup.ts',
  // globalTeardown: '<rootDir>/src/test/global-teardown.ts',

  // Test results processor
  // testResultsProcessor: '<rootDir>/src/test/results-processor.ts',

  // Error on deprecated features
  errorOnDeprecated: true,

  // Detect open handles
  detectOpenHandles: true,

  // Force exit after tests
  forceExit: true,
};
