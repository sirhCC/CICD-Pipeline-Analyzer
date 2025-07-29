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

import { Logger } from '@/shared/logger';
import { AppError } from '@/middleware/error-handler';
import { WebSocketService } from '@/services/websocket.service';
import { repositoryFactory } from '@/repositories/factory.enhanced';
import { databaseManager } from '@/core/database';

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
  // Anomaly detection thresholds
  anomaly?: {
    zScoreThreshold: number;
    percentileThreshold: number;
    minDataPoints: number;
    triggerCount: number; // Number of consecutive anomalies to trigger alert
  };
  
  // SLA violation thresholds
  sla?: {
    violationPercent: number;
    durationMinutes: number;
    frequency: number; // violations per time period
    timePeriodHours: number;
  };
  
  // Cost analysis thresholds
  cost?: {
    absoluteThreshold: number;
    percentageIncrease: number;
    budgetExceeded: number;
    trendDetection: boolean;
  };
  
  // Performance thresholds
  performance?: {
    durationMs: number;
    errorRate: number;
    successRate: number;
    resourceUtilization: number;
  };
  
  // Custom metric thresholds
  custom?: {
    metricName: string;
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
    value: number;
    timeWindow: number; // minutes
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
  channels: string[]; // Channel IDs
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
  deduplicationWindow: number; // minutes
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

// Enums
export enum AlertType {
  ANOMALY_DETECTION = 'anomaly_detection',
  SLA_VIOLATION = 'sla_violation',
  COST_THRESHOLD = 'cost_threshold',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  TREND_ANOMALY = 'trend_anomaly',
  SYSTEM_HEALTH = 'system_health',
  CUSTOM_METRIC = 'custom_metric'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  SUPPRESSED = 'suppressed',
  ESCALATED = 'escalated'
}

export enum ChannelType {
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  SMS = 'sms',
  TEAMS = 'teams',
  DISCORD = 'discord',
  PAGERDUTY = 'pagerduty',
  OPSGENIE = 'opsgenie'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETRYING = 'retrying'
}

export enum ResolutionType {
  MANUAL = 'manual',
  AUTO = 'auto',
  TIMEOUT = 'timeout',
  ESCALATION_RESOLVED = 'escalation_resolved'
}

// Additional interfaces
export interface ChannelConfig {
  // Email configuration
  email?: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    template: string;
  };
  
  // Slack configuration
  slack?: {
    webhookUrl: string;
    channel: string;
    username: string;
    iconEmoji?: string;
    template: string;
  };
  
  // Webhook configuration
  webhook?: {
    url: string;
    method: 'POST' | 'PUT' | 'PATCH';
    headers: Record<string, string>;
    template: string;
    secretKey?: string;
  };
  
  // SMS configuration
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
  start: string; // HH:mm format
  end: string;   // HH:mm format
  timezone: string;
  daysOfWeek: number[]; // 0-6, Sunday=0
}

/**
 * Advanced Alerting Service Implementation
 */
export class AlertingService {
  private static instance: AlertingService;
  private logger: Logger;
  private webSocketService?: WebSocketService;
  private alertConfigurations: Map<string, AlertConfiguration> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private isInitialized = false;

  constructor() {
    this.logger = new Logger('AlertingService');
  }

  public static getInstance(): AlertingService {
    if (!AlertingService.instance) {
      AlertingService.instance = new AlertingService();
    }
    return AlertingService.instance;
  }

