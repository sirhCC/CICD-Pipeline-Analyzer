/**
 * GitHub Actions Provider Implementation
 * Integrates with GitHub Actions API for pipeline data collection
 */
import { BaseCICDProvider, ProviderConfig, PipelineData, LogData, WebhookPayload } from './base.provider';
import { PipelineProvider, PipelineStatus } from '../types';
export interface GitHubActionsConfig extends ProviderConfig {
    apiKey: string;
    baseUrl?: string;
    webhookSecret?: string;
    timeout?: number;
    owner?: string;
    repo?: string;
}
/**
 * GitHub Actions Provider
 */
export declare class GitHubActionsProvider extends BaseCICDProvider {
    private client;
    private logger;
    protected config: GitHubActionsConfig;
    constructor(config: GitHubActionsConfig);
    getProviderType(): PipelineProvider;
    validateConfig(): Promise<boolean>;
    testConnection(): Promise<boolean>;
    fetchPipeline(pipelineId: string): Promise<PipelineData>;
    fetchPipelines(repository: string, options?: {
        branch?: string;
        limit?: number;
        since?: Date;
        status?: PipelineStatus[];
    }): Promise<PipelineData[]>;
    fetchPipelineRun(pipelineId: string, runId: string): Promise<PipelineData>;
    fetchLogs(pipelineId: string, runId: string, jobId?: string, stepId?: string): Promise<LogData[]>;
    processWebhook(payload: WebhookPayload): Promise<PipelineData | null>;
    verifyWebhookSignature(payload: string, signature: string): boolean;
    getSupportedEvents(): string[];
    setupWebhook(repository: string, webhookUrl: string, events: string[]): Promise<{
        id: string;
        secret: string;
    }>;
    private getOwnerRepo;
    private transformWorkflowRun;
    private mapStatusesToGitHub;
    private parseJobLogs;
}
//# sourceMappingURL=github-actions.provider.d.ts.map