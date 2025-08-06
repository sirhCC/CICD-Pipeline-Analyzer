/**
 * Test Database Setup - In-Memory SQLite for Testing
 */

import { DataSource } from 'typeorm';
import { join } from 'path';

// Import all entities
import { Pipeline } from '../entities/pipeline.entity';
import { PipelineRun } from '../entities/pipeline-run.entity';
import { PipelineMetrics } from '../entities/pipeline-metrics.entity';
import { User } from '../entities/user.entity';
import { AnomalyHistory } from '../entities/anomaly-history.entity';
import { StatisticalCache } from '../entities/statistical-cache.entity';
import { StatisticalResult } from '../entities/statistical-result.entity';
import { TrendHistory } from '../entities/trend-history.entity';

/**
 * Create in-memory test database
 */
export const createTestDataSource = (): DataSource => {
  return new DataSource({
    type: 'sqlite',
    database: ':memory:',
    entities: [
      Pipeline,
      PipelineRun,
      PipelineMetrics,
      User,
      AnomalyHistory,
      StatisticalCache,
      StatisticalResult,
      TrendHistory
    ],
    synchronize: true,
    logging: false,
    dropSchema: true,
  });
};

/**
 * Setup test database connection
 */
export const setupTestDatabase = async (): Promise<DataSource> => {
  const dataSource = createTestDataSource();
  await dataSource.initialize();
  return dataSource;
};

/**
 * Cleanup test database
 */
export const cleanupTestDatabase = async (dataSource: DataSource): Promise<void> => {
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
  }
};

/**
 * Mock database service for tests
 */
export class MockDatabaseService {
  private dataSource: DataSource | null = null;

  async initialize(): Promise<void> {
    if (!this.dataSource) {
      this.dataSource = await setupTestDatabase();
    }
  }

  async close(): Promise<void> {
    if (this.dataSource) {
      await cleanupTestDatabase(this.dataSource);
      this.dataSource = null;
    }
  }

  async clearAllData(): Promise<void> {
    if (this.dataSource) {
      const entities = this.dataSource.entityMetadatas;
      for (const entity of entities) {
        const repository = this.dataSource.getRepository(entity.name);
        await repository.clear();
      }
    }
  }

  getDataSource(): DataSource | null {
    return this.dataSource;
  }

  isConnected(): boolean {
    return this.dataSource?.isInitialized || false;
  }
}
