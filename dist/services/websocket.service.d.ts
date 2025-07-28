/**
 * WebSocket Service for Real-time Statistical Analytics
 * Provides live updates for pipeline statistics, anomalies, and insights
 */
import { Server as HttpServer } from 'http';
import { UserRole, Permission } from '../middleware/auth';
export interface WebSocketConfig {
    cors?: {
        origin: string | string[];
        credentials?: boolean;
    };
    heartbeatInterval?: number;
    clientTimeout?: number;
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
        pipelines: string[];
        alertTypes: string[];
        globalInsights: boolean;
    };
    lastSeen: Date;
}
export declare class WebSocketService {
    private io;
    private logger;
    private config;
    private clients;
    private heartbeatInterval;
    private metricsInterval;
    private statisticalService;
    private metrics;
    constructor(httpServer: HttpServer, config?: Partial<WebSocketConfig>);
    /**
     * Setup WebSocket event handlers
     */
    private setupEventHandlers;
    /**
     * Handle new WebSocket connection
     */
    private handleConnection;
    /**
     * Setup individual socket event handlers
     */
    private setupSocketHandlers;
    /**
     * Handle pipeline subscription
     */
    private handlePipelineSubscription;
    /**
     * Handle pipeline unsubscription
     */
    private handlePipelineUnsubscription;
    /**
     * Handle alert type subscription
     */
    private handleAlertSubscription;
    /**
     * Handle global insights subscription
     */
    private handleGlobalSubscription;
    /**
     * Handle immediate analysis request
     */
    private handleAnalysisRequest;
    /**
     * Handle client disconnection
     */
    private handleDisconnection;
    /**
     * Publish statistical update to subscribed clients
     */
    publishStatisticalUpdate(update: StatisticalUpdate): void;
    /**
     * Check if client should receive update based on subscriptions
     */
    private shouldReceiveUpdate;
    /**
     * Start heartbeat to detect disconnected clients
     */
    private startHeartbeat;
    /**
     * Start metrics collection
     */
    private startMetricsCollection;
    /**
     * Get current service metrics
     */
    getMetrics(): {
        activeConnections: number;
        uptime: number;
        totalConnections: number;
        messagesPublished: number;
        messagesSent: number;
        bytesTransferred: number;
        errorCount: number;
        lastReset: Date;
    };
    /**
     * Get connected clients info
     */
    getClients(): ClientSubscription[];
    /**
     * Broadcast to all connected clients
     */
    broadcast(event: string, data: any): void;
    /**
     * Send message to specific client
     */
    sendToClient(socketId: string, event: string, data: any): boolean;
    /**
     * Close WebSocket service
     */
    close(): Promise<void>;
}
export declare const createWebSocketService: (httpServer: HttpServer, config?: Partial<WebSocketConfig>) => WebSocketService;
export declare const getWebSocketService: () => WebSocketService;
//# sourceMappingURL=websocket.service.d.ts.map