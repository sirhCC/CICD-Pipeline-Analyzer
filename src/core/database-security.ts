/**
 * Database Security Manager
 * Handles database security auditing, monitoring, and compliance
 */

import { Logger } from '@/shared/logger';
import { configManager } from '@/config';

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

export class DatabaseSecurityManager {
  private static instance: DatabaseSecurityManager;
  private logger: Logger;
  private securityEvents: SecurityEvent[] = [];
  private metrics: SecurityMetrics;
  private suspiciousPatterns: RegExp[];

  private constructor() {
    this.logger = new Logger('DatabaseSecurity');
    this.metrics = {
      connectionAttempts: 0,
      failedConnections: 0,
      suspiciousQueries: 0,
      lastSecurityEvent: null,
      securityScore: 100,
    };

    this.suspiciousPatterns = [];
    this.initializeSuspiciousPatterns();
  }

  public static getInstance(): DatabaseSecurityManager {
    if (!DatabaseSecurityManager.instance) {
      DatabaseSecurityManager.instance = new DatabaseSecurityManager();
    }
    return DatabaseSecurityManager.instance;
  }

  /**
   * Initialize patterns for detecting suspicious queries
   */
  private initializeSuspiciousPatterns(): void {
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
      /select\s+\*\s+from\s+\w+\s+limit\s+\d{4,}/gi,
    ];
  }

  /**
   * Log a security event
   */
  public logSecurityEvent(
    event: Omit<SecurityEvent, 'details'> & { details?: Partial<SecurityEvent['details']> }
  ): void {
    const securityEvent: SecurityEvent = {
      ...event,
      details: {
        timestamp: new Date(),
        ...event.details,
      },
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
      ...event.details,
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
  private updateMetrics(event: SecurityEvent): void {
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
  public analyzeQuery(query: string, context?: { user?: string; host?: string }): void {
    if (!configManager.isProduction() && !process.env.ENABLE_QUERY_ANALYSIS) {
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
          ...context,
        },
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
          query: this.sanitizeQuery(`${query.substring(0, 1000)}...`),
          ...context,
        },
      });
    }
  }

  /**
   * Log connection attempt
   */
  public logConnectionAttempt(
    success: boolean,
    context: { user?: string; host?: string; database?: string; error?: string }
  ): void {
    if (success) {
      this.logSecurityEvent({
        type: 'connection',
        severity: 'low',
        message: 'Database connection established',
        details: context,
      });
    } else {
      this.logSecurityEvent({
        type: 'connection',
        severity: 'high',
        message: 'Database connection failed',
        details: context,
      });
    }
  }

  /**
   * Log authentication event
   */
  public logAuthenticationEvent(
    success: boolean,
    context: { user?: string; host?: string; method?: string }
  ): void {
    this.logSecurityEvent({
      type: 'authentication',
      severity: success ? 'low' : 'high',
      message: success ? 'Authentication successful' : 'Authentication failed',
      details: context,
    });
  }

  /**
   * Get security metrics
   */
  public getSecurityMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent security events
   */
  public getRecentEvents(
    limit: number = 50,
    severity?: SecurityEvent['severity']
  ): SecurityEvent[] {
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
  public generateSecurityReport(): {
    summary: SecurityMetrics;
    recentEvents: SecurityEvent[];
    recommendations: string[];
  } {
    const recommendations: string[] = [];

    // Analyze metrics and generate recommendations
    if (this.metrics.failedConnections > 10) {
      recommendations.push('High number of failed connections detected - consider IP whitelisting');
    }

    if (this.metrics.suspiciousQueries > 5) {
      recommendations.push(
        'Suspicious query patterns detected - review application code for SQL injection vulnerabilities'
      );
    }

    if (this.metrics.securityScore < 80) {
      recommendations.push(
        'Security score is low - review recent security events and implement additional safeguards'
      );
    }

    const recentCriticalEvents = this.getRecentEvents(10, 'critical');
    if (recentCriticalEvents.length > 0) {
      recommendations.push('Critical security events detected - immediate attention required');
    }

    return {
      summary: this.getSecurityMetrics(),
      recentEvents: this.getRecentEvents(20),
      recommendations,
    };
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/password\s*=\s*"[^"]*"/gi, 'password="***"')
      .replace(/'[a-zA-Z0-9+/]{20,}'/g, "'***'") // Potential tokens/hashes
      .replace(/"[a-zA-Z0-9+/]{20,}"/g, '"***"');
  }

  /**
   * Reset metrics (for testing or administrative purposes)
   */
  public resetMetrics(): void {
    this.metrics = {
      connectionAttempts: 0,
      failedConnections: 0,
      suspiciousQueries: 0,
      lastSecurityEvent: null,
      securityScore: 100,
    };
    this.securityEvents = [];

    this.logger.info('Security metrics reset');
  }

  /**
   * Check if IP address should be blocked (basic implementation)
   */
  public shouldBlockIP(ip: string): boolean {
    // Count failed connections from this IP in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentFailures = this.securityEvents.filter(
      event =>
        event.type === 'connection' &&
        (event.severity === 'high' || event.severity === 'critical') &&
        event.details.host === ip &&
        event.details.timestamp > oneHourAgo
    ).length;

    // Block if more than 10 failed attempts in the last hour
    return recentFailures > 10;
  }
}

// Export singleton instance
export const databaseSecurityManager = DatabaseSecurityManager.getInstance();
