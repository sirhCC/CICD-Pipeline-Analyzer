"use strict";
/**
 * Request Logger Middleware
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestLogger = void 0;
const logger_1 = require("../shared/logger");
const uuid_1 = require("uuid");
class RequestLogger {
    static logger = new logger_1.Logger('HTTP');
    static middleware() {
        return (req, res, next) => {
            const requestId = (0, uuid_1.v4)();
            const startTime = Date.now();
            // Add request ID to response locals for error handling
            res.locals.requestId = requestId;
            // Log incoming request
            RequestLogger.logger.info('Incoming request', {
                requestId,
                method: req.method,
                url: req.originalUrl,
                userAgent: req.get('User-Agent'),
                ip: req.ip,
            });
            // Override end method to log response
            const originalEnd = res.end;
            res.end = function (chunk, encoding) {
                const duration = Date.now() - startTime;
                RequestLogger.logger.info('Request completed', {
                    requestId,
                    method: req.method,
                    url: req.originalUrl,
                    statusCode: res.statusCode,
                    duration,
                });
                return originalEnd.call(this, chunk, encoding);
            };
            next();
        };
    }
}
exports.RequestLogger = RequestLogger;
//# sourceMappingURL=request-logger.js.map