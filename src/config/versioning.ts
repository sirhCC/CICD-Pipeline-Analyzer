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
export class ApiVersionManager {
  private static instance: ApiVersionManager;
  private config: VersioningConfig;

  private constructor() {
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

  public static getInstance(): ApiVersionManager {
    if (!ApiVersionManager.instance) {
      ApiVersionManager.instance = new ApiVersionManager();
    }
    return ApiVersionManager.instance;
  }

  /**
   * Get the current API version
   */
  public getCurrentVersion(): string {
    return this.config.currentVersion;
  }

  /**
   * Get the default API version
   */
  public getDefaultVersion(): string {
    return this.config.defaultVersion;
  }

  /**
   * Get all supported versions
   */
  public getSupportedVersions(): ApiVersionConfig[] {
    return this.config.supportedVersions.filter(v => v.supported);
  }

  /**
   * Get deprecated versions
   */
  public getDeprecatedVersions(): ApiVersionConfig[] {
    return this.config.supportedVersions.filter(v => v.deprecated && v.supported);
  }

  /**
   * Get version configuration by version string
   */
  public getVersionConfig(version: string): ApiVersionConfig | undefined {
    return this.config.supportedVersions.find(v => v.version === version);
  }

  /**
   * Check if a version is supported
   */
  public isVersionSupported(version: string): boolean {
    const versionConfig = this.getVersionConfig(version);
    return versionConfig?.supported || false;
  }

  /**
   * Check if a version is deprecated
   */
  public isVersionDeprecated(version: string): boolean {
    const versionConfig = this.getVersionConfig(version);
    return versionConfig?.deprecated || false;
  }

  /**
   * Get version from request (headers, query params, or URL)
   */
  public extractVersionFromRequest(req: any): string {
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
  public getVersionPrefix(version: string): string {
    const versionConfig = this.getVersionConfig(version);
    return versionConfig?.prefix || `/api/${version}`;
  }

  /**
   * Get version metadata for responses
   */
  public getVersionMetadata(version: string): any {
    const versionConfig = this.getVersionConfig(version);
    if (!versionConfig) {
      return null;
    }

    const metadata: any = {
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
  public getResponseHeaders(version: string, requestedVersion?: string): Record<string, string> {
    const headers: Record<string, string> = {};
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
  public addVersion(versionConfig: ApiVersionConfig): void {
    const existingIndex = this.config.supportedVersions.findIndex(
      v => v.version === versionConfig.version
    );

    if (existingIndex >= 0) {
      this.config.supportedVersions[existingIndex] = versionConfig;
    } else {
      this.config.supportedVersions.push(versionConfig);
    }
  }

  /**
   * Mark a version as deprecated
   */
  public deprecateVersion(
    version: string,
    deprecationDate?: string,
    sunsetDate?: string
  ): void {
    const versionConfig = this.getVersionConfig(version);
    if (versionConfig) {
      versionConfig.deprecated = true;
      if (deprecationDate) versionConfig.deprecationDate = deprecationDate;
      if (sunsetDate) versionConfig.sunsetDate = sunsetDate;
    }
  }

  /**
   * Remove support for a version
   */
  public unsupportVersion(version: string): void {
    const versionConfig = this.getVersionConfig(version);
    if (versionConfig) {
      versionConfig.supported = false;
    }
  }

  /**
   * Get the full versioning configuration
   */
  public getConfig(): VersioningConfig {
    return { ...this.config };
  }
}

// Singleton instance export
export const apiVersionManager = ApiVersionManager.getInstance();
