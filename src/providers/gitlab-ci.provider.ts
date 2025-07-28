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
  LogData,
  WebhookPayload,
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
  private gitlabConfig: GitLabConfig;

  constructor(config: GitLabConfig) {
    super(config);
    this.gitlabConfig = config;
    
    // Initialize GitLab API client
    this.client = axios.create({
      baseURL: this.gitlabConfig.baseUrl || 'https://gitlab.com/api/v4',
      headers: {
        'Private-Token': this.gitlabConfig.token || this.gitlabConfig.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: this.gitlabConfig.timeout || 30000,
    });

    logger.info('GitLab CI provider initialized', {
      baseUrl: this.gitlabConfig.baseUrl,
      hasToken: !!(this.gitlabConfig.token || this.gitlabConfig.apiKey)
    });
  }

  getProviderType(): PipelineProvider {
    return PipelineProvider.GITLAB_CI;
  }

  async validateConfig(): Promise<boolean> {
    try {
      if (!this.gitlabConfig.token && !this.gitlabConfig.apiKey) {
        throw new Error('GitLab token is required');
      }

      if (!this.gitlabConfig.baseUrl) {
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
      const projectId = repository || this.gitlabConfig.projectId;
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
      
      const pipelineData: PipelineData = {
        id: runId,
        name: job.name,
        repository: projectId || '',
        branch: 'unknown',
        status: job.status,
        startedAt: job.startedAt,
        triggeredBy: 'system',
        triggeredEvent: 'job',
        commitSha: 'unknown',
        commitAuthor: 'unknown',
        runNumber: parseInt(runId) || 0,
        jobs: [job]
      };

      if (job.finishedAt) {
        pipelineData.finishedAt = job.finishedAt;
      }

      if (job.duration) {
        pipelineData.duration = job.duration;
      }

      return pipelineData;
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

  async fetchLogs(pipelineId: string, runId: string): Promise<LogData[]> {
    try {
      const [projectId] = pipelineId.split(':');
      const response = await this.client.get(`/projects/${projectId}/jobs/${runId}/trace`);
      
      // Convert raw log text to LogData format
      const logText = response.data || '';
      const logLines = logText.split('\n').filter((line: string) => line.trim());
      
      return logLines.map((line: string, index: number) => ({
        timestamp: new Date(),
        level: this.detectLogLevel(line),
        message: line,
        source: 'gitlab-ci',
        jobId: runId,
        stepId: undefined
      }));
    } catch {
      return [];
    }
  }

  private detectLogLevel(logLine: string): 'debug' | 'info' | 'warn' | 'error' {
    const lowerLine = logLine.toLowerCase();
    if (lowerLine.includes('error') || lowerLine.includes('fail')) return 'error';
    if (lowerLine.includes('warn')) return 'warn';
    if (lowerLine.includes('debug')) return 'debug';
    return 'info';
  }

  async processWebhook(payload: WebhookPayload): Promise<PipelineData | null> {
    try {
      logger.info('Processing GitLab webhook', { 
        event: payload.event,
        provider: payload.provider 
      });
      
      // Basic webhook processing - would need to parse GitLab webhook format
      if (payload.event === 'pipeline' && payload.data) {
        // Transform GitLab webhook data to PipelineData
        return this.transformWebhookToPipelineData(payload.data);
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to process GitLab webhook', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  private transformWebhookToPipelineData(webhookData: any): PipelineData {
    const pipelineData: PipelineData = {
      id: `${webhookData.project?.id}:${webhookData.id}`,
      name: `Pipeline #${webhookData.id}`,
      repository: webhookData.project?.id?.toString() || 'unknown',
      branch: webhookData.ref || 'unknown',
      status: this.mapStatus(webhookData.status || 'unknown'),
      startedAt: new Date(webhookData.created_at || Date.now()),
      triggeredBy: webhookData.user?.username || 'unknown',
      triggeredEvent: 'webhook',
      commitSha: webhookData.sha || 'unknown',
      commitAuthor: webhookData.user?.username || 'unknown',
      runNumber: webhookData.id || 0,
      jobs: [],
      artifacts: [],
      logs: []
    };

    if (webhookData.finished_at) {
      pipelineData.finishedAt = new Date(webhookData.finished_at);
    }

    if (webhookData.duration) {
      pipelineData.duration = webhookData.duration;
    }

    return pipelineData;
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    // GitLab webhook signature verification would go here
    return true;
  }

  getSupportedEvents(): string[] {
    return ['push', 'pipeline', 'job', 'merge_request'];
  }

  async setupWebhook(repository: string, webhookUrl: string, events: string[]): Promise<{ id: string; secret: string }> {
    try {
      const projectId = repository;
      const response = await this.client.post(`/projects/${projectId}/hooks`, {
        url: webhookUrl,
        pipeline_events: events.includes('pipeline'),
        job_events: events.includes('job'),
        push_events: events.includes('push'),
        merge_requests_events: events.includes('merge_request')
      });

      logger.info('Created GitLab webhook', {
        repository,
        webhookUrl,
        webhookId: response.data.id
      });

      return {
        id: response.data.id.toString(),
        secret: this.gitlabConfig.webhookSecret || 'no-secret'
      };
    } catch (error) {
      logger.error('Failed to create GitLab webhook', {
        error: error instanceof Error ? error.message : String(error),
        repository
      });
      throw error;
    }
  }

  getMetrics(): ProviderMetrics {
    return {
      apiCallsCount: 0,
      apiCallsSuccessRate: 100,
      averageResponseTime: 0,
      lastSyncTime: new Date(),
      errorCount: 0,
      rateLimitRemaining: 1000
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

  private transformPipeline(gitlabPipeline: GitLabPipeline, projectId: string): PipelineData {
    const pipelineData: PipelineData = {
      id: `${projectId}:${gitlabPipeline.id}`,
      name: `Pipeline #${gitlabPipeline.id}`,
      repository: projectId,
      branch: gitlabPipeline.ref,
      status: this.mapStatus(gitlabPipeline.status),
      startedAt: new Date(gitlabPipeline.created_at),
      triggeredBy: gitlabPipeline.user?.username || 'unknown',
      triggeredEvent: 'push',
      commitSha: gitlabPipeline.sha,
      commitAuthor: gitlabPipeline.user?.username || 'unknown',
      runNumber: gitlabPipeline.id,
      jobs: [],
      artifacts: [],
      logs: []
    };

    // Only add finishedAt if it exists
    if (gitlabPipeline.updated_at) {
      pipelineData.finishedAt = new Date(gitlabPipeline.updated_at);
    }

    return pipelineData;
  }

  private transformJob(gitlabJob: GitLabJob): JobData {
    const jobData: JobData = {
      id: gitlabJob.id.toString(),
      name: gitlabJob.name,
      status: this.mapStatus(gitlabJob.status),
      startedAt: gitlabJob.started_at ? new Date(gitlabJob.started_at) : new Date(gitlabJob.created_at),
      steps: []
    };

    // Only add optional fields if they exist
    if (gitlabJob.finished_at) {
      jobData.finishedAt = new Date(gitlabJob.finished_at);
    }

    if (gitlabJob.duration) {
      jobData.duration = gitlabJob.duration;
    }

    return jobData;
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
