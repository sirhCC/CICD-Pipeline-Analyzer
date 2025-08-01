/**
 * Comprehensive JWT Authentication Middleware Tests
 * 
 * Tests covering:
 * - JWT token generation and verification
 * - API key authentication
 * - Role-based access control
 * - Permission-based authorization
 * - Security features (MFA, IP whitelisting, rate limiting)
 * - Error handling scenarios
 * - Utility functions
 * 
 * @author sirhCC
 * @version 1.0.0
 */

import request from 'supertest';
import express, { Application } from 'express';
import jwt from 'jsonwebtoken';
import { 
  getAuthService,
  authenticateJWT,
  requireRole,
  requirePermission,
  optionalAuth,
  hashPassword,
  verifyPassword,
  generateSessionId,
  getRolePermissions,
  UserRole,
  Permission,
  JWTPayload,
  AuthenticatedRequest,
  ROLE_PERMISSIONS
} from '../middleware/auth';
import { AuthenticationError, AuthorizationError } from '../middleware/error-handler';
import { errorHandler } from '../middleware/error-handler';

describe('JWT Authentication Middleware Tests', () => {
  let app: Application;
  let testUserId: string;
  let testSessionId: string;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    testUserId = 'test-user-123';
    testSessionId = generateSessionId();
    
    // Test routes for authentication
    app.get('/public', (req, res) => {
      res.json({ message: 'Public endpoint' });
    });
    
    app.get('/protected', authenticateJWT, (req: AuthenticatedRequest, res) => {
      res.json({ 
        message: 'Protected endpoint', 
        user: req.user,
        authenticated: true 
      });
    });
    
    app.get('/admin-only', 
      authenticateJWT, 
      requireRole(UserRole.ADMIN), 
      (req: AuthenticatedRequest, res) => {
        res.json({ 
          message: 'Admin only endpoint', 
          user: req.user 
        });
      }
    );
    
    app.get('/analyst-or-admin', 
      authenticateJWT, 
      requireRole(UserRole.ANALYST, UserRole.ADMIN), 
      (req: AuthenticatedRequest, res) => {
        res.json({ 
          message: 'Analyst or Admin endpoint', 
          user: req.user 
        });
      }
    );
    
    app.get('/pipelines-read', 
      authenticateJWT, 
      requirePermission(Permission.PIPELINES_READ), 
      (req: AuthenticatedRequest, res) => {
        res.json({ 
          message: 'Pipelines read endpoint', 
          user: req.user 
        });
      }
    );
    
    app.get('/system-config', 
      authenticateJWT, 
      requirePermission(Permission.SYSTEM_CONFIG, Permission.SYSTEM_LOGS), 
      (req: AuthenticatedRequest, res) => {
        res.json({ 
          message: 'System config endpoint', 
          user: req.user 
        });
      }
    );
    
    app.get('/optional', optionalAuth, (req: AuthenticatedRequest, res) => {
      res.json({ 
        message: 'Optional auth endpoint', 
        authenticated: !!req.user,
        user: req.user 
      });
    });
    
    // Add error handler
    app.use(errorHandler);
  });

  afterEach(() => {
    // Clear any blacklisted tokens
    jest.clearAllMocks();
  });

  describe('AuthService', () => {
    describe('Token Generation', () => {
      test('should generate valid JWT access token', () => {
        const payload = {
          userId: testUserId,
          email: 'test@example.com',
          role: UserRole.ANALYST,
          permissions: getRolePermissions(UserRole.ANALYST),
          sessionId: testSessionId
        };

        const token = getAuthService().generateAccessToken(payload);
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        
        // Verify token can be decoded
        const decoded = jwt.verify(token, String(getAuthService().config.jwtSecret)) as JWTPayload;
        expect(decoded.userId).toBe(testUserId);
        expect(decoded.role).toBe(UserRole.ANALYST);
        expect(decoded.sessionId).toBe(testSessionId);
      });

      test('should generate valid refresh token', () => {
        const token = getAuthService().generateRefreshToken(testUserId, testSessionId, 'family-123');
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        
        const decoded = jwt.verify(token, String(getAuthService().config.jwtRefreshSecret));
        expect(decoded).toMatchObject({
          userId: testUserId,
          sessionId: testSessionId,
          tokenFamily: 'family-123'
        });
      });

      test('should generate valid API key', () => {
        const apiKey = getAuthService().generateApiKey({
          keyId: 'api-key-123',
          userId: testUserId,
          permissions: ['pipelines:read', 'reports:read'],
          rateLimit: 1000,
          allowedIPs: ['192.168.1.1']
        });
        
        expect(apiKey).toBeDefined();
        expect(typeof apiKey).toBe('string');
        
        const decoded = jwt.verify(apiKey, String(getAuthService().config.apiKeySecret));
        expect(decoded).toMatchObject({
          keyId: 'api-key-123',
          userId: testUserId,
          permissions: ['pipelines:read', 'reports:read'],
          rateLimit: 1000,
          allowedIPs: ['192.168.1.1']
        });
      });
    });

    describe('Token Verification', () => {
      test('should verify valid JWT token', () => {
        const payload = {
          userId: testUserId,
          email: 'test@example.com',
          role: UserRole.ANALYST,
          permissions: getRolePermissions(UserRole.ANALYST),
          sessionId: testSessionId
        };

        const token = getAuthService().generateAccessToken(payload);
        const decoded = getAuthService().verifyToken(token, String(getAuthService().config.jwtSecret));
        
        expect(decoded.userId).toBe(testUserId);
        expect(decoded.role).toBe(UserRole.ANALYST);
      });

      test('should throw AuthenticationError for expired token', () => {
        const expiredToken = jwt.sign(
          { userId: testUserId, exp: Math.floor(Date.now() / 1000) - 3600 },
          String(getAuthService().config.jwtSecret)
        );
        
        expect(() => {
          getAuthService().verifyToken(expiredToken, String(getAuthService().config.jwtSecret));
        }).toThrow(AuthenticationError);
      });

      test('should throw AuthenticationError for invalid token', () => {
        expect(() => {
          getAuthService().verifyToken('invalid-token', String(getAuthService().config.jwtSecret));
        }).toThrow(AuthenticationError);
      });

      test('should throw AuthenticationError for wrong secret', () => {
        const token = jwt.sign({ userId: testUserId }, 'wrong-secret');
        
        expect(() => {
          getAuthService().verifyToken(token, String(getAuthService().config.jwtSecret));
        }).toThrow(AuthenticationError);
      });
    });

    describe('Token Blacklist', () => {
      test('should blacklist tokens', () => {
        const token = 'test-token-123';
        expect(getAuthService().isTokenBlacklisted(token)).toBe(false);
        
        getAuthService().blacklistToken(token);
        expect(getAuthService().isTokenBlacklisted(token)).toBe(true);
      });
    });

    describe('Failed Attempts Tracking', () => {
      test('should track failed login attempts', () => {
        const identifier = 'user@example.com';
        
        expect(getAuthService().isAccountLocked(identifier)).toBe(false);
        
        // Simulate multiple failed attempts
        for (let i = 0; i < 5; i++) {
          getAuthService().trackFailedAttempt(identifier);
        }
        
        expect(getAuthService().isAccountLocked(identifier)).toBe(true);
      });

      test('should clear failed attempts on successful login', () => {
        const identifier = 'user@example.com';
        
        getAuthService().trackFailedAttempt(identifier);
        getAuthService().trackFailedAttempt(identifier);
        getAuthService().clearFailedAttempts(identifier);
        
        expect(getAuthService().isAccountLocked(identifier)).toBe(false);
      });
    });

    describe('IP Whitelisting', () => {
      test('should allow any IP when whitelisting is disabled', () => {
        expect(getAuthService().isIpAllowed('192.168.1.1')).toBe(true);
        expect(getAuthService().isIpAllowed('10.0.0.1')).toBe(true);
      });

      test('should check IP whitelist when provided', () => {
        const allowedIPs = ['192.168.1.1', '10.0.0.1'];
        
        // For testing, we need to override the config temporarily
        const originalConfig = getAuthService().config.enableIpWhitelisting;
        (getAuthService() as any).authConfig.enableIpWhitelisting = true;
        
        expect(getAuthService().isIpAllowed('192.168.1.1', allowedIPs)).toBe(true);
        expect(getAuthService().isIpAllowed('192.168.1.2', allowedIPs)).toBe(false);
        expect(getAuthService().isIpAllowed('*', allowedIPs)).toBe(false);
        
        // Restore original config
        (getAuthService() as any).authConfig.enableIpWhitelisting = originalConfig;
      });

      test('should allow wildcard IP', () => {
        const allowedIPs = ['*'];
        
        expect(getAuthService().isIpAllowed('192.168.1.1', allowedIPs)).toBe(true);
        expect(getAuthService().isIpAllowed('10.0.0.1', allowedIPs)).toBe(true);
      });
    });
  });

  describe('JWT Authentication Middleware', () => {
    test('should authenticate valid JWT token', async () => {
      const payload = {
        userId: testUserId,
        email: 'test@example.com',
        role: UserRole.ANALYST,
        permissions: getRolePermissions(UserRole.ANALYST),
        sessionId: testSessionId
      };

      const token = getAuthService().generateAccessToken(payload);
      
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.authenticated).toBe(true);
      expect(response.body.user.userId).toBe(testUserId);
      expect(response.body.user.role).toBe(UserRole.ANALYST);
    });

    test('should authenticate valid API key', async () => {
      const apiKey = getAuthService().generateApiKey({
        keyId: 'api-key-123',
        userId: testUserId,
        permissions: getRolePermissions(UserRole.DEVELOPER),
        rateLimit: 1000
      });
      
      const response = await request(app)
        .get('/protected')
        .set('x-api-key', apiKey)
        .expect(200);

      expect(response.body.authenticated).toBe(true);
      expect(response.body.user.userId).toBe(testUserId);
      expect(response.body.user.isApiKey).toBe(true);
    });

    test('should reject missing authorization header', async () => {
      await request(app)
        .get('/protected')
        .expect(401);
    });

    test('should reject invalid authorization header format', async () => {
      await request(app)
        .get('/protected')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });

    test('should reject blacklisted token', async () => {
      const payload = {
        userId: testUserId,
        email: 'test@example.com',
        role: UserRole.ANALYST,
        permissions: getRolePermissions(UserRole.ANALYST),
        sessionId: testSessionId
      };

      const token = getAuthService().generateAccessToken(payload);
      getAuthService().blacklistToken(token);
      
      await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    test('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { 
          userId: testUserId,
          role: UserRole.ANALYST,
          exp: Math.floor(Date.now() / 1000) - 3600 
        },
        String(getAuthService().config.jwtSecret)
      );
      
      await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('Role-based Authorization', () => {
    test('should allow access for correct role', async () => {
      const payload = {
        userId: testUserId,
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        permissions: getRolePermissions(UserRole.ADMIN),
        sessionId: testSessionId
      };

      const token = getAuthService().generateAccessToken(payload);
      
      await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    test('should deny access for incorrect role', async () => {
      const payload = {
        userId: testUserId,
        email: 'user@example.com',
        role: UserRole.VIEWER,
        permissions: getRolePermissions(UserRole.VIEWER),
        sessionId: testSessionId
      };

      const token = getAuthService().generateAccessToken(payload);
      
      await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    test('should allow access for multiple allowed roles', async () => {
      const analystPayload = {
        userId: testUserId,
        email: 'analyst@example.com',
        role: UserRole.ANALYST,
        permissions: getRolePermissions(UserRole.ANALYST),
        sessionId: testSessionId
      };

      const adminPayload = {
        userId: testUserId,
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        permissions: getRolePermissions(UserRole.ADMIN),
        sessionId: testSessionId
      };

      const analystToken = getAuthService().generateAccessToken(analystPayload);
      const adminToken = getAuthService().generateAccessToken(adminPayload);
      
      await request(app)
        .get('/analyst-or-admin')
        .set('Authorization', `Bearer ${analystToken}`)
        .expect(200);

      await request(app)
        .get('/analyst-or-admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Permission-based Authorization', () => {
    test('should allow access with correct permission', async () => {
      const payload = {
        userId: testUserId,
        email: 'analyst@example.com',
        role: UserRole.ANALYST,
        permissions: getRolePermissions(UserRole.ANALYST),
        sessionId: testSessionId
      };

      const token = getAuthService().generateAccessToken(payload);
      
      await request(app)
        .get('/pipelines-read')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    test('should deny access without required permission', async () => {
      const payload = {
        userId: testUserId,
        email: 'viewer@example.com',
        role: UserRole.VIEWER,
        permissions: getRolePermissions(UserRole.VIEWER),
        sessionId: testSessionId
      };

      const token = getAuthService().generateAccessToken(payload);
      
      await request(app)
        .get('/system-config')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    test('should require all specified permissions', async () => {
      const payload = {
        userId: testUserId,
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        permissions: getRolePermissions(UserRole.ADMIN),
        sessionId: testSessionId
      };

      const token = getAuthService().generateAccessToken(payload);
      
      await request(app)
        .get('/system-config')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('Optional Authentication', () => {
    test('should work without authentication', async () => {
      const response = await request(app)
        .get('/optional')
        .expect(200);

      expect(response.body.authenticated).toBe(false);
      expect(response.body.user).toBeUndefined();
    });

    test('should work with valid authentication', async () => {
      const payload = {
        userId: testUserId,
        email: 'user@example.com',
        role: UserRole.VIEWER,
        permissions: getRolePermissions(UserRole.VIEWER),
        sessionId: testSessionId
      };

      const token = getAuthService().generateAccessToken(payload);
      
      const response = await request(app)
        .get('/optional')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.authenticated).toBe(true);
      expect(response.body.user.userId).toBe(testUserId);
    });

    test('should continue without authentication on invalid token', async () => {
      const response = await request(app)
        .get('/optional')
        .set('Authorization', 'Bearer invalid-token')
        .expect(200);

      expect(response.body.authenticated).toBe(false);
    });
  });

  describe('Password Utilities', () => {
    test('should hash and verify passwords correctly', async () => {
      const password = 'testPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
      
      const isInvalid = await verifyPassword('wrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Role Permissions Utility', () => {
    test('should return correct permissions for each role', () => {
      expect(getRolePermissions(UserRole.ADMIN)).toEqual(ROLE_PERMISSIONS[UserRole.ADMIN]);
      expect(getRolePermissions(UserRole.ANALYST)).toEqual(ROLE_PERMISSIONS[UserRole.ANALYST]);
      expect(getRolePermissions(UserRole.VIEWER)).toEqual(ROLE_PERMISSIONS[UserRole.VIEWER]);
      expect(getRolePermissions(UserRole.DEVELOPER)).toEqual(ROLE_PERMISSIONS[UserRole.DEVELOPER]);
    });

    test('should return empty array for invalid role', () => {
      expect(getRolePermissions('invalid-role' as UserRole)).toEqual([]);
    });

    test('should validate role permissions mapping', () => {
      // Admin should have all permissions
      const allPermissions = Object.values(Permission);
      expect(getRolePermissions(UserRole.ADMIN)).toEqual(allPermissions);
      
      // Analyst should have subset of permissions
      const analystPermissions = getRolePermissions(UserRole.ANALYST);
      expect(analystPermissions).toContain(Permission.PIPELINES_READ);
      expect(analystPermissions).toContain(Permission.PIPELINES_WRITE);
      expect(analystPermissions).not.toContain(Permission.SYSTEM_CONFIG);
      
      // Viewer should have minimal permissions
      const viewerPermissions = getRolePermissions(UserRole.VIEWER);
      expect(viewerPermissions).toContain(Permission.PIPELINES_READ);
      expect(viewerPermissions).not.toContain(Permission.PIPELINES_WRITE);
      expect(viewerPermissions).not.toContain(Permission.SYSTEM_CONFIG);
    });
  });

  describe('Session Management', () => {
    test('should generate unique session IDs', () => {
      const sessionId1 = generateSessionId();
      const sessionId2 = generateSessionId();
      
      expect(sessionId1).toBeDefined();
      expect(sessionId2).toBeDefined();
      expect(sessionId1).not.toBe(sessionId2);
      expect(sessionId1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
  });

  describe('Security Headers and Best Practices', () => {
    test('should not expose sensitive information in errors', async () => {
      const response = await request(app)
        .get('/protected')
        .expect(401);

      // Check that error response exists and has proper format
      expect(response.body).toBeDefined();
      expect(response.body.error || response.body.message).toBeDefined();
      
      // Ensure no sensitive information is exposed
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain(getAuthService().config.jwtSecret);
      expect(response.body.stack).toBeUndefined(); // No stack trace in production-like errors
    });
  });
});