  /**
   * Initialize the alerting service
   */
  public async initialize(): Promise<void> {
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
    } catch (error) {
      this.logger.error('Failed to initialize alerting service', error);
      throw new AppError('Alerting service initialization failed', 500);
    }
  }

  /**
   * Set WebSocket service for real-time notifications
   */
  public setWebSocketService(webSocketService: WebSocketService): void {
    this.webSocketService = webSocketService;
    this.logger.info('WebSocket service configured for alerting');
  }

  /**
   * Create a new alert configuration
   */
  public async createAlertConfiguration(
    config: Omit<AlertConfiguration, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const configId = `alert-config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const alertConfig: AlertConfiguration = {
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
  public async triggerAlert(
    type: AlertType,
    details: AlertDetails,
    context: AlertContext = { environment: 'production', tags: [], metadata: {}, relatedAlerts: [] }
  ): Promise<string | null> {
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

    } catch (error) {
      this.logger.error('Failed to trigger alert', error, { type, details });
      throw new AppError('Alert triggering failed', 500);
    }
  }

  /**
   * Acknowledge an alert
   */
  public async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string,
    comment?: string
  ): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new AppError('Alert not found', 404);
    }

    if (alert.status === AlertStatus.ACKNOWLEDGED || alert.status === AlertStatus.RESOLVED) {
      throw new AppError('Alert already acknowledged or resolved', 400);
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
  public async resolveAlert(
    alertId: string,
    resolvedBy: string,
    resolutionType: ResolutionType = ResolutionType.MANUAL,
    comment?: string,
    rootCause?: string,
    actionsTaken: string[] = []
  ): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new AppError('Alert not found', 404);
    }

    if (alert.status === AlertStatus.RESOLVED) {
      throw new AppError('Alert already resolved', 400);
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
  public getActiveAlerts(filters?: {
    type?: AlertType;
    severity?: AlertSeverity;
    pipelineId?: string;
    limit?: number;
  }): Alert[] {
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
  public getAlertHistory(filters?: {
    type?: AlertType;
    severity?: AlertSeverity;
    status?: AlertStatus;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Alert[] {
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
        alerts = alerts.filter(alert => alert.createdAt >= filters.startDate!);
      }
      if (filters.endDate) {
        alerts = alerts.filter(alert => alert.createdAt <= filters.endDate!);
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
  public getAlertingMetrics(): {
    activeAlerts: number;
    totalAlerts: number;
    alertsByType: Record<AlertType, number>;
    alertsBySeverity: Record<AlertSeverity, number>;
    averageResolutionTime: number;
    escalationRate: number;
    acknowledgedRate: number;
  } {
    const activeAlerts = Array.from(this.activeAlerts.values());
    const allAlerts = [...activeAlerts, ...this.alertHistory];

    const alertsByType = {} as Record<AlertType, number>;
    const alertsBySeverity = {} as Record<AlertSeverity, number>;

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
          const resolutionTime = alert.resolvedAt!.getTime() - alert.createdAt.getTime();
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

  private async loadAlertConfigurations(): Promise<void> {
    // In a real implementation, this would load from database
    // For now, create some default configurations
    await this.createDefaultConfigurations();
  }

  private async createDefaultConfigurations(): Promise<void> {
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

  private validateAlertConfiguration(config: AlertConfiguration): void {
    // Validate required fields
    if (!config.name || !config.type || !config.severity) {
      throw new AppError('Invalid alert configuration: missing required fields', 400);
    }

    // Validate thresholds
    if (!config.thresholds || Object.keys(config.thresholds).length === 0) {
      throw new AppError('Invalid alert configuration: no thresholds defined', 400);
    }

    // Validate channels
    if (!config.channels || config.channels.length === 0) {
      throw new AppError('Invalid alert configuration: no notification channels defined', 400);
    }

    // Additional validation logic...
  }

  private findMatchingConfigurations(
    type: AlertType,
    details: AlertDetails,
    context: AlertContext
  ): AlertConfiguration[] {
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

  private checkThresholds(
    thresholds: AlertThresholds,
    type: AlertType,
    details: AlertDetails
  ): boolean {
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

  private async isRateLimited(
    config: AlertConfiguration,
    details: AlertDetails,
    context: AlertContext
  ): Promise<boolean> {
    if (!config.rateLimit.enabled) {
      return false;
    }

    // Check for duplicate alerts in deduplication window
    const deduplicationKey = this.generateDeduplicationKey(config.type, details, context);
    const deduplicationWindow = config.rateLimit.deduplicationWindow * 60 * 1000; // Convert to ms
    const cutoffTime = new Date(Date.now() - deduplicationWindow);

    const recentSimilarAlerts = this.alertHistory.filter(alert => 
      alert.createdAt >= cutoffTime && 
      this.generateDeduplicationKey(alert.type, alert.details, alert.context) === deduplicationKey
    );

    return recentSimilarAlerts.length > 0;
  }

  private generateDeduplicationKey(
    type: AlertType,
    details: AlertDetails,
    context: AlertContext
  ): string {
    return `${type}-${details.metric}-${details.pipelineId || 'global'}-${context.environment}`;
  }

  private async createAlert(
    config: AlertConfiguration,
    details: AlertDetails,
    context: AlertContext
  ): Promise<string> {
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: Alert = {
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

  private generateAlertTitle(type: AlertType, details: AlertDetails): string {
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

  private generateAlertMessage(
    type: AlertType,
    details: AlertDetails,
    context: AlertContext
  ): string {
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

  private async sendNotifications(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return;

    const config = this.alertConfigurations.get(alert.configurationId);
    if (!config) return;

    for (const channel of config.channels) {
      if (!channel.enabled) continue;

      try {
        await this.sendNotificationToChannel(alert, channel);
      } catch (error) {
        this.logger.error('Failed to send notification', error, {
          alertId,
          channelId: channel.id,
          channelType: channel.type
        });
      }
    }
  }

  private async sendNotificationToChannel(
    alert: Alert,
    channel: NotificationChannel
  ): Promise<void> {
    const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const notification: NotificationRecord = {
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
      
    } catch (error) {
      notification.status = NotificationStatus.FAILED;
      notification.failedAt = new Date();
      notification.error = error instanceof Error ? error.message : 'Unknown error';
    }

    alert.notifications.push(notification);
    await this.persistAlert(alert);
  }

  private async sendWebhookNotification(
    alert: Alert,
    channel: NotificationChannel
  ): Promise<void> {
    const webhookConfig = channel.config.webhook;
    if (!webhookConfig) throw new Error('Webhook configuration missing');

    const payload = this.renderTemplate(webhookConfig.template, alert);
    
    // In a real implementation, this would make an HTTP request
    this.logger.info('Webhook notification sent', {
      url: webhookConfig.url,
      payload,
      alertId: alert.id
    });
  }

  private async sendEmailNotification(
    alert: Alert,
    channel: NotificationChannel
  ): Promise<void> {
    const emailConfig = channel.config.email;
    if (!emailConfig) throw new Error('Email configuration missing');

    // In a real implementation, this would send an email
    this.logger.info('Email notification sent', {
      to: emailConfig.to,
      subject: emailConfig.subject,
      alertId: alert.id
    });
  }

  private async sendSlackNotification(
    alert: Alert,
    channel: NotificationChannel
  ): Promise<void> {
    const slackConfig = channel.config.slack;
    if (!slackConfig) throw new Error('Slack configuration missing');

    // In a real implementation, this would send to Slack
    this.logger.info('Slack notification sent', {
      channel: slackConfig.channel,
      webhook: slackConfig.webhookUrl,
      alertId: alert.id
    });
  }

  private renderTemplate(template: string, alert: Alert): string {
    return template
      .replace(/\{\{title\}\}/g, alert.title)
      .replace(/\{\{message\}\}/g, alert.message)
      .replace(/\{\{severity\}\}/g, alert.severity)
      .replace(/\{\{type\}\}/g, alert.type)
      .replace(/\{\{id\}\}/g, alert.id)
      .replace(/\{\{createdAt\}\}/g, alert.createdAt.toISOString());
  }

  private scheduleEscalation(alertId: string): void {
    // In a real implementation, this would use a job scheduler
    this.logger.info('Escalation scheduled', { alertId });
  }

  private stopEscalation(alertId: string): void {
    // In a real implementation, this would cancel the scheduled escalation
    this.logger.info('Escalation stopped', { alertId });
  }

  private async sendAcknowledgmentNotifications(alertId: string): Promise<void> {
    this.logger.info('Acknowledgment notifications sent', { alertId });
  }

  private async sendResolutionNotifications(alertId: string): Promise<void> {
    this.logger.info('Resolution notifications sent', { alertId });
  }

  private async persistAlertConfiguration(config: AlertConfiguration): Promise<void> {
    // In a real implementation, this would save to database
    this.logger.debug('Alert configuration persisted', { configId: config.id });
  }

  private async persistAlert(alert: Alert): Promise<void> {
    // In a real implementation, this would save to database
    this.logger.debug('Alert persisted', { alertId: alert.id });
  }

  private startBackgroundProcesses(): void {
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

  private cleanupOldAlerts(): void {
    const cutoffTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
    const initialCount = this.alertHistory.length;
    
    this.alertHistory = this.alertHistory.filter(alert => alert.createdAt >= cutoffTime);
    
    const removedCount = initialCount - this.alertHistory.length;
    if (removedCount > 0) {
      this.logger.info('Cleaned up old alerts', { removedCount });
    }
  }

  private checkEscalations(): void {
    // Check for alerts that need escalation
    const now = new Date();
    
    for (const alert of this.activeAlerts.values()) {
      const config = this.alertConfigurations.get(alert.configurationId);
      if (!config || !config.escalation.enabled) continue;

      // Check if alert needs escalation
      const timeSinceCreation = now.getTime() - alert.createdAt.getTime();
      const firstStage = config.escalation.stages[0];
      if (!firstStage) continue;
      
      const escalationDelay = firstStage.delayMinutes * 60 * 1000;

      if (timeSinceCreation >= escalationDelay && alert.escalations.length === 0) {
        this.escalateAlert(alert.id);
      }
    }
  }

  private async escalateAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return;

    alert.status = AlertStatus.ESCALATED;
    
    const escalation: EscalationRecord = {
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

// Export singleton instance
export const alertingService = AlertingService.getInstance();
