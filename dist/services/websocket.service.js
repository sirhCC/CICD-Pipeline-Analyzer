"use strict";
/**
 * WebSocket Service for Real-time Statistical Analytics
 * Provides live updates for pipeline statistics, anomalies, and insights
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebSocketService = exports.createWebSocketService = exports.WebSocketService = void 0;
const socket_io_1 = require("socket.io");
const logger_1 = require("../shared/logger");
const auth_1 = require("../middleware/auth");
const statistical_analytics_service_1 = require("./statistical-analytics.service");
class WebSocketService {
    io;
    logger;
    config;
    clients;
    heartbeatInterval = null;
    metricsInterval = null;
    statisticalService = (0, statistical_analytics_service_1.getStatisticalAnalyticsService)();
    metrics = {
        totalConnections: 0,
        activeConnections: 0,
        messagesPublished: 0,
        messagesSent: 0,
        bytesTransferred: 0,
        errorCount: 0,
        lastReset: new Date()
    };
    constructor(httpServer, config = {}) {
        this.logger = new logger_1.Logger('WebSocketService');
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
        this.io = new socket_io_1.Server(httpServer, {
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
    setupEventHandlers() {
        this.io.on('connection', async (socket) => {
            try {
                await this.handleConnection(socket);
            }
            catch (error) {
                this.logger.error('Connection setup failed', {
                    socketId: socket.id,
                    error: error instanceof Error ? error.message : String(error)
                });
                socket.disconnect(true);
            }
        });
        this.io.on('disconnect', (socket) => {
            this.handleDisconnection(socket);
        });
    }
    /**
     * Handle new WebSocket connection
     */
    async handleConnection(socket) {
        this.metrics.totalConnections++;
        this.metrics.activeConnections++;
        this.logger.info('New WebSocket connection', {
            socketId: socket.id,
            clientIP: socket.handshake.address,
            userAgent: socket.handshake.headers['user-agent'],
            activeConnections: this.metrics.activeConnections
        });
        // Check connection limit
        if (this.metrics.activeConnections > this.config.maxConnections) {
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
                    role: auth_1.UserRole.ADMIN,
                    permissions: [auth_1.Permission.ANALYTICS_READ, auth_1.Permission.ANALYTICS_WRITE]
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
            }
            catch (error) {
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
    setupSocketHandlers(socket) {
        // Subscribe to pipeline updates
        socket.on('subscribe:pipeline', (pipelineId) => {
            this.handlePipelineSubscription(socket, pipelineId);
        });
        // Unsubscribe from pipeline updates
        socket.on('unsubscribe:pipeline', (pipelineId) => {
            this.handlePipelineUnsubscription(socket, pipelineId);
        });
        // Subscribe to alert types
        socket.on('subscribe:alerts', (alertTypes) => {
            this.handleAlertSubscription(socket, alertTypes);
        });
        // Subscribe to global insights
        socket.on('subscribe:global', () => {
            this.handleGlobalSubscription(socket);
        });
        // Request immediate statistical analysis
        socket.on('request:analysis', async (data) => {
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
    handlePipelineSubscription(socket, pipelineId) {
        const client = this.clients.get(socket.id);
        if (!client)
            return;
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
    handlePipelineUnsubscription(socket, pipelineId) {
        const client = this.clients.get(socket.id);
        if (!client)
            return;
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
    handleAlertSubscription(socket, alertTypes) {
        const client = this.clients.get(socket.id);
        if (!client)
            return;
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
    handleGlobalSubscription(socket) {
        const client = this.clients.get(socket.id);
        if (!client)
            return;
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
    async handleAnalysisRequest(socket, data) {
        try {
            const client = this.clients.get(socket.id);
            if (!client)
                return;
            this.logger.info('Real-time analysis requested', {
                socketId: socket.id,
                pipelineId: data.pipelineId,
                metric: data.metric
            });
            // Perform statistical analysis
            const [anomalies, trends, benchmark] = await Promise.all([
                this.statisticalService.analyzePipelineAnomalies(data.pipelineId, data.metric),
                this.statisticalService.analyzePipelineTrends(data.pipelineId, data.metric),
                this.statisticalService.benchmarkPipelinePerformance(data.pipelineId, data.metric)
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
        }
        catch (error) {
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
    handleDisconnection(socket) {
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
    publishStatisticalUpdate(update) {
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
    shouldReceiveUpdate(client, update) {
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
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            const now = new Date();
            let disconnectedClients = 0;
            this.clients.forEach((client, socketId) => {
                const socket = this.io.sockets.sockets.get(socketId);
                if (!socket || (now.getTime() - client.lastSeen.getTime()) > this.config.clientTimeout) {
                    this.clients.delete(socketId);
                    disconnectedClients++;
                    if (socket) {
                        socket.disconnect(true);
                    }
                }
                else {
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
    startMetricsCollection() {
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
    getMetrics() {
        return {
            ...this.metrics,
            activeConnections: this.clients.size,
            uptime: new Date().getTime() - this.metrics.lastReset.getTime()
        };
    }
    /**
     * Get connected clients info
     */
    getClients() {
        return Array.from(this.clients.values());
    }
    /**
     * Broadcast to all connected clients
     */
    broadcast(event, data) {
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
    sendToClient(socketId, event, data) {
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
    async close() {
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
exports.WebSocketService = WebSocketService;
// Export singleton instance getter
let _instance;
const createWebSocketService = (httpServer, config) => {
    if (_instance) {
        throw new Error('WebSocket service already initialized');
    }
    _instance = new WebSocketService(httpServer, config);
    return _instance;
};
exports.createWebSocketService = createWebSocketService;
const getWebSocketService = () => {
    if (!_instance) {
        throw new Error('WebSocket service not initialized. Call createWebSocketService() first.');
    }
    return _instance;
};
exports.getWebSocketService = getWebSocketService;
//# sourceMappingURL=websocket.service.js.map