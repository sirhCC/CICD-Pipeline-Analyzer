"use strict";
/**
 * Entity Index - Centralized entity exports
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.entityMetadata = exports.entities = exports.AnalyticsAlert = exports.OptimizationRecommendation = exports.FailurePattern = exports.PipelineMetrics = exports.ApiKey = exports.UserSession = exports.User = exports.PipelineRunStage = exports.PipelineRun = exports.Pipeline = exports.BaseEntity = void 0;
var base_entity_1 = require("./base.entity");
Object.defineProperty(exports, "BaseEntity", { enumerable: true, get: function () { return base_entity_1.BaseEntity; } });
var pipeline_entity_1 = require("./pipeline.entity");
Object.defineProperty(exports, "Pipeline", { enumerable: true, get: function () { return pipeline_entity_1.Pipeline; } });
var pipeline_run_entity_1 = require("./pipeline-run.entity");
Object.defineProperty(exports, "PipelineRun", { enumerable: true, get: function () { return pipeline_run_entity_1.PipelineRun; } });
Object.defineProperty(exports, "PipelineRunStage", { enumerable: true, get: function () { return pipeline_run_entity_1.PipelineRunStage; } });
var user_entity_1 = require("./user.entity");
Object.defineProperty(exports, "User", { enumerable: true, get: function () { return user_entity_1.User; } });
Object.defineProperty(exports, "UserSession", { enumerable: true, get: function () { return user_entity_1.UserSession; } });
Object.defineProperty(exports, "ApiKey", { enumerable: true, get: function () { return user_entity_1.ApiKey; } });
var pipeline_metrics_entity_1 = require("./pipeline-metrics.entity");
Object.defineProperty(exports, "PipelineMetrics", { enumerable: true, get: function () { return pipeline_metrics_entity_1.PipelineMetrics; } });
Object.defineProperty(exports, "FailurePattern", { enumerable: true, get: function () { return pipeline_metrics_entity_1.FailurePattern; } });
Object.defineProperty(exports, "OptimizationRecommendation", { enumerable: true, get: function () { return pipeline_metrics_entity_1.OptimizationRecommendation; } });
Object.defineProperty(exports, "AnalyticsAlert", { enumerable: true, get: function () { return pipeline_metrics_entity_1.AnalyticsAlert; } });
// Entity arrays for TypeORM configuration
exports.entities = [
    'Pipeline',
    'PipelineRun',
    'PipelineRunStage',
    'User',
    'UserSession',
    'ApiKey',
    'PipelineMetrics',
    'FailurePattern',
    'OptimizationRecommendation',
    'AnalyticsAlert'
];
// Entity metadata for introspection
exports.entityMetadata = {
    Pipeline: {
        tableName: 'pipelines',
        primaryKey: 'id',
        relations: ['runs']
    },
    PipelineRun: {
        tableName: 'pipeline_runs',
        primaryKey: 'id',
        relations: ['pipeline', 'stages']
    },
    PipelineRunStage: {
        tableName: 'pipeline_run_stages',
        primaryKey: 'id',
        relations: ['run']
    },
    User: {
        tableName: 'users',
        primaryKey: 'id',
        relations: ['sessions', 'apiKeys']
    },
    UserSession: {
        tableName: 'user_sessions',
        primaryKey: 'id',
        relations: ['user']
    },
    ApiKey: {
        tableName: 'api_keys',
        primaryKey: 'id',
        relations: ['user']
    }
};
//# sourceMappingURL=index.js.map