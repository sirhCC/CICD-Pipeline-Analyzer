/**
 * GitHub Actions Provider Implementation
 * Integrates with GitHub Actions API for pipeline data collection
 */

import { BaseCICDProvider, ProviderConfig, PipelineData, JobData, StepData, LogData, WebhookPayload } from './base.provider';
import { PipelineProvider, PipelineStatus } from '../types';
import { Logger } from '../shared/logger';
import axios from 'axios';
import * as crypto from 'crypto';

export interface GitHubActionsConfig extends ProviderConfig {
  apiKey: string; // GitHub Personal Access Token
  baseUrl?: string; // Default: https://api.github.com
  webhookSecret?: string; // Webhook secret for signature verification
  timeout?: number; // Request timeout in milliseconds
  owner?: string; // Repository owner
  repo?: string; // Repository name
}

interface GitHubWorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  head_sha: string;
  path: string;
  display_title: string;
  run_number: number;
  event: string;
  status: string;
  conclusion: string | null;
  workflow_id: number;
  check_suite_id: number;
  check_suite_node_id: string;
  url: string;
  html_url: string;
  pull_requests: any[];
  created_at: string;
  updated_at: string;
  actor: {
    login: string;
    id: number;
    avatar_url: string;
    type: string;
  };
  run_attempt: number;
  referenced_workflows: any[];
  run_started_at: string;
  triggering_actor: {
    login: string;
    id: number;
    avatar_url: string;
    type: string;
  };
  jobs_url: string;
  logs_url: string;
  check_suite_url: string;
  artifacts_url: string;
  cancel_url: string;
  rerun_url: string;
  previous_attempt_url: string | null;
  workflow_url: string;
  head_commit: {
    id: string;
    tree_id: string;
    message: string;
    timestamp: string;
    author: {
      name: string;
      email: string;
    };
    committer: {
      name: string;
      email: string;
    };
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
      id: number;
      avatar_url: string;
      type: string;
    };
    private: boolean;
    html_url: string;
    description: string;
    fork: boolean;
    url: string;
  };
}

interface GitHubJob {
  id: number;
  run_id: number;
  run_url: string;
  run_attempt: number;
  node_id: string;
  head_sha: string;
  url: string;
  html_url: string;
  status: string;
  conclusion: string | null;
  started_at: string;
  completed_at: string | null;
  name: string;
  steps: GitHubStep[];
  check_run_url: string;
  labels: string[];
  runner_id: number | null;
  runner_name: string | null;
  runner_group_id: number | null;
  runner_group_name: string | null;
}

interface GitHubStep {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
  started_at: string | null;
  completed_at: string | null;
}

/**
 * GitHub Actions Provider
 */
export class GitHubActionsProvider extends BaseCICDProvider {
  private client: any;
  private logger: Logger;
  protected config: GitHubActionsConfig;

  constructor(config: GitHubActionsConfig) {
    super(config);
    this.config = config;
    this.logger = new Logger('GitHubActionsProvider');

    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.github.com',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CICD-Pipeline-Analyzer/1.0.0',
      },
      timeout: config.timeout || 30000,
    });

    // Add request/response interceptors for metrics
    this.client.interceptors.request.use((config: any) => {
      (config as any).metadata = { startTime: Date.now() };
      return config;
    });

    this.client.interceptors.response.use(
      (response: any) => {
        const duration = Date.now() - ((response.config as any).metadata?.startTime || 0);
        this.updateMetrics(duration, true);
        return response;
      },
      (error: any) => {
        const duration = Date.now() - ((error.config as any)?.metadata?.startTime || 0);
        this.updateMetrics(duration, false, error.message);
        return Promise.reject(error);
      }
    );
  }

  getProviderType(): PipelineProvider {
    return PipelineProvider.GITHUB_ACTIONS;
  }

  async validateConfig(): Promise<boolean> {
    try {
      const response = await this.client.get('/user');
      return response.status === 200;
    } catch (error) {
      this.logger.error('Config validation failed', { error });
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/rate_limit');
      return response.status === 200;
    } catch (error) {
      this.logger.error('Connection test failed', { error });
      return false;
    }
  }

  async fetchPipeline(pipelineId: string): Promise<PipelineData> {
    return this.executeWithMetrics(async () => {
      // For GitHub Actions, pipelineId is actually a workflow run ID
      const [owner, repo] = this.getOwnerRepo();
      const response = await this.client.get(`/repos/${owner}/${repo}/actions/runs/${pipelineId}`);
      
      return this.transformWorkflowRun(response.data);
    });
  }

  async fetchPipelines(
    repository: string,
    options?: {
      branch?: string;
      limit?: number;
      since?: Date;
      status?: PipelineStatus[];
    }
  ): Promise<PipelineData[]> {
    return this.executeWithMetrics(async () => {
      const [owner, repo] = repository.split('/');
      const params: any = {
        per_page: options?.limit || 30,
      };

      if (options?.branch) {
        params.branch = options.branch;
      }

      if (options?.since) {
        params.created = `>=${options.since.toISOString()}`;
      }

      if (options?.status) {
        // GitHub Actions uses different status values
        params.status = this.mapStatusesToGitHub(options.status);
      }

      const response = await this.client.get(`/repos/${owner}/${repo}/actions/runs`, { params });
      
      return response.data.workflow_runs.map((run: GitHubWorkflowRun) => 
        this.transformWorkflowRun(run)
      );
    });
  }

  async fetchPipelineRun(pipelineId: string, runId: string): Promise<PipelineData> {
    // For GitHub Actions, pipelineId and runId are the same since runs are top-level
    return this.fetchPipeline(runId);
  }

  async fetchLogs(
    pipelineId: string,
    runId: string,
    jobId?: string,
    stepId?: string
  ): Promise<LogData[]> {
    return this.executeWithMetrics(async () => {
      const [owner, repo] = this.getOwnerRepo();
      
      if (jobId) {
        // Fetch logs for specific job
        const response = await this.client.get(
          `/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`,
          { responseType: 'text' }
        );
        
        return this.parseJobLogs(response.data, jobId, stepId);
      } else {
        // Fetch logs for entire workflow run
        const response = await this.client.get(
          `/repos/${owner}/${repo}/actions/runs/${runId}/logs`,
          { responseType: 'arraybuffer' }
        );
        
        // GitHub returns logs as a zip file, we'd need to extract and parse
        // For now, return empty array - this would need zip extraction logic
        return [];
      }
    });
  }

  async processWebhook(payload: WebhookPayload): Promise<PipelineData | null> {
    try {
      if (payload.event === 'workflow_run') {
        const workflowRun = payload.data.workflow_run;
        return this.transformWorkflowRun(workflowRun);
      }
      return null;
    } catch (error) {
      this.logger.error('Failed to process webhook', { error, payload });
      return null;
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(`sha256=${expectedSignature}`),
      Buffer.from(signature)
    );
  }

  getSupportedEvents(): string[] {
    return [
      'workflow_run',
      'workflow_job',
      'check_run',
      'check_suite',
    ];
  }

  async setupWebhook(
    repository: string,
    webhookUrl: string,
    events: string[]
  ): Promise<{ id: string; secret: string }> {
    return this.executeWithMetrics(async () => {
      const [owner, repo] = repository.split('/');
      const secret = crypto.randomBytes(32).toString('hex');

      const response = await this.client.post(`/repos/${owner}/${repo}/hooks`, {
        name: 'web',
        active: true,
        events,
        config: {
          url: webhookUrl,
          content_type: 'json',
          secret,
          insecure_ssl: '0',
        },
      });

      return {
        id: response.data.id.toString(),
        secret,
      };
    });
  }

  private getOwnerRepo(): [string, string] {
    if (this.config.owner && this.config.repo) {
      return [this.config.owner, this.config.repo];
    }
    throw new Error('Owner and repo must be configured for GitHub Actions provider');
  }

  private transformWorkflowRun(run: GitHubWorkflowRun): PipelineData {
    const finishedAt = run.updated_at ? new Date(run.updated_at) : undefined;
    
    const result: any = {
      id: run.id.toString(),
      name: run.name || run.display_title,
      repository: run.repository.full_name,
      branch: run.head_branch,
      status: this.normalizePipelineStatus(run.status === 'completed' ? run.conclusion || 'unknown' : run.status),
      startedAt: new Date(run.run_started_at),
      triggeredBy: run.triggering_actor.login,
      triggeredEvent: run.event,
      commitSha: run.head_sha,
      commitAuthor: run.head_commit.author.name,
      commitMessage: run.head_commit.message,
      runNumber: run.run_number,
      jobs: [], // Would need additional API call to fetch jobs
    };

    if (finishedAt) {
      result.finishedAt = finishedAt;
    }

    const duration = this.parseDuration(run.run_started_at, run.updated_at);
    if (duration !== undefined) {
      result.duration = duration;
    }

    return result as PipelineData;
  }

  private mapStatusesToGitHub(statuses: PipelineStatus[]): string {
    // GitHub Actions status mapping
    const statusMap: Record<PipelineStatus, string> = {
      [PipelineStatus.PENDING]: 'queued',
      [PipelineStatus.RUNNING]: 'in_progress',
      [PipelineStatus.SUCCESS]: 'completed',
      [PipelineStatus.FAILED]: 'completed',
      [PipelineStatus.CANCELLED]: 'completed',
      [PipelineStatus.SKIPPED]: 'completed',
      [PipelineStatus.TIMEOUT]: 'completed',
      [PipelineStatus.UNKNOWN]: 'completed',
    };

    // For now, just return the first mapped status
    if (statuses.length > 0) {
      const firstStatus = statuses[0];
      return firstStatus && statusMap[firstStatus] ? statusMap[firstStatus] : 'completed';
    }
    return 'completed';
  }

  private parseJobLogs(logText: string, jobId: string, stepId?: string): LogData[] {
    const logs: LogData[] = [];
    const lines = logText.split('\n');

    for (const line of lines) {
      // Parse GitHub Actions log format: timestamp level message
      const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+(.+)$/);
      if (match && match[1] && match[2]) {
        const logEntry: LogData = {
          timestamp: new Date(match[1]),
          level: 'info', // GitHub doesn't provide detailed log levels
          message: match[2],
          source: 'github-actions',
          jobId,
        };
        
        if (stepId) {
          logEntry.stepId = stepId;
        }
        
        logs.push(logEntry);
      }
    }

    return logs;
  }
}
