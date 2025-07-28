/**
 * Enterprise-grade Request Validation Middleware
 *
 * Features:
 * - Comprehensive input validation for body, params, query, headers
 * - Schema-based validation using Joi with custom rules
 * - Data sanitization and normalization
 * - XSS protection and SQL injection prevention
 * - File upload validation with size and type restrictions
 * - Configurable validation rules per endpoint
 * - Detailed validation error reporting
 * - Performance-optimized with caching
 * - IP and rate limiting integration
 * - Audit logging for security compliance
 *
 * @author sirhCC
 * @version 1.0.0
 */
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from './error-handler';
interface MulterFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
}
interface RequestWithFiles extends Request {
    file?: MulterFile;
    files?: MulterFile[] | {
        [fieldname: string]: MulterFile[];
    };
}
export interface ValidationSchema {
    body?: Joi.ObjectSchema;
    params?: Joi.ObjectSchema;
    query?: Joi.ObjectSchema;
    headers?: Joi.ObjectSchema;
}
export interface ValidationOptions {
    stripUnknown?: boolean;
    allowUnknown?: boolean;
    abortEarly?: boolean;
    skipOnError?: boolean;
    sanitize?: boolean;
    maxFileSize?: number;
    allowedFileTypes?: string[];
    rateLimitByKey?: string;
}
export interface SanitizationRules {
    trimStrings?: boolean;
    normalizeEmail?: boolean;
    escapeHtml?: boolean;
    removeNullBytes?: boolean;
    maxStringLength?: number;
    allowedTags?: string[];
}
export interface ValidationResult {
    isValid: boolean;
    data?: any;
    errors?: ValidationError[];
    sanitized?: any;
}
/**
 * Request Validation Service
 * Handles all validation logic with enterprise-grade features
 */
export declare class RequestValidationService {
    private logger;
    private schemaCache;
    private isEnabled;
    private maxCacheSize;
    constructor();
    /**
     * Validate request data against schema
     */
    validateRequest(data: {
        body?: any;
        params?: any;
        query?: any;
        headers?: any;
    }, schema: ValidationSchema, options?: ValidationOptions): Promise<ValidationResult>;
    /**
     * Sanitize data according to rules
     */
    private sanitizeData;
    /**
     * Escape HTML characters
     */
    private escapeHtml;
    /**
     * Check if string is email format
     */
    private isEmail;
    /**
     * Cache validation schema for performance
     */
    cacheSchema(key: string, schema: ValidationSchema): void;
    /**
     * Get cached schema
     */
    getCachedSchema(key: string): ValidationSchema | undefined;
    /**
     * Clear schema cache
     */
    clearCache(): void;
}
export declare const validationService: RequestValidationService;
/**
 * Create validation middleware for Express routes
 */
export declare function validateRequest(schema: ValidationSchema, options?: ValidationOptions): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Common validation schemas
 */
export declare const commonSchemas: {
    uuid: Joi.StringSchema<string>;
    uuidOptional: Joi.StringSchema<string>;
    email: Joi.StringSchema<string>;
    password: Joi.StringSchema<string>;
    pagination: Joi.ObjectSchema<any>;
    dateRange: Joi.ObjectSchema<any>;
    safeText: Joi.StringSchema<string>;
    apiVersion: Joi.StringSchema<string>;
    file: Joi.ObjectSchema<any>;
};
/**
 * Pipeline-specific validation schemas
 */
export declare const pipelineSchemas: {
    createPipeline: {
        body: Joi.ObjectSchema<any>;
    };
    updatePipeline: {
        params: Joi.ObjectSchema<any>;
        body: Joi.ObjectSchema<any>;
    };
    getPipeline: {
        params: Joi.ObjectSchema<any>;
    };
    listPipelines: {
        query: Joi.ObjectSchema<any>;
    };
};
/**
 * API validation schemas
 */
export declare const apiSchemas: {
    healthCheck: {
        query: Joi.ObjectSchema<any>;
    };
    login: {
        body: Joi.ObjectSchema<any>;
    };
    register: {
        body: Joi.ObjectSchema<any>;
    };
};
/**
 * File upload validation middleware
 */
export declare function validateFileUpload(options?: {
    maxSize?: number;
    allowedTypes?: string[];
    maxFiles?: number;
}): (req: RequestWithFiles, res: Response, next: NextFunction) => void;
/**
 * Export commonly used validation middleware
 */
export declare const validation: {
    createPipeline: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updatePipeline: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getPipeline: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    listPipelines: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    healthCheck: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    login: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    register: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    uploadFile: (req: RequestWithFiles, res: Response, next: NextFunction) => void;
    uploadMultipleFiles: (req: RequestWithFiles, res: Response, next: NextFunction) => void;
    uploadImage: (req: RequestWithFiles, res: Response, next: NextFunction) => void;
};
export default validationService;
//# sourceMappingURL=request-validation.d.ts.map