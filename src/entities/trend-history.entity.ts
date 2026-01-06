/**
 * Trend Analysis History Entity - Phase 3 Data Persistence
 * Stores historical trend analysis results for long-term pattern tracking
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

export enum TrendDirection {
  IMPROVING = 'improving',
  DEGRADING = 'degrading',
  STABLE = 'stable',
  VOLATILE = 'volatile',
}

export enum TrendStrength {
  WEAK = 'weak',
  MODERATE = 'moderate',
  STRONG = 'strong',
  VERY_STRONG = 'very_strong',
}

@Entity('trend_history')
@Index(['pipelineId', 'timestamp'])
@Index(['metric', 'timestamp'])
@Index(['trend', 'timestamp'])
@Index(['strength', 'timestamp'])
export class TrendHistory {
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
    enum: TrendDirection,
  })
  trend!: TrendDirection;

  @Column({
    type: 'enum',
    enum: TrendStrength,
  })
  strength!: TrendStrength;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  correlation!: number; // Correlation coefficient

  @Column({ type: 'decimal', precision: 15, scale: 6 })
  slope!: number; // Linear regression slope

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  rSquared!: number; // R-squared goodness of fit

  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true })
  volatility?: number; // Data volatility measure

  @Column({ type: 'int' })
  dataPoints!: number; // Number of data points in analysis

  @Column({ type: 'int' })
  periodDays!: number; // Analysis period in days

  @Column({ type: 'json', nullable: true })
  prediction?: Record<string, unknown>; // Future predictions

  @Column({ type: 'json', nullable: true })
  confidenceInterval?: Record<string, unknown>; // Statistical confidence bounds

  @Column({ type: 'varchar', length: 100, nullable: true })
  jobExecutionId?: string; // Link to background job execution

  @CreateDateColumn()
  timestamp!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
