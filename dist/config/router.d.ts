/**
 * Versioned Router Factory
 * Creates Express routers with API version support
 */
import { Router } from 'express';
export interface VersionedRouterConfig {
    version: string;
    prefix?: string;
    deprecated?: boolean;
    routes: {
        auth?: boolean;
        pipelines?: boolean;
        analytics?: boolean;
        admin?: boolean;
    };
}
/**
 * Create a versioned router with specified configuration
 */
export declare function createVersionedRouter(config: VersionedRouterConfig): Router;
/**
 * Create all supported API version routers
 */
export declare function createAllVersionedRouters(): Array<{
    version: string;
    prefix: string;
    router: Router;
}>;
/**
 * Get API version information endpoint
 */
export declare function createVersionInfoRouter(): Router;
//# sourceMappingURL=router.d.ts.map