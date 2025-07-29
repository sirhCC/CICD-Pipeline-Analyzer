/**
 * Statistical Data Persistence Migration - Phase 3
 * Creates tables for statistical analysis results, anomaly history, trend tracking, and caching
 */

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class StatisticalDataPersistence1701298765432 implements MigrationInterface {
  name = 'StatisticalDataPersistence1701298765432';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create statistical_results table
    await queryRunner.createTable(
      new Table({
        name: 'statistical_results',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'pipelineId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'analysisType',
            type: 'enum',
            enum: ['anomaly_detection', 'trend_analysis', 'sla_monitoring', 'cost_analysis', 'benchmark_analysis']
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['success', 'warning', 'error', 'critical'],
            default: "'success'"
          },
          {
            name: 'metric',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'method',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'result',
            type: 'json'
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true
          },
          {
            name: 'score',
            type: 'decimal',
            precision: 10,
            scale: 4,
            isNullable: true
          },
          {
            name: 'severity',
            type: 'varchar',
            length: '20',
            isNullable: true
          },
          {
            name: 'dataPointCount',
            type: 'int',
            isNullable: true
          },
          {
            name: 'periodDays',
            type: 'int',
            isNullable: true
          },
          {
            name: 'executionTime',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true
          },
          {
            name: 'jobExecutionId',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP'
          }
        ],
        foreignKeys: [
          {
            columnNames: ['pipelineId'],
            referencedTableName: 'pipelines',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ]
      }),
      true
    );

    // Create anomaly_history table
    await queryRunner.createTable(
      new Table({
        name: 'anomaly_history',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'pipelineId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'metric',
            type: 'varchar',
            length: '100'
          },
          {
            name: 'method',
            type: 'enum',
            enum: ['z-score', 'percentile', 'iqr', 'composite']
          },
          {
            name: 'isAnomaly',
            type: 'boolean'
          },
          {
            name: 'value',
            type: 'decimal',
            precision: 15,
            scale: 4
          },
          {
            name: 'anomalyScore',
            type: 'decimal',
            precision: 10,
            scale: 4
          },
          {
            name: 'severity',
            type: 'enum',
            enum: ['low', 'medium', 'high', 'critical']
          },
          {
            name: 'threshold',
            type: 'decimal',
            precision: 15,
            scale: 4,
            isNullable: true
          },
          {
            name: 'baseline',
            type: 'decimal',
            precision: 15,
            scale: 4,
            isNullable: true
          },
          {
            name: 'deviation',
            type: 'decimal',
            precision: 15,
            scale: 4,
            isNullable: true
          },
          {
            name: 'context',
            type: 'json',
            isNullable: true
          },
          {
            name: 'jobExecutionId',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'runId',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ],
        foreignKeys: [
          {
            columnNames: ['pipelineId'],
            referencedTableName: 'pipelines',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ]
      }),
      true
    );

    // Create trend_history table
    await queryRunner.createTable(
      new Table({
        name: 'trend_history',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'pipelineId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'metric',
            type: 'varchar',
            length: '100'
          },
          {
            name: 'trend',
            type: 'enum',
            enum: ['improving', 'degrading', 'stable', 'volatile']
          },
          {
            name: 'strength',
            type: 'enum',
            enum: ['weak', 'moderate', 'strong', 'very_strong']
          },
          {
            name: 'correlation',
            type: 'decimal',
            precision: 10,
            scale: 4
          },
          {
            name: 'slope',
            type: 'decimal',
            precision: 15,
            scale: 6
          },
          {
            name: 'rSquared',
            type: 'decimal',
            precision: 10,
            scale: 4
          },
          {
            name: 'volatility',
            type: 'decimal',
            precision: 15,
            scale: 4,
            isNullable: true
          },
          {
            name: 'dataPoints',
            type: 'int'
          },
          {
            name: 'periodDays',
            type: 'int'
          },
          {
            name: 'prediction',
            type: 'json',
            isNullable: true
          },
          {
            name: 'confidenceInterval',
            type: 'json',
            isNullable: true
          },
          {
            name: 'jobExecutionId',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ],
        foreignKeys: [
          {
            columnNames: ['pipelineId'],
            referencedTableName: 'pipelines',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ]
      }),
      true
    );

    // Create statistical_cache table
    await queryRunner.createTable(
      new Table({
        name: 'statistical_cache',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'cacheKey',
            type: 'varchar',
            length: '255',
            isUnique: true
          },
          {
            name: 'cacheType',
            type: 'enum',
            enum: ['benchmark_data', 'aggregated_metrics', 'historical_stats', 'baseline_values', 'threshold_config']
          },
          {
            name: 'pipelineId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'metric',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'data',
            type: 'json'
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true
          },
          {
            name: 'size',
            type: 'bigint'
          },
          {
            name: 'hitCount',
            type: 'int',
            default: 0
          },
          {
            name: 'expiresAt',
            type: 'timestamp'
          },
          {
            name: 'lastAccessed',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create indexes for performance
    await queryRunner.createIndex('statistical_results', new TableIndex({
      name: 'idx_statistical_results_pipeline_type_timestamp',
      columnNames: ['pipelineId', 'analysisType', 'timestamp']
    }));
    await queryRunner.createIndex('statistical_results', new TableIndex({
      name: 'idx_statistical_results_type_timestamp',
      columnNames: ['analysisType', 'timestamp']
    }));
    await queryRunner.createIndex('statistical_results', new TableIndex({
      name: 'idx_statistical_results_status_timestamp',
      columnNames: ['status', 'timestamp']
    }));

    await queryRunner.createIndex('anomaly_history', new TableIndex({
      name: 'idx_anomaly_history_pipeline_timestamp',
      columnNames: ['pipelineId', 'timestamp']
    }));
    await queryRunner.createIndex('anomaly_history', new TableIndex({
      name: 'idx_anomaly_history_metric_timestamp',
      columnNames: ['metric', 'timestamp']
    }));
    await queryRunner.createIndex('anomaly_history', new TableIndex({
      name: 'idx_anomaly_history_severity_timestamp',
      columnNames: ['severity', 'timestamp']
    }));
    await queryRunner.createIndex('anomaly_history', new TableIndex({
      name: 'idx_anomaly_history_anomaly_timestamp',
      columnNames: ['isAnomaly', 'timestamp']
    }));

    await queryRunner.createIndex('trend_history', new TableIndex({
      name: 'idx_trend_history_pipeline_timestamp',
      columnNames: ['pipelineId', 'timestamp']
    }));
    await queryRunner.createIndex('trend_history', new TableIndex({
      name: 'idx_trend_history_metric_timestamp',
      columnNames: ['metric', 'timestamp']
    }));
    await queryRunner.createIndex('trend_history', new TableIndex({
      name: 'idx_trend_history_trend_timestamp',
      columnNames: ['trend', 'timestamp']
    }));
    await queryRunner.createIndex('trend_history', new TableIndex({
      name: 'idx_trend_history_strength_timestamp',
      columnNames: ['strength', 'timestamp']
    }));

    await queryRunner.createIndex('statistical_cache', new TableIndex({
      name: 'idx_statistical_cache_key',
      columnNames: ['cacheKey']
    }));
    await queryRunner.createIndex('statistical_cache', new TableIndex({
      name: 'idx_statistical_cache_type_expires',
      columnNames: ['cacheType', 'expiresAt']
    }));
    await queryRunner.createIndex('statistical_cache', new TableIndex({
      name: 'idx_statistical_cache_pipeline_type',
      columnNames: ['pipelineId', 'cacheType']
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('statistical_cache', 'idx_statistical_cache_pipeline_type');
    await queryRunner.dropIndex('statistical_cache', 'idx_statistical_cache_type_expires');
    await queryRunner.dropIndex('statistical_cache', 'idx_statistical_cache_key');

    await queryRunner.dropIndex('trend_history', 'idx_trend_history_strength_timestamp');
    await queryRunner.dropIndex('trend_history', 'idx_trend_history_trend_timestamp');
    await queryRunner.dropIndex('trend_history', 'idx_trend_history_metric_timestamp');
    await queryRunner.dropIndex('trend_history', 'idx_trend_history_pipeline_timestamp');

    await queryRunner.dropIndex('anomaly_history', 'idx_anomaly_history_anomaly_timestamp');
    await queryRunner.dropIndex('anomaly_history', 'idx_anomaly_history_severity_timestamp');
    await queryRunner.dropIndex('anomaly_history', 'idx_anomaly_history_metric_timestamp');
    await queryRunner.dropIndex('anomaly_history', 'idx_anomaly_history_pipeline_timestamp');

    await queryRunner.dropIndex('statistical_results', 'idx_statistical_results_status_timestamp');
    await queryRunner.dropIndex('statistical_results', 'idx_statistical_results_type_timestamp');
    await queryRunner.dropIndex('statistical_results', 'idx_statistical_results_pipeline_type_timestamp');

    // Drop tables
    await queryRunner.dropTable('statistical_cache');
    await queryRunner.dropTable('trend_history');
    await queryRunner.dropTable('anomaly_history');
    await queryRunner.dropTable('statistical_results');
  }
}
