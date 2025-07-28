"use strict";
/**
 * Enterprise Logger - Structured logging with multiple transports
 * Production-ready logging system with performance monitoring
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.Logger = void 0;
const winston_1 = __importDefault(require("winston"));
const config_1 = require("../config");
class Logger {
    logger;
    context;
    constructor(context = {}) {
        this.context = typeof context === 'string' ? { module: context } : context;
        this.logger = this.createLogger();
    }
    createLogger() {
        const config = config_1.configManager.getMonitoring();
        const formats = [
            winston_1.default.format.timestamp(),
            winston_1.default.format.errors({ stack: true }),
        ];
        if (config.logging.format === 'json') {
            formats.push(winston_1.default.format.json());
        }
        else {
            formats.push(winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
                return `${timestamp} [${level}]: ${message} ${metaStr}`;
            }));
        }
        const transports = [
            new winston_1.default.transports.Console({
                level: config.logging.level,
                format: winston_1.default.format.combine(...formats),
            }),
        ];
        // Add file transport if configured
        if (config.logging.file) {
            transports.push(new winston_1.default.transports.File({
                filename: config.logging.file,
                level: config.logging.level,
                maxsize: this.parseSize(config.logging.maxSize || '10m'),
                maxFiles: config.logging.maxFiles || 5,
                format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
            }));
        }
        return winston_1.default.createLogger({
            level: config.logging.level,
            transports,
            exitOnError: false,
        });
    }
    parseSize(size) {
        const units = {
            b: 1,
            k: 1024,
            m: 1024 * 1024,
            g: 1024 * 1024 * 1024,
        };
        const match = size.toLowerCase().match(/^(\d+)([bkmg]?)$/);
        if (!match) {
            return 10 * 1024 * 1024; // Default 10MB
        }
        const [, number, unit = 'b'] = match;
        if (!number) {
            return 10 * 1024 * 1024; // Default 10MB if number is invalid
        }
        return parseInt(number, 10) * (units[unit] || 1);
    }
    formatMessage(message, meta) {
        const logMeta = {
            ...this.context,
            ...meta,
            timestamp: new Date().toISOString(),
        };
        return [message, logMeta];
    }
    error(message, error, meta) {
        const [msg, logMeta] = this.formatMessage(message, meta);
        if (error instanceof Error) {
            logMeta.error = {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
        }
        else if (error) {
            logMeta.error = error;
        }
        this.logger.error(msg, logMeta);
    }
    warn(message, meta) {
        const [msg, logMeta] = this.formatMessage(message, meta);
        this.logger.warn(msg, logMeta);
    }
    info(message, meta) {
        const [msg, logMeta] = this.formatMessage(message, meta);
        this.logger.info(msg, logMeta);
    }
    debug(message, meta) {
        const [msg, logMeta] = this.formatMessage(message, meta);
        this.logger.debug(msg, logMeta);
    }
    child(additionalContext) {
        const newContext = { ...this.context, ...additionalContext };
        return new Logger(newContext);
    }
    // === Performance Logging ===
    startTimer(operation) {
        const start = process.hrtime.bigint();
        return () => {
            const end = process.hrtime.bigint();
            const duration = Number(end - start) / 1000000; // Convert to milliseconds
            this.info(`Operation completed: ${operation}`, {
                operation,
                duration,
                unit: 'ms',
            });
        };
    }
    // === Request Logging ===
    logRequest(method, url, statusCode, duration, meta) {
        const level = statusCode >= 400 ? 'warn' : 'info';
        this[level](`${method} ${url} ${statusCode}`, {
            method,
            url,
            statusCode,
            duration,
            type: 'request',
            ...meta,
        });
    }
    // === Structured Logging Helpers ===
    logDatabaseQuery(query, duration, meta) {
        this.debug('Database query executed', {
            query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
            duration,
            type: 'database',
            ...meta,
        });
    }
    logCacheOperation(operation, key, meta) {
        this.debug(`Cache ${operation}`, {
            operation,
            key,
            type: 'cache',
            ...meta,
        });
    }
    logSecurityEvent(event, severity, meta) {
        const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
        this[level](`Security event: ${event}`, {
            event,
            severity,
            type: 'security',
            ...meta,
        });
    }
    // === Health Check Logging ===
    logHealthCheck(service, status, responseTime, meta) {
        const level = status === 'healthy' ? 'info' : 'error';
        this[level](`Health check: ${service} - ${status}`, {
            service,
            status,
            responseTime,
            type: 'health',
            ...meta,
        });
    }
}
exports.Logger = Logger;
// === Global Logger Instance ===
const globalLogger = new Logger('global');
// === Convenience Functions ===
exports.log = {
    error: (message, error, meta) => globalLogger.error(message, error, meta),
    warn: (message, meta) => globalLogger.warn(message, meta),
    info: (message, meta) => globalLogger.info(message, meta),
    debug: (message, meta) => globalLogger.debug(message, meta),
};
exports.default = Logger;
//# sourceMappingURL=logger.js.map