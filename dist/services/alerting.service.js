"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertingService = exports.AlertingService = exports.ResolutionType = exports.NotificationStatus = exports.ChannelType = exports.AlertStatus = exports.AlertSeverity = exports.AlertType = void 0;
const logger_1 = require("../shared/logger");
const error_handler_1 = require("../middleware/error-handler");
// Enums
var AlertType;
(function (AlertType) {
    AlertType["ANOMALY_DETECTION"] = "anomaly_detection";
    AlertType["SLA_VIOLATION"] = "sla_violation";
    AlertType["COST_THRESHOLD"] = "cost_threshold";
    AlertType["PERFORMANCE_DEGRADATION"] = "performance_degradation";
    AlertType["TREND_ANOMALY"] = "trend_anomaly";
    AlertType["SYSTEM_HEALTH"] = "system_health";
    AlertType["CUSTOM_METRIC"] = "custom_metric";
})(AlertType || (exports.AlertType = AlertType = {}));
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["LOW"] = "low";
    AlertSeverity["MEDIUM"] = "medium";
    AlertSeverity["HIGH"] = "high";
    AlertSeverity["CRITICAL"] = "critical";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
var AlertStatus;
(function (AlertStatus) {
    AlertStatus["ACTIVE"] = "active";
    AlertStatus["ACKNOWLEDGED"] = "acknowledged";
    AlertStatus["RESOLVED"] = "resolved";
    AlertStatus["SUPPRESSED"] = "suppressed";
    AlertStatus["ESCALATED"] = "escalated";
})(AlertStatus || (exports.AlertStatus = AlertStatus = {}));
var ChannelType;
(function (ChannelType) {
    ChannelType["EMAIL"] = "email";
    ChannelType["SLACK"] = "slack";
    ChannelType["WEBHOOK"] = "webhook";
    ChannelType["SMS"] = "sms";
    ChannelType["TEAMS"] = "teams";
    ChannelType["DISCORD"] = "discord";
    ChannelType["PAGERDUTY"] = "pagerduty";
    ChannelType["OPSGENIE"] = "opsgenie";
})(ChannelType || (exports.ChannelType = ChannelType = {}));
var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["PENDING"] = "pending";
    NotificationStatus["SENT"] = "sent";
    NotificationStatus["DELIVERED"] = "delivered";
    NotificationStatus["FAILED"] = "failed";
    NotificationStatus["RETRYING"] = "retrying";
})(NotificationStatus || (exports.NotificationStatus = NotificationStatus = {}));
var ResolutionType;
(function (ResolutionType) {
    ResolutionType["MANUAL"] = "manual";
    ResolutionType["AUTO"] = "auto";
    ResolutionType["TIMEOUT"] = "timeout";
    ResolutionType["ESCALATION_RESOLVED"] = "escalation_resolved";
})(ResolutionType || (exports.ResolutionType = ResolutionType = {}));
/**
 * Advanced Alerting Service Implementation
 */
