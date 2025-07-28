"use strict";
/**
 * Standard API Response Types and Utilities
 * Ensures consistent response format across all endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseBuilder = exports.ErrorCode = exports.HttpStatus = void 0;
exports.calculatePagination = calculatePagination;
exports.getRequestId = getRequestId;
const versioning_1 = require("../config/versioning");
// Standard HTTP status codes used in responses
var HttpStatus;
(function (HttpStatus) {
    HttpStatus[HttpStatus["OK"] = 200] = "OK";
    HttpStatus[HttpStatus["CREATED"] = 201] = "CREATED";
    HttpStatus[HttpStatus["ACCEPTED"] = 202] = "ACCEPTED";
    HttpStatus[HttpStatus["NO_CONTENT"] = 204] = "NO_CONTENT";
    HttpStatus[HttpStatus["BAD_REQUEST"] = 400] = "BAD_REQUEST";
    HttpStatus[HttpStatus["UNAUTHORIZED"] = 401] = "UNAUTHORIZED";
    HttpStatus[HttpStatus["FORBIDDEN"] = 403] = "FORBIDDEN";
    HttpStatus[HttpStatus["NOT_FOUND"] = 404] = "NOT_FOUND";
    HttpStatus[HttpStatus["METHOD_NOT_ALLOWED"] = 405] = "METHOD_NOT_ALLOWED";
    HttpStatus[HttpStatus["CONFLICT"] = 409] = "CONFLICT";
    HttpStatus[HttpStatus["UNPROCESSABLE_ENTITY"] = 422] = "UNPROCESSABLE_ENTITY";
    HttpStatus[HttpStatus["TOO_MANY_REQUESTS"] = 429] = "TOO_MANY_REQUESTS";
    HttpStatus[HttpStatus["INTERNAL_SERVER_ERROR"] = 500] = "INTERNAL_SERVER_ERROR";
    HttpStatus[HttpStatus["BAD_GATEWAY"] = 502] = "BAD_GATEWAY";
    HttpStatus[HttpStatus["SERVICE_UNAVAILABLE"] = 503] = "SERVICE_UNAVAILABLE";
    HttpStatus[HttpStatus["GATEWAY_TIMEOUT"] = 504] = "GATEWAY_TIMEOUT";
})(HttpStatus || (exports.HttpStatus = HttpStatus = {}));
// Standard error codes
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["AUTHENTICATION_ERROR"] = "AUTHENTICATION_ERROR";
    ErrorCode["AUTHORIZATION_ERROR"] = "AUTHORIZATION_ERROR";
    ErrorCode["NOT_FOUND_ERROR"] = "NOT_FOUND_ERROR";
    ErrorCode["CONFLICT_ERROR"] = "CONFLICT_ERROR";
    ErrorCode["RATE_LIMIT_ERROR"] = "RATE_LIMIT_ERROR";
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ErrorCode["EXTERNAL_SERVICE_ERROR"] = "EXTERNAL_SERVICE_ERROR";
    ErrorCode["DATABASE_ERROR"] = "DATABASE_ERROR";
    ErrorCode["CONFIGURATION_ERROR"] = "CONFIGURATION_ERROR";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
/**
 * Response Builder Utility Class
 */
class ResponseBuilder {
    /**
     * Create a successful response
     */
    static success(data, meta, requestId, version) {
        const response = {
            success: true,
            data,
            timestamp: new Date().toISOString(),
            version: version || versioning_1.apiVersionManager.getCurrentVersion(),
        };
        if (meta)
            response.meta = meta;
        if (requestId)
            response.requestId = requestId;
        return response;
    }
    /**
     * Create an error response
     */
    static error(error, meta, requestId, version) {
        const response = {
            success: false,
            error,
            timestamp: new Date().toISOString(),
            version: version || versioning_1.apiVersionManager.getCurrentVersion(),
        };
        if (meta)
            response.meta = meta;
        if (requestId)
            response.requestId = requestId;
        return response;
    }
    /**
     * Create a paginated list response
     */
    static list(items, pagination, performance, requestId, version) {
        const meta = { pagination };
        if (performance)
            meta.performance = performance;
        return this.success({ items, pagination }, meta, requestId, version);
    }
    /**
     * Create a creation response
     */
    static created(item, requestId, version) {
        return this.success({ item, created: true }, undefined, requestId, version);
    }
    /**
     * Create an update response
     */
    static updated(item, changes, requestId, version) {
        const data = { item, updated: true };
        if (changes)
            data.changes = changes;
        return this.success(data, undefined, requestId, version);
    }
    /**
     * Create a deletion response
     */
    static deleted(id, requestId, version) {
        return this.success({ deleted: true, id }, undefined, requestId, version);
    }
    /**
     * Create a no content response (204)
     */
    static noContent(requestId, version) {
        return this.success(null, undefined, requestId, version);
    }
    /**
     * Create a health check response
     */
    static health(status, checks, uptime, requestId, version) {
        const apiVersion = version || versioning_1.apiVersionManager.getCurrentVersion();
        return this.success({
            status,
            timestamp: new Date().toISOString(),
            version: apiVersion,
            uptime,
            checks,
        }, undefined, requestId, apiVersion);
    }
    /**
     * Create bulk operation response
     */
    static bulk(items, successful, failed, errors, requestId, version) {
        const data = { items, successful, failed };
        if (errors)
            data.errors = errors;
        return this.success(data, undefined, requestId, version);
    }
    /**
     * Create validation error response
     */
    static validationError(message, details, field, requestId, version) {
        const error = {
            code: ErrorCode.VALIDATION_ERROR,
            message,
        };
        if (details)
            error.details = details;
        if (field)
            error.field = field;
        return this.error(error, undefined, requestId, version);
    }
    /**
     * Create not found error response
     */
    static notFound(resource, id, requestId, version) {
        return this.error({
            code: ErrorCode.NOT_FOUND_ERROR,
            message: `${resource}${id ? ` with id '${id}'` : ''} not found`,
            details: { resource, id },
        }, undefined, requestId, version);
    }
    /**
     * Create unauthorized error response
     */
    static unauthorized(message = 'Authentication required', requestId, version) {
        return this.error({
            code: ErrorCode.AUTHENTICATION_ERROR,
            message,
        }, undefined, requestId, version);
    }
    /**
     * Create forbidden error response
     */
    static forbidden(message = 'Access denied', requestId, version) {
        return this.error({
            code: ErrorCode.AUTHORIZATION_ERROR,
            message,
        }, undefined, requestId, version);
    }
    /**
     * Create rate limit error response
     */
    static rateLimited(retryAfter, requestId, version) {
        return this.error({
            code: ErrorCode.RATE_LIMIT_ERROR,
            message: 'Rate limit exceeded',
            details: { retryAfter },
        }, undefined, requestId, version);
    }
    /**
     * Create internal server error response
     */
    static internalError(message = 'Internal server error', details, stack, requestId, version) {
        const error = {
            code: ErrorCode.INTERNAL_ERROR,
            message,
            details,
        };
        // Only include stack trace in development
        if (process.env.NODE_ENV === 'development' && stack) {
            error.stack = stack;
        }
        return this.error(error, undefined, requestId, version);
    }
}
exports.ResponseBuilder = ResponseBuilder;
/**
 * Calculate pagination metadata
 */
function calculatePagination(page, limit, total) {
    const totalPages = Math.ceil(total / limit);
    return {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    };
}
/**
 * Extract request ID from request headers
 */
function getRequestId(req) {
    return req.headers['x-request-id'] || req.id || undefined;
}
//# sourceMappingURL=api-response.js.map