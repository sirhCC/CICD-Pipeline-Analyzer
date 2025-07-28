/**
 * Pipeline Run Entity - Represents individual pipeline executions
 */

import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Pipeline } from './pipeline.entity';
import { PipelineStatus } from '../types';

/**
 * Pipeline Run Stage Entity for detailed stage tracking
 */
@Entity('pipeline_run_stages')
@Index(['runId', 'name'])
@Index(['status'])
@Index(['startedAt'])
export class PipelineRunStage extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ 
    type: 'enum', 
    enum: PipelineStatus,
    enumName: 'pipeline_status_enum',
    default: PipelineStatus.PENDING
  })
  status!: PipelineStatus;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @Column({ type: 'int', nullable: true })
  duration?: number; // in seconds

  @Column({ type: 'int', default: 0 })
  exitCode!: number;

  @Column({ type: 'text', nullable: true })
  logs?: string;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  resources?: Record<string, any>; // CPU, memory usage

  @Column({ type: 'json', nullable: true })
  artifacts?: Record<string, any>;

  // Relations
  @Column({ type: 'uuid' })
  runId!: string;

  @ManyToOne(() => PipelineRun, run => run.stages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'runId' })
  run!: PipelineRun;

  /**
   * Calculate stage duration
   */
  calculateDuration(): number {
    if (!this.startedAt || !this.completedAt) {
      return 0;
    }
    return Math.round((this.completedAt.getTime() - this.startedAt.getTime()) / 1000);
  }

  /**
   * Check if stage is successful
   */
  isSuccessful(): boolean {
    return this.status === PipelineStatus.SUCCESS;
  }

  /**
   * Check if stage failed
   */
  isFailed(): boolean {
    return [
      PipelineStatus.FAILED,
      PipelineStatus.CANCELLED,
      PipelineStatus.TIMEOUT
    ].includes(this.status);
  }
}

/**
 * Pipeline Run Entity for tracking individual executions
 */
@Entity('pipeline_runs')
@Index(['pipelineId', 'runNumber'], { unique: true })
@Index(['status'])
@Index(['triggeredBy'])
@Index(['startedAt'])
@Index(['branch'])
export class PipelineRun extends BaseEntity {
  @Column({ type: 'int' })
  runNumber!: number;

  @Column({ type: 'varchar', length: 255 })
  branch!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  tag?: string;

  @Column({ type: 'varchar', length: 255 })
  commitSha!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  commitMessage?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  commitAuthor?: string;

  @Column({ 
    type: 'enum', 
    enum: PipelineStatus,
    enumName: 'pipeline_status_enum',
    default: PipelineStatus.PENDING
  })
  status!: PipelineStatus;

  @Column({ type: 'varchar', length: 255 })
  triggeredBy!: string; // user, webhook, schedule, etc.

  @Column({ type: 'varchar', length: 255, nullable: true })
  triggeredEvent?: string; // push, pull_request, schedule, etc.

  @Column({ type: 'timestamptz', nullable: true })
  queuedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @Column({ type: 'int', nullable: true })
  duration?: number; // in seconds

  @Column({ type: 'int', default: 0 })
  exitCode!: number;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'json', nullable: true })
  environment?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  variables?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  artifacts?: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }>;

  @Column({ type: 'json', nullable: true })
  testResults?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    coverage?: number;
  };

  @Column({ type: 'json', nullable: true })
  resources?: {
    maxCpu?: number;
    maxMemory?: number;
    totalCpuTime?: number;
    networkIO?: number;
    diskIO?: number;
  };

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'varchar', length: 500, nullable: true })
  externalUrl?: string;

  @Column({ type: 'text', nullable: true })
  rawData?: string; // Store original provider data

  // Relations
  @Column({ type: 'uuid' })
  pipelineId!: string;

  @ManyToOne(() => Pipeline, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pipelineId' })
  pipeline!: Pipeline;

  @OneToMany(() => PipelineRunStage, stage => stage.run, { cascade: true })
  stages!: PipelineRunStage[];

  /**
   * Calculate run duration
   */
  calculateDuration(): number {
    if (!this.startedAt || !this.completedAt) {
      return 0;
    }
    return Math.round((this.completedAt.getTime() - this.startedAt.getTime()) / 1000);
  }

  /**
   * Calculate queue time
   */
  calculateQueueTime(): number {
    if (!this.queuedAt || !this.startedAt) {
      return 0;
    }
    return Math.round((this.startedAt.getTime() - this.queuedAt.getTime()) / 1000);
  }

  /**
   * Check if run is successful
   */
  isSuccessful(): boolean {
    return this.status === PipelineStatus.SUCCESS;
  }

  /**
   * Check if run failed
   */
  isFailed(): boolean {
    return [
      PipelineStatus.FAILED,
      PipelineStatus.CANCELLED,
      PipelineStatus.TIMEOUT
    ].includes(this.status);
  }

  /**
   * Check if run is in progress
   */
  isInProgress(): boolean {
    return [
      PipelineStatus.PENDING,
      PipelineStatus.RUNNING
    ].includes(this.status);
  }

  /**
   * Get success rate for test results
   */
  getTestSuccessRate(): number {
    if (!this.testResults || this.testResults.total === 0) {
      return 0;
    }
    return (this.testResults.passed / this.testResults.total) * 100;
  }

  /**
   * Update run statistics
   */
  updateDuration(): void {
    if (this.startedAt && this.completedAt) {
      this.duration = this.calculateDuration();
    }
  }

  /**
   * Mark as completed
   */
  markCompleted(status: PipelineStatus, exitCode: number = 0, errorMessage?: string): void {
    this.status = status;
    this.completedAt = new Date();
    this.exitCode = exitCode;
    if (errorMessage !== undefined) {
      this.errorMessage = errorMessage;
    }
    this.updateDuration();
  }

  /**
   * Mark as started
   */
  markStarted(): void {
    this.status = PipelineStatus.RUNNING;
    this.startedAt = new Date();
  }

  /**
   * Add stage result
   */
  addStageResult(stage: Partial<PipelineRunStage>): PipelineRunStage {
    const newStage = new PipelineRunStage();
    Object.assign(newStage, stage);
    newStage.runId = this.id;
    
    if (!this.stages) {
      this.stages = [];
    }
    this.stages.push(newStage);
    
    return newStage;
  }
}
