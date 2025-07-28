/**
 * Pipeline Management Routes  
 * CRUD operations for CI/CD pipelines with analytics integration
 */

import { Router } from 'express';
import { authenticateJWT, requirePermission, Permission } from '../middleware/auth';
import { validation } from '../middleware/request-validation';
import { pipelineController } from '../controllers/pipeline.controller';

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

// Pipeline CRUD operations
router.get('/', 
  requirePermission(Permission.PIPELINES_READ),
  validation.listPipelines,
  pipelineController.listPipelines
);

router.post('/', 
  requirePermission(Permission.PIPELINES_WRITE),
  validation.createPipeline,
  pipelineController.createPipeline
);

router.get('/:pipelineId', 
  requirePermission(Permission.PIPELINES_READ),
  validation.getPipeline,
  pipelineController.getPipeline
);

router.put('/:pipelineId', 
  requirePermission(Permission.PIPELINES_WRITE),
  validation.updatePipeline,
  pipelineController.updatePipeline
);

router.delete('/:pipelineId', 
  requirePermission(Permission.PIPELINES_DELETE),
  pipelineController.deletePipeline
);

// Pipeline runs
router.get('/:pipelineId/runs', 
  requirePermission(Permission.PIPELINES_READ),
  pipelineController.getPipelineRuns
);

router.get('/:pipelineId/runs/:runId', 
  requirePermission(Permission.PIPELINES_READ),
  pipelineController.getPipelineRun
);

// Pipeline actions
router.post('/:pipelineId/analyze', 
  requirePermission(Permission.PIPELINES_ANALYZE),
  pipelineController.analyzePipeline
);

router.post('/:pipelineId/sync', 
  requirePermission(Permission.PIPELINES_WRITE),
  pipelineController.syncPipeline
);

export default router;
