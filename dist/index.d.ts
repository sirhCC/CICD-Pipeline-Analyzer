/**
 * CI/CD Pipeline Analyzer - Main Application Entry Point
 * Enterprise-grade modular architecture with comprehensive error handling
 */
import express from 'express';
import { WebSocketService } from './services/websocket.service';
declare class Application {
    private app;
    private logger;
    private server;
    private httpServer;
    private webSocketService;
    constructor();
    /**
     * Initialize the application
     */
    initialize(): Promise<void>;
    /**
     * Start the application server
     */
    start(): Promise<void>;
    /**
     * Stop the application server
     */
    stop(): Promise<void>;
    /**
     * Validate application configuration
     */
    private validateConfiguration;
    /**
     * Initialize core services (database, cache, etc.)
     */
    private initializeCoreServices;
    /**
     * Configure Express middleware
     */
    private configureMiddleware;
    /**
     * Configure application routes
     */
    private configureRoutes;
    /**
     * Configure error handling middleware
     */
    private configureErrorHandling;
    /**
     * Initialize application modules
     */
    private initializeModules;
    /**
     * Get application health status
     */
    private getHealthStatus;
    /**
     * Setup graceful shutdown handlers
     */
    private setupGracefulShutdown;
    /**
     * Get Express application instance
     */
    getApp(): express.Application;
    /**
     * Get WebSocket service instance
     */
    getWebSocketService(): WebSocketService | null;
}
declare function bootstrap(): Promise<void>;
export { Application };
export default bootstrap;
//# sourceMappingURL=index.d.ts.map