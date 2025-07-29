"use strict";
/**
 * Statistical Result Entity - Phase 3 Data Persistence
 * Stores statistical analysis results for historical tracking and trend analysis
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
exports.StatisticalResult = exports.ResultStatus = exports.AnalysisType = void 0;
const typeorm_1 = require("typeorm");
const pipeline_entity_1 = require("./pipeline.entity");
var AnalysisType;
(function (AnalysisType) {
    AnalysisType["ANOMALY_DETECTION"] = "anomaly_detection";
    AnalysisType["TREND_ANALYSIS"] = "trend_analysis";
    AnalysisType["SLA_MONITORING"] = "sla_monitoring";
    AnalysisType["COST_ANALYSIS"] = "cost_analysis";
    AnalysisType["BENCHMARK_ANALYSIS"] = "benchmark_analysis";
})(AnalysisType || (exports.AnalysisType = AnalysisType = {}));
var ResultStatus;
(function (ResultStatus) {
    ResultStatus["SUCCESS"] = "success";
    ResultStatus["WARNING"] = "warning";
    ResultStatus["ERROR"] = "error";
    ResultStatus["CRITICAL"] = "critical";
})(ResultStatus || (exports.ResultStatus = ResultStatus = {}));
let StatisticalResult = class StatisticalResult {
    id;
    pipelineId;
    pipeline;
    analysisType;
    status;
    metric; // duration, cpu, memory, success_rate, test_coverage
    method; // z-score, percentile, iqr, linear-regression
    result; // The actual analysis result
    metadata; // Additional context
    score; // Confidence score, anomaly score, etc.
    severity;
    dataPointCount; // Number of data points analyzed
    periodDays; // Analysis period in days
    executionTime; // Analysis execution time in milliseconds
    jobExecutionId; // Link to background job execution
    timestamp;
    createdAt;
    updatedAt;
};
exports.StatisticalResult = StatisticalResult;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], StatisticalResult.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], StatisticalResult.prototype, "pipelineId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => pipeline_entity_1.Pipeline, { nullable: true, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'pipelineId' }),
    __metadata("design:type", pipeline_entity_1.Pipeline)
], StatisticalResult.prototype, "pipeline", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: AnalysisType
    }),
    __metadata("design:type", String)
], StatisticalResult.prototype, "analysisType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ResultStatus,
        default: ResultStatus.SUCCESS
    }),
    __metadata("design:type", String)
], StatisticalResult.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], StatisticalResult.prototype, "metric", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], StatisticalResult.prototype, "method", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json' }),
    __metadata("design:type", Object)
], StatisticalResult.prototype, "result", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], StatisticalResult.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], StatisticalResult.prototype, "score", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", String)
], StatisticalResult.prototype, "severity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], StatisticalResult.prototype, "dataPointCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], StatisticalResult.prototype, "periodDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], StatisticalResult.prototype, "executionTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], StatisticalResult.prototype, "jobExecutionId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], StatisticalResult.prototype, "timestamp", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], StatisticalResult.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], StatisticalResult.prototype, "updatedAt", void 0);
exports.StatisticalResult = StatisticalResult = __decorate([
    (0, typeorm_1.Entity)('statistical_results'),
    (0, typeorm_1.Index)(['pipelineId', 'analysisType', 'timestamp']),
    (0, typeorm_1.Index)(['analysisType', 'timestamp']),
    (0, typeorm_1.Index)(['status', 'timestamp'])
], StatisticalResult);
//# sourceMappingURL=statistical-result.entity.js.map