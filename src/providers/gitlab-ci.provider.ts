/**
 * GitLab CI/CD Provider Implementation
 * Implements the CI/CD provider abstraction for GitLab pipelines
 */

import axios from 'axios';
import { BaseCICDProvider } from './base.provider';
import {
  PipelineProvider,
  PipelineStatus
} from '../types';
import type {
  ProviderConfig,
  PipelineData,
  JobData,
  ProviderMetrics
} from './base.provider';
import { Logger } from '../shared/logger';

const logger = new Logger('GitLabCIProvider');

interface GitLabConfig extends ProviderConfig {
  baseUrl: string;
  token: string;
  projectId?: string;
}

interface GitLabPipeline {
  id: number;
  project_id: number;
  sha: string;
  ref: string;
  status: string;
  created_at: string;
  updated_at: string;
  web_url: string;
  user: {
    id: number;
    username: string;
  };
}

interface GitLabJob {
  id: number;
  status: string;
  stage: string;
  name: string;
  ref: string;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  duration?: number;
  web_url: string;
}

export class GitLabCIProvider extends BaseCICDProvider {
  private client: any;
  private config: GitLabConfig;

  constructor(config: GitLabConfig) {
    super(config);
    this.config = config;
    
    // Initialize GitLab API client
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://gitlab.com/api/v4',
      headers: {
        'Private-Token': config.token || config.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: config.timeout || 30000,
    });

