"use strict";
/**
 * Core type definitions for the CI/CD Pipeline Analyzer
 * Enterprise-grade type safety across all modules
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRole = exports.ImpactLevel = exports.Priority = exports.OptimizationType = exports.BottleneckType = exports.StageType = exports.JobStatus = exports.StageStatus = exports.PipelineStatus = exports.PipelineProvider = void 0;
// === Provider Types ===
var PipelineProvider;
(function (PipelineProvider) {
    PipelineProvider["GITHUB_ACTIONS"] = "github-actions";
    PipelineProvider["GITLAB_CI"] = "gitlab-ci";
    PipelineProvider["JENKINS"] = "jenkins";
    PipelineProvider["AZURE_DEVOPS"] = "azure-devops";
    PipelineProvider["CIRCLECI"] = "circleci";
    PipelineProvider["BUILDKITE"] = "buildkite";
    PipelineProvider["CUSTOM"] = "custom";
})(PipelineProvider || (exports.PipelineProvider = PipelineProvider = {}));
// === Status Enums ===
var PipelineStatus;
(function (PipelineStatus) {
    PipelineStatus["PENDING"] = "pending";
    PipelineStatus["RUNNING"] = "running";
    PipelineStatus["SUCCESS"] = "success";
    PipelineStatus["FAILED"] = "failed";
    PipelineStatus["CANCELLED"] = "cancelled";
    PipelineStatus["SKIPPED"] = "skipped";
    PipelineStatus["TIMEOUT"] = "timeout";
})(PipelineStatus || (exports.PipelineStatus = PipelineStatus = {}));
var StageStatus;
(function (StageStatus) {
    StageStatus["PENDING"] = "pending";
    StageStatus["RUNNING"] = "running";
    StageStatus["SUCCESS"] = "success";
    StageStatus["FAILED"] = "failed";
    StageStatus["CANCELLED"] = "cancelled";
    StageStatus["SKIPPED"] = "skipped";
})(StageStatus || (exports.StageStatus = StageStatus = {}));
var JobStatus;
(function (JobStatus) {
    JobStatus["PENDING"] = "pending";
    JobStatus["RUNNING"] = "running";
    JobStatus["SUCCESS"] = "success";
    JobStatus["FAILED"] = "failed";
    JobStatus["CANCELLED"] = "cancelled";
    JobStatus["SKIPPED"] = "skipped";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
var StageType;
(function (StageType) {
    StageType["BUILD"] = "build";
    StageType["TEST"] = "test";
    StageType["LINT"] = "lint";
    StageType["SECURITY"] = "security";
    StageType["DEPLOY"] = "deploy";
    StageType["RELEASE"] = "release";
    StageType["CUSTOM"] = "custom";
})(StageType || (exports.StageType = StageType = {}));
var BottleneckType;
(function (BottleneckType) {
    BottleneckType["RESOURCE_CONSTRAINT"] = "resource-constraint";
    BottleneckType["DEPENDENCY_WAIT"] = "dependency-wait";
    BottleneckType["INEFFICIENT_PARALLELIZATION"] = "inefficient-parallelization";
    BottleneckType["SLOW_DEPENDENCY_FETCH"] = "slow-dependency-fetch";
    BottleneckType["EXCESSIVE_LOGGING"] = "excessive-logging";
    BottleneckType["REDUNDANT_STEPS"] = "redundant-steps";
})(BottleneckType || (exports.BottleneckType = BottleneckType = {}));
var OptimizationType;
(function (OptimizationType) {
    OptimizationType["CACHING"] = "caching";
    OptimizationType["PARALLELIZATION"] = "parallelization";
    OptimizationType["RESOURCE_OPTIMIZATION"] = "resource-optimization";
    OptimizationType["DEPENDENCY_OPTIMIZATION"] = "dependency-optimization";
    OptimizationType["WORKFLOW_RESTRUCTURE"] = "workflow-restructure";
    OptimizationType["COST_OPTIMIZATION"] = "cost-optimization";
})(OptimizationType || (exports.OptimizationType = OptimizationType = {}));
// === Common Utility Types ===
var Priority;
(function (Priority) {
    Priority["LOW"] = "low";
    Priority["MEDIUM"] = "medium";
    Priority["HIGH"] = "high";
    Priority["CRITICAL"] = "critical";
})(Priority || (exports.Priority = Priority = {}));
var ImpactLevel;
(function (ImpactLevel) {
    ImpactLevel["MINIMAL"] = "minimal";
    ImpactLevel["LOW"] = "low";
    ImpactLevel["MEDIUM"] = "medium";
    ImpactLevel["HIGH"] = "high";
    ImpactLevel["SEVERE"] = "severe";
})(ImpactLevel || (exports.ImpactLevel = ImpactLevel = {}));
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["ANALYST"] = "analyst";
    UserRole["VIEWER"] = "viewer";
    UserRole["DEVELOPER"] = "developer";
})(UserRole || (exports.UserRole = UserRole = {}));
//# sourceMappingURL=index.js.map