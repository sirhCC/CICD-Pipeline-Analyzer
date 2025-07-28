"use strict";
/**
 * Pipeline Management Routes
 * CRUD operations for CI/CD pipelines with analytics integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const request_validation_1 = require("../middleware/request-validation");
const pipeline_controller_1 = require("../controllers/pipeline.controller");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateJWT);
// Pipeline CRUD operations
router.get('/', (0, auth_1.requirePermission)(auth_1.Permission.PIPELINES_READ), request_validation_1.validation.listPipelines, pipeline_controller_1.pipelineController.listPipelines);
router.post('/', (0, auth_1.requirePermission)(auth_1.Permission.PIPELINES_WRITE), request_validation_1.validation.createPipeline, pipeline_controller_1.pipelineController.createPipeline);
router.get('/:pipelineId', (0, auth_1.requirePermission)(auth_1.Permission.PIPELINES_READ), request_validation_1.validation.getPipeline, pipeline_controller_1.pipelineController.getPipeline);
router.put('/:pipelineId', (0, auth_1.requirePermission)(auth_1.Permission.PIPELINES_WRITE), request_validation_1.validation.updatePipeline, pipeline_controller_1.pipelineController.updatePipeline);
router.delete('/:pipelineId', (0, auth_1.requirePermission)(auth_1.Permission.PIPELINES_DELETE), pipeline_controller_1.pipelineController.deletePipeline);
// Pipeline runs
router.get('/:pipelineId/runs', (0, auth_1.requirePermission)(auth_1.Permission.PIPELINES_READ), pipeline_controller_1.pipelineController.getPipelineRuns);
router.get('/:pipelineId/runs/:runId', (0, auth_1.requirePermission)(auth_1.Permission.PIPELINES_READ), pipeline_controller_1.pipelineController.getPipelineRun);
// Pipeline actions
router.post('/:pipelineId/analyze', (0, auth_1.requirePermission)(auth_1.Permission.PIPELINES_ANALYZE), pipeline_controller_1.pipelineController.analyzePipeline);
router.post('/:pipelineId/sync', (0, auth_1.requirePermission)(auth_1.Permission.PIPELINES_WRITE), pipeline_controller_1.pipelineController.syncPipeline);
exports.default = router;
//# sourceMappingURL=pipeline.routes.js.map