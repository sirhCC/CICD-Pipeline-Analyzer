/**
 * Enterprise Logger Service
 * Structured logging with multiple transports and performance optimization
 */

import winston from 'winston';
import { configManager } from '@/config';

export class Logger {
  private logger: winston.Logger;
  private context: string;

  constructor(context: string = 'Application') {
    this.context = context;
    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const config = configManager.getMonitoring().logging;
    
    const formats = [
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
    ];

    if (config.format === 'json') {
      formats.push(winston.format.json());
    } else {
      formats.push(
        winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${timestamp} [${level.toUpperCase()}] [${context}] ${message} ${metaStr}`;
        })
      );
    }

    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          ...formats
        ),
      }),
    ];

    if (config.file) {
      transports.push(
        new winston.transports.File({
          filename: config.file,
          maxsize: this.parseSize(config.maxSize || '10m'),
          maxFiles: config.maxFiles || 5,
          format: winston.format.combine(...formats),
        })
      );
    }

    return winston.createLogger({
      level: config.level,
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
    
    const match = size.match(/^(\d+)([bkmg])?$/i);
    if (!match) return 10 * 1024 * 1024; // Default 10MB
    
    const value = parseInt(match[1]!, 10);
    const unit = (match[2] || 'b').toLowerCase();
    return value * (units[unit] || 1);
  }

  public info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, { context: this.context, ...meta });
  }

  public warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, { context: this.context, ...meta });
  }

  public error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    this.logger.error(message, { 
      context: this.context, 
      error: error instanceof Error ? error.stack : error,
      ...meta 
    });
  }

  public debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, { context: this.context, ...meta });
  }

  public setContext(context: string): void {
    this.context = context;
  }
}