    logger.info('GitLab CI provider initialized', {
      baseUrl: this.config.baseUrl,
      hasToken: !!(this.config.token || this.config.apiKey)
    });
  }

  getProviderType(): PipelineProvider {
    return PipelineProvider.GITLAB_CI;
  }

  async validateConfig(): Promise<boolean> {
    try {
      if (!this.config.token && !this.config.apiKey) {
        throw new Error('GitLab token is required');
      }

      if (!this.config.baseUrl) {
        throw new Error('GitLab base URL is required');
      }

      // Test API connection
      const response = await this.client.get('/user');
      
      logger.info('GitLab CI configuration validated successfully', {
        userId: response.data.id,
        username: response.data.username
      });

      return true;
    } catch (error) {
      logger.error('GitLab CI configuration validation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/user');
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async fetchPipelines(repository: string, options: {
    branch?: string;
    limit?: number;
    since?: Date;
    status?: PipelineStatus[];
  } = {}): Promise<PipelineData[]> {
    try {
      const projectId = repository || this.config.projectId;
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      const params: any = {
        per_page: options.limit || 100,
        order_by: 'updated_at',
        sort: 'desc'
      };

      if (options.branch) {
        params.ref = options.branch;
      }

      if (options.since) {
        params.updated_after = options.since.toISOString();
      }

      const response = await this.client.get(`/projects/${projectId}/pipelines`, {
        params
      });

      const pipelines = response.data.map((pipeline: GitLabPipeline) => 
        this.transformPipeline(pipeline, projectId)
      );

      logger.info('Fetched GitLab pipelines', {
        count: pipelines.length,
        projectId
      });

      return pipelines;
    } catch (error) {
      logger.error('Failed to fetch GitLab pipelines', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async fetchPipeline(pipelineId: string): Promise<PipelineData> {
    try {
      const [projectId, gitlabPipelineId] = pipelineId.split(':');
      
      const response = await this.client.get(
        `/projects/${projectId}/pipelines/${gitlabPipelineId}`
      );

      return this.transformPipeline(response.data, projectId || '');
    } catch (error) {
      logger.error('Failed to fetch GitLab pipeline', {
        error: error instanceof Error ? error.message : String(error),
        pipelineId
      });
      throw error;
    }
  }

  async fetchPipelineRun(pipelineId: string, runId: string): Promise<PipelineData> {
    try {
      const [projectId] = pipelineId.split(':');
      
      const response = await this.client.get(
        `/projects/${projectId}/jobs/${runId}`
      );

      // For GitLab, a "run" is actually a job, so we return job details as pipeline data
      const job = this.transformJob(response.data);
      
      return {
        id: runId,
        name: job.name,
        repository: projectId || '',
        branch: 'unknown',
        status: job.status,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt || new Date(),
        duration: job.duration,
        triggeredBy: 'system',
        triggeredEvent: 'job',
        commitSha: 'unknown',
        commitAuthor: 'unknown',
        runNumber: parseInt(runId) || 0,
        jobs: [job]
      };
    } catch (error) {
      logger.error('Failed to fetch GitLab job', {
        error: error instanceof Error ? error.message : String(error),
        runId
      });
      throw error;
    }
  }

  async getPipelineRuns(pipelineId: string, options: {
    limit?: number;
    since?: Date;
  } = {}): Promise<JobData[]> {
    try {
      const [projectId, gitlabPipelineId] = pipelineId.split(':');
      
      const response = await this.client.get(
        `/projects/${projectId}/pipelines/${gitlabPipelineId}/jobs`,
        {
          params: {
            per_page: options.limit || 100
          }
        }
      );

      return response.data.map((job: GitLabJob) => this.transformJob(job));
    } catch (error) {
      logger.error('Failed to fetch GitLab pipeline runs', {
        error: error instanceof Error ? error.message : String(error),
        pipelineId
      });
      return [];
    }
  }

  async fetchLogs(pipelineId: string, runId: string): Promise<string[]> {
    try {
      const [projectId] = pipelineId.split(':');
      const response = await this.client.get(`/projects/${projectId}/jobs/${runId}/trace`);
      return [response.data || ''];
    } catch {
      return [];
    }
  }

  async processWebhook(payload: any): Promise<boolean> {
    try {
      logger.info('Processing GitLab webhook', { payload });
      return true;
    } catch {
      return false;
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    // GitLab webhook signature verification would go here
    return true;
  }

  getSupportedEvents(): string[] {
    return ['push', 'pipeline', 'job', 'merge_request'];
  }

  async setupWebhook(repository: string, webhookUrl: string): Promise<boolean> {
    return this.createWebhook(repository, webhookUrl);
  }

  getMetrics(): ProviderMetrics {
    return {
      apiCallsCount: 0,
      apiCallsSuccessRate: 100,
      averageResponseTime: 0,
      lastSyncTime: new Date(),
      errorCount: 0,
      rateLimitRemaining: 1000,
      quotaUsage: 0
    };
  }

  async syncRepository(repository: string): Promise<boolean> {
    try {
      const pipelines = await this.fetchPipelines(repository, { limit: 10 });
      logger.info('Synced GitLab repository', {
        repository,
        pipelineCount: pipelines.length
      });
      return true;
    } catch (error) {
      logger.error('Failed to sync GitLab repository', {
        error: error instanceof Error ? error.message : String(error),
        repository
      });
      return false;
    }
  }

  async createWebhook(repository: string, webhookUrl: string): Promise<boolean> {
    try {
      const projectId = repository;
      await this.client.post(`/projects/${projectId}/hooks`, {
        url: webhookUrl,
        pipeline_events: true,
        job_events: true,
        push_events: true,
        merge_requests_events: true
      });

      logger.info('Created GitLab webhook', {
        repository,
        webhookUrl
      });
      return true;
    } catch (error) {
      logger.error('Failed to create GitLab webhook', {
        error: error instanceof Error ? error.message : String(error),
        repository
      });
      return false;
    }
  }

  private transformPipeline(gitlabPipeline: GitLabPipeline, projectId: string): PipelineData {
    return {
      id: `${projectId}:${gitlabPipeline.id}`,
      name: `Pipeline #${gitlabPipeline.id}`,
      repository: projectId,
      branch: gitlabPipeline.ref,
      status: this.mapStatus(gitlabPipeline.status),
      startedAt: new Date(gitlabPipeline.created_at),
      finishedAt: gitlabPipeline.updated_at ? new Date(gitlabPipeline.updated_at) : undefined,
      duration: undefined,
      triggeredBy: gitlabPipeline.user?.username || 'unknown',
      triggeredEvent: 'push',
      commitSha: gitlabPipeline.sha,
      commitAuthor: gitlabPipeline.user?.username || 'unknown',
      commitMessage: undefined,
      runNumber: gitlabPipeline.id,
      jobs: [],
      artifacts: [],
      logs: []
    };
  }

  private transformJob(gitlabJob: GitLabJob): JobData {
    return {
      id: gitlabJob.id.toString(),
      name: gitlabJob.name,
      status: this.mapStatus(gitlabJob.status),
      startedAt: gitlabJob.started_at ? new Date(gitlabJob.started_at) : new Date(gitlabJob.created_at),
      finishedAt: gitlabJob.finished_at ? new Date(gitlabJob.finished_at) : undefined,
      duration: gitlabJob.duration || undefined,
      steps: [],
      runner: undefined,
      resourceUsage: undefined
    };
  }

  private mapStatus(gitlabStatus: string): PipelineStatus {
    switch (gitlabStatus.toLowerCase()) {
      case 'success':
        return PipelineStatus.SUCCESS;
      case 'failed':
        return PipelineStatus.FAILED;
      case 'canceled':
      case 'cancelled':
        return PipelineStatus.CANCELLED;
      case 'running':
        return PipelineStatus.RUNNING;
      case 'pending':
      case 'created':
        return PipelineStatus.PENDING;
      case 'skipped':
        return PipelineStatus.SKIPPED;
      default:
        return PipelineStatus.UNKNOWN;
    }
  }
}
