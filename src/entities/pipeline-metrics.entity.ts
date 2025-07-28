import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Pipeline } from './pipeline.entity';

/**
 * Analytics metrics for pipeline performance and trends
 */
@Entity('pipeline_metrics')
@Index(['pipelineId', 'metricType', 'timestamp'])
@Index(['metricType', 'timestamp'])
export class PipelineMetrics extends BaseEntity {
  @Column({ name: 'pipeline_id', type: 'uuid' })
  pipelineId!: string;

  @ManyToOne(() => Pipeline, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pipeline_id' })
  pipeline!: Pipeline;

  @Column({ name: 'metric_type', type: 'varchar', length: 100 })
  metricType!: string; // 'success_rate', 'avg_duration', 'failure_count', etc.

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  value!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>; // Additional metric context

  @Column({ type: 'varchar', length: 50, default: 'daily' })
  aggregationPeriod!: string; // 'hourly', 'daily', 'weekly', 'monthly'

  @Column({ type: 'timestamp with time zone' })
  timestamp!: Date;
}

/**
 * Failure pattern analysis results
 */
@Entity('failure_patterns')
@Index(['pipelineId', 'patternType', 'detectedAt'])
export class FailurePattern extends BaseEntity {
  @Column({ name: 'pipeline_id', type: 'uuid', nullable: true })
  pipelineId?: string;

  @ManyToOne(() => Pipeline, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pipeline_id' })
  pipeline?: Pipeline;

  @Column({ name: 'pattern_type', type: 'varchar', length: 100 })
  patternType!: string; // 'recurring_failure', 'timeout_pattern', 'dependency_failure', etc.

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  confidence!: number; // 0.0 to 1.0

  @Column({ type: 'jsonb' })
  data!: Record<string, any>; // Pattern-specific data

  @Column({ type: 'varchar', length: 50, default: 'low' })
  severity!: string; // 'low', 'medium', 'high', 'critical'

  @Column({ name: 'first_seen', type: 'timestamp with time zone' })
  firstSeen!: Date;

  @Column({ name: 'last_seen', type: 'timestamp with time zone' })
  lastSeen!: Date;

  @Column({ name: 'occurrence_count', type: 'integer', default: 1 })
  occurrenceCount!: number;

  @Column({ name: 'detected_at', type: 'timestamp with time zone' })
  detectedAt!: Date;

  @Column({ type: 'boolean', default: true })
  active!: boolean;
}

/**
 * Resource optimization recommendations
 */
@Entity('optimization_recommendations')
@Index(['pipelineId', 'recommendationType', 'createdAt'])
export class OptimizationRecommendation extends BaseEntity {
  @Column({ name: 'pipeline_id', type: 'uuid', nullable: true })
  pipelineId?: string;

  @ManyToOne(() => Pipeline, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pipeline_id' })
  pipeline?: Pipeline;

  @Column({ name: 'recommendation_type', type: 'varchar', length: 100 })
  recommendationType!: string; // 'resource_scaling', 'caching', 'parallelization', etc.

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'potential_savings', type: 'jsonb' })
  potentialSavings!: {
    time?: number; // seconds
    cost?: number; // dollars
    resources?: Record<string, number>;
  };

  @Column({ name: 'implementation_effort', type: 'varchar', length: 50 })
  implementationEffort!: string; // 'low', 'medium', 'high'

  @Column({ type: 'varchar', length: 50, default: 'medium' })
  priority!: string; // 'low', 'medium', 'high', 'critical'

  @Column({ type: 'jsonb', nullable: true })
  actionItems?: string[]; // Specific steps to implement

  @Column({ type: 'boolean', default: false })
  implemented!: boolean;

  @Column({ name: 'implemented_at', type: 'timestamp with time zone', nullable: true })
  implementedAt?: Date;
}

/**
 * Analytics alerts and notifications
 */
@Entity('analytics_alerts')
@Index(['alertType', 'severity', 'createdAt'])
@Index(['pipelineId', 'acknowledged'])
export class AnalyticsAlert extends BaseEntity {
  @Column({ name: 'pipeline_id', type: 'uuid', nullable: true })
  pipelineId?: string;

  @ManyToOne(() => Pipeline, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pipeline_id' })
  pipeline?: Pipeline;

  @Column({ name: 'alert_type', type: 'varchar', length: 100 })
  alertType!: string; // 'performance_degradation', 'failure_spike', 'resource_waste', etc.

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'varchar', length: 50 })
  severity!: string; // 'info', 'warning', 'error', 'critical'

  @Column({ type: 'jsonb' })
  data!: Record<string, any>; // Alert-specific data

  @Column({ name: 'threshold_value', type: 'decimal', precision: 10, scale: 4, nullable: true })
  thresholdValue?: number;

  @Column({ name: 'actual_value', type: 'decimal', precision: 10, scale: 4, nullable: true })
  actualValue?: number;

  @Column({ type: 'boolean', default: false })
  acknowledged!: boolean;

  @Column({ name: 'acknowledged_by', type: 'varchar', length: 100, nullable: true })
  acknowledgedBy?: string;

  @Column({ name: 'acknowledged_at', type: 'timestamp with time zone', nullable: true })
  acknowledgedAt?: Date;

  @Column({ type: 'boolean', default: true })
  active!: boolean;
}
