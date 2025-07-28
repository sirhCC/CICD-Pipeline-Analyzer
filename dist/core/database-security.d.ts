/**
 * Database Security Manager
 * Handles database security auditing, monitoring, and compliance
 */
export interface SecurityEvent {
    type: 'connection' | 'query' | 'authentication' | 'authorization' | 'error';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    details: {
        timestamp: Date;
        user?: string;
        host?: string;
        database?: string;
        query?: string;
        error?: string;
        patterns?: string[];
        queryLength?: number;
        metadata?: Record<string, unknown>;
    };
}
export interface SecurityMetrics {
    connectionAttempts: number;
    failedConnections: number;
    suspiciousQueries: number;
    lastSecurityEvent: Date | null;
    securityScore: number;
}
export declare class DatabaseSecurityManager {
    private static instance;
    private logger;
    private securityEvents;
    private metrics;
    private suspiciousPatterns;
    private constructor();
    static getInstance(): DatabaseSecurityManager;
    /**
     * Initialize patterns for detecting suspicious queries
     */
    private initializeSuspiciousPatterns;
    /**
     * Log a security event
     */
    logSecurityEvent(event: Omit<SecurityEvent, 'details'> & {
        details?: Partial<SecurityEvent['details']>;
    }): void;
    /**
     * Update security metrics
     */
    private updateMetrics;
    /**
     * Analyze query for suspicious patterns
     */
    analyzeQuery(query: string, context?: {
        user?: string;
        host?: string;
    }): void;
    /**
     * Log connection attempt
     */
    logConnectionAttempt(success: boolean, context: {
        user?: string;
        host?: string;
        database?: string;
        error?: string;
    }): void;
    /**
     * Log authentication event
     */
    logAuthenticationEvent(success: boolean, context: {
        user?: string;
        host?: string;
        method?: string;
    }): void;
    /**
     * Get security metrics
     */
    getSecurityMetrics(): SecurityMetrics;
    /**
     * Get recent security events
     */
    getRecentEvents(limit?: number, severity?: SecurityEvent['severity']): SecurityEvent[];
    /**
     * Generate security report
     */
    generateSecurityReport(): {
        summary: SecurityMetrics;
        recentEvents: SecurityEvent[];
        recommendations: string[];
    };
    /**
     * Sanitize query for logging (remove sensitive data)
     */
    private sanitizeQuery;
    /**
     * Reset metrics (for testing or administrative purposes)
     */
    resetMetrics(): void;
    /**
     * Check if IP address should be blocked (basic implementation)
     */
    shouldBlockIP(ip: string): boolean;
}
export declare const databaseSecurityManager: DatabaseSecurityManager;
//# sourceMappingURL=database-security.d.ts.map