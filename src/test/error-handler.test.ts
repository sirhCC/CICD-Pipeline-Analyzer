/**
 * Error Handler Middleware Tests
 * Comprehensive testing for enterprise-grade error handling
 */

import request from 'supertest';
import express from 'express';
import {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
} from '../middleware/error-handler';

describe('Error Handler Middleware Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Error Classes', () => {
    it('should create AppError with all properties', () => {
      const error = new AppError('Test error', 400, true, 'TEST_ERROR', { detail: 'test' });
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.details).toEqual({ detail: 'test' });
    });

    it('should create ValidationError correctly', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should create AuthenticationError correctly', () => {
      const error = new AuthenticationError();
      
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.message).toBe('Authentication required');
    });

    it('should create AuthorizationError correctly', () => {
      const error = new AuthorizationError();
      
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(AuthorizationError);
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
      expect(error.message).toBe('Insufficient permissions');
    });

    it('should create NotFoundError correctly', () => {
      const error = new NotFoundError('Pipeline');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND_ERROR');
      expect(error.message).toBe('Pipeline not found');
    });

    it('should create RateLimitError correctly', () => {
      const error = new RateLimitError();
      
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.message).toBe('Rate limit exceeded');
    });

    it('should create DatabaseError correctly', () => {
      const originalError = new Error('Connection failed');
      const error = new DatabaseError('Database operation failed', originalError);
      
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.details).toEqual({
        originalMessage: 'Connection failed',
        originalStack: originalError.stack,
      });
    });

    it('should create ExternalServiceError correctly', () => {
      const error = new ExternalServiceError('GitHub', 'API unavailable', 503);
      
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ExternalServiceError);
      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
      expect(error.message).toBe('External service error (GitHub): API unavailable');
      expect(error.details).toEqual({ service: 'GitHub' });
    });
  });

  describe('Error Handler Middleware', () => {
    it('should handle AppError correctly', async () => {
      app.get('/test-app-error', (req, res, next) => {
        next(new AppError('Custom app error', 422, true, 'CUSTOM_ERROR', { field: 'test' }));
      });

      // Add error handler AFTER route
      app.use(errorHandler);

      const response = await request(app)
        .get('/test-app-error')
        .expect(422);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Custom app error',
          code: 'CUSTOM_ERROR',
          details: { field: 'test' },
        },
      });

      expect(response.body.error.timestamp).toBeDefined();
      expect(response.body.error.requestId).toBeDefined();
    });

    it('should handle ValidationError correctly', async () => {
      app.get('/test-validation-error', (req, res, next) => {
        next(new ValidationError('Invalid email format', { field: 'email' }));
      });

      app.use(errorHandler);

      const response = await request(app)
        .get('/test-validation-error')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Invalid email format',
          code: 'VALIDATION_ERROR',
          details: { field: 'email' },
        },
      });
    });

    it('should handle AuthenticationError correctly', async () => {
      app.get('/test-auth-error', (req, res, next) => {
        next(new AuthenticationError('Token expired'));
      });

      app.use(errorHandler);

      const response = await request(app)
        .get('/test-auth-error')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Token expired',
          code: 'AUTHENTICATION_ERROR',
        },
      });
    });

    it('should handle generic Error correctly', async () => {
      app.get('/test-generic-error', (req, res, next) => {
        next(new Error('Generic error'));
      });

      app.use(errorHandler);

      const response = await request(app)
        .get('/test-generic-error')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringMatching(/Generic error|Internal server error/), // Accept either development or production message
          code: 'INTERNAL_ERROR',
        },
      });
    });

    it('should handle JSON syntax errors', async () => {
      const syntaxError = new SyntaxError('Unexpected token');
      (syntaxError as any).body = true; // Simulate Express JSON parsing error

      app.get('/test-syntax-error', (req, res, next) => {
        next(syntaxError);
      });

      app.use(errorHandler);

      const response = await request(app)
        .get('/test-syntax-error')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Invalid JSON format',
          code: 'INVALID_JSON',
        },
      });
    });

    it('should set security headers', async () => {
      app.get('/test-security-headers', (req, res, next) => {
        next(new AppError('Test error', 400));
      });

      app.use(errorHandler);

      const response = await request(app)
        .get('/test-security-headers')
        .expect(400);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });

  describe('Async Handler Wrapper', () => {
    it('should catch async errors', async () => {
      const asyncRoute = asyncHandler(async (req: express.Request, res: express.Response) => {
        throw new AppError('Async error', 400);
      });

      app.get('/test-async', asyncRoute);
      app.use(errorHandler);

      const response = await request(app)
        .get('/test-async')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Async error',
        },
      });
    });

    it('should catch async promise rejections', async () => {
      const asyncRoute = asyncHandler(async (req: express.Request, res: express.Response) => {
        await Promise.reject(new ValidationError('Async validation error'));
      });

      app.get('/test-async-rejection', asyncRoute);
      app.use(errorHandler);

      const response = await request(app)
        .get('/test-async-rejection')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Async validation error',
          code: 'VALIDATION_ERROR',
        },
      });
    });
  });

  describe('Not Found Handler', () => {
    it('should handle 404 routes', async () => {
      app.use(notFoundHandler);
      app.use(errorHandler);

      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Route GET /non-existent-route not found',
          code: 'NOT_FOUND_ERROR',
        },
      });
    });
  });

  describe('Error Response Format', () => {
    it('should have consistent error response format', async () => {
      app.get('/test-format', (req, res, next) => {
        next(new AppError('Format test', 400, true, 'FORMAT_TEST', { extra: 'data' }));
      });

      app.use(errorHandler);

      const response = await request(app)
        .get('/test-format')
        .expect(400);

      // Verify response structure
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('details');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error).toHaveProperty('requestId');

      // Verify timestamp format (ISO string)
      expect(new Date(response.body.error.timestamp).toISOString()).toBe(response.body.error.timestamp);
    });

    it('should omit undefined fields from response', async () => {
      app.get('/test-minimal', (req, res, next) => {
        next(new AppError('Minimal error', 400)); // No code or details
      });

      app.use(errorHandler);

      const response = await request(app)
        .get('/test-minimal')
        .expect(400);

      expect(response.body.error).not.toHaveProperty('code');
      expect(response.body.error).not.toHaveProperty('details');
    });
  });
});

export {};
