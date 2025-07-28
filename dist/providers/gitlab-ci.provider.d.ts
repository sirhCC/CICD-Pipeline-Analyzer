/**
 * GitLab CI/CD Provider Implementation
 * Implements the CI/CD provider abstraction for GitLab pipelines
 */
import { BaseCICDProvider } from './base.provider';
import { PipelineProvider, PipelineStatus } from '../types';
import type { ProviderConfig, PipelineData, JobData, LogData, WebhookPayload, ProviderMetrics } from './base.provider';
interface GitLabConfig extends ProviderConfig {
    baseUrl: string;
    token: string;
    projectId?: string;
}
export declare class GitLabCIProvider extends BaseCICDProvider {
    private client;
    private gitlabConfig;
    constructor(config: GitLabConfig);
    getProviderType(): PipelineProvider;
    validateConfig(): Promise<boolean>;
    testConnection(): Promise<boolean>;
    fetchPipelines(repository: string, options?: {
        branch?: string;
        limit?: number;
        since?: Date;
        status?: PipelineStatus[];
    }): Promise<PipelineData[]>;
    fetchPipeline(pipelineId: string): Promise<PipelineData>;
    fetchPipelineRun(pipelineId: string, runId: string): Promise<PipelineData>;
    getPipelineRuns(pipelineId: string, options?: {
        limit?: number;
        since?: Date;
    }): Promise<JobData[]>;
    fetchLogs(pipelineId: string, runId: string): Promise<LogData[]>;
    private detectLogLevel;
    processWebhook(payload: WebhookPayload): Promise<PipelineData | null>;
    private transformWebhookToPipelineData;
    verifyWebhookSignature(payload: string, signature: string): boolean;
    getSupportedEvents(): string[];
    setupWebhook(repository: string, webhookUrl: string, events: string[]): Promise<{
        id: string;
        secret: string;
    }>;
    getMetrics(): ProviderMetrics;
    syncRepository(repository: string): Promise<boolean>;
    private transformPipeline;
    private transformJob;
    private mapStatus;
}
export {};
//# sourceMappingURL=gitlab-ci.provider.d.ts.map