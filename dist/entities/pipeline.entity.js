"use strict";
/**
 * Pipeline Entity - Represents a CI/CD pipeline
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pipeline = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const types_1 = require("../types");
let Pipeline = class Pipeline extends base_entity_1.BaseEntity {
    name;
    description;
    provider;
    externalId;
    repository;
    branch;
    status;
    visibility;
    owner;
    organization;
    configuration;
    metadata;
    lastRunAt;
    lastSuccessAt;
    lastFailureAt;
    totalRuns;
    successfulRuns;
    failedRuns;
    averageDuration;
    successRate;
    isActive;
    isMonitored;
    webhookUrl;
    webhookSecret;
    // Relations will be added later
    // @OneToMany(() => PipelineRun, run => run.pipeline, { cascade: true })
    // runs!: PipelineRun[];
    /**
     * Calculate and update success rate
     */
    updateSuccessRate() {
        if (this.totalRuns === 0) {
            this.successRate = 0;
            return;
        }
        this.successRate = (this.successfulRuns / this.totalRuns) * 100;
    }
    /**
     * Check if pipeline is healthy (success rate above threshold)
     */
    isHealthy(threshold = 80) {
        return (this.successRate ?? 0) >= threshold;
    }
    /**
     * Get pipeline URL based on provider
     */
    getExternalUrl() {
        switch (this.provider) {
            case types_1.PipelineProvider.GITHUB_ACTIONS:
                return `https://github.com/${this.repository}/actions`;
            case types_1.PipelineProvider.GITLAB_CI:
                return `https://gitlab.com/${this.repository}/-/pipelines`;
            case types_1.PipelineProvider.JENKINS:
                return this.metadata?.url || null;
            case types_1.PipelineProvider.AZURE_DEVOPS:
                return this.metadata?.url || null;
            case types_1.PipelineProvider.CIRCLECI:
                return `https://app.circleci.com/pipelines/github/${this.repository}`;
            default:
                return null;
        }
    }
    /**
     * Update pipeline statistics
     */
    updateStats(duration) {
        if (duration !== undefined) {
            if (this.averageDuration === undefined) {
                this.averageDuration = duration;
            }
            else {
                // Exponential moving average
                this.averageDuration = (this.averageDuration * 0.8) + (duration * 0.2);
            }
        }
        this.updateSuccessRate();
    }
};
exports.Pipeline = Pipeline;
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Pipeline.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Pipeline.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: types_1.PipelineProvider,
        enumName: 'pipeline_provider_enum'
    }),
    __metadata("design:type", String)
], Pipeline.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Pipeline.prototype, "externalId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500 }),
    __metadata("design:type", String)
], Pipeline.prototype, "repository", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Pipeline.prototype, "branch", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: types_1.PipelineStatus,
        enumName: 'pipeline_status_enum',
        default: types_1.PipelineStatus.UNKNOWN
    }),
    __metadata("design:type", String)
], Pipeline.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: types_1.PipelineVisibility,
        enumName: 'pipeline_visibility_enum',
        default: types_1.PipelineVisibility.PRIVATE
    }),
    __metadata("design:type", String)
], Pipeline.prototype, "visibility", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], Pipeline.prototype, "owner", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], Pipeline.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Pipeline.prototype, "configuration", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Pipeline.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], Pipeline.prototype, "lastRunAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], Pipeline.prototype, "lastSuccessAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], Pipeline.prototype, "lastFailureAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Pipeline.prototype, "totalRuns", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Pipeline.prototype, "successfulRuns", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Pipeline.prototype, "failedRuns", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], Pipeline.prototype, "averageDuration", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], Pipeline.prototype, "successRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Pipeline.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Pipeline.prototype, "isMonitored", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], Pipeline.prototype, "webhookUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], Pipeline.prototype, "webhookSecret", void 0);
exports.Pipeline = Pipeline = __decorate([
    (0, typeorm_1.Entity)('pipelines'),
    (0, typeorm_1.Index)(['provider', 'externalId'], { unique: true }),
    (0, typeorm_1.Index)(['repository', 'branch']),
    (0, typeorm_1.Index)(['status']),
    (0, typeorm_1.Index)(['createdAt'])
], Pipeline);
exports.default = Pipeline;
//# sourceMappingURL=pipeline.entity.js.map