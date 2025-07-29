"use strict";
/**
 * API Versioning Configuration and Management
 * Centralizes version control, deprecation, and routing logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiVersionManager = exports.ApiVersionManager = void 0;
/**
 * API Version Manager
 */
class ApiVersionManager {
    static instance;
    config;
    constructor() {
        this.config = {
            defaultVersion: 'v1',
            currentVersion: 'v1',
            supportedVersions: [
                {
                    version: 'v1',
                    prefix: '/api/v1',
                    supported: true,
                    deprecated: false,
                    features: [
                        'authentication',
                        'pipeline-management',
                        'basic-analytics',
                        'advanced-analytics',
                        'phase3-optimizations',
                        'user-management',
                    ],
                    breaking: false,
                },
                // Future versions can be added here
                // {
                //   version: 'v2',
                //   prefix: '/api/v2',
                //   supported: false,
                //   deprecated: false,
                //   features: [
                //     'authentication',
                //     'pipeline-management',
                //     'advanced-analytics',
                //     'user-management',
                //     'real-time-monitoring',
                //   ],
                //   breaking: true,
                // },
            ],
            deprecationWarningMonths: 6,
            headerNames: {
                version: 'X-API-Version',
                requestedVersion: 'X-Requested-Version',
                deprecationWarning: 'X-API-Deprecation-Warning',
                sunset: 'X-API-Sunset',
            },
        };
    }
    static getInstance() {
        if (!ApiVersionManager.instance) {
            ApiVersionManager.instance = new ApiVersionManager();
        }
        return ApiVersionManager.instance;
    }
    /**
     * Get the current API version
     */
    getCurrentVersion() {
        return this.config.currentVersion;
    }
    /**
     * Get the default API version
     */
    getDefaultVersion() {
        return this.config.defaultVersion;
    }
    /**
     * Get all supported versions
     */
    getSupportedVersions() {
        return this.config.supportedVersions.filter(v => v.supported);
    }
    /**
     * Get deprecated versions
     */
    getDeprecatedVersions() {
        return this.config.supportedVersions.filter(v => v.deprecated && v.supported);
    }
    /**
     * Get version configuration by version string
     */
    getVersionConfig(version) {
        return this.config.supportedVersions.find(v => v.version === version);
    }
    /**
     * Check if a version is supported
     */
    isVersionSupported(version) {
        const versionConfig = this.getVersionConfig(version);
        return versionConfig?.supported || false;
    }
    /**
     * Check if a version is deprecated
     */
    isVersionDeprecated(version) {
        const versionConfig = this.getVersionConfig(version);
        return versionConfig?.deprecated || false;
    }
    /**
     * Get version from request (headers, query params, or URL)
     */
    extractVersionFromRequest(req) {
        // 1. Check explicit version header
        const headerVersion = req.headers[this.config.headerNames.version.toLowerCase()];
        if (headerVersion && this.isVersionSupported(headerVersion)) {
            return headerVersion;
        }
        // 2. Check query parameter
        const queryVersion = req.query.version;
        if (queryVersion && this.isVersionSupported(queryVersion)) {
            return queryVersion;
        }
        // 3. Extract from URL path
        const pathMatch = req.originalUrl.match(/^\/api\/(v\d+)/);
        if (pathMatch && this.isVersionSupported(pathMatch[1])) {
            return pathMatch[1];
        }
        // 4. Fall back to default version
        return this.getDefaultVersion();
    }
    /**
     * Get version prefix for routing
     */
    getVersionPrefix(version) {
        const versionConfig = this.getVersionConfig(version);
        return versionConfig?.prefix || `/api/${version}`;
    }
    /**
     * Get version metadata for responses
     */
    getVersionMetadata(version) {
        const versionConfig = this.getVersionConfig(version);
        if (!versionConfig) {
            return null;
        }
        const metadata = {
            version: versionConfig.version,
            features: versionConfig.features,
            breaking: versionConfig.breaking,
        };
        if (versionConfig.deprecated) {
            metadata.deprecated = true;
            if (versionConfig.deprecationDate) {
                metadata.deprecationDate = versionConfig.deprecationDate;
            }
            if (versionConfig.sunsetDate) {
                metadata.sunsetDate = versionConfig.sunsetDate;
            }
        }
        return metadata;
    }
    /**
     * Get headers to add to responses
     */
    getResponseHeaders(version, requestedVersion) {
        const headers = {};
        const versionConfig = this.getVersionConfig(version);
        // Always include the actual version used
        headers[this.config.headerNames.version] = version;
        // Include requested version if different
        if (requestedVersion && requestedVersion !== version) {
            headers[this.config.headerNames.requestedVersion] = requestedVersion;
        }
        // Add deprecation warnings
        if (versionConfig?.deprecated) {
            let warning = `Version ${version} is deprecated`;
            if (versionConfig.sunsetDate) {
                warning += ` and will be sunset on ${versionConfig.sunsetDate}`;
            }
            headers[this.config.headerNames.deprecationWarning] = warning;
            if (versionConfig.sunsetDate) {
                headers[this.config.headerNames.sunset] = versionConfig.sunsetDate;
            }
        }
        return headers;
    }
    /**
     * Add a new version configuration
     */
    addVersion(versionConfig) {
        const existingIndex = this.config.supportedVersions.findIndex(v => v.version === versionConfig.version);
        if (existingIndex >= 0) {
            this.config.supportedVersions[existingIndex] = versionConfig;
        }
        else {
            this.config.supportedVersions.push(versionConfig);
        }
    }
    /**
     * Mark a version as deprecated
     */
    deprecateVersion(version, deprecationDate, sunsetDate) {
        const versionConfig = this.getVersionConfig(version);
        if (versionConfig) {
            versionConfig.deprecated = true;
            if (deprecationDate)
                versionConfig.deprecationDate = deprecationDate;
            if (sunsetDate)
                versionConfig.sunsetDate = sunsetDate;
        }
    }
    /**
     * Remove support for a version
     */
    unsupportVersion(version) {
        const versionConfig = this.getVersionConfig(version);
        if (versionConfig) {
            versionConfig.supported = false;
        }
    }
    /**
     * Get the full versioning configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.ApiVersionManager = ApiVersionManager;
// Singleton instance export
exports.apiVersionManager = ApiVersionManager.getInstance();
//# sourceMappingURL=versioning.js.map