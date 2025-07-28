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
    gitlabConfig;
    constructor(config) {
        super(config);
        this.gitlabConfig = config;
        // Initialize GitLab API client
        this.client = axios_1.default.create({
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
    getProviderType() {
        return types_1.PipelineProvider.GITLAB_CI;
    }
    async validateConfig() {
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
            const projectId = repository || this.gitlabConfig.projectId;
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
            const pipelineData = {
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
            // Convert raw log text to LogData format
            const logText = response.data || '';
            const logLines = logText.split('\n').filter((line) => line.trim());
            return logLines.map((line, index) => ({
                timestamp: new Date(),
                level: this.detectLogLevel(line),
                message: line,
                source: 'gitlab-ci',
                jobId: runId,
                stepId: undefined
            }));
        }
        catch {
            return [];
        }
    }
    detectLogLevel(logLine) {
        const lowerLine = logLine.toLowerCase();
        if (lowerLine.includes('error') || lowerLine.includes('fail'))
            return 'error';
        if (lowerLine.includes('warn'))
            return 'warn';
        if (lowerLine.includes('debug'))
            return 'debug';
        return 'info';
    }
    async processWebhook(payload) {
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
        }
        catch (error) {
            logger.error('Failed to process GitLab webhook', {
                error: error instanceof Error ? error.message : String(error)
            });
            return null;
        }
    }
    transformWebhookToPipelineData(webhookData) {
        const pipelineData = {
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
    verifyWebhookSignature(payload, signature) {
        // GitLab webhook signature verification would go here
        return true;
    }
    getSupportedEvents() {
        return ['push', 'pipeline', 'job', 'merge_request'];
    }
    async setupWebhook(repository, webhookUrl, events) {
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
        }
        catch (error) {
            logger.error('Failed to create GitLab webhook', {
                error: error instanceof Error ? error.message : String(error),
                repository
            });
            throw error;
        }
    }
    getMetrics() {
        return {
            apiCallsCount: 0,
            apiCallsSuccessRate: 100,
            averageResponseTime: 0,
            lastSyncTime: new Date(),
            errorCount: 0,
            rateLimitRemaining: 1000
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
    transformPipeline(gitlabPipeline, projectId) {
        const pipelineData = {
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
    transformJob(gitlabJob) {
        const jobData = {
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