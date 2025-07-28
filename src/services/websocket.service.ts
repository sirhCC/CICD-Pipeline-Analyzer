/**
 * WebSocket Service for Real-time Statistical Analytics
 * Provides live updates for pipeline statistics, anomalies, and insights
 */

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Logger } from '@/shared/logger';
import { authenticateJWT, UserRole, Permission } from '@/middleware/auth';
import { getStatisticalAnalyticsService, StatisticalDataPoint } from './statistical-analytics.service';
import { AppError } from '@/middleware/error-handler';

export interface WebSocketConfig {
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };
  heartbeatInterval?: number; // ms
  clientTimeout?: number; // ms
  maxConnections?: number;
  enableAuth?: boolean;
  enableMetrics?: boolean;
}

export interface StatisticalUpdate {
  type: 'anomaly' | 'trend' | 'sla_violation' | 'cost_alert' | 'benchmark_update';
  pipelineId?: string;
  timestamp: Date;
  data: any;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

export interface ClientSubscription {
  socketId: string;
  userId: string;
  role: UserRole;
  permissions: Permission[];
  subscriptions: {
    pipelines: string[]; // Pipeline IDs
    alertTypes: string[]; // Alert types
    globalInsights: boolean;
  };
  lastSeen: Date;
}

export class WebSocketService {
  private io: SocketIOServer;
  private logger: Logger;
  private config: WebSocketConfig;
  private clients: Map<string, ClientSubscription>;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private statisticalService = getStatisticalAnalyticsService();

  private metrics = {
    totalConnections: 0,
    activeConnections: 0,
    messagesPublished: 0,
    messagesSent: 0,
    bytesTransferred: 0,
    errorCount: 0,
    lastReset: new Date()
  };

  constructor(httpServer: HttpServer, config: Partial<WebSocketConfig> = {}) {
    this.logger = new Logger('WebSocketService');
    this.clients = new Map();
    
    this.config = {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true
      },
      heartbeatInterval: 30000, // 30 seconds
      clientTimeout: 60000, // 1 minute
      maxConnections: 1000,
      enableAuth: true,
      enableMetrics: true,
      ...config
    };

    this.io = new SocketIOServer(httpServer, {
      cors: this.config.cors || {
        origin: ['http://localhost:3000'],
        credentials: true
      },
      pingTimeout: this.config.clientTimeout || 60000,
      pingInterval: this.config.heartbeatInterval || 30000,
      maxHttpBufferSize: 1e6, // 1MB
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    this.startHeartbeat();
    
    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }

    this.logger.info('WebSocket service initialized', {
      maxConnections: this.config.maxConnections,
      heartbeatInterval: this.config.heartbeatInterval,
      authEnabled: this.config.enableAuth
    });
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', async (socket: Socket) => {
      try {
        await this.handleConnection(socket);
      } catch (error) {
        this.logger.error('Connection setup failed', { 
          socketId: socket.id, 
          error: error instanceof Error ? error.message : String(error) 
        });
        socket.disconnect(true);
      }
    });

    this.io.on('disconnect', (socket: Socket) => {
      this.handleDisconnection(socket);
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(socket: Socket): Promise<void> {
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;

    this.logger.info('New WebSocket connection', {
      socketId: socket.id,
      clientIP: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'],
      activeConnections: this.metrics.activeConnections
    });

    // Check connection limit
    if (this.metrics.activeConnections > this.config.maxConnections!) {
      this.logger.warn('Connection limit exceeded', {
        activeConnections: this.metrics.activeConnections,
        maxConnections: this.config.maxConnections
      });
      socket.emit('error', { code: 'CONNECTION_LIMIT_EXCEEDED' });
      socket.disconnect(true);
      return;
    }

    // Authentication (if enabled)
    if (this.config.enableAuth) {
      const auth = socket.handshake.auth;
      if (!auth?.token) {
        socket.emit('error', { code: 'AUTHENTICATION_REQUIRED' });
        socket.disconnect(true);
        return;
      }

      try {
        // Authenticate token (simplified for WebSocket)
        const token = auth.token.replace('Bearer ', '');
        // Note: In production, integrate with actual auth service
        const user = { 
          id: 'websocket-user', 
          role: UserRole.ADMIN, 
          permissions: [Permission.ANALYTICS_READ, Permission.ANALYTICS_WRITE] 
        };
        
        this.clients.set(socket.id, {
          socketId: socket.id,
          userId: user.id,
          role: user.role,
          permissions: user.permissions,
          subscriptions: {
            pipelines: [],
            alertTypes: [],
            globalInsights: false
          },
          lastSeen: new Date()
        });

        this.logger.info('WebSocket client authenticated', {
          socketId: socket.id,
          userId: user.id,
          role: user.role
        });

      } catch (error) {
        this.logger.error('WebSocket authentication failed', {
          socketId: socket.id,
          error: error instanceof Error ? error.message : String(error)
        });
        socket.emit('error', { code: 'AUTHENTICATION_FAILED' });
        socket.disconnect(true);
        return;
      }
    }

    this.setupSocketHandlers(socket);

    // Send welcome message
    socket.emit('connected', {
      socketId: socket.id,
      timestamp: new Date(),
      features: ['real-time-analytics', 'anomaly-alerts', 'trend-updates']
    });
  }

  /**
   * Setup individual socket event handlers
   */
  private setupSocketHandlers(socket: Socket): void {
    // Subscribe to pipeline updates
    socket.on('subscribe:pipeline', (pipelineId: string) => {
      this.handlePipelineSubscription(socket, pipelineId);
    });

    // Unsubscribe from pipeline updates
    socket.on('unsubscribe:pipeline', (pipelineId: string) => {
      this.handlePipelineUnsubscription(socket, pipelineId);
    });

    // Subscribe to alert types
    socket.on('subscribe:alerts', (alertTypes: string[]) => {
      this.handleAlertSubscription(socket, alertTypes);
    });

    // Subscribe to global insights
    socket.on('subscribe:global', () => {
      this.handleGlobalSubscription(socket);
    });

    // Request immediate statistical analysis
    socket.on('request:analysis', async (data: { pipelineId: string; metric: string }) => {
      await this.handleAnalysisRequest(socket, data);
    });

    // Heartbeat response
    socket.on('pong', () => {
      const client = this.clients.get(socket.id);
      if (client) {
        client.lastSeen = new Date();
        this.clients.set(socket.id, client);
      }
    });

    // Error handling
    socket.on('error', (error) => {
      this.logger.error('WebSocket client error', {
        socketId: socket.id,
        error: error instanceof Error ? error.message : String(error)
      });
      this.metrics.errorCount++;
    });
  }

  /**
   * Handle pipeline subscription
   */
  private handlePipelineSubscription(socket: Socket, pipelineId: string): void {
    const client = this.clients.get(socket.id);
    if (!client) return;

    if (!client.subscriptions.pipelines.includes(pipelineId)) {
      client.subscriptions.pipelines.push(pipelineId);
      this.clients.set(socket.id, client);
      
      this.logger.info('Client subscribed to pipeline', {
        socketId: socket.id,
        pipelineId,
        totalSubscriptions: client.subscriptions.pipelines.length
      });

      socket.emit('subscribed', { type: 'pipeline', id: pipelineId });
    }
  }

  /**
   * Handle pipeline unsubscription
   */
  private handlePipelineUnsubscription(socket: Socket, pipelineId: string): void {
    const client = this.clients.get(socket.id);
    if (!client) return;

    const index = client.subscriptions.pipelines.indexOf(pipelineId);
    if (index > -1) {
      client.subscriptions.pipelines.splice(index, 1);
      this.clients.set(socket.id, client);
      
      this.logger.info('Client unsubscribed from pipeline', {
        socketId: socket.id,
        pipelineId
      });

      socket.emit('unsubscribed', { type: 'pipeline', id: pipelineId });
    }
  }

  /**
   * Handle alert type subscription
   */
  private handleAlertSubscription(socket: Socket, alertTypes: string[]): void {
    const client = this.clients.get(socket.id);
    if (!client) return;

    client.subscriptions.alertTypes = [...new Set([...client.subscriptions.alertTypes, ...alertTypes])];
    this.clients.set(socket.id, client);

    this.logger.info('Client subscribed to alerts', {
      socketId: socket.id,
      alertTypes,
      totalAlertTypes: client.subscriptions.alertTypes.length
    });

    socket.emit('subscribed', { type: 'alerts', types: alertTypes });
  }

  /**
   * Handle global insights subscription
   */
  private handleGlobalSubscription(socket: Socket): void {
    const client = this.clients.get(socket.id);
    if (!client) return;

    client.subscriptions.globalInsights = true;
    this.clients.set(socket.id, client);

    this.logger.info('Client subscribed to global insights', {
      socketId: socket.id
    });

    socket.emit('subscribed', { type: 'global' });
  }

  /**
   * Handle immediate analysis request
   */
  private async handleAnalysisRequest(socket: Socket, data: { pipelineId: string; metric: string }): Promise<void> {
    try {
      const client = this.clients.get(socket.id);
      if (!client) return;

      this.logger.info('Real-time analysis requested', {
        socketId: socket.id,
        pipelineId: data.pipelineId,
        metric: data.metric
      });

      // Perform statistical analysis
      const [anomalies, trends, benchmark] = await Promise.all([
        this.statisticalService.analyzePipelineAnomalies(data.pipelineId, data.metric as any),
        this.statisticalService.analyzePipelineTrends(data.pipelineId, data.metric as any),
        this.statisticalService.benchmarkPipelinePerformance(data.pipelineId, data.metric as any)
      ]);

      const analysis = {
        pipelineId: data.pipelineId,
        metric: data.metric,
        timestamp: new Date(),
        results: {
          anomalies: anomalies.map(a => ({
            detected: a.isAnomaly,
            score: a.anomalyScore,
            severity: a.severity,
            method: a.method
          })),
          trend: {
            direction: trends.trend,
            strength: trends.correlation,
            prediction: trends.prediction
          },
          benchmark: {
            performance: benchmark.performance,
            percentile: benchmark.percentile,
            deviation: benchmark.deviationPercent
          }
        }
      };

      socket.emit('analysis:result', analysis);
      this.metrics.messagesSent++;

    } catch (error) {
      this.logger.error('Analysis request failed', {
        socketId: socket.id,
        error: error instanceof Error ? error.message : String(error)
      });
      
      socket.emit('analysis:error', {
        message: 'Analysis failed',
        code: 'ANALYSIS_ERROR'
      });
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(socket: Socket): void {
    this.clients.delete(socket.id);
    this.metrics.activeConnections--;

    this.logger.info('WebSocket client disconnected', {
      socketId: socket.id,
      activeConnections: this.metrics.activeConnections
    });
  }

  /**
   * Publish statistical update to subscribed clients
   */
  public publishStatisticalUpdate(update: StatisticalUpdate): void {
    let recipients = 0;

    this.clients.forEach((client, socketId) => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (!socket) {
        this.clients.delete(socketId);
        return;
      }

      // Check if client should receive this update
      const shouldReceive = this.shouldReceiveUpdate(client, update);
      if (shouldReceive) {
        socket.emit('statistical:update', update);
        recipients++;
        this.metrics.messagesSent++;
      }
    });

    this.metrics.messagesPublished++;
    
    this.logger.info('Statistical update published', {
      type: update.type,
      pipelineId: update.pipelineId,
      recipients,
      severity: update.severity
    });
  }

  /**
   * Check if client should receive update based on subscriptions
   */
  private shouldReceiveUpdate(client: ClientSubscription, update: StatisticalUpdate): boolean {
    // Global insights subscription
    if (client.subscriptions.globalInsights && !update.pipelineId) {
      return true;
    }

    // Pipeline-specific updates
    if (update.pipelineId && client.subscriptions.pipelines.includes(update.pipelineId)) {
      return true;
    }

    // Alert type subscriptions
    if (client.subscriptions.alertTypes.includes(update.type)) {
      return true;
    }

    return false;
  }

  /**
   * Start heartbeat to detect disconnected clients
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      let disconnectedClients = 0;

      this.clients.forEach((client, socketId) => {
        const socket = this.io.sockets.sockets.get(socketId);
        
        if (!socket || (now.getTime() - client.lastSeen.getTime()) > this.config.clientTimeout!) {
          this.clients.delete(socketId);
          disconnectedClients++;
          if (socket) {
            socket.disconnect(true);
          }
        } else {
          socket.emit('ping');
        }
      });

      if (disconnectedClients > 0) {
        this.logger.info('Cleaned up disconnected clients', {
          disconnectedClients,
          activeConnections: this.clients.size
        });
      }

    }, this.config.heartbeatInterval);
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.logger.info('WebSocket metrics', {
        ...this.metrics,
        activeConnections: this.clients.size,
        uptime: new Date().getTime() - this.metrics.lastReset.getTime()
      });
    }, 60000); // Every minute
  }

  /**
   * Get current service metrics
   */
  public getMetrics() {
    return {
      ...this.metrics,
      activeConnections: this.clients.size,
      uptime: new Date().getTime() - this.metrics.lastReset.getTime()
    };
  }

  /**
   * Get connected clients info
   */
  public getClients(): ClientSubscription[] {
    return Array.from(this.clients.values());
  }

  /**
   * Broadcast to all connected clients
   */
  public broadcast(event: string, data: any): void {
    this.io.emit(event, data);
    this.metrics.messagesSent += this.clients.size;
    
    this.logger.info('Broadcasted to all clients', {
      event,
      recipients: this.clients.size
    });
  }

  /**
   * Send message to specific client
   */
  public sendToClient(socketId: string, event: string, data: any): boolean {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit(event, data);
      this.metrics.messagesSent++;
      return true;
    }
    return false;
  }

  /**
   * Close WebSocket service
   */
  public async close(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.io.close();
    this.clients.clear();
    
    this.logger.info('WebSocket service closed');
  }
}

// Export singleton instance getter
let _instance: WebSocketService | undefined;

export const createWebSocketService = (httpServer: HttpServer, config?: Partial<WebSocketConfig>): WebSocketService => {
  if (_instance) {
    throw new Error('WebSocket service already initialized');
  }
  _instance = new WebSocketService(httpServer, config);
  return _instance;
};

export const getWebSocketService = (): WebSocketService => {
  if (!_instance) {
    throw new Error('WebSocket service not initialized. Call createWebSocketService() first.');
  }
  return _instance;
};
