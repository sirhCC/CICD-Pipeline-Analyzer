"use strict";
/**
 * Database Security Manager
 * Handles database security auditing, monitoring, and compliance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseSecurityManager = exports.DatabaseSecurityManager = void 0;
const logger_1 = require("../shared/logger");
const config_1 = require("../config");
class DatabaseSecurityManager {
    static instance;
    logger;
    securityEvents = [];
    metrics;
    suspiciousPatterns;
    constructor() {
        this.logger = new logger_1.Logger('DatabaseSecurity');
        this.metrics = {
            connectionAttempts: 0,
            failedConnections: 0,
            suspiciousQueries: 0,
            lastSecurityEvent: null,
            securityScore: 100
        };
        this.suspiciousPatterns = [];
        this.initializeSuspiciousPatterns();
    }
    static getInstance() {
        if (!DatabaseSecurityManager.instance) {
            DatabaseSecurityManager.instance = new DatabaseSecurityManager();
        }
        return DatabaseSecurityManager.instance;
    }
    /**
     * Initialize patterns for detecting suspicious queries
     */
    initializeSuspiciousPatterns() {
        this.suspiciousPatterns = [
            // SQL injection patterns
            /(\bunion\s+select)|(\bor\s+1\s*=\s*1)|(\bdrop\s+table)|(\bdelete\s+from)/gi,
            // Information schema access
            /information_schema|pg_catalog|pg_user|pg_shadow/gi,
            // System function abuse
            /pg_read_file|pg_ls_dir|pg_stat_file/gi,
            // Privilege escalation
            /create\s+user|alter\s+user|grant\s+all/gi,
            // Data exfiltration patterns
            /select\s+\*\s+from\s+\w+\s+limit\s+\d{4,}/gi
        ];
    }
    /**
     * Log a security event
     */
    logSecurityEvent(event) {
        const securityEvent = {
            ...event,
            details: {
                timestamp: new Date(),
                ...event.details
            }
        };
        this.securityEvents.push(securityEvent);
        this.metrics.lastSecurityEvent = securityEvent.details.timestamp;
        // Update metrics based on event type
        this.updateMetrics(securityEvent);
        // Log based on severity
        const logMessage = `Security Event: ${event.type} - ${event.message}`;
        const logContext = {
            type: event.type,
            severity: event.severity,
            ...event.details
        };
        switch (event.severity) {
            case 'critical':
                this.logger.error(logMessage, logContext);
                break;
            case 'high':
                this.logger.warn(logMessage, logContext);
                break;
            case 'medium':
                this.logger.info(logMessage, logContext);
                break;
            case 'low':
                this.logger.debug(logMessage, logContext);
                break;
        }
        // Keep only recent events (last 1000)
        if (this.securityEvents.length > 1000) {
            this.securityEvents = this.securityEvents.slice(-1000);
        }
    }
    /**
     * Update security metrics
     */
    updateMetrics(event) {
        switch (event.type) {
            case 'connection':
                this.metrics.connectionAttempts++;
                if (event.severity === 'high' || event.severity === 'critical') {
                    this.metrics.failedConnections++;
                    this.metrics.securityScore = Math.max(0, this.metrics.securityScore - 5);
                }
                break;
            case 'query':
                if (event.severity === 'high' || event.severity === 'critical') {
                    this.metrics.suspiciousQueries++;
                    this.metrics.securityScore = Math.max(0, this.metrics.securityScore - 10);
                }
                break;
            case 'error':
                if (event.severity === 'critical') {
                    this.metrics.securityScore = Math.max(0, this.metrics.securityScore - 15);
                }
                break;
        }
    }
    /**
     * Analyze query for suspicious patterns
     */
    analyzeQuery(query, context) {
        if (!config_1.configManager.isProduction() && !process.env.ENABLE_QUERY_ANALYSIS) {
            return; // Skip in development unless explicitly enabled
        }
        const suspiciousPatterns = this.suspiciousPatterns.filter(pattern => pattern.test(query));
        if (suspiciousPatterns.length > 0) {
            this.logSecurityEvent({
                type: 'query',
                severity: 'high',
                message: 'Suspicious query pattern detected',
                details: {
                    query: this.sanitizeQuery(query),
                    patterns: suspiciousPatterns.map(p => p.source),
                    ...context
                }
            });
        }
        // Check for unusual query characteristics
        if (query.length > 10000) {
            this.logSecurityEvent({
                type: 'query',
                severity: 'medium',
                message: 'Unusually large query detected',
                details: {
                    queryLength: query.length,
                    query: this.sanitizeQuery(query.substring(0, 1000) + '...'),
                    ...context
                }
            });
        }
    }
    /**
     * Log connection attempt
     */
    logConnectionAttempt(success, context) {
        if (success) {
            this.logSecurityEvent({
                type: 'connection',
                severity: 'low',
                message: 'Database connection established',
                details: context
            });
        }
        else {
            this.logSecurityEvent({
                type: 'connection',
                severity: 'high',
                message: 'Database connection failed',
                details: context
            });
        }
    }
    /**
     * Log authentication event
     */
    logAuthenticationEvent(success, context) {
        this.logSecurityEvent({
            type: 'authentication',
            severity: success ? 'low' : 'high',
            message: success ? 'Authentication successful' : 'Authentication failed',
            details: context
        });
    }
    /**
     * Get security metrics
     */
    getSecurityMetrics() {
        return { ...this.metrics };
    }
    /**
     * Get recent security events
     */
    getRecentEvents(limit = 50, severity) {
        let events = this.securityEvents;
        if (severity) {
            events = events.filter(event => event.severity === severity);
        }
        return events
            .sort((a, b) => b.details.timestamp.getTime() - a.details.timestamp.getTime())
            .slice(0, limit);
    }
    /**
     * Generate security report
     */
    generateSecurityReport() {
        const recommendations = [];
        // Analyze metrics and generate recommendations
        if (this.metrics.failedConnections > 10) {
            recommendations.push('High number of failed connections detected - consider IP whitelisting');
        }
        if (this.metrics.suspiciousQueries > 5) {
            recommendations.push('Suspicious query patterns detected - review application code for SQL injection vulnerabilities');
        }
        if (this.metrics.securityScore < 80) {
            recommendations.push('Security score is low - review recent security events and implement additional safeguards');
        }
        const recentCriticalEvents = this.getRecentEvents(10, 'critical');
        if (recentCriticalEvents.length > 0) {
            recommendations.push('Critical security events detected - immediate attention required');
        }
        return {
            summary: this.getSecurityMetrics(),
            recentEvents: this.getRecentEvents(20),
            recommendations
        };
    }
    /**
     * Sanitize query for logging (remove sensitive data)
     */
    sanitizeQuery(query) {
        return query
            .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
            .replace(/password\s*=\s*"[^"]*"/gi, 'password="***"')
            .replace(/'[a-zA-Z0-9+/]{20,}'/g, "'***'") // Potential tokens/hashes
            .replace(/"[a-zA-Z0-9+/]{20,}"/g, '"***"');
    }
    /**
     * Reset metrics (for testing or administrative purposes)
     */
    resetMetrics() {
        this.metrics = {
            connectionAttempts: 0,
            failedConnections: 0,
            suspiciousQueries: 0,
            lastSecurityEvent: null,
            securityScore: 100
        };
        this.securityEvents = [];
        this.logger.info('Security metrics reset');
    }
    /**
     * Check if IP address should be blocked (basic implementation)
     */
    shouldBlockIP(ip) {
        // Count failed connections from this IP in the last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentFailures = this.securityEvents.filter(event => event.type === 'connection' &&
            (event.severity === 'high' || event.severity === 'critical') &&
            event.details.host === ip &&
            event.details.timestamp > oneHourAgo).length;
        // Block if more than 10 failed attempts in the last hour
        return recentFailures > 10;
    }
}
exports.DatabaseSecurityManager = DatabaseSecurityManager;
// Export singleton instance
exports.databaseSecurityManager = DatabaseSecurityManager.getInstance();
//# sourceMappingURL=database-security.js.map