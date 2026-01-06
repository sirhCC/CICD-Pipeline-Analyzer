/**
 * Enterprise Logger - Structured logging with multiple transports
 * Production-ready logging system with performance monitoring
 */

import winston from 'winston';
import { configManager } from '@/config';

export interface LogContext {
  requestId?: string;
  userId?: string;
  module?: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

export class Logger {
  private logger: winston.Logger;
  private context: LogContext;

  constructor(context: string | LogContext = {}) {
    this.context = typeof context === 'string' ? { module: context } : context;
    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const config = configManager.getMonitoring();

    const formats = [winston.format.timestamp(), winston.format.errors({ stack: true })];

    if (config.logging.format === 'json') {
      formats.push(winston.format.json());
    } else {
      formats.push(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      );
    }

    const transports: winston.transport[] = [
      new winston.transports.Console({
        level: config.logging.level,
        format: winston.format.combine(...formats),
      }),
    ];

    // Add file transport if configured
    if (config.logging.file) {
      transports.push(
        new winston.transports.File({
          filename: config.logging.file,
          level: config.logging.level,
          maxsize: this.parseSize(config.logging.maxSize || '10m'),
          maxFiles: config.logging.maxFiles || 5,
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        })
      );
    }

    return winston.createLogger({
      level: config.logging.level,
      transports,
      exitOnError: false,
    });
  }

  private parseSize(size: string): number {
    const units: Record<string, number> = {
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

  private formatMessage(
    message: string,
    meta?: Record<string, unknown>
  ): [string, Record<string, unknown>] {
    const logMeta = {
      ...this.context,
      ...meta,
      timestamp: new Date().toISOString(),
    };

    return [message, logMeta];
  }

  public error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    const [msg, logMeta] = this.formatMessage(message, meta);

    if (error instanceof Error) {
      logMeta.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      logMeta.error = error;
    }

    this.logger.error(msg, logMeta);
  }

  public warn(message: string, meta?: Record<string, unknown>): void {
    const [msg, logMeta] = this.formatMessage(message, meta);
    this.logger.warn(msg, logMeta);
  }

  public info(message: string, meta?: Record<string, unknown>): void {
    const [msg, logMeta] = this.formatMessage(message, meta);
    this.logger.info(msg, logMeta);
  }

  public debug(message: string, meta?: Record<string, unknown>): void {
    const [msg, logMeta] = this.formatMessage(message, meta);
    this.logger.debug(msg, logMeta);
  }

  public child(additionalContext: LogContext): Logger {
    const newContext = { ...this.context, ...additionalContext };
    return new Logger(newContext);
  }

  // === Performance Logging ===
  public startTimer(operation: string): () => void {
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
  public logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    meta?: Record<string, unknown>
  ): void {
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
  public logDatabaseQuery(query: string, duration: number, meta?: Record<string, unknown>): void {
    this.debug('Database query executed', {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      duration,
      type: 'database',
      ...meta,
    });
  }

  public logCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'del',
    key: string,
    meta?: Record<string, unknown>
  ): void {
    this.debug(`Cache ${operation}`, {
      operation,
      key,
      type: 'cache',
      ...meta,
    });
  }

  public logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    meta?: Record<string, unknown>
  ): void {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';

    this[level](`Security event: ${event}`, {
      event,
      severity,
      type: 'security',
      ...meta,
    });
  }

  // === Health Check Logging ===
  public logHealthCheck(
    service: string,
    status: 'healthy' | 'unhealthy',
    responseTime?: number,
    meta?: Record<string, unknown>
  ): void {
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

// === Global Logger Instance ===
const globalLogger = new Logger('global');

// === Convenience Functions ===
export const log = {
  error: (message: string, error?: Error | unknown, meta?: Record<string, unknown>) =>
    globalLogger.error(message, error, meta),
  warn: (message: string, meta?: Record<string, unknown>) => globalLogger.warn(message, meta),
  info: (message: string, meta?: Record<string, unknown>) => globalLogger.info(message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => globalLogger.debug(message, meta),
};

export default Logger;
