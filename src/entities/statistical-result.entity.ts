/**
 * Statistical Result Entity - Phase 3 Data Persistence
 * Stores statistical analysis results for historical tracking and trend analysis
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Pipeline } from './pipeline.entity';

export enum AnalysisType {
  ANOMALY_DETECTION = 'anomaly_detection',
  TREND_ANALYSIS = 'trend_analysis',
  SLA_MONITORING = 'sla_monitoring',
  COST_ANALYSIS = 'cost_analysis',
  BENCHMARK_ANALYSIS = 'benchmark_analysis',
}

export enum ResultStatus {
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

@Entity('statistical_results')
@Index(['pipelineId', 'analysisType', 'timestamp'])
@Index(['analysisType', 'timestamp'])
@Index(['status', 'timestamp'])
export class StatisticalResult {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  pipelineId?: string;

  @ManyToOne(() => Pipeline, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pipelineId' })
  pipeline?: Pipeline;

  @Column({
    type: 'enum',
    enum: AnalysisType,
  })
  analysisType!: AnalysisType;

  @Column({
    type: 'enum',
    enum: ResultStatus,
    default: ResultStatus.SUCCESS,
  })
  status!: ResultStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  metric?: string; // duration, cpu, memory, success_rate, test_coverage

  @Column({ type: 'varchar', length: 100, nullable: true })
  method?: string; // z-score, percentile, iqr, linear-regression

  @Column({ type: 'json' })
  result!: Record<string, unknown>; // The actual analysis result

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown>; // Additional context

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  score?: number; // Confidence score, anomaly score, etc.

  @Column({ type: 'varchar', length: 20, nullable: true })
  severity?: 'low' | 'medium' | 'high' | 'critical';

  @Column({ type: 'int', nullable: true })
  dataPointCount?: number; // Number of data points analyzed

  @Column({ type: 'int', nullable: true })
  periodDays?: number; // Analysis period in days

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  executionTime?: number; // Analysis execution time in milliseconds

  @Column({ type: 'varchar', length: 100, nullable: true })
  jobExecutionId?: string; // Link to background job execution

  @CreateDateColumn()
  timestamp!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
