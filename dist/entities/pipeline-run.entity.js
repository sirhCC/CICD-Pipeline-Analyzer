"use strict";
/**
 * Pipeline Run Entity - Represents individual pipeline executions
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
exports.PipelineRun = exports.PipelineRunStage = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const pipeline_entity_1 = require("./pipeline.entity");
const types_1 = require("../types");
/**
 * Pipeline Run Stage Entity for detailed stage tracking
 */
let PipelineRunStage = class PipelineRunStage extends base_entity_1.BaseEntity {
    name;
    description;
    status;
    startedAt;
    completedAt;
    duration; // in seconds
    exitCode;
    logs;
    errorMessage;
    metadata;
    resources; // CPU, memory usage
    artifacts;
    // Relations
    runId;
    run;
    /**
     * Calculate stage duration
     */
    calculateDuration() {
        if (!this.startedAt || !this.completedAt) {
            return 0;
        }
        return Math.round((this.completedAt.getTime() - this.startedAt.getTime()) / 1000);
    }
    /**
     * Check if stage is successful
     */
    isSuccessful() {
        return this.status === types_1.PipelineStatus.SUCCESS;
    }
    /**
     * Check if stage failed
     */
    isFailed() {
        return [
            types_1.PipelineStatus.FAILED,
            types_1.PipelineStatus.CANCELLED,
            types_1.PipelineStatus.TIMEOUT
        ].includes(this.status);
    }
};
exports.PipelineRunStage = PipelineRunStage;
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], PipelineRunStage.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PipelineRunStage.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: types_1.PipelineStatus,
        enumName: 'pipeline_status_enum',
        default: types_1.PipelineStatus.PENDING
    }),
    __metadata("design:type", String)
], PipelineRunStage.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], PipelineRunStage.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], PipelineRunStage.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], PipelineRunStage.prototype, "duration", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PipelineRunStage.prototype, "exitCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PipelineRunStage.prototype, "logs", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PipelineRunStage.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PipelineRunStage.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PipelineRunStage.prototype, "resources", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PipelineRunStage.prototype, "artifacts", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], PipelineRunStage.prototype, "runId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => PipelineRun, run => run.stages, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'runId' }),
    __metadata("design:type", PipelineRun)
], PipelineRunStage.prototype, "run", void 0);
exports.PipelineRunStage = PipelineRunStage = __decorate([
    (0, typeorm_1.Entity)('pipeline_run_stages'),
    (0, typeorm_1.Index)(['runId', 'name']),
    (0, typeorm_1.Index)(['status']),
    (0, typeorm_1.Index)(['startedAt'])
], PipelineRunStage);
/**
 * Pipeline Run Entity for tracking individual executions
 */
let PipelineRun = class PipelineRun extends base_entity_1.BaseEntity {
    runNumber;
    branch;
    tag;
    commitSha;
    commitMessage;
    commitAuthor;
    status;
    triggeredBy; // user, webhook, schedule, etc.
    triggeredEvent; // push, pull_request, schedule, etc.
    queuedAt;
    startedAt;
    completedAt;
    duration; // in seconds
    exitCode;
    errorMessage;
    environment;
    variables;
    artifacts;
    testResults;
    resources;
    metadata;
    externalUrl;
    rawData; // Store original provider data
    // Relations
    pipelineId;
    pipeline;
    stages;
    /**
     * Calculate run duration
     */
    calculateDuration() {
        if (!this.startedAt || !this.completedAt) {
            return 0;
        }
        return Math.round((this.completedAt.getTime() - this.startedAt.getTime()) / 1000);
    }
    /**
     * Calculate queue time
     */
    calculateQueueTime() {
        if (!this.queuedAt || !this.startedAt) {
            return 0;
        }
        return Math.round((this.startedAt.getTime() - this.queuedAt.getTime()) / 1000);
    }
    /**
     * Check if run is successful
     */
    isSuccessful() {
        return this.status === types_1.PipelineStatus.SUCCESS;
    }
    /**
     * Check if run failed
     */
    isFailed() {
        return [
            types_1.PipelineStatus.FAILED,
            types_1.PipelineStatus.CANCELLED,
            types_1.PipelineStatus.TIMEOUT
        ].includes(this.status);
    }
    /**
     * Check if run is in progress
     */
    isInProgress() {
        return [
            types_1.PipelineStatus.PENDING,
            types_1.PipelineStatus.RUNNING
        ].includes(this.status);
    }
    /**
     * Get success rate for test results
     */
    getTestSuccessRate() {
        if (!this.testResults || this.testResults.total === 0) {
            return 0;
        }
        return (this.testResults.passed / this.testResults.total) * 100;
    }
    /**
     * Update run statistics
     */
    updateDuration() {
        if (this.startedAt && this.completedAt) {
            this.duration = this.calculateDuration();
        }
    }
    /**
     * Mark as completed
     */
    markCompleted(status, exitCode = 0, errorMessage) {
        this.status = status;
        this.completedAt = new Date();
        this.exitCode = exitCode;
        if (errorMessage !== undefined) {
            this.errorMessage = errorMessage;
        }
        this.updateDuration();
    }
    /**
     * Mark as started
     */
    markStarted() {
        this.status = types_1.PipelineStatus.RUNNING;
        this.startedAt = new Date();
    }
    /**
     * Add stage result
     */
    addStageResult(stage) {
        const newStage = new PipelineRunStage();
        Object.assign(newStage, stage);
        newStage.runId = this.id;
        if (!this.stages) {
            this.stages = [];
        }
        this.stages.push(newStage);
        return newStage;
    }
};
exports.PipelineRun = PipelineRun;
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], PipelineRun.prototype, "runNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], PipelineRun.prototype, "branch", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], PipelineRun.prototype, "tag", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], PipelineRun.prototype, "commitSha", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], PipelineRun.prototype, "commitMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], PipelineRun.prototype, "commitAuthor", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: types_1.PipelineStatus,
        enumName: 'pipeline_status_enum',
        default: types_1.PipelineStatus.PENDING
    }),
    __metadata("design:type", String)
], PipelineRun.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], PipelineRun.prototype, "triggeredBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], PipelineRun.prototype, "triggeredEvent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], PipelineRun.prototype, "queuedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], PipelineRun.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], PipelineRun.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], PipelineRun.prototype, "duration", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PipelineRun.prototype, "exitCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PipelineRun.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PipelineRun.prototype, "environment", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PipelineRun.prototype, "variables", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], PipelineRun.prototype, "artifacts", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PipelineRun.prototype, "testResults", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PipelineRun.prototype, "resources", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PipelineRun.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], PipelineRun.prototype, "externalUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PipelineRun.prototype, "rawData", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], PipelineRun.prototype, "pipelineId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => pipeline_entity_1.Pipeline, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'pipelineId' }),
    __metadata("design:type", pipeline_entity_1.Pipeline)
], PipelineRun.prototype, "pipeline", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PipelineRunStage, stage => stage.run, { cascade: true }),
    __metadata("design:type", Array)
], PipelineRun.prototype, "stages", void 0);
exports.PipelineRun = PipelineRun = __decorate([
    (0, typeorm_1.Entity)('pipeline_runs'),
    (0, typeorm_1.Index)(['pipelineId', 'runNumber'], { unique: true }),
    (0, typeorm_1.Index)(['status']),
    (0, typeorm_1.Index)(['triggeredBy']),
    (0, typeorm_1.Index)(['startedAt']),
    (0, typeorm_1.Index)(['branch'])
], PipelineRun);
//# sourceMappingURL=pipeline-run.entity.js.map