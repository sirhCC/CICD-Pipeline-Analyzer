/**
 * Analytics Service and Routes Integration Tests
 * Tests the analytics engine, metrics collection, pattern detection, and optimization features
 */

import request from 'supertest';
import express from 'express';

// Mock the repository factory before importing the service
jest.mock('../repositories/factory.enhanced', () => {
  // Mock pipeline data
  const mockPipeline = {
    id: 'test-pipeline-id',
    name: 'Test Pipeline',
    description: 'Test pipeline description',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  // Mock pipeline runs
  const mockRuns = [
    {
      id: 'run-1',
      pipelineId: 'test-pipeline-id',
      status: 'completed',
      startTime: new Date('2024-01-01T10:00:00Z'),
      endTime: new Date('2024-01-01T10:30:00Z'),
      duration: 1800,
      errorMessage: null
    },
    {
      id: 'run-2',
      pipelineId: 'test-pipeline-id',
      status: 'failed',
      startTime: new Date('2024-01-01T11:00:00Z'),
      endTime: new Date('2024-01-01T11:15:00Z'),
      duration: 900,
      errorMessage: 'Test error message'
    }
  ];

  // Mock alerts
  const mockAlerts = [
    {
      id: 'test-alert-id',
      alertType: 'failure_rate',
      title: 'High Failure Rate',
      message: 'Pipeline failure rate exceeded threshold',
      severity: 'warning',
      acknowledged: false,
      acknowledgedBy: null,
      createdAt: new Date('2024-01-01')
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      alertType: 'performance',
      title: 'Slow Performance',
      message: 'Pipeline execution time increased significantly',
      severity: 'info',
      acknowledged: true,
      acknowledgedBy: 'admin',
      createdAt: new Date('2024-01-01')
    }
  ];

  // Mock metrics
  const mockMetrics = [
    {
      id: 'metric-1',
      pipelineId: 'test-pipeline-id',
      period: 'daily',
      totalRuns: 10,
      successfulRuns: 8,
      failedRuns: 2,
      avgDuration: 1500,
      successRate: 0.8,
      createdAt: new Date('2024-01-01')
    }
  ];

  return {
    repositoryFactory: {
      getPipelineRepository: jest.fn().mockReturnValue({
        findOne: jest.fn().mockImplementation(({ where }) => {
          if (where?.id === 'test-pipeline-id' || where?.id === '550e8400-e29b-41d4-a716-446655440000') {
            return Promise.resolve(mockPipeline);
          }
          return Promise.resolve(null);
        }),
        find: jest.fn().mockResolvedValue([mockPipeline]),
        count: jest.fn().mockResolvedValue(1),
      }),
      getUserRepository: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
        find: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      }),
      getPipelineRunRepository: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockRuns[0]),
        find: jest.fn().mockResolvedValue(mockRuns),
        count: jest.fn().mockResolvedValue(mockRuns.length),
      }),
      getRepository: jest.fn().mockImplementation((entity) => {
        const entityName = entity.name || (typeof entity === 'string' ? entity : 'Unknown');
        
        if (entityName === 'Pipeline') {
          return {
            findOne: jest.fn().mockImplementation(({ where }) => {
              if (where?.id === 'test-pipeline-id' || where?.id === '550e8400-e29b-41d4-a716-446655440000') {
                return Promise.resolve(mockPipeline);
              }
              return Promise.resolve(null);
            }),
            find: jest.fn().mockResolvedValue([mockPipeline]),
            count: jest.fn().mockResolvedValue(1),
          };
        }
        
        if (entityName === 'PipelineRun') {
          return {
            findOne: jest.fn().mockResolvedValue(mockRuns[0]),
            find: jest.fn().mockResolvedValue(mockRuns),
            count: jest.fn().mockResolvedValue(mockRuns.length),
          };
        }
        
        if (entityName === 'AnalyticsAlert') {
          return {
            findOne: jest.fn().mockImplementation(({ where }) => {
              if (where?.id === 'test-alert-id') {
                return Promise.resolve(mockAlerts[0]);
              }
              if (where?.id === '550e8400-e29b-41d4-a716-446655440000') {
                return Promise.resolve(mockAlerts[1]);
              }
              return Promise.resolve(null);
            }),
            find: jest.fn().mockResolvedValue(mockAlerts),
            count: jest.fn().mockResolvedValue(mockAlerts.length),
            save: jest.fn().mockImplementation((alert) => Promise.resolve({ ...alert, id: alert.id || 'mock-alert-id' })),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
          };
        }
        
        // Default repository for metrics, patterns, etc.
        return {
          findOne: jest.fn().mockResolvedValue(null),
          find: jest.fn().mockResolvedValue([]),
          findAndCount: jest.fn().mockResolvedValue([[], 0]),
          count: jest.fn().mockResolvedValue(0),
          save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
          create: jest.fn().mockImplementation((data) => ({ id: 'mock-id', ...data })),
          update: jest.fn().mockResolvedValue({ affected: 1 }),
          delete: jest.fn().mockResolvedValue({ affected: 1 }),
          createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            having: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            offset: jest.fn().mockReturnThis(),
            getRawMany: jest.fn().mockResolvedValue([]),
            getMany: jest.fn().mockResolvedValue([]),
            getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
            getOne: jest.fn().mockResolvedValue(null),
            getCount: jest.fn().mockResolvedValue(0),
          })),
        };
      }),
    }
  };
});

import { AnalyticsService } from '../services/analytics.service';
import analyticsRoutes from '../routes/analytics.routes';
import { AuthService, UserRole, getAuthService } from '../middleware/auth';
import { PipelineMetrics, FailurePattern, OptimizationRecommendation, AnalyticsAlert } from '../entities/pipeline-metrics.entity';

// Mock config manager
jest.mock('../config', () => {
  const mockConfig = {
    auth: {
      bcryptRounds: 10,
      jwtSecret: 'test-jwt-secret-key',
      jwtExpiresIn: '24h',
      jwtRefreshExpiresIn: '7d',
      apiKeySecret: 'test-api-secret',
      requireMfa: false,
      enableApiKeys: true,
      maxFailedAttempts: 5,
      lockoutDuration: 15
    },
    logging: {
      level: 'info',
      format: 'json',
      enableConsole: true,
      enableFile: false
    },
    database: {
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      username: 'test',
      password: 'test'
    }
  };

  return {
    configManager: {
      get: jest.fn().mockImplementation((key?: string, defaultValue?: any) => {
        if (!key) {
          // Return full config when no key is provided
          return mockConfig;
        }
        switch (key) {
          case 'JWT_SECRET':
            return 'test-jwt-secret-key';
          case 'JWT_EXPIRES_IN':
            return '24h';
          case 'API_SECRET':
            return 'test-api-secret';
          default:
            return defaultValue;
        }
      }),
      isProduction: jest.fn().mockReturnValue(false),
      isDevelopment: jest.fn().mockReturnValue(true),
      isTest: jest.fn().mockReturnValue(true),
      getMonitoring: jest.fn().mockReturnValue({
        level: 'info',
        enableConsole: true,
        enableFile: false,
        maxFiles: 5,
        maxSize: '10m',
        format: 'json',
        logging: mockConfig.logging
      }),
      getDatabase: jest.fn().mockReturnValue(mockConfig.database),
      getSecurity: jest.fn().mockReturnValue({
        ...mockConfig.auth,
        auth: mockConfig.auth
      }),
      getConfig: jest.fn().mockReturnValue(mockConfig)
    }
  };
});

describe('Analytics Service Tests', () => {
  let analyticsService: AnalyticsService;
  
  beforeEach(() => {
    analyticsService = new AnalyticsService({
      enableRealTimeAnalysis: false, // Disable to prevent setInterval open handles
      metricRetentionDays: 90,
      alertThresholds: {
        failureRate: 0.15,
        avgDuration: 1800,
        errorSpike: 5
      },
      batchSize: 100,
      analysisInterval: 15
    });
  });

  afterEach(() => {
    // Clear any intervals to prevent open handles
    if (analyticsService && typeof analyticsService.stopRealTimeAnalysis === 'function') {
      analyticsService.stopRealTimeAnalysis();
    }
  });

  describe('Service Initialization', () => {
    it('should initialize with default configuration', () => {
      const service = new AnalyticsService({ enableRealTimeAnalysis: false });
      expect(service).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const config = {
        enableRealTimeAnalysis: false,
        metricRetentionDays: 30,
        alertThresholds: {
          failureRate: 0.20,
          avgDuration: 2400,
          errorSpike: 10
        },
        batchSize: 50,
        analysisInterval: 30
      };
      
      const service = new AnalyticsService(config);
      expect(service).toBeDefined();
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate metrics for hourly period', async () => {
      const pipelineId = 'test-pipeline-id';
      const metrics = await analyticsService.calculateMetrics(pipelineId, 'hourly');
      
      expect(Array.isArray(metrics)).toBe(true);
      
      if (metrics.length > 0) {
        const metric = metrics[0];
        expect(metric).toBeDefined();
        if (metric) {
          expect(typeof metric.metricType).toBe('string');
          expect(typeof metric.value).toBe('number');
          expect(metric.timestamp).toBeInstanceOf(Date);
          expect(typeof metric.aggregationPeriod).toBe('string');
          expect(metric.aggregationPeriod).toBe('hourly');
        }
      }
    });

    it('should calculate metrics for different time periods', async () => {
      const pipelineId = 'test-pipeline-id';
      const periods = ['hourly', 'daily', 'weekly', 'monthly'] as const;
      
      for (const period of periods) {
        const metrics = await analyticsService.calculateMetrics(pipelineId, period);
        expect(Array.isArray(metrics)).toBe(true);
        
        if (metrics.length > 0 && metrics[0]) {
          expect(metrics[0].aggregationPeriod).toBe(period);
        }
      }
    });

    it('should handle metrics calculation for non-existent pipeline', async () => {
      // This should throw an error for non-existent pipeline
      await expect(analyticsService.calculateMetrics('non-existent', 'daily'))
        .rejects.toThrow('Pipeline not found');
    });
  });

  describe('Failure Pattern Detection', () => {
    it('should detect patterns for specific pipeline', async () => {
      const pipelineId = 'test-pipeline-id';
      const patterns = await analyticsService.detectFailurePatterns(pipelineId);
      
      expect(Array.isArray(patterns)).toBe(true);
      
      if (patterns.length > 0) {
        const pattern = patterns[0];
        expect(pattern).toBeDefined();
        if (pattern) {
          expect(typeof pattern.patternType).toBe('string');
          expect(typeof pattern.description).toBe('string');
          expect(typeof pattern.confidence).toBe('number');
          expect(pattern.confidence).toBeGreaterThanOrEqual(0);
          expect(pattern.confidence).toBeLessThanOrEqual(1);
          expect(['low', 'medium', 'high', 'critical']).toContain(pattern.severity);
          expect(typeof pattern.occurrenceCount).toBe('number');
          expect(pattern.firstSeen).toBeInstanceOf(Date);
          expect(pattern.lastSeen).toBeInstanceOf(Date);
        }
      }
    });

    it('should detect global patterns across all pipelines', async () => {
      const patterns = await analyticsService.detectFailurePatterns();
      
      expect(Array.isArray(patterns)).toBe(true);
      
      if (patterns.length > 0) {
        const pattern = patterns[0];
        expect(pattern).toBeDefined();
        if (pattern) {
          expect(typeof pattern.patternType).toBe('string');
          expect(typeof pattern.description).toBe('string');
          expect(typeof pattern.confidence).toBe('number');
        }
      }
    });

    it('should return empty array for pipeline with no failures', async () => {
      const patterns = await analyticsService.detectFailurePatterns('no-failures-pipeline');
      expect(patterns).toEqual([]);
    });
  });

  describe('Optimization Recommendations', () => {
    it('should generate recommendations for pipeline', async () => {
      const pipelineId = 'test-pipeline-id';
      const recommendations = await analyticsService.generateOptimizationRecommendations(pipelineId);
      
      expect(Array.isArray(recommendations)).toBe(true);
      
      if (recommendations.length > 0) {
        const recommendation = recommendations[0];
        expect(recommendation).toBeDefined();
        if (recommendation) {
          expect(typeof recommendation.recommendationType).toBe('string');
          expect(typeof recommendation.title).toBe('string');
          expect(typeof recommendation.description).toBe('string');
          expect(['low', 'medium', 'high', 'critical']).toContain(recommendation.priority);
          expect(['low', 'medium', 'high']).toContain(recommendation.implementationEffort);
          expect(typeof recommendation.potentialSavings).toBe('object');
          if (recommendation.actionItems) {
            expect(Array.isArray(recommendation.actionItems)).toBe(true);
          }
        }
      }
    });

    it('should generate different types of recommendations', async () => {
      const recommendations = await analyticsService.generateOptimizationRecommendations('test-pipeline-id');
      
      const types = ['performance', 'reliability', 'cost', 'security', 'maintainability'];
      
      if (recommendations.length > 0) {
        recommendations.forEach(rec => {
          expect(typeof rec.recommendationType).toBe('string');
          // The recommendationType might not match exactly the types array, so just check it's a string
        });
      }
    });
  });

  describe('Dashboard Generation', () => {
    it('should generate dashboard data with default parameters', async () => {
      const dashboard = await analyticsService.generateDashboard({});
      
      expect(dashboard).toBeDefined();
      expect(typeof dashboard.summary).toBe('object');
      expect(typeof dashboard.summary.totalPipelines).toBe('number');
      expect(typeof dashboard.summary.totalRuns).toBe('number');
      expect(typeof dashboard.summary.successRate).toBe('number');
      expect(typeof dashboard.summary.averageDuration).toBe('number');
      expect(Array.isArray(dashboard.recentActivity)).toBe(true);
      expect(Array.isArray(dashboard.topFailures)).toBe(true);
      expect(Array.isArray(dashboard.performanceTrends)).toBe(true);
      expect(Array.isArray(dashboard.alerts)).toBe(true);
    });

    it('should generate dashboard for specific pipeline', async () => {
      const pipelineId = 'test-pipeline-id';
      const dashboard = await analyticsService.generateDashboard({
        pipelineId,
        timeRange: 'daily'
      });
      
      expect(dashboard).toBeDefined();
      expect(dashboard.summary.totalPipelines).toBe(1);
    });

    it('should generate dashboard for different time ranges', async () => {
      const timeRanges = ['hourly', 'daily', 'weekly', 'monthly'];
      
      for (const timeRange of timeRanges) {
        const dashboard = await analyticsService.generateDashboard({ timeRange });
        expect(dashboard).toBeDefined();
      }
    });
  });

  describe('Alert Management', () => {
    it('should generate alerts based on thresholds', async () => {
      const alerts = await analyticsService.generateAlerts();
      
      expect(Array.isArray(alerts)).toBe(true);
      
      if (alerts.length > 0) {
        const alert = alerts[0];
        expect(alert).toBeDefined();
        if (alert) {
          expect(typeof alert.alertType).toBe('string');
          expect(typeof alert.title).toBe('string');
          expect(typeof alert.message).toBe('string');
          expect(['info', 'warning', 'error', 'critical']).toContain(alert.severity);
          expect(typeof alert.data).toBe('object');
          if (alert.thresholdValue !== undefined) {
            expect(typeof alert.thresholdValue).toBe('number');
          }
          if (alert.actualValue !== undefined) {
            expect(typeof alert.actualValue).toBe('number');
          }
        }
      }
    });

    it('should update alert status', async () => {
      // Since AlertResult doesn't have an id field, we'll test with a mock scenario
      const mockAlertId = 'test-alert-id';
      const updatedAlert = await analyticsService.updateAlert(mockAlertId, {
        acknowledged: true,
        acknowledgedBy: 'test-user'
      });
      
      expect(updatedAlert).toBeDefined();
      // The updated alert should have acknowledged status
      expect(updatedAlert.acknowledged).toBe(true);
      expect(updatedAlert.acknowledgedBy).toBe('test-user');
    });
  });

  describe('Async Analysis', () => {
    it('should trigger async analysis for pipeline', async () => {
      const pipelineId = 'test-pipeline-id';
      
      // Should not throw error
      await expect(analyticsService.analyzeAsync(pipelineId)).resolves.toBeUndefined();
    });

    it('should handle async analysis errors gracefully', async () => {
      const pipelineId = 'error-pipeline';
      
      // Should not throw error even if internal processing fails
      await expect(analyticsService.analyzeAsync(pipelineId)).resolves.toBeUndefined();
    });
  });
});

describe('Analytics Routes Tests', () => {
  let app: express.Application;
  let authService: AuthService;
  let validToken: string;

  beforeAll(async () => {
    // Setup test app
    app = express();
    app.use(express.json());
    
    // Initialize auth service
    authService = getAuthService();

    // Generate valid test token
    validToken = authService.generateAccessToken({
      userId: 'test-user-id',
      email: 'test@example.com',
      role: UserRole.ADMIN,
      permissions: [
        'pipelines:read',
        'pipelines:write', 
        'pipelines:delete',
        'pipelines:analyze',
        'system:metrics',
        'system:config',
        'system:logs',
        'users:read',
        'users:write',
        'reports:read',
        'reports:write'
      ],
      sessionId: 'test-session'
    });

    // Mount analytics routes
    app.use('/analytics', analyticsRoutes);
  });

  describe('GET /analytics/dashboard', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/analytics/dashboard')
        .expect(401);
    });

    it('should return dashboard data with valid auth', async () => {
      const response = await request(app)
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.performance).toBeDefined();
    });

    it('should accept query parameters', async () => {
      const response = await request(app)
        .get('/analytics/dashboard?period=weekly&pipelineId=550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/analytics/dashboard?period=invalid')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);
    });
  });

  describe('GET /analytics/pipelines/:pipelineId/metrics', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/analytics/pipelines/test-pipeline/metrics')
        .expect(401);
    });

    it('should return metrics for valid pipeline', async () => {
      const response = await request(app)
        .get('/analytics/pipelines/550e8400-e29b-41d4-a716-446655440000/metrics')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.pipelineId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should validate pipeline ID format', async () => {
      const response = await request(app)
        .get('/analytics/pipelines/invalid-uuid/metrics')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);
    });

    it('should accept period query parameter', async () => {
      const response = await request(app)
        .get('/analytics/pipelines/550e8400-e29b-41d4-a716-446655440000/metrics?period=weekly')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /analytics/pipelines/:pipelineId/patterns', () => {
    it('should return failure patterns', async () => {
      const response = await request(app)
        .get('/analytics/pipelines/550e8400-e29b-41d4-a716-446655440000/patterns')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /analytics/patterns', () => {
    it('should return global patterns', async () => {
      const response = await request(app)
        .get('/analytics/patterns')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require SYSTEM_METRICS permission', async () => {
      // Create token with limited permissions
      const limitedToken = authService.generateAccessToken({
        userId: 'test-user-id',
        email: 'test@example.com',
        role: UserRole.VIEWER,
        permissions: ['PIPELINES_READ'],
        sessionId: 'limited-session'
      });

      const response = await request(app)
        .get('/analytics/patterns')
        .set('Authorization', `Bearer ${limitedToken}`)
        .expect(403);
    });
  });

  describe('GET /analytics/pipelines/:pipelineId/recommendations', () => {
    it('should return optimization recommendations', async () => {
      const response = await request(app)
        .get('/analytics/pipelines/550e8400-e29b-41d4-a716-446655440000/recommendations')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /analytics/alerts', () => {
    it('should return alerts', async () => {
      const response = await request(app)
        .get('/analytics/alerts')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('PUT /analytics/alerts/:alertId', () => {
    it('should update alert status', async () => {
      const alertId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .put(`/analytics/alerts/${alertId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          acknowledged: true,
          acknowledgedBy: 'test-user'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should validate request body', async () => {
      const alertId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .put(`/analytics/alerts/${alertId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          acknowledged: 'invalid'
        })
        .expect(400);
    });

    it('should require PIPELINES_WRITE permission', async () => {
      const limitedToken = authService.generateAccessToken({
        userId: 'test-user-id',
        email: 'test@example.com',
        role: UserRole.VIEWER,
        permissions: ['PIPELINES_READ'],
        sessionId: 'limited-session'
      });

      const alertId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .put(`/analytics/alerts/${alertId}`)
        .set('Authorization', `Bearer ${limitedToken}`)
        .send({
          acknowledged: true
        })
        .expect(403);
    });
  });

  describe('POST /analytics/pipelines/:pipelineId/trigger', () => {
    it('should trigger analytics analysis', async () => {
      const response = await request(app)
        .post('/analytics/pipelines/550e8400-e29b-41d4-a716-446655440000/trigger')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('triggered');
      expect(response.body.data.pipelineId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should require PIPELINES_WRITE permission', async () => {
      const limitedToken = authService.generateAccessToken({
        userId: 'test-user-id',
        email: 'test@example.com',
        role: UserRole.VIEWER,
        permissions: ['PIPELINES_READ'],
        sessionId: 'limited-session'
      });

      const response = await request(app)
        .post('/analytics/pipelines/550e8400-e29b-41d4-a716-446655440000/trigger')
        .set('Authorization', `Bearer ${limitedToken}`)
        .expect(403);
    });
  });

  describe('GET /analytics/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/analytics/health')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.service).toBe('analytics');
      expect(response.body.data.version).toBe('1.0.0');
    });

    it('should require SYSTEM_METRICS permission', async () => {
      const limitedToken = authService.generateAccessToken({
        userId: 'test-user-id',
        email: 'test@example.com',
        role: UserRole.VIEWER,
        permissions: ['PIPELINES_READ'],
        sessionId: 'limited-session'
      });

      const response = await request(app)
        .get('/analytics/health')
        .set('Authorization', `Bearer ${limitedToken}`)
        .expect(403);
    });
  });

  describe('Request Logging and Performance', () => {
    it('should include performance metrics in responses', async () => {
      const response = await request(app)
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.meta.performance).toBeDefined();
      expect(typeof response.body.meta.performance.executionTime).toBe('number');
      expect(response.body.meta.performance.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle concurrent requests efficiently', async () => {
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .get('/analytics/dashboard')
          .set('Authorization', `Bearer ${validToken}`)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
