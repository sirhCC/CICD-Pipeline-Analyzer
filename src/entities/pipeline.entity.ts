/**
 * Pipeline Entity - Represents a CI/CD pipeline
 */

import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { PipelineProvider, PipelineStatus, PipelineVisibility } from '../types';

@Entity('pipelines')
@Index(['provider', 'externalId'], { unique: true })
@Index(['repository', 'branch'])
@Index(['status'])
@Index(['createdAt'])
export class Pipeline extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ 
    type: 'enum', 
    enum: PipelineProvider,
    enumName: 'pipeline_provider_enum'
  })
  provider!: PipelineProvider;

  @Column({ type: 'varchar', length: 255 })
  externalId!: string;

  @Column({ type: 'varchar', length: 500 })
  repository!: string;

  @Column({ type: 'varchar', length: 255 })
  branch!: string;

  @Column({ 
    type: 'enum', 
    enum: PipelineStatus,
    enumName: 'pipeline_status_enum',
    default: PipelineStatus.UNKNOWN
  })
  status!: PipelineStatus;

  @Column({ 
    type: 'enum', 
    enum: PipelineVisibility,
    enumName: 'pipeline_visibility_enum',
    default: PipelineVisibility.PRIVATE
  })
  visibility!: PipelineVisibility;

  @Column({ type: 'varchar', length: 255, nullable: true })
  owner?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  organization?: string;

  @Column({ type: 'json', nullable: true })
  configuration?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'timestamptz', nullable: true })
  lastRunAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastSuccessAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastFailureAt?: Date;

  @Column({ type: 'int', default: 0 })
  totalRuns!: number;

  @Column({ type: 'int', default: 0 })
  successfulRuns!: number;

  @Column({ type: 'int', default: 0 })
  failedRuns!: number;

  @Column({ type: 'float', nullable: true })
  averageDuration?: number;

  @Column({ type: 'float', nullable: true })
  successRate?: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  isMonitored!: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  webhookUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  webhookSecret?: string;

  // Relations
  @OneToMany('PipelineRun', 'pipeline', { cascade: true })
  runs!: any[];

  /**
   * Calculate and update success rate
   */
  updateSuccessRate(): void {
    if (this.totalRuns === 0) {
      this.successRate = 0;
      return;
    }
    this.successRate = (this.successfulRuns / this.totalRuns) * 100;
  }

  /**
   * Check if pipeline is healthy (success rate above threshold)
   */
  isHealthy(threshold: number = 80): boolean {
    return (this.successRate ?? 0) >= threshold;
  }

  /**
   * Get pipeline URL based on provider
   */
  getExternalUrl(): string | null {
    switch (this.provider) {
      case PipelineProvider.GITHUB_ACTIONS:
        return `https://github.com/${this.repository}/actions`;
      case PipelineProvider.GITLAB_CI:
        return `https://gitlab.com/${this.repository}/-/pipelines`;
      case PipelineProvider.JENKINS:
        return this.metadata?.url || null;
      case PipelineProvider.AZURE_DEVOPS:
        return this.metadata?.url || null;
      case PipelineProvider.CIRCLECI:
        return `https://app.circleci.com/pipelines/github/${this.repository}`;
      default:
        return null;
    }
  }

  /**
   * Update pipeline statistics
   */
  updateStats(duration?: number): void {
    if (duration !== undefined) {
      if (this.averageDuration === undefined) {
        this.averageDuration = duration;
      } else {
        // Exponential moving average
        this.averageDuration = (this.averageDuration * 0.8) + (duration * 0.2);
      }
    }
    
    this.updateSuccessRate();
  }
}

export default Pipeline;
