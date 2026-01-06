/**
 * Base CI/CD Provider Interface
 * Abstract foundation for all CI/CD provider integrations
 */

import type { PipelineProvider } from '../types';
import { PipelineStatus } from '../types';

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  webhookSecret?: string;
  timeout?: number;
  retryAttempts?: number;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}

export interface PipelineData {
  id: string;
  name: string;
  repository: string;
  branch: string;
  status: PipelineStatus;
  startedAt: Date;
  finishedAt?: Date;
  duration?: number;
  triggeredBy: string;
  triggeredEvent: string;
  commitSha: string;
  commitAuthor: string;
  commitMessage?: string;
  runNumber: number;
  jobs?: JobData[];
  artifacts?: ArtifactData[];
  logs?: LogData[];
}

export interface JobData {
  id: string;
  name: string;
  status: PipelineStatus;
  startedAt: Date;
  finishedAt?: Date;
  duration?: number;
  steps?: StepData[];
  runner?: RunnerData;
  resourceUsage?: ResourceUsageData;
}

export interface StepData {
  id: string;
  name: string;
  status: PipelineStatus;
  startedAt: Date;
  finishedAt?: Date;
  duration?: number;
  command?: string;
  output?: string;
  errorOutput?: string;
}

export interface RunnerData {
  id: string;
  name: string;
  os: string;
  arch: string;
  labels?: string[];
  environment?: Record<string, string>;
}

export interface ResourceUsageData {
  cpu?: {
    cores: number;
    usagePercent: number;
    peakUsage: number;
  };
  memory?: {
    totalMb: number;
    usedMb: number;
    peakUsageMb: number;
  };
  disk?: {
    totalGb: number;
    usedGb: number;
    ioReadMb: number;
    ioWriteMb: number;
  };
  network?: {
    downloadMb: number;
    uploadMb: number;
  };
}

export interface ArtifactData {
  id: string;
  name: string;
  type: string;
  sizeBytes: number;
  downloadUrl?: string;
  expiresAt?: Date;
}

export interface LogData {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  source: string;
  jobId?: string;
  stepId?: string;
}

export interface WebhookPayload {
  provider: PipelineProvider;
  event: string;
  data: any;
  signature?: string;
  timestamp: Date;
}

export interface ProviderMetrics {
  apiCallsCount: number;
  apiCallsSuccessRate: number;
  averageResponseTime: number;
  rateLimitRemaining?: number;
  rateLimitReset?: Date;
  lastSyncTime: Date;
  errorCount: number;
  lastError?: string;
}

/**
 * Abstract base class for all CI/CD providers
 */
export abstract class BaseCICDProvider {
  protected config: ProviderConfig;
  protected metrics: ProviderMetrics;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.metrics = {
      apiCallsCount: 0,
      apiCallsSuccessRate: 100,
      averageResponseTime: 0,
      lastSyncTime: new Date(),
      errorCount: 0,
    };
  }

  /**
   * Get the provider type
   */
  abstract getProviderType(): PipelineProvider;

  /**
   * Validate the provider configuration
   */
  abstract validateConfig(): Promise<boolean>;

  /**
   * Test the connection to the provider
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Fetch pipeline data by ID
   */
  abstract fetchPipeline(pipelineId: string): Promise<PipelineData>;

  /**
   * Fetch multiple pipelines for a repository
   */
  abstract fetchPipelines(
    repository: string,
    options?: {
      branch?: string;
      limit?: number;
      since?: Date;
      status?: PipelineStatus[];
    }
  ): Promise<PipelineData[]>;

  /**
   * Fetch pipeline run details
   */
  abstract fetchPipelineRun(pipelineId: string, runId: string): Promise<PipelineData>;

  /**
   * Fetch logs for a specific job or step
   */
  abstract fetchLogs(
    pipelineId: string,
    runId: string,
    jobId?: string,
    stepId?: string
  ): Promise<LogData[]>;

  /**
   * Process webhook payload
   */
  abstract processWebhook(payload: WebhookPayload): Promise<PipelineData | null>;

  /**
   * Verify webhook signature
   */
  abstract verifyWebhookSignature(payload: string, signature: string): boolean;

  /**
   * Get supported webhook events
   */
  abstract getSupportedEvents(): string[];

  /**
   * Setup webhook endpoint
   */
  abstract setupWebhook(
    repository: string,
    webhookUrl: string,
    events: string[]
  ): Promise<{ id: string; secret: string }>;

  /**
   * Get provider-specific metrics
   */
  getMetrics(): ProviderMetrics {
    return { ...this.metrics };
  }

  /**
   * Update provider metrics
   */
  protected updateMetrics(responseTime: number, success: boolean, error?: string): void {
    this.metrics.apiCallsCount++;
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.apiCallsCount - 1) + responseTime) /
      this.metrics.apiCallsCount;

    if (success) {
      this.metrics.apiCallsSuccessRate =
        (this.metrics.apiCallsSuccessRate * (this.metrics.apiCallsCount - 1) + 100) /
        this.metrics.apiCallsCount;
    } else {
      this.metrics.errorCount++;
      if (error) {
        this.metrics.lastError = error;
      }
      this.metrics.apiCallsSuccessRate =
        (this.metrics.apiCallsSuccessRate * (this.metrics.apiCallsCount - 1)) /
        this.metrics.apiCallsCount;
    }

    this.metrics.lastSyncTime = new Date();
  }

  /**
   * Execute API call with metrics tracking
   */
  protected async executeWithMetrics<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await operation();
      this.updateMetrics(Date.now() - startTime, true);
      return result;
    } catch (error) {
      this.updateMetrics(
        Date.now() - startTime,
        false,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  /**
   * Normalize pipeline status across providers
   */
  protected normalizePipelineStatus(providerStatus: string): PipelineStatus {
    const statusMap: Record<string, PipelineStatus> = {
      // Common status mappings
      success: PipelineStatus.SUCCESS,
      completed: PipelineStatus.SUCCESS,
      passed: PipelineStatus.SUCCESS,
      failed: PipelineStatus.FAILED,
      failure: PipelineStatus.FAILED,
      error: PipelineStatus.FAILED,
      running: PipelineStatus.RUNNING,
      in_progress: PipelineStatus.RUNNING,
      pending: PipelineStatus.PENDING,
      queued: PipelineStatus.PENDING,
      waiting: PipelineStatus.PENDING,
      cancelled: PipelineStatus.CANCELLED,
      canceled: PipelineStatus.CANCELLED,
      skipped: PipelineStatus.SKIPPED,
      timeout: PipelineStatus.TIMEOUT,
      timed_out: PipelineStatus.TIMEOUT,
    };

    return statusMap[providerStatus.toLowerCase()] || PipelineStatus.UNKNOWN;
  }

  /**
   * Parse duration from various formats
   */
  protected parseDuration(startTime: string | Date, endTime?: string | Date): number | undefined {
    if (!endTime) return undefined;

    const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
    const end = typeof endTime === 'string' ? new Date(endTime) : endTime;

    return Math.max(0, end.getTime() - start.getTime());
  }

  /**
   * Sanitize sensitive data from logs
   */
  protected sanitizeData(data: any): any {
    const sensitiveKeys = [
      'password',
      'token',
      'key',
      'secret',
      'credential',
      'auth',
      'authorization',
      'bearer',
      'api_key',
    ];

    if (typeof data === 'string') {
      // Mask potential secrets in strings
      return data.replace(
        /([a-zA-Z0-9_-]*(?:password|token|key|secret)[a-zA-Z0-9_-]*\s*[:=]\s*)([^\s\n]+)/gi,
        '$1***'
      );
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized = Array.isArray(data) ? [] : {};

      for (const [key, value] of Object.entries(data)) {
        const isSensitive = sensitiveKeys.some(sensitiveKey =>
          key.toLowerCase().includes(sensitiveKey)
        );

        if (isSensitive) {
          (sanitized as any)[key] = '***';
        } else {
          (sanitized as any)[key] = this.sanitizeData(value);
        }
      }

      return sanitized;
    }

    return data;
  }
}
