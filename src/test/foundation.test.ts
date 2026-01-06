/**
 * Basic setup test to verify Phase 1 foundation
 */

import { Logger } from '../shared/logger';
import { configManager } from '../config';

describe('Phase 1 Foundation Tests', () => {
  describe('Logger', () => {
    it('should create logger instance', () => {
      const logger = new Logger('test');
      expect(logger).toBeDefined();
    });

    it('should format log messages', () => {
      const logger = new Logger('test');
      // Test basic functionality without actual logging
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('debug');
    });
  });

  describe('Configuration Manager', () => {
    it('should load configuration', () => {
      expect(configManager).toBeDefined();
      expect(configManager.get).toBeDefined();
    });

    it('should provide environment methods', () => {
      expect(configManager.isDevelopment).toBeDefined();
      expect(configManager.isProduction).toBeDefined();
      expect(configManager.isTest).toBeDefined();
    });

    it('should provide configuration sections', () => {
      expect(configManager.getServer).toBeDefined();
      expect(configManager.getDatabase).toBeDefined();
      expect(configManager.getRedis).toBeDefined();
      expect(configManager.getAuth).toBeDefined();
    });
  });

  describe('Application Structure', () => {
    it('should have all core modules available', async () => {
      // Test that modules can be imported without errors
      const { moduleManager } = await import('../core/module-manager');
      const { databaseManager } = await import('../core/database');
      const { redisManager } = await import('../core/redis');

      expect(moduleManager).toBeDefined();
      expect(databaseManager).toBeDefined();
      expect(redisManager).toBeDefined();
    });

    it('should have entity definitions', async () => {
      const { BaseEntity } = await import('../entities/base.entity');
      const { Pipeline } = await import('../entities/pipeline.entity');

      expect(BaseEntity).toBeDefined();
      expect(Pipeline).toBeDefined();
    });

    it('should have type definitions', async () => {
      const types = await import('../types');

      expect(types.PipelineProvider).toBeDefined();
      expect(types.PipelineStatus).toBeDefined();
      expect(types.PipelineVisibility).toBeDefined();
    });
  });
});

export {};
