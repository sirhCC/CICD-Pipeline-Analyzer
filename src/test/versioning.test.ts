/**
 * API Versioning System Test
 * Validates the versioning implementation
 */

import { describe, it, expect } from '@jest/globals';
import { apiVersionManager } from '../config/versioning';
import { ResponseBuilder } from '../shared/api-response';

describe('API Versioning System', () => {
  describe('ApiVersionManager', () => {
    it('should have a default version', () => {
      const defaultVersion = apiVersionManager.getDefaultVersion();
      expect(defaultVersion).toBe('v1');
    });

    it('should have a current version', () => {
      const currentVersion = apiVersionManager.getCurrentVersion();
      expect(currentVersion).toBe('v1');
    });

    it('should return supported versions', () => {
      const supportedVersions = apiVersionManager.getSupportedVersions();
      expect(supportedVersions).toHaveLength(1);
      expect(supportedVersions[0]?.version).toBe('v1');
      expect(supportedVersions[0]?.supported).toBe(true);
    });

    it('should check if version is supported', () => {
      expect(apiVersionManager.isVersionSupported('v1')).toBe(true);
      expect(apiVersionManager.isVersionSupported('v2')).toBe(false);
      expect(apiVersionManager.isVersionSupported('invalid')).toBe(false);
    });

    it('should extract version from request headers', () => {
      const req = {
        headers: { 'x-api-version': 'v1' },
        query: {},
        originalUrl: '/api/v1/test'
      };
      
      const version = apiVersionManager.extractVersionFromRequest(req);
      expect(version).toBe('v1');
    });

    it('should extract version from URL path', () => {
      const req = {
        headers: {},
        query: {},
        originalUrl: '/api/v1/pipelines'
      };
      
      const version = apiVersionManager.extractVersionFromRequest(req);
      expect(version).toBe('v1');
    });

    it('should fall back to default version', () => {
      const req = {
        headers: {},
        query: {},
        originalUrl: '/api/test'
      };
      
      const version = apiVersionManager.extractVersionFromRequest(req);
      expect(version).toBe('v1');
    });

    it('should get version prefix', () => {
      const prefix = apiVersionManager.getVersionPrefix('v1');
      expect(prefix).toBe('/api/v1');
    });

    it('should get version metadata', () => {
      const metadata = apiVersionManager.getVersionMetadata('v1');
      expect(metadata).toMatchObject({
        version: 'v1',
        features: expect.arrayContaining(['authentication', 'pipeline-management']),
        breaking: false
      });
    });

    it('should get response headers', () => {
      const headers = apiVersionManager.getResponseHeaders('v1');
      expect(headers['X-API-Version']).toBe('v1');
    });

    it('should include deprecation warnings for deprecated versions', () => {
      // First deprecate v1 for testing
      apiVersionManager.deprecateVersion('v1', '2025-12-31', '2026-06-30');
      
      const headers = apiVersionManager.getResponseHeaders('v1');
      expect(headers['X-API-Deprecation-Warning']).toContain('deprecated');
      expect(headers['X-API-Sunset']).toBe('2026-06-30');
    });
  });

  describe('ResponseBuilder with Versioning', () => {
    it('should include version in success responses', () => {
      const response = ResponseBuilder.success({ test: 'data' }, undefined, 'req-123', 'v1');
      
      expect(response.success).toBe(true);
      expect(response.version).toBe('v1');
      expect(response.requestId).toBe('req-123');
      expect(response.data).toEqual({ test: 'data' });
    });

    it('should include version in error responses', () => {
      const response = ResponseBuilder.validationError(
        'Test error',
        { field: 'test' },
        'testField',
        'req-123',
        'v1'
      );
      
      expect(response.success).toBe(false);
      expect(response.version).toBe('v1');
      expect(response.requestId).toBe('req-123');
      expect(response.error?.message).toBe('Test error');
    });

    it('should use current version when no version specified', () => {
      const response = ResponseBuilder.success({ test: 'data' });
      
      expect(response.version).toBe('v1');
    });

    it('should handle created responses with versioning', () => {
      const response = ResponseBuilder.created({ id: 1, name: 'test' }, 'req-123', 'v1');
      
      expect(response.success).toBe(true);
      expect(response.version).toBe('v1');
      expect(response.data?.created).toBe(true);
    });

    it('should handle not found responses with versioning', () => {
      const response = ResponseBuilder.notFound('Pipeline', '123', 'req-123', 'v1');
      
      expect(response.success).toBe(false);
      expect(response.version).toBe('v1');
      expect(response.error?.message).toContain('Pipeline');
      expect(response.error?.message).toContain('123');
    });
  });

  describe('Version Features', () => {
    it('should define features for v1', () => {
      const versionConfig = apiVersionManager.getVersionConfig('v1');
      
      expect(versionConfig?.features).toContain('authentication');
      expect(versionConfig?.features).toContain('pipeline-management');
      expect(versionConfig?.features).toContain('basic-analytics');
      expect(versionConfig?.features).toContain('user-management');
    });

    it('should mark v1 as non-breaking', () => {
      const versionConfig = apiVersionManager.getVersionConfig('v1');
      expect(versionConfig?.breaking).toBe(false);
    });
  });

  describe('Version Management', () => {
    it('should add new version configurations', () => {
      const newVersionConfig = {
        version: 'v2',
        prefix: '/api/v2',
        supported: false, // Not yet supported
        deprecated: false,
        features: ['authentication', 'pipeline-management', 'advanced-analytics'],
        breaking: true,
      };

      apiVersionManager.addVersion(newVersionConfig);
      const retrievedConfig = apiVersionManager.getVersionConfig('v2');
      
      expect(retrievedConfig).toMatchObject(newVersionConfig);
    });

    it('should handle deprecation workflow', () => {
      // Add v2 and make it supported
      apiVersionManager.addVersion({
        version: 'v2',
        prefix: '/api/v2',
        supported: true,
        deprecated: false,
        features: ['authentication', 'pipeline-management', 'advanced-analytics'],
        breaking: true,
      });

      // Deprecate v1
      apiVersionManager.deprecateVersion('v1', '2025-12-31', '2026-06-30');
      
      const v1Config = apiVersionManager.getVersionConfig('v1');
      expect(v1Config?.deprecated).toBe(true);
      expect(v1Config?.deprecationDate).toBe('2025-12-31');
      expect(v1Config?.sunsetDate).toBe('2026-06-30');

      const deprecatedVersions = apiVersionManager.getDeprecatedVersions();
      expect(deprecatedVersions).toContainEqual(
        expect.objectContaining({ version: 'v1', deprecated: true })
      );
    });

    it('should handle version unsupporting', () => {
      apiVersionManager.unsupportVersion('v1');
      
      const v1Config = apiVersionManager.getVersionConfig('v1');
      expect(v1Config?.supported).toBe(false);
      expect(apiVersionManager.isVersionSupported('v1')).toBe(false);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle requests for unsupported versions gracefully', () => {
      const req = {
        headers: { 'x-api-version': 'v99' },
        query: {},
        originalUrl: '/api/v99/test'
      };
      
      const version = apiVersionManager.extractVersionFromRequest(req);
      expect(version).toBe('v1'); // Falls back to default
    });

    it('should handle malformed version requests', () => {
      const req = {
        headers: { 'x-api-version': 'invalid-version' },
        query: { version: 'also-invalid' },
        originalUrl: '/api/malformed/test'
      };
      
      const version = apiVersionManager.extractVersionFromRequest(req);
      expect(version).toBe('v1'); // Falls back to default
    });
  });
});
