/**
 * Advanced Alerting System - Configurable Multi-Channel Notifications
 *
 * Features:
 * - Configurable alert thresholds for anomalies, SLA violations, cost overruns
 * - Multi-channel notification support (email, Slack, webhooks, SMS)
 * - Alert escalation policies with time-based escalation
 * - Alert history and management with acknowledgment system
 * - Advanced filtering and routing based on severity and context
 * - Rate limiting and deduplication to prevent alert fatigue
 *
 * @author sirhCC
 * @version 1.0.0
 */
import { WebSocketService } from '../services/websocket.service';
export interface AlertConfiguration {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    type: AlertType;
    severity: AlertSeverity;
    thresholds: AlertThresholds;
    channels: NotificationChannel[];
    escalation: EscalationPolicy;
    filters: AlertFilters;
    rateLimit: RateLimitConfig;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}
export interface AlertThresholds {
    anomaly?: {
        zScoreThreshold: number;
        percentileThreshold: number;
        minDataPoints: number;
        triggerCount: number;
    };
    sla?: {
        violationPercent: number;
        durationMinutes: number;
        frequency: number;
        timePeriodHours: number;
    };
    cost?: {
        absoluteThreshold: number;
        percentageIncrease: number;
        budgetExceeded: number;
        trendDetection: boolean;
    };
    performance?: {
        durationMs: number;
        errorRate: number;
        successRate: number;
        resourceUtilization: number;
    };
    custom?: {
        metricName: string;
        operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
        value: number;
        timeWindow: number;
    };
}
export interface NotificationChannel {
    id: string;
    type: ChannelType;
    enabled: boolean;
    config: ChannelConfig;
    filters: ChannelFilters;
    retryPolicy: RetryPolicy;
}
export interface EscalationPolicy {
    enabled: boolean;
    stages: EscalationStage[];
    maxEscalations: number;
    escalationTimeoutMinutes: number;
    autoResolve: boolean;
    autoResolveTimeoutMinutes: number;
}
export interface EscalationStage {
    stage: number;
    delayMinutes: number;
    channels: string[];
    requiresAcknowledgment: boolean;
    notifyRoles: string[];
    notifyUsers: string[];
}
export interface AlertFilters {
    pipelineIds?: string[];
    environments?: string[];
    tags?: string[];
    timeWindows?: TimeWindow[];
    excludePatterns?: string[];
}
export interface RateLimitConfig {
    enabled: boolean;
    maxAlertsPerHour: number;
    maxAlertsPerDay: number;
    cooldownMinutes: number;
    deduplicationWindow: number;
}
export interface Alert {
    id: string;
    configurationId: string;
    type: AlertType;
    severity: AlertSeverity;
    status: AlertStatus;
    title: string;
    message: string;
    details: AlertDetails;
    context: AlertContext;
    notifications: NotificationRecord[];
    escalations: EscalationRecord[];
    acknowledgment?: AcknowledgmentRecord;
    resolution?: ResolutionRecord;
    createdAt: Date;
    updatedAt: Date;
    resolvedAt?: Date;
}
export interface AlertDetails {
    triggerValue: number;
    threshold: number;
    metric: string;
    pipelineId?: string;
    runId?: string;
    source: string;
    raw: Record<string, unknown>;
}
export interface AlertContext {
    environment: string;
    tags: string[];
    metadata: Record<string, unknown>;
    relatedAlerts: string[];
    parentAlert?: string;
}
export interface NotificationRecord {
    id: string;
    channelId: string;
    channelType: ChannelType;
    status: NotificationStatus;
    sentAt: Date;
    deliveredAt?: Date;
    failedAt?: Date;
    retryCount: number;
    error?: string;
    metadata: Record<string, unknown>;
}
export interface EscalationRecord {
    id: string;
    stage: number;
    triggeredAt: Date;
    notifiedChannels: string[];
    acknowledged: boolean;
    acknowledgedBy?: string;
    acknowledgedAt?: Date;
}
export interface AcknowledgmentRecord {
    acknowledgedBy: string;
    acknowledgedAt: Date;
    comment?: string;
    autoAcknowledged: boolean;
}
export interface ResolutionRecord {
    resolvedBy: string;
    resolvedAt: Date;
    resolutionType: ResolutionType;
    comment?: string;
    autoResolved: boolean;
    rootCause?: string;
    actionsTaken: string[];
}
export declare enum AlertType {
    ANOMALY_DETECTION = "anomaly_detection",
    SLA_VIOLATION = "sla_violation",
    COST_THRESHOLD = "cost_threshold",
    PERFORMANCE_DEGRADATION = "performance_degradation",
    TREND_ANOMALY = "trend_anomaly",
    SYSTEM_HEALTH = "system_health",
    CUSTOM_METRIC = "custom_metric"
}
export declare enum AlertSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare enum AlertStatus {
    ACTIVE = "active",
    ACKNOWLEDGED = "acknowledged",
    RESOLVED = "resolved",
    SUPPRESSED = "suppressed",
    ESCALATED = "escalated"
}
export declare enum ChannelType {
    EMAIL = "email",
    SLACK = "slack",
    WEBHOOK = "webhook",
    SMS = "sms",
    TEAMS = "teams",
    DISCORD = "discord",
    PAGERDUTY = "pagerduty",
    OPSGENIE = "opsgenie"
}
export declare enum NotificationStatus {
    PENDING = "pending",
    SENT = "sent",
    DELIVERED = "delivered",
    FAILED = "failed",
    RETRYING = "retrying"
}
export declare enum ResolutionType {
    MANUAL = "manual",
    AUTO = "auto",
    TIMEOUT = "timeout",
    ESCALATION_RESOLVED = "escalation_resolved"
}
export interface ChannelConfig {
    email?: {
        to: string[];
        cc?: string[];
        bcc?: string[];
        subject: string;
        template: string;
    };
    slack?: {
        webhookUrl: string;
        channel: string;
        username: string;
        iconEmoji?: string;
        template: string;
    };
    webhook?: {
        url: string;
        method: 'POST' | 'PUT' | 'PATCH';
        headers: Record<string, string>;
        template: string;
        secretKey?: string;
    };
    sms?: {
        numbers: string[];
        provider: 'twilio' | 'aws_sns' | 'custom';
        credentials: Record<string, string>;
        template: string;
    };
}
export interface ChannelFilters {
    severities: AlertSeverity[];
    types: AlertType[];
    pipelineIds?: string[];
    timeWindows?: TimeWindow[];
}
export interface RetryPolicy {
    enabled: boolean;
    maxRetries: number;
    retryDelayMs: number;
    exponentialBackoff: boolean;
    maxRetryDelayMs: number;
}
export interface TimeWindow {
    start: string;
    end: string;
    timezone: string;
    daysOfWeek: number[];
}
/**
 * Advanced Alerting Service Implementation
 */