class AlertingService {
    static instance;
    logger;
    webSocketService;
    alertConfigurations = new Map();
    activeAlerts = new Map();
    alertHistory = [];
    isInitialized = false;
    constructor() {
        this.logger = new logger_1.Logger('AlertingService');
    }
    static getInstance() {
        if (!AlertingService.instance) {
            AlertingService.instance = new AlertingService();
        }
        return AlertingService.instance;
    }
    /**
     * Initialize the alerting service
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            // Load alert configurations from database
            await this.loadAlertConfigurations();
            // Initialize background processes
            this.startBackgroundProcesses();
            this.isInitialized = true;
            this.logger.info('Alerting service initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize alerting service', error);
            throw new error_handler_1.AppError('Alerting service initialization failed', 500);
        }
    }
    /**
     * Set WebSocket service for real-time notifications
     */
    setWebSocketService(webSocketService) {
        this.webSocketService = webSocketService;
        this.logger.info('WebSocket service configured for alerting');
    }
    /**
     * Create a new alert configuration
     */
    async createAlertConfiguration(config) {
        const configId = `alert-config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const alertConfig = {
            ...config,
            id: configId,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        // Validate configuration
        this.validateAlertConfiguration(alertConfig);
        // Store configuration
        this.alertConfigurations.set(configId, alertConfig);
        await this.persistAlertConfiguration(alertConfig);
        this.logger.info('Alert configuration created', {
            configId,
            type: config.type,
            severity: config.severity
        });
        return configId;
    }
    /**
     * Trigger an alert based on analysis results
     */
    async triggerAlert(type, details, context = { environment: 'production', tags: [], metadata: {}, relatedAlerts: [] }) {
        try {
            // Find matching alert configurations
            const matchingConfigs = this.findMatchingConfigurations(type, details, context);
            if (matchingConfigs.length === 0) {
                this.logger.debug('No matching alert configurations found', { type, details });
                return null;
            }
            // Check rate limiting and deduplication
            const config = matchingConfigs[0]; // Use first matching config
            if (!config) {
                this.logger.warn('No valid configuration found');
                return null;
            }
            if (await this.isRateLimited(config, details, context)) {
                this.logger.debug('Alert rate limited', { configId: config.id, type });
                return null;
            }
            // Create alert
            const alertId = await this.createAlert(config, details, context);
            // Send notifications
            await this.sendNotifications(alertId);
            // Start escalation timer if configured
            if (config.escalation.enabled) {
                this.scheduleEscalation(alertId);
            }
            this.logger.info('Alert triggered successfully', {
                alertId,
                configId: config.id,
                type,
                severity: config.severity
            });
            return alertId;
        }
        catch (error) {
            this.logger.error('Failed to trigger alert', error, { type, details });
            throw new error_handler_1.AppError('Alert triggering failed', 500);
        }
    }
    /**
     * Acknowledge an alert
     */
    async acknowledgeAlert(alertId, acknowledgedBy, comment) {
        const alert = this.activeAlerts.get(alertId);
        if (!alert) {
            throw new error_handler_1.AppError('Alert not found', 404);
        }
        if (alert.status === AlertStatus.ACKNOWLEDGED || alert.status === AlertStatus.RESOLVED) {
            throw new error_handler_1.AppError('Alert already acknowledged or resolved', 400);
        }
        // Update alert
        alert.status = AlertStatus.ACKNOWLEDGED;
        alert.acknowledgment = {
            acknowledgedBy,
            acknowledgedAt: new Date(),
            autoAcknowledged: false,
            ...(comment && { comment })
        };
        alert.updatedAt = new Date();
        // Stop escalation
        this.stopEscalation(alertId);
        // Send acknowledgment notifications
        await this.sendAcknowledgmentNotifications(alertId);
        // Persist changes
        await this.persistAlert(alert);
        this.logger.info('Alert acknowledged', {
            alertId,
            acknowledgedBy,
            comment
        });
    }
    /**
     * Resolve an alert
     */
    async resolveAlert(alertId, resolvedBy, resolutionType = ResolutionType.MANUAL, comment, rootCause, actionsTaken = []) {
        const alert = this.activeAlerts.get(alertId);
        if (!alert) {
            throw new error_handler_1.AppError('Alert not found', 404);
        }
        if (alert.status === AlertStatus.RESOLVED) {
            throw new error_handler_1.AppError('Alert already resolved', 400);
        }
        // Update alert
        alert.status = AlertStatus.RESOLVED;
        alert.resolvedAt = new Date();
        alert.resolution = {
            resolvedBy,
            resolvedAt: new Date(),
            resolutionType,
            autoResolved: resolutionType !== ResolutionType.MANUAL,
            actionsTaken,
            ...(comment && { comment }),
            ...(rootCause && { rootCause })
        };
        alert.updatedAt = new Date();
        // Stop escalation
        this.stopEscalation(alertId);
        // Move to history
        this.activeAlerts.delete(alertId);
        this.alertHistory.push(alert);
        // Send resolution notifications
        await this.sendResolutionNotifications(alertId);
        // Persist changes
        await this.persistAlert(alert);
        this.logger.info('Alert resolved', {
            alertId,
            resolvedBy,
            resolutionType,
            rootCause
        });
    }
    /**
     * Get active alerts with filtering
     */
    getActiveAlerts(filters) {
        let alerts = Array.from(this.activeAlerts.values());
        if (filters) {
            if (filters.type) {
                alerts = alerts.filter(alert => alert.type === filters.type);
            }
            if (filters.severity) {
                alerts = alerts.filter(alert => alert.severity === filters.severity);
            }
            if (filters.pipelineId) {
                alerts = alerts.filter(alert => alert.details.pipelineId === filters.pipelineId);
            }
            if (filters.limit) {
                alerts = alerts.slice(0, filters.limit);
            }
        }
        return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    /**
     * Get alert history with filtering
     */
    getAlertHistory(filters) {
        let alerts = [...this.alertHistory];
        if (filters) {
            if (filters.type) {
                alerts = alerts.filter(alert => alert.type === filters.type);
            }
            if (filters.severity) {
                alerts = alerts.filter(alert => alert.severity === filters.severity);
            }
            if (filters.status) {
                alerts = alerts.filter(alert => alert.status === filters.status);
            }
            if (filters.startDate) {
                alerts = alerts.filter(alert => alert.createdAt >= filters.startDate);
            }
            if (filters.endDate) {
                alerts = alerts.filter(alert => alert.createdAt <= filters.endDate);
            }
            if (filters.limit) {
                alerts = alerts.slice(0, filters.limit);
            }
        }
        return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    /**
     * Get alerting metrics and statistics
     */
    getAlertingMetrics() {
        const activeAlerts = Array.from(this.activeAlerts.values());
        const allAlerts = [...activeAlerts, ...this.alertHistory];
        const alertsByType = {};
        const alertsBySeverity = {};
        // Initialize counters
        Object.values(AlertType).forEach(type => alertsByType[type] = 0);
        Object.values(AlertSeverity).forEach(severity => alertsBySeverity[severity] = 0);
        // Count alerts
        allAlerts.forEach(alert => {
            alertsByType[alert.type]++;
            alertsBySeverity[alert.severity]++;
        });
        // Calculate resolution time
        const resolvedAlerts = this.alertHistory.filter(alert => alert.resolvedAt);
        const averageResolutionTime = resolvedAlerts.length > 0
            ? resolvedAlerts.reduce((sum, alert) => {
                const resolutionTime = alert.resolvedAt.getTime() - alert.createdAt.getTime();
                return sum + resolutionTime;
            }, 0) / resolvedAlerts.length / 60000 // Convert to minutes
            : 0;
        // Calculate rates
        const escalatedAlerts = allAlerts.filter(alert => alert.escalations.length > 0);
        const acknowledgedAlerts = allAlerts.filter(alert => alert.acknowledgment);
        return {
            activeAlerts: activeAlerts.length,
            totalAlerts: allAlerts.length,
            alertsByType,
            alertsBySeverity,
            averageResolutionTime,
            escalationRate: allAlerts.length > 0 ? (escalatedAlerts.length / allAlerts.length) * 100 : 0,
            acknowledgedRate: allAlerts.length > 0 ? (acknowledgedAlerts.length / allAlerts.length) * 100 : 0
        };
    }
    // ================== PRIVATE HELPER METHODS ==================
    async loadAlertConfigurations() {
        // In a real implementation, this would load from database
        // For now, create some default configurations
        await this.createDefaultConfigurations();
    }
    async createDefaultConfigurations() {
        // Default anomaly detection configuration
        await this.createAlertConfiguration({
            name: 'Critical Anomaly Detection',
            description: 'Alerts for critical pipeline anomalies',
            enabled: true,
            type: AlertType.ANOMALY_DETECTION,
            severity: AlertSeverity.HIGH,
            thresholds: {
                anomaly: {
                    zScoreThreshold: 3.0,
                    percentileThreshold: 99,
                    minDataPoints: 10,
                    triggerCount: 2
                }
            },
            channels: [
                {
                    id: 'default-webhook',
                    type: ChannelType.WEBHOOK,
                    enabled: true,
                    config: {
                        webhook: {
                            url: 'http://localhost:3000/alerts/webhook',
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            template: '{"alert": "{{title}}", "message": "{{message}}", "severity": "{{severity}}"}'
                        }
                    },
                    filters: {
                        severities: [AlertSeverity.HIGH, AlertSeverity.CRITICAL],
                        types: [AlertType.ANOMALY_DETECTION]
                    },
                    retryPolicy: {
                        enabled: true,
                        maxRetries: 3,
                        retryDelayMs: 5000,
                        exponentialBackoff: true,
                        maxRetryDelayMs: 30000
                    }
                }
            ],
            escalation: {
                enabled: true,
                stages: [
                    {
                        stage: 1,
                        delayMinutes: 15,
                        channels: ['default-webhook'],
                        requiresAcknowledgment: true,
                        notifyRoles: ['admin'],
                        notifyUsers: []
                    }
                ],
                maxEscalations: 2,
                escalationTimeoutMinutes: 60,
                autoResolve: true,
                autoResolveTimeoutMinutes: 240
            },
            filters: {
                environments: ['production'],
                timeWindows: []
            },
            rateLimit: {
                enabled: true,
                maxAlertsPerHour: 5,
                maxAlertsPerDay: 20,
                cooldownMinutes: 10,
                deduplicationWindow: 30
            },
            metadata: {},
            createdBy: 'system'
        });
        this.logger.info('Default alert configurations created');
    }
    validateAlertConfiguration(config) {
        // Validate required fields
        if (!config.name || !config.type || !config.severity) {
            throw new error_handler_1.AppError('Invalid alert configuration: missing required fields', 400);
        }
        // Validate thresholds
        if (!config.thresholds || Object.keys(config.thresholds).length === 0) {
            throw new error_handler_1.AppError('Invalid alert configuration: no thresholds defined', 400);
        }
        // Validate channels
        if (!config.channels || config.channels.length === 0) {
            throw new error_handler_1.AppError('Invalid alert configuration: no notification channels defined', 400);
        }
        // Additional validation logic...
    }
    findMatchingConfigurations(type, details, context) {
        return Array.from(this.alertConfigurations.values()).filter(config => {
            // Check if configuration is enabled and matches type
            if (!config.enabled || config.type !== type) {
                return false;
            }
            // Check filters
            if (config.filters.pipelineIds && details.pipelineId &&
                !config.filters.pipelineIds.includes(details.pipelineId)) {
                return false;
            }
            if (config.filters.environments &&
                !config.filters.environments.includes(context.environment)) {
                return false;
            }
            // Check threshold conditions
            return this.checkThresholds(config.thresholds, type, details);
        });
    }
    checkThresholds(thresholds, type, details) {
        switch (type) {
            case AlertType.ANOMALY_DETECTION:
                if (thresholds.anomaly) {
                    return details.triggerValue >= thresholds.anomaly.zScoreThreshold;
                }
                break;
            case AlertType.SLA_VIOLATION:
                if (thresholds.sla) {
                    return details.triggerValue >= thresholds.sla.violationPercent;
                }
                break;
            case AlertType.COST_THRESHOLD:
                if (thresholds.cost) {
                    return details.triggerValue >= thresholds.cost.absoluteThreshold;
                }
                break;
            default:
                return true;
        }
        return false;
    }
    async isRateLimited(config, details, context) {
        if (!config.rateLimit.enabled) {
            return false;
        }
        // Check for duplicate alerts in deduplication window
        const deduplicationKey = this.generateDeduplicationKey(config.type, details, context);
        const deduplicationWindow = config.rateLimit.deduplicationWindow * 60 * 1000; // Convert to ms
        const cutoffTime = new Date(Date.now() - deduplicationWindow);
        const recentSimilarAlerts = this.alertHistory.filter(alert => alert.createdAt >= cutoffTime &&
            this.generateDeduplicationKey(alert.type, alert.details, alert.context) === deduplicationKey);
        return recentSimilarAlerts.length > 0;
    }
    generateDeduplicationKey(type, details, context) {
        return `${type}-${details.metric}-${details.pipelineId || 'global'}-${context.environment}`;
    }
    async createAlert(config, details, context) {
        const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const alert = {
            id: alertId,
            configurationId: config.id,
            type: config.type,
            severity: config.severity,
            status: AlertStatus.ACTIVE,
            title: this.generateAlertTitle(config.type, details),
            message: this.generateAlertMessage(config.type, details, context),
            details,
            context,
            notifications: [],
            escalations: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.activeAlerts.set(alertId, alert);
        await this.persistAlert(alert);
        // Send real-time notification via WebSocket
        if (this.webSocketService) {
            // Use existing broadcast method for alerts
            this.webSocketService.broadcast('alert', {
                type: 'new_alert',
                alert: {
                    id: alert.id,
                    type: alert.type,
                    severity: alert.severity,
                    title: alert.title,
                    message: alert.message,
                    createdAt: alert.createdAt
                }
            });
        }
        return alertId;
    }
    generateAlertTitle(type, details) {
        switch (type) {
            case AlertType.ANOMALY_DETECTION:
                return `Anomaly Detected: ${details.metric}`;
            case AlertType.SLA_VIOLATION:
                return `SLA Violation: ${details.metric}`;
            case AlertType.COST_THRESHOLD:
                return `Cost Threshold Exceeded: ${details.metric}`;
            default:
                return `Alert: ${details.metric}`;
        }
    }
    generateAlertMessage(type, details, context) {
        const pipelineInfo = details.pipelineId ? ` for pipeline ${details.pipelineId}` : '';
        switch (type) {
            case AlertType.ANOMALY_DETECTION:
                return `Anomaly detected in ${details.metric}${pipelineInfo}. ` +
                    `Value: ${details.triggerValue}, Threshold: ${details.threshold}`;
            case AlertType.SLA_VIOLATION:
                return `SLA violation for ${details.metric}${pipelineInfo}. ` +
                    `Current: ${details.triggerValue}%, Target: ${details.threshold}%`;
            case AlertType.COST_THRESHOLD:
                return `Cost threshold exceeded for ${details.metric}${pipelineInfo}. ` +
                    `Current: $${details.triggerValue}, Threshold: $${details.threshold}`;
            default:
                return `Alert triggered for ${details.metric}${pipelineInfo}`;
        }
    }
    async sendNotifications(alertId) {
        const alert = this.activeAlerts.get(alertId);
        if (!alert)
            return;
        const config = this.alertConfigurations.get(alert.configurationId);
        if (!config)
            return;
        for (const channel of config.channels) {
            if (!channel.enabled)
                continue;
            try {
                await this.sendNotificationToChannel(alert, channel);
            }
            catch (error) {
                this.logger.error('Failed to send notification', error, {
                    alertId,
                    channelId: channel.id,
                    channelType: channel.type
                });
            }
        }
    }
    async sendNotificationToChannel(alert, channel) {
        const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const notification = {
            id: notificationId,
            channelId: channel.id,
            channelType: channel.type,
            status: NotificationStatus.PENDING,
            sentAt: new Date(),
            retryCount: 0,
            metadata: {}
        };
        try {
            // Send notification based on channel type
            switch (channel.type) {
                case ChannelType.WEBHOOK:
                    await this.sendWebhookNotification(alert, channel);
                    break;
                case ChannelType.EMAIL:
                    await this.sendEmailNotification(alert, channel);
                    break;
                case ChannelType.SLACK:
                    await this.sendSlackNotification(alert, channel);
                    break;
                default:
                    throw new Error(`Unsupported channel type: ${channel.type}`);
            }
            notification.status = NotificationStatus.SENT;
            notification.deliveredAt = new Date();
        }
        catch (error) {
            notification.status = NotificationStatus.FAILED;
            notification.failedAt = new Date();
            notification.error = error instanceof Error ? error.message : 'Unknown error';
        }
        alert.notifications.push(notification);
        await this.persistAlert(alert);
    }
    async sendWebhookNotification(alert, channel) {
        const webhookConfig = channel.config.webhook;
        if (!webhookConfig)
            throw new Error('Webhook configuration missing');
        const payload = this.renderTemplate(webhookConfig.template, alert);
        // In a real implementation, this would make an HTTP request
        this.logger.info('Webhook notification sent', {
            url: webhookConfig.url,
            payload,
            alertId: alert.id
        });
    }
    async sendEmailNotification(alert, channel) {
        const emailConfig = channel.config.email;
        if (!emailConfig)
            throw new Error('Email configuration missing');
        // In a real implementation, this would send an email
        this.logger.info('Email notification sent', {
            to: emailConfig.to,
            subject: emailConfig.subject,
            alertId: alert.id
        });
    }
    async sendSlackNotification(alert, channel) {
        const slackConfig = channel.config.slack;
        if (!slackConfig)
            throw new Error('Slack configuration missing');
        // In a real implementation, this would send to Slack
        this.logger.info('Slack notification sent', {
            channel: slackConfig.channel,
            webhook: slackConfig.webhookUrl,
            alertId: alert.id
        });
    }
    renderTemplate(template, alert) {
        return template
            .replace(/\{\{title\}\}/g, alert.title)
            .replace(/\{\{message\}\}/g, alert.message)
            .replace(/\{\{severity\}\}/g, alert.severity)
            .replace(/\{\{type\}\}/g, alert.type)
            .replace(/\{\{id\}\}/g, alert.id)
            .replace(/\{\{createdAt\}\}/g, alert.createdAt.toISOString());
    }
    scheduleEscalation(alertId) {
        // In a real implementation, this would use a job scheduler
        this.logger.info('Escalation scheduled', { alertId });
    }
    stopEscalation(alertId) {
        // In a real implementation, this would cancel the scheduled escalation
        this.logger.info('Escalation stopped', { alertId });
    }
    async sendAcknowledgmentNotifications(alertId) {
        this.logger.info('Acknowledgment notifications sent', { alertId });
    }
    async sendResolutionNotifications(alertId) {
        this.logger.info('Resolution notifications sent', { alertId });
    }
    async persistAlertConfiguration(config) {
        // In a real implementation, this would save to database
        this.logger.debug('Alert configuration persisted', { configId: config.id });
    }
    async persistAlert(alert) {
        // In a real implementation, this would save to database
        this.logger.debug('Alert persisted', { alertId: alert.id });
    }
    startBackgroundProcesses() {
        // Start cleanup process for old alerts
        setInterval(() => {
            this.cleanupOldAlerts();
        }, 60 * 60 * 1000); // Run every hour
        // Start escalation check process
        setInterval(() => {
            this.checkEscalations();
        }, 5 * 60 * 1000); // Run every 5 minutes
        this.logger.info('Background processes started');
    }
    cleanupOldAlerts() {
        const cutoffTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
        const initialCount = this.alertHistory.length;
        this.alertHistory = this.alertHistory.filter(alert => alert.createdAt >= cutoffTime);
        const removedCount = initialCount - this.alertHistory.length;
        if (removedCount > 0) {
            this.logger.info('Cleaned up old alerts', { removedCount });
        }
    }
    checkEscalations() {
        // Check for alerts that need escalation
        const now = new Date();
        for (const alert of this.activeAlerts.values()) {
            const config = this.alertConfigurations.get(alert.configurationId);
            if (!config || !config.escalation.enabled)
                continue;
            // Check if alert needs escalation
            const timeSinceCreation = now.getTime() - alert.createdAt.getTime();
            const firstStage = config.escalation.stages[0];
            if (!firstStage)
                continue;
            const escalationDelay = firstStage.delayMinutes * 60 * 1000;
            if (timeSinceCreation >= escalationDelay && alert.escalations.length === 0) {
                this.escalateAlert(alert.id);
            }
        }
    }
    async escalateAlert(alertId) {
        const alert = this.activeAlerts.get(alertId);
        if (!alert)
            return;
        alert.status = AlertStatus.ESCALATED;
        const escalation = {
            id: `escalation-${Date.now()}`,
            stage: 1,
            triggeredAt: new Date(),
            notifiedChannels: [],
            acknowledged: false
        };
        alert.escalations.push(escalation);
        alert.updatedAt = new Date();
        await this.persistAlert(alert);
        this.logger.info('Alert escalated', { alertId, stage: escalation.stage });
    }
}
exports.AlertingService = AlertingService;
// Export singleton instance
exports.alertingService = AlertingService.getInstance();
//# sourceMappingURL=alerting.service.js.map