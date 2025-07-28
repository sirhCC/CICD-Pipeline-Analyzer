/**
 * Entity Index - Centralized entity exports
 */
export { BaseEntity } from './base.entity';
export { Pipeline } from './pipeline.entity';
export { PipelineRun, PipelineRunStage } from './pipeline-run.entity';
export { User, UserSession, ApiKey } from './user.entity';
export declare const entities: string[];
export declare const entityMetadata: {
    Pipeline: {
        tableName: string;
        primaryKey: string;
        relations: string[];
    };
    PipelineRun: {
        tableName: string;
        primaryKey: string;
        relations: string[];
    };
    PipelineRunStage: {
        tableName: string;
        primaryKey: string;
        relations: string[];
    };
    User: {
        tableName: string;
        primaryKey: string;
        relations: string[];
    };
    UserSession: {
        tableName: string;
        primaryKey: string;
        relations: string[];
    };
    ApiKey: {
        tableName: string;
        primaryKey: string;
        relations: string[];
    };
};
//# sourceMappingURL=index.d.ts.map