export declare class AlertingService {
    private static instance;
    private logger;
    private webSocketService?;
    private alertConfigurations;
    private activeAlerts;
    private alertHistory;
    private isInitialized;
    constructor();
    static getInstance(): AlertingService;
    /**
     * Initialize the alerting service
     */
    initialize(): Promise<void>;
    /**
     * Set WebSocket service for real-time notifications
     */
    setWebSocketService(webSocketService: WebSocketService): void;
    /**
     * Create a new alert configuration
     */
    createAlertConfiguration(config: Omit<AlertConfiguration, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
    /**
     * Trigger an alert based on analysis results
     */
    triggerAlert(type: AlertType, details: AlertDetails, context?: AlertContext): Promise<string | null>;
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId: string, acknowledgedBy: string, comment?: string): Promise<void>;
    /**
     * Resolve an alert
     */
    resolveAlert(alertId: string, resolvedBy: string, resolutionType?: ResolutionType, comment?: string, rootCause?: string, actionsTaken?: string[]): Promise<void>;
    /**
     * Get active alerts with filtering
     */
    getActiveAlerts(filters?: {
        type?: AlertType;
        severity?: AlertSeverity;
        pipelineId?: string;
        limit?: number;
    }): Alert[];
    /**
     * Get alert history with filtering
     */
    getAlertHistory(filters?: {
        type?: AlertType;
        severity?: AlertSeverity;
        status?: AlertStatus;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }): Alert[];
    /**
     * Get alerting metrics and statistics
     */
    getAlertingMetrics(): {
        activeAlerts: number;
        totalAlerts: number;
        alertsByType: Record<AlertType, number>;
        alertsBySeverity: Record<AlertSeverity, number>;
        averageResolutionTime: number;
        escalationRate: number;
        acknowledgedRate: number;
    };
    private loadAlertConfigurations;
    private createDefaultConfigurations;
    private validateAlertConfiguration;
    private findMatchingConfigurations;
    private checkThresholds;
    private isRateLimited;
    private generateDeduplicationKey;
    private createAlert;
    private generateAlertTitle;
    private generateAlertMessage;
    private sendNotifications;
    private sendNotificationToChannel;
    private sendWebhookNotification;
    private sendEmailNotification;
    private sendSlackNotification;
    private renderTemplate;
    private scheduleEscalation;
    private stopEscalation;
    private sendAcknowledgmentNotifications;
    private sendResolutionNotifications;
    private persistAlertConfiguration;
    private persistAlert;
    private startBackgroundProcesses;
    private cleanupOldAlerts;
    private checkEscalations;
    private escalateAlert;
}
export declare const alertingService: AlertingService;
//# sourceMappingURL=alerting.service.d.ts.map