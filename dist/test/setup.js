"use strict";
/**
 * Test setup and global configuration
 */
// Global test timeout
jest.setTimeout(10000);
// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_purposes_only';
process.env.DB_NAME = 'test_cicd_analyzer';
process.env.DB_USERNAME = 'test_user';
process.env.DB_PASSWORD = 'test_password';
//# sourceMappingURL=setup.js.map