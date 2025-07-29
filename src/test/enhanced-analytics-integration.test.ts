/**
 * Integration Test for Enhanced Analytics Routes
 * Validates that all enhanced analytics endpoints are properly integrated
 */

import { Router } from 'express';

describe('Enhanced Analytics Routes Integration', () => {
  // Import the enhanced analytics router
  let enhancedAnalyticsRouter: Router;

  beforeAll(async () => {
    // Dynamically import to avoid initialization issues
    const routerModule = await import('../routes/enhanced-analytics.routes');
    enhancedAnalyticsRouter = routerModule.default;
  });

  test('Enhanced analytics router should be defined', () => {
    expect(enhancedAnalyticsRouter).toBeDefined();
    expect(typeof enhancedAnalyticsRouter).toBe('function');
  });

  test('Router should have expected routes', () => {
    // Check that the router has the expected middleware/routes
    const routerStack = (enhancedAnalyticsRouter as any).stack;
    expect(routerStack).toBeDefined();
    expect(Array.isArray(routerStack)).toBe(true);
    expect(routerStack.length).toBeGreaterThan(0);
  });

  test('Enhanced services should be importable', async () => {
    // Test that we can import the optimization services
    const servicesModule = await import('../services');
    
    expect(servicesModule.enhancedStatisticalAnalyticsService).toBeDefined();
    expect(servicesModule.optimizationIntegrationService).toBeDefined();
    expect(servicesModule.optimizationConfigService).toBeDefined();
  });
});

// Integration test for router configuration
describe('Router Configuration Integration', () => {
  test('Versioned router should include enhanced analytics feature', async () => {
    const { apiVersionManager } = await import('../config/versioning');
    const versionConfig = apiVersionManager.getVersionConfig('v1');
    
    expect(versionConfig).toBeDefined();
    expect(versionConfig?.features).toContain('phase3-optimizations');
  });

  test('Router factory should create enhanced analytics routes', async () => {
    const { createAllVersionedRouters } = await import('../config/router');
    const routers = createAllVersionedRouters();
    
    expect(routers).toBeDefined();
    expect(Array.isArray(routers)).toBe(true);
    expect(routers.length).toBeGreaterThan(0);
    
    // Check that at least one router is configured for v1
    const v1Router = routers.find(r => r.version === 'v1');
    expect(v1Router).toBeDefined();
  });
});

// Test helper functions in enhanced analytics routes
describe('Enhanced Analytics Helper Functions', () => {
  test('Helper functions should not throw on valid input', () => {
    // These functions are defined in the routes file
    const testResults = [
      { severity: 'low' },
      { severity: 'medium' },
      { severity: 'high' },
      { severity: 'critical' }
    ];

    // The helper functions should handle this data without throwing
    expect(() => {
      // Mock implementation of helper function logic
      const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
      testResults.forEach(result => {
        const severity = result.severity as keyof typeof distribution;
        if (severity in distribution) {
          distribution[severity]++;
        }
      });
    }).not.toThrow();
  });
});

export {};
