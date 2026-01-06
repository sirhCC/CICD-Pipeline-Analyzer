/**
 * Anomaly Detection History Entity - Phase 3 Data Persistence
 * Tracks historical anomaly detection results for pattern analysis
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Pipeline } from './pipeline.entity';

export enum AnomalyMethod {
  Z_SCORE = 'z-score',
  PERCENTILE = 'percentile',
  IQR = 'iqr',
  COMPOSITE = 'composite',
}

export enum AnomalySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('anomaly_history')
@Index(['pipelineId', 'timestamp'])
@Index(['metric', 'timestamp'])
@Index(['severity', 'timestamp'])
@Index(['isAnomaly', 'timestamp'])
export class AnomalyHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  pipelineId?: string;

  @ManyToOne(() => Pipeline, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pipelineId' })
  pipeline?: Pipeline;

  @Column({ type: 'varchar', length: 100 })
  metric!: string; // duration, cpu, memory, success_rate, test_coverage

  @Column({
    type: 'enum',
    enum: AnomalyMethod,
  })
  method!: AnomalyMethod;

  @Column({ type: 'boolean' })
  isAnomaly!: boolean;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  value!: number; // The actual metric value

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  anomalyScore!: number; // 0-1 confidence score

  @Column({
    type: 'enum',
    enum: AnomalySeverity,
  })
  severity!: AnomalySeverity;

  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true })
  threshold?: number; // Detection threshold used

  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true })
  baseline?: number; // Baseline value for comparison

  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true })
  deviation?: number; // Deviation from baseline

  @Column({ type: 'json', nullable: true })
  context?: Record<string, unknown>; // Additional context (window size, etc.)

  @Column({ type: 'varchar', length: 100, nullable: true })
  jobExecutionId?: string; // Link to background job execution

  @Column({ type: 'varchar', length: 100, nullable: true })
  runId?: string; // Pipeline run ID if available

  @CreateDateColumn()
  timestamp!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
