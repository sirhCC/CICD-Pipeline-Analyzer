/**
 * API Versioning Configuration and Management
 * Centralizes version control, deprecation, and routing logic
 */
export interface ApiVersionConfig {
    version: string;
    prefix: string;
    supported: boolean;
    deprecated: boolean;
    deprecationDate?: string;
    sunsetDate?: string;
    features: string[];
    breaking: boolean;
}
export interface VersioningConfig {
    defaultVersion: string;
    currentVersion: string;
    supportedVersions: ApiVersionConfig[];
    deprecationWarningMonths: number;
    headerNames: {
        version: string;
        requestedVersion: string;
        deprecationWarning: string;
        sunset: string;
    };
}
/**
 * API Version Manager
 */
export declare class ApiVersionManager {
    private static instance;
    private config;
    private constructor();
    static getInstance(): ApiVersionManager;
    /**
     * Get the current API version
     */
    getCurrentVersion(): string;
    /**
     * Get the default API version
     */
    getDefaultVersion(): string;
    /**
     * Get all supported versions
     */
    getSupportedVersions(): ApiVersionConfig[];
    /**
     * Get deprecated versions
     */
    getDeprecatedVersions(): ApiVersionConfig[];
    /**
     * Get version configuration by version string
     */
    getVersionConfig(version: string): ApiVersionConfig | undefined;
    /**
     * Check if a version is supported
     */
    isVersionSupported(version: string): boolean;
    /**
     * Check if a version is deprecated
     */
    isVersionDeprecated(version: string): boolean;
    /**
     * Get version from request (headers, query params, or URL)
     */
    extractVersionFromRequest(req: any): string;
    /**
     * Get version prefix for routing
     */
    getVersionPrefix(version: string): string;
    /**
     * Get version metadata for responses
     */
    getVersionMetadata(version: string): any;
    /**
     * Get headers to add to responses
     */
    getResponseHeaders(version: string, requestedVersion?: string): Record<string, string>;
    /**
     * Add a new version configuration
     */
    addVersion(versionConfig: ApiVersionConfig): void;
    /**
     * Mark a version as deprecated
     */
    deprecateVersion(version: string, deprecationDate?: string, sunsetDate?: string): void;
    /**
     * Remove support for a version
     */
    unsupportVersion(version: string): void;
    /**
     * Get the full versioning configuration
     */
    getConfig(): VersioningConfig;
}
export declare const apiVersionManager: ApiVersionManager;
//# sourceMappingURL=versioning.d.ts.map