/**
 * Enterprise Logger - Structured logging with multiple transports
 * Production-ready logging system with performance monitoring
 */
export interface LogContext {
    requestId?: string;
    userId?: string;
    module?: string;
    operation?: string;
    metadata?: Record<string, unknown>;
}
export declare class Logger {
    private logger;
    private context;
    constructor(context?: string | LogContext);
    private createLogger;
    private parseSize;
    private formatMessage;
    error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    info(message: string, meta?: Record<string, unknown>): void;
    debug(message: string, meta?: Record<string, unknown>): void;
    child(additionalContext: LogContext): Logger;
    startTimer(operation: string): () => void;
    logRequest(method: string, url: string, statusCode: number, duration: number, meta?: Record<string, unknown>): void;
    logDatabaseQuery(query: string, duration: number, meta?: Record<string, unknown>): void;
    logCacheOperation(operation: 'hit' | 'miss' | 'set' | 'del', key: string, meta?: Record<string, unknown>): void;
    logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', meta?: Record<string, unknown>): void;
    logHealthCheck(service: string, status: 'healthy' | 'unhealthy', responseTime?: number, meta?: Record<string, unknown>): void;
}
export declare const log: {
    error: (message: string, error?: Error | unknown, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    info: (message: string, meta?: Record<string, unknown>) => void;
    debug: (message: string, meta?: Record<string, unknown>) => void;
};
export default Logger;
//# sourceMappingURL=logger.d.ts.map