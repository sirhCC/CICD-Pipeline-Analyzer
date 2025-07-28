"use strict";
/**
 * GitLab CI/CD Provider Implementation
 * Implements the CI/CD provider abstraction for GitLab pipelines
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitLabCIProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const base_provider_1 = require("./base.provider");
const types_1 = require("../types");
const logger_1 = require("../shared/logger");
const logger = new logger_1.Logger('GitLabCIProvider');
class GitLabCIProvider extends base_provider_1.BaseCICDProvider {
    client;
    config;
    constructor(config) {
        super(config);
        this.config = config;
        // Initialize GitLab API client
        this.client = axios_1.default.create({
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
    getProviderType() {
        return types_1.PipelineProvider.GITLAB_CI;
    }
    async validateConfig() {
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
        }
        catch (error) {
            logger.error('GitLab CI configuration validation failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }
    async testConnection() {
        try {
            const response = await this.client.get('/user');
            return response.status === 200;
        }
        catch {
            return false;
        }
    }
    async fetchPipelines(repository, options = {}) {
        try {
            const projectId = repository || this.config.projectId;
            if (!projectId) {
                throw new Error('Project ID is required');
            }
            const params = {
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
            const pipelines = response.data.map((pipeline) => this.transformPipeline(pipeline, projectId));
            logger.info('Fetched GitLab pipelines', {
                count: pipelines.length,
                projectId
            });
            return pipelines;
        }
        catch (error) {
            logger.error('Failed to fetch GitLab pipelines', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async fetchPipeline(pipelineId) {
        try {
            const [projectId, gitlabPipelineId] = pipelineId.split(':');
            const response = await this.client.get(`/projects/${projectId}/pipelines/${gitlabPipelineId}`);
            return this.transformPipeline(response.data, projectId || '');
        }
        catch (error) {
            logger.error('Failed to fetch GitLab pipeline', {
                error: error instanceof Error ? error.message : String(error),
                pipelineId
            });
            throw error;
        }
    }
    async fetchPipelineRun(pipelineId, runId) {
        try {
            const [projectId] = pipelineId.split(':');
            const response = await this.client.get(`/projects/${projectId}/jobs/${runId}`);
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
        }
        catch (error) {
            logger.error('Failed to fetch GitLab job', {
                error: error instanceof Error ? error.message : String(error),
                runId
            });
            throw error;
        }
    }
    async getPipelineRuns(pipelineId, options = {}) {
        try {
            const [projectId, gitlabPipelineId] = pipelineId.split(':');
            const response = await this.client.get(`/projects/${projectId}/pipelines/${gitlabPipelineId}/jobs`, {
                params: {
                    per_page: options.limit || 100
                }
            });
            return response.data.map((job) => this.transformJob(job));
        }
        catch (error) {
            logger.error('Failed to fetch GitLab pipeline runs', {
                error: error instanceof Error ? error.message : String(error),
                pipelineId
            });
            return [];
        }
    }
    async fetchLogs(pipelineId, runId) {
        try {
            const [projectId] = pipelineId.split(':');
            const response = await this.client.get(`/projects/${projectId}/jobs/${runId}/trace`);
            return [response.data || ''];
        }
        catch {
            return [];
        }
    }
    async processWebhook(payload) {
        try {
            logger.info('Processing GitLab webhook', { payload });
            return true;
        }
        catch {
            return false;
        }
    }
    verifyWebhookSignature(payload, signature) {
        // GitLab webhook signature verification would go here
        return true;
    }
    getSupportedEvents() {
        return ['push', 'pipeline', 'job', 'merge_request'];
    }
    async setupWebhook(repository, webhookUrl) {
        return this.createWebhook(repository, webhookUrl);
    }
    getMetrics() {
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
    async syncRepository(repository) {
        try {
            const pipelines = await this.fetchPipelines(repository, { limit: 10 });
            logger.info('Synced GitLab repository', {
                repository,
                pipelineCount: pipelines.length
            });
            return true;
        }
        catch (error) {
            logger.error('Failed to sync GitLab repository', {
                error: error instanceof Error ? error.message : String(error),
                repository
            });
            return false;
        }
    }
    async createWebhook(repository, webhookUrl) {
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
        }
        catch (error) {
            logger.error('Failed to create GitLab webhook', {
                error: error instanceof Error ? error.message : String(error),
                repository
            });
            return false;
        }
    }
    transformPipeline(gitlabPipeline, projectId) {
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
    transformJob(gitlabJob) {
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
    mapStatus(gitlabStatus) {
        switch (gitlabStatus.toLowerCase()) {
            case 'success':
                return types_1.PipelineStatus.SUCCESS;
            case 'failed':
                return types_1.PipelineStatus.FAILED;
            case 'canceled':
            case 'cancelled':
                return types_1.PipelineStatus.CANCELLED;
            case 'running':
                return types_1.PipelineStatus.RUNNING;
            case 'pending':
            case 'created':
                return types_1.PipelineStatus.PENDING;
            case 'skipped':
                return types_1.PipelineStatus.SKIPPED;
            default:
                return types_1.PipelineStatus.UNKNOWN;
        }
    }
}
exports.GitLabCIProvider = GitLabCIProvider;
//# sourceMappingURL=gitlab-ci.provider.js.map