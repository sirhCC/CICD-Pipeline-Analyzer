/**
 * Request Validation Middleware Tests
 * Comprehensive test suite for enterprise-grade validation
 * 
 * @author sirhCC
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { 
  validateRequest, 
  validationService, 
  commonSchemas, 
  pipelineSchemas,
  apiSchemas,
  validation,
  ValidationSchema,
  ValidationOptions
} from '../middleware/request-validation';
import { ValidationError } from '../middleware/error-handler';

// Mock logger
jest.mock('../shared/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

describe('Request Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {},
      headers: {},
      method: 'POST',
      url: '/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-agent')
    };
    mockResponse = {};
    nextFunction = jest.fn();
    
    // Clear validation service cache
    validationService.clearCache();
  });

  describe('ValidationService', () => {
    describe('validateRequest', () => {
      it('should validate valid request data successfully', async () => {
        const schema: ValidationSchema = {
          body: Joi.object({
            name: Joi.string().required(),
            email: Joi.string().email().required()
          })
        };

        const data = {
          body: {
            name: 'John Doe',
            email: 'john@example.com'
          }
        };

        const result = await validationService.validateRequest(data, schema);

        expect(result.isValid).toBe(true);
        expect(result.data).toEqual(data);
        expect(result.errors).toBeUndefined();
      });

      it('should return validation errors for invalid data', async () => {
        const schema: ValidationSchema = {
          body: Joi.object({
            name: Joi.string().required(),
            email: Joi.string().email().required()
          })
        };

        const data = {
          body: {
            name: '', // Invalid: empty string
            email: 'invalid-email' // Invalid: not an email
          }
        };

        const result = await validationService.validateRequest(data, schema);

        expect(result.isValid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
      });

      it('should sanitize data when sanitization is enabled', async () => {
        const schema: ValidationSchema = {
          body: Joi.object({
            message: Joi.string().required()
          })
        };

        const data = {
          body: {
            message: '  <script>alert("xss")</script>  '
          }
        };

        const result = await validationService.validateRequest(data, schema, { sanitize: true });

        expect(result.isValid).toBe(true);
        expect(result.sanitized?.body.message).not.toContain('<script>');
        expect(result.sanitized?.body.message.trim()).toBeTruthy();
      });

      it('should strip unknown fields when stripUnknown is true', async () => {
        const schema: ValidationSchema = {
          body: Joi.object({
            name: Joi.string().required()
          })
        };

        const data = {
          body: {
            name: 'John',
            unknownField: 'should be removed'
          }
        };

        const result = await validationService.validateRequest(data, schema, { stripUnknown: true });

        expect(result.isValid).toBe(true);
        expect(result.data?.body.unknownField).toBeUndefined();
        expect(result.data?.body.name).toBe('John');
      });
    });

    describe('Data Sanitization', () => {
      it('should escape HTML characters', async () => {
        const schema: ValidationSchema = {
          body: Joi.object({
            content: Joi.string().required()
          })
        };

        const data = {
          body: {
            content: '<div>Test & "quotes" \'single\'</div>'
          }
        };

        const result = await validationService.validateRequest(data, schema, { sanitize: true });

        expect(result.sanitized?.body.content).toBe('&lt;div&gt;Test &amp; &quot;quotes&quot; &#039;single&#039;&lt;/div&gt;');
      });

      it('should normalize email addresses', async () => {
        const schema: ValidationSchema = {
          body: Joi.object({
            email: Joi.string().required()
          })
        };

        const data = {
          body: {
            email: '  JOHN@EXAMPLE.COM  '
          }
        };

        const result = await validationService.validateRequest(data, schema, { sanitize: true });

        expect(result.sanitized?.body.email).toBe('john@example.com');
      });

      it('should remove null bytes', async () => {
        const schema: ValidationSchema = {
          body: Joi.object({
            text: Joi.string().required()
          })
        };

        const data = {
          body: {
            text: 'text\0with\0nulls'
          }
        };

        const result = await validationService.validateRequest(data, schema, { sanitize: true });

        expect(result.sanitized?.body.text).toBe('textwithnulls');
      });
    });

    describe('Schema Caching', () => {
      it('should cache and retrieve validation schemas', () => {
        const schema: ValidationSchema = {
          body: Joi.object({
            name: Joi.string().required()
          })
        };

        const key = 'test-schema';
        
        // Cache schema
        validationService.cacheSchema(key, schema);
        
        // Retrieve cached schema
        const cached = validationService.getCachedSchema(key);
        
        expect(cached).toEqual(schema);
      });

      it('should clear cache when requested', () => {
        const schema: ValidationSchema = {
          body: Joi.object({
            name: Joi.string().required()
          })
        };

        validationService.cacheSchema('test', schema);
        expect(validationService.getCachedSchema('test')).toBeDefined();

        validationService.clearCache();
        expect(validationService.getCachedSchema('test')).toBeUndefined();
      });
    });
  });

  describe('Validation Middleware', () => {
    it('should pass validation with valid data', async () => {
      const schema: ValidationSchema = {
        body: Joi.object({
          name: Joi.string().required()
        })
      };

      mockRequest.body = { name: 'John Doe' };

      const middleware = validateRequest(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should call next with ValidationError for invalid data', async () => {
      const schema: ValidationSchema = {
        body: Joi.object({
          name: Joi.string().required()
        })
      };

      mockRequest.body = {}; // Missing required field

      const middleware = validateRequest(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should replace request data with sanitized data', async () => {
      const schema: ValidationSchema = {
        body: Joi.object({
          message: Joi.string().required()
        })
      };

      mockRequest.body = { message: '  test message  ' };

      const middleware = validateRequest(schema, { sanitize: true });
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.body.message).toBe('test message'); // Trimmed
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should validate request parameters', async () => {
      const schema: ValidationSchema = {
        params: Joi.object({
          id: Joi.string().uuid().required()
        })
      };

      mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' };

      const middleware = validateRequest(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should validate query parameters', async () => {
      const schema: ValidationSchema = {
        query: Joi.object({
          page: Joi.number().integer().min(1).required(),
          limit: Joi.number().integer().min(1).max(100).required()
        })
      };

      mockRequest.query = { page: '1', limit: '20' };

      const middleware = validateRequest(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });
  });

  describe('Common Schemas', () => {
    it('should validate UUID format', async () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      const invalidUUID = 'not-a-uuid';

      const { error: validError } = Joi.string().uuid().validate(validUUID);
      const { error: invalidError } = Joi.string().uuid().validate(invalidUUID);

      expect(validError).toBeUndefined();
      expect(invalidError).toBeDefined();
    });

    it('should validate email format', async () => {
      const validEmail = 'test@example.com';
      const invalidEmail = 'not-an-email';

      const { error: validError } = commonSchemas.email.validate(validEmail);
      const { error: invalidError } = commonSchemas.email.validate(invalidEmail);

      expect(validError).toBeUndefined();
      expect(invalidError).toBeDefined();
    });

    it('should validate strong passwords', async () => {
      const strongPassword = 'MyStr0ng!Password123';
      const weakPassword = 'weak';

      const { error: strongError } = commonSchemas.password.validate(strongPassword);
      const { error: weakError } = commonSchemas.password.validate(weakPassword);

      expect(strongError).toBeUndefined();
      expect(weakError).toBeDefined();
    });

    it('should validate pagination parameters', async () => {
      const validPagination = { page: 1, limit: 20 };
      const invalidPagination = { page: 0, limit: -1 };

      const { error: validError } = commonSchemas.pagination.validate(validPagination);
      const { error: invalidError } = commonSchemas.pagination.validate(invalidPagination);

      expect(validError).toBeUndefined();
      expect(invalidError).toBeDefined();
    });
  });

  describe('Pipeline Schemas', () => {
    it('should validate create pipeline request', async () => {
      const validData = {
        name: 'Test Pipeline',
        provider: 'github',
        branch: 'main'
      };

      const { error } = pipelineSchemas.createPipeline.body!.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid pipeline provider', async () => {
      const invalidData = {
        name: 'Test Pipeline',
        provider: 'invalid-provider',
        repositoryId: '123e4567-e89b-12d3-a456-426614174000'
      };

      const { error } = pipelineSchemas.createPipeline.body!.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should validate list pipelines query parameters', async () => {
      const validQuery = {
        page: 1,
        limit: 20,
        provider: 'github',
        status: 'success'
      };

      const { error } = pipelineSchemas.listPipelines.query!.validate(validQuery);
      expect(error).toBeUndefined();
    });
  });

  describe('API Schemas', () => {
    it('should validate login request', async () => {
      const validLogin = {
        email: 'user@example.com',
        password: 'validpassword123'
      };

      const { error } = apiSchemas.login.body!.validate(validLogin);
      expect(error).toBeUndefined();
    });

    it('should validate registration request', async () => {
      const validRegistration = {
        email: 'user@example.com',
        password: 'MyStr0ng!Password123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const { error } = apiSchemas.register.body!.validate(validRegistration);
      expect(error).toBeUndefined();
    });

    it('should reject weak passwords in registration', async () => {
      const invalidRegistration = {
        email: 'user@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe'
      };

      const { error } = apiSchemas.register.body!.validate(invalidRegistration);
      expect(error).toBeDefined();
    });
  });

  describe('Pre-configured Validation Middleware', () => {
    it('should have createPipeline validation middleware', () => {
      expect(validation.createPipeline).toBeDefined();
      expect(typeof validation.createPipeline).toBe('function');
    });

    it('should have login validation middleware', () => {
      expect(validation.login).toBeDefined();
      expect(typeof validation.login).toBe('function');
    });

    it('should have file upload validation middleware', () => {
      expect(validation.uploadFile).toBeDefined();
      expect(typeof validation.uploadFile).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed request data gracefully', async () => {
      const schema: ValidationSchema = {
        body: Joi.object({
          data: Joi.object().required()
        })
      };

      // Simulate circular reference that can't be serialized
      const circularRef: any = {};
      circularRef.self = circularRef;
      mockRequest.body = { data: circularRef };

      const middleware = validateRequest(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Should still call next (either with success or error)
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle Joi validation errors properly', async () => {
      const schema: ValidationSchema = {
        body: Joi.object({
          requiredField: Joi.string().required()
        })
      };

      mockRequest.body = {}; // Missing required field

      const middleware = validateRequest(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(ValidationError));
      
      const error = (nextFunction as jest.Mock).mock.calls[0][0] as ValidationError;
      expect(error.message).toContain('validation failed');
    });
  });

  describe('Performance and Caching', () => {
    it('should maintain performance with large validation schemas', async () => {
      // Create a complex schema
      const largeSchema: ValidationSchema = {
        body: Joi.object({
          field1: Joi.string().required(),
          field2: Joi.number().required(),
          field3: Joi.array().items(Joi.object({
            subField1: Joi.string(),
            subField2: Joi.number(),
            subField3: Joi.boolean()
          })),
          field4: Joi.object({
            nested1: Joi.string(),
            nested2: Joi.object({
              deepNested: Joi.string()
            })
          })
        })
      };

      const validData = {
        body: {
          field1: 'test',
          field2: 123,
          field3: [
            { subField1: 'sub1', subField2: 456, subField3: true },
            { subField1: 'sub2', subField2: 789, subField3: false }
          ],
          field4: {
            nested1: 'nested',
            nested2: {
              deepNested: 'deep'
            }
          }
        }
      };

      const startTime = Date.now();
      const result = await validationService.validateRequest(validData, largeSchema);
      const duration = Date.now() - startTime;

      expect(result.isValid).toBe(true);
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });
  });

  describe('Security Features', () => {
    it('should prevent XSS attacks through sanitization', async () => {
      const schema: ValidationSchema = {
        body: Joi.object({
          userInput: Joi.string().required()
        })
      };

      const maliciousData = {
        body: {
          userInput: '<script>alert("XSS")</script><img src="x" onerror="alert(\'XSS\')">'
        }
      };

      const result = await validationService.validateRequest(maliciousData, schema, { sanitize: true });

      expect(result.isValid).toBe(true);
      expect(result.sanitized?.body.userInput).not.toContain('<script>');
      expect(result.sanitized?.body.userInput).toContain('&lt;script&gt;');
      expect(result.sanitized?.body.userInput).toContain('&quot;');
    });

    it('should enforce maximum string lengths', async () => {
      const schema: ValidationSchema = {
        body: Joi.object({
          longString: Joi.string().max(10).required()
        })
      };

      const data = {
        body: {
          longString: 'this string is definitely longer than 10 characters'
        }
      };

      const result = await validationService.validateRequest(data, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
});
