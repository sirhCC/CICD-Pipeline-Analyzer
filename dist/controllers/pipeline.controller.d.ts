/**
 * Pipeline Management Controller
 * Handles CRUD operations and analytics for CI/CD pipelines
 */
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare const pipelineController: {
    /**
     * List pipelines with basic pagination
     */
    listPipelines(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Create a new pipeline
     */
    createPipeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get a specific pipeline by ID
     */
    getPipeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Update a pipeline (simplified)
     */
    updatePipeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Delete a pipeline (simplified)
     */
    deletePipeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get pipeline runs (simplified)
     */
    getPipelineRuns(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get a specific pipeline run (simplified)
     */
    getPipelineRun(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Analyze a pipeline (trigger analytics processing)
     */
    analyzePipeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Sync pipeline data from provider
     */
    syncPipeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=pipeline.controller.d.ts.map