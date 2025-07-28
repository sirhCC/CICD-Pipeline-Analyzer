"use strict";
/**
 * API Response Middleware
 * Automatically wraps responses in standard format and adds metadata
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.responseMiddleware = void 0;
exports.extractApiVersion = extractApiVersion;
exports.initializeResponseTracking = initializeResponseTracking;
exports.addResponseHelpers = addResponseHelpers;
exports.errorResponseHandler = errorResponseHandler;
exports.notFoundHandler = notFoundHandler;
exports.trackDatabaseQuery = trackDatabaseQuery;
exports.trackCacheHit = trackCacheHit;
const api_response_1 = require("../shared/api-response");
const versioning_1 = require("../config/versioning");
const logger_1 = require("../shared/logger");
const logger = new logger_1.Logger('ResponseMiddleware');
/**
 * Extract and validate API version from request
 */
function extractApiVersion(req, res, next) {
    const requestedVersion = versioning_1.apiVersionManager.extractVersionFromRequest(req);
    const actualVersion = versioning_1.apiVersionManager.isVersionSupported(requestedVersion)
        ? requestedVersion
        : versioning_1.apiVersionManager.getDefaultVersion();
    // Store versions in request for later use
    req.apiVersion = actualVersion;
    req.requestedVersion = requestedVersion !== actualVersion ? requestedVersion : undefined;
    // Add version headers to all responses
    const versionHeaders = versioning_1.apiVersionManager.getResponseHeaders(actualVersion, req.requestedVersion);
    Object.entries(versionHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
    });
    next();
}
/**
 * Initialize response enhancement tracking
 */
function initializeResponseTracking(req, res, next) {
    req.responseEnhancement = {
        startTime: Date.now(),
        queries: 0,
        cacheHits: 0,
        cacheMisses: 0,
    };
    // Track performance metrics
    const originalJson = res.json;
    res.json = function (body) {
        if (req.responseEnhancement) {
            const executionTime = Date.now() - req.responseEnhancement.startTime;
            // Add performance metadata if response has meta object
            if (body && typeof body === 'object' && body.meta) {
                body.meta.performance = {
                    executionTime,
                    queries: req.responseEnhancement.queries,
                    cacheHits: req.responseEnhancement.cacheHits,
                    cacheMisses: req.responseEnhancement.cacheMisses,
                };
            }
        }
        return originalJson.call(this, body);
    };
    next();
}
/**
 * Add API response helper methods to Express Response
 */
function addResponseHelpers(req, res, next) {
    const requestId = (0, api_response_1.getRequestId)(req);
    const version = req.apiVersion;
    // Success response
    res.apiSuccess = function (data, meta) {
        const response = api_response_1.ResponseBuilder.success(data, meta, requestId, version);
        return this.status(200).json(response);
    };
    // Error response
    res.apiError = function (error, statusCode = 500) {
        let response;
        if (error?.code && error?.message) {
            // Already formatted error
            response = api_response_1.ResponseBuilder.error(error, undefined, requestId, version);
        }
        else if (error instanceof Error) {
            // Standard error object
            response = api_response_1.ResponseBuilder.internalError(error.message, undefined, process.env.NODE_ENV === 'development' ? error.stack : undefined, requestId, version);
        }
        else {
            // Unknown error format
            response = api_response_1.ResponseBuilder.internalError(typeof error === 'string' ? error : 'Unknown error', error, undefined, requestId, version);
        }
        return this.status(statusCode).json(response);
    };
    // Created response (201)
    res.apiCreated = function (data) {
        const response = api_response_1.ResponseBuilder.created(data, requestId, version);
        return this.status(201).json(response);
    };
    // No content response (204)
    res.apiNoContent = function () {
        const response = api_response_1.ResponseBuilder.noContent(requestId, version);
        return this.status(204).json(response);
    };
    // Not found response (404)
    res.apiNotFound = function (resource, id) {
        const response = api_response_1.ResponseBuilder.notFound(resource, id, requestId, version);
        return this.status(404).json(response);
    };
    // Validation error response (422)
    res.apiValidationError = function (message, details, field) {
        const response = api_response_1.ResponseBuilder.validationError(message, details, field, requestId, version);
        return this.status(422).json(response);
    };
    // Unauthorized response (401)
    res.apiUnauthorized = function (message) {
        const response = api_response_1.ResponseBuilder.unauthorized(message, requestId, version);
        return this.status(401).json(response);
    };
    // Forbidden response (403)
    res.apiForbidden = function (message) {
        const response = api_response_1.ResponseBuilder.forbidden(message, requestId, version);
        return this.status(403).json(response);
    };
    // Rate limited response (429)
    res.apiRateLimited = function (retryAfter) {
        const response = api_response_1.ResponseBuilder.rateLimited(retryAfter, requestId, version);
        const headers = {};
        if (retryAfter)
            headers['Retry-After'] = retryAfter;
        return this.status(429).set(headers).json(response);
    };
    // Internal server error response (500)
    res.apiInternalError = function (message, details) {
        const response = api_response_1.ResponseBuilder.internalError(message, details, undefined, requestId, version);
        return this.status(500).json(response);
    };
    next();
}
/**
 * Error response handler - catches errors and formats them
 */
function errorResponseHandler(error, req, res, next) {
    const requestId = (0, api_response_1.getRequestId)(req);
    const version = req.apiVersion;
    logger.error('Unhandled API error', {
        error: error.message,
        stack: error.stack,
        requestId,
        url: req.url,
        method: req.method,
        userId: req.user?.userId,
        version,
    });
    // If response already sent, delegate to Express default handler
    if (res.headersSent) {
        return next(error);
    }
    // Determine status code
    let statusCode = 500;
    if (error.status || error.statusCode) {
        statusCode = error.status || error.statusCode;
    }
    // Use helper method if available
    if (res.apiError) {
        return res.apiError(error, statusCode);
    }
    // Fallback response
    const response = api_response_1.ResponseBuilder.internalError(error.message || 'Internal server error', undefined, process.env.NODE_ENV === 'development' ? error.stack : undefined, requestId, version);
    res.status(statusCode).json(response);
}
/**
 * Not found handler - for unmatched routes
 */
function notFoundHandler(req, res) {
    const version = req.apiVersion;
    const response = api_response_1.ResponseBuilder.notFound('Route', req.originalUrl, (0, api_response_1.getRequestId)(req), version);
    res.status(404).json(response);
}
/**
 * Track database queries for performance metrics
 */
function trackDatabaseQuery(req) {
    if (req.responseEnhancement) {
        req.responseEnhancement.queries = (req.responseEnhancement.queries || 0) + 1;
    }
}
/**
 * Track cache hits/misses for performance metrics
 */
function trackCacheHit(req, isHit) {
    if (req.responseEnhancement) {
        if (isHit) {
            req.responseEnhancement.cacheHits = (req.responseEnhancement.cacheHits || 0) + 1;
        }
        else {
            req.responseEnhancement.cacheMisses = (req.responseEnhancement.cacheMisses || 0) + 1;
        }
    }
}
/**
 * Complete response middleware setup
 */
exports.responseMiddleware = [
    extractApiVersion,
    initializeResponseTracking,
    addResponseHelpers,
];
exports.default = exports.responseMiddleware;
//# sourceMappingURL=response.js.map