"use strict";
/**
 * GitHub Actions Provider Implementation
 * Integrates with GitHub Actions API for pipeline data collection
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubActionsProvider = void 0;
const base_provider_1 = require("./base.provider");
const types_1 = require("../types");
const logger_1 = require("../shared/logger");
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
/**
 * GitHub Actions Provider
 */
class GitHubActionsProvider extends base_provider_1.BaseCICDProvider {
    client;
    logger;
    config;
    constructor(config) {
        super(config);
        this.config = config;
        this.logger = new logger_1.Logger('GitHubActionsProvider');
        this.client = axios_1.default.create({
            baseURL: config.baseUrl || 'https://api.github.com',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'CICD-Pipeline-Analyzer/1.0.0',
            },
            timeout: config.timeout || 30000,
        });
        // Add request/response interceptors for metrics
        this.client.interceptors.request.use((config) => {
            config.metadata = { startTime: Date.now() };
            return config;
        });
        this.client.interceptors.response.use((response) => {
            const duration = Date.now() - (response.config.metadata?.startTime || 0);
            this.updateMetrics(duration, true);
            return response;
        }, (error) => {
            const duration = Date.now() - (error.config?.metadata?.startTime || 0);
            this.updateMetrics(duration, false, error.message);
            return Promise.reject(error);
        });
    }
    getProviderType() {
        return types_1.PipelineProvider.GITHUB_ACTIONS;
    }
    async validateConfig() {
        try {
            const response = await this.client.get('/user');
            return response.status === 200;
        }
        catch (error) {
            this.logger.error('Config validation failed', { error });
            return false;
        }
    }
    async testConnection() {
        try {
            const response = await this.client.get('/rate_limit');
            return response.status === 200;
        }
        catch (error) {
            this.logger.error('Connection test failed', { error });
            return false;
        }
    }
    async fetchPipeline(pipelineId) {
        return this.executeWithMetrics(async () => {
            // For GitHub Actions, pipelineId is actually a workflow run ID
            const [owner, repo] = this.getOwnerRepo();
            const response = await this.client.get(`/repos/${owner}/${repo}/actions/runs/${pipelineId}`);
            return this.transformWorkflowRun(response.data);
        });
    }
    async fetchPipelines(repository, options) {
        return this.executeWithMetrics(async () => {
            const [owner, repo] = repository.split('/');
            const params = {
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
            return response.data.workflow_runs.map((run) => this.transformWorkflowRun(run));
        });
    }
    async fetchPipelineRun(pipelineId, runId) {
        // For GitHub Actions, pipelineId and runId are the same since runs are top-level
        return this.fetchPipeline(runId);
    }
    async fetchLogs(pipelineId, runId, jobId, stepId) {
        return this.executeWithMetrics(async () => {
            const [owner, repo] = this.getOwnerRepo();
            if (jobId) {
                // Fetch logs for specific job
                const response = await this.client.get(`/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`, { responseType: 'text' });
                return this.parseJobLogs(response.data, jobId, stepId);
            }
            else {
                // Fetch logs for entire workflow run
                const response = await this.client.get(`/repos/${owner}/${repo}/actions/runs/${runId}/logs`, { responseType: 'arraybuffer' });
                // GitHub returns logs as a zip file, we'd need to extract and parse
                // For now, return empty array - this would need zip extraction logic
                return [];
            }
        });
    }
    async processWebhook(payload) {
        try {
            if (payload.event === 'workflow_run') {
                const workflowRun = payload.data.workflow_run;
                return this.transformWorkflowRun(workflowRun);
            }
            return null;
        }
        catch (error) {
            this.logger.error('Failed to process webhook', { error, payload });
            return null;
        }
    }
    verifyWebhookSignature(payload, signature) {
        if (!this.config.webhookSecret) {
            return false;
        }
        const expectedSignature = crypto
            .createHmac('sha256', this.config.webhookSecret)
            .update(payload)
            .digest('hex');
        return crypto.timingSafeEqual(Buffer.from(`sha256=${expectedSignature}`), Buffer.from(signature));
    }
    getSupportedEvents() {
        return [
            'workflow_run',
            'workflow_job',
            'check_run',
            'check_suite',
        ];
    }
    async setupWebhook(repository, webhookUrl, events) {
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
    getOwnerRepo() {
        if (this.config.owner && this.config.repo) {
            return [this.config.owner, this.config.repo];
        }
        throw new Error('Owner and repo must be configured for GitHub Actions provider');
    }
    transformWorkflowRun(run) {
        const finishedAt = run.updated_at ? new Date(run.updated_at) : undefined;
        const result = {
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
        return result;
    }
    mapStatusesToGitHub(statuses) {
        // GitHub Actions status mapping
        const statusMap = {
            [types_1.PipelineStatus.PENDING]: 'queued',
            [types_1.PipelineStatus.RUNNING]: 'in_progress',
            [types_1.PipelineStatus.SUCCESS]: 'completed',
            [types_1.PipelineStatus.FAILED]: 'completed',
            [types_1.PipelineStatus.CANCELLED]: 'completed',
            [types_1.PipelineStatus.SKIPPED]: 'completed',
            [types_1.PipelineStatus.TIMEOUT]: 'completed',
            [types_1.PipelineStatus.UNKNOWN]: 'completed',
        };
        // For now, just return the first mapped status
        if (statuses.length > 0) {
            const firstStatus = statuses[0];
            return firstStatus && statusMap[firstStatus] ? statusMap[firstStatus] : 'completed';
        }
        return 'completed';
    }
    parseJobLogs(logText, jobId, stepId) {
        const logs = [];
        const lines = logText.split('\n');
        for (const line of lines) {
            // Parse GitHub Actions log format: timestamp level message
            const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+(.+)$/);
            if (match && match[1] && match[2]) {
                const logEntry = {
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
exports.GitHubActionsProvider = GitHubActionsProvider;
//# sourceMappingURL=github-actions.provider.js.map