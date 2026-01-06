/**
 * Enterprise Configuration Management
 * Modular, type-safe configuration with environment validation
 */

import { config } from 'dotenv';
import Joi from 'joi';
import type { AppConfig } from '@/types';
import { PipelineProvider } from '@/types';

// Load environment variables
config();

// === Backward-compatible ENV key mapping ===
// Accept DATABASE_* and SERVER_* aliases by mapping them to DB_* and HOST/PORT
const env = process.env as Record<string, string | undefined>;

// Database aliases
if (!env.DB_HOST && env.DATABASE_HOST) env.DB_HOST = env.DATABASE_HOST;
if (!env.DB_PORT && env.DATABASE_PORT) env.DB_PORT = env.DATABASE_PORT;
if (!env.DB_NAME && env.DATABASE_NAME) env.DB_NAME = env.DATABASE_NAME;
if (!env.DB_USERNAME && env.DATABASE_USERNAME) env.DB_USERNAME = env.DATABASE_USERNAME;
if (!env.DB_PASSWORD && env.DATABASE_PASSWORD) env.DB_PASSWORD = env.DATABASE_PASSWORD;
if (!env.DB_SSL && env.DATABASE_SSL) env.DB_SSL = env.DATABASE_SSL;

// Server aliases
if (!env.HOST && (env.SERVER_HOST || env.SERVERNAME)) env.HOST = env.SERVER_HOST || env.SERVERNAME;
if (!env.PORT && env.SERVER_PORT) env.PORT = env.SERVER_PORT;

// === Environment Validation Schema ===
const configSchema = Joi.object({
  // Server Configuration
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  HOST: Joi.string().default('0.0.0.0'),

  // Database Configuration
  DB_TYPE: Joi.string().valid('postgres', 'mysql', 'sqlite').default('postgres'),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().port().default(5432),
  DB_NAME: Joi.string().when('DB_TYPE', {
    is: 'sqlite',
    then: Joi.string().default(':memory:'),
    otherwise: Joi.string().required(),
  }),
  DB_USERNAME: Joi.string().when('DB_TYPE', {
    is: 'sqlite',
    then: Joi.string().optional(),
    otherwise: Joi.string().required(),
  }),
  DB_PASSWORD: Joi.string().when('DB_TYPE', {
    is: 'sqlite',
    then: Joi.string().optional(),
    otherwise: Joi.string().required(),
  }),
  DB_SSL: Joi.boolean().default(false),
  DB_POOL_SIZE: Joi.number().min(1).max(100).default(10),
  DB_SYNCHRONIZE: Joi.boolean().default(false),
  DB_DROP_SCHEMA: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),

  // Redis Configuration
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_DB: Joi.number().min(0).max(15).default(0),
  REDIS_TTL: Joi.number().min(60).default(3600),

  // Authentication Configuration
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),
  BCRYPT_ROUNDS: Joi.number().min(10).max(15).default(12),

  // CORS Configuration
  CORS_ORIGIN: Joi.string().default('*'),
  CORS_CREDENTIALS: Joi.boolean().default(true),

  // Security Configuration
  RATE_LIMITING: Joi.boolean().default(true),
  HELMET_ENABLED: Joi.boolean().default(true),
  COMPRESSION_ENABLED: Joi.boolean().default(true),

  // Module Configuration
  MODULES_ENABLED: Joi.string().default('github-actions,gitlab-ci,jenkins'),
  CACHING_ENABLED: Joi.boolean().default(true),
  CACHING_STRATEGY: Joi.string().valid('lru', 'lfu', 'fifo').default('lru'),
  CACHING_MAX_SIZE: Joi.number().min(100).default(10000),

  // Monitoring Configuration
  MONITORING_ENABLED: Joi.boolean().default(true),
  PROMETHEUS_ENABLED: Joi.boolean().default(true),
  JAEGER_ENABLED: Joi.boolean().default(false),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'simple').default('json'),

  // Provider-specific configurations (GitHub Actions)
  GITHUB_TOKEN: Joi.string().allow('').optional(),
  GITHUB_WEBHOOK_SECRET: Joi.string().allow('').optional(),

  // Provider-specific configurations (GitLab CI)
  GITLAB_TOKEN: Joi.string().allow('').optional(),
  GITLAB_BASE_URL: Joi.string().uri().allow('').optional(),
  GITLAB_WEBHOOK_SECRET: Joi.string().allow('').optional(),

  // Provider-specific configurations (Jenkins)
  JENKINS_URL: Joi.string().uri().allow('').optional(),
  JENKINS_USERNAME: Joi.string().allow('').optional(),
  JENKINS_TOKEN: Joi.string().allow('').optional(),
});

// === Validate Environment Variables ===
const { error, value: envVars } = configSchema.validate(process.env, {
  allowUnknown: true,
  stripUnknown: true,
});

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// === Build Application Configuration ===
const appConfig: AppConfig = {
  server: {
    port: envVars.PORT as number,
    host: envVars.HOST as string,
    cors: {
      origin: envVars.CORS_ORIGIN as string,
      credentials: envVars.CORS_CREDENTIALS as boolean,
      optionsSuccessStatus: 200,
    },
    security: {
      rateLimiting: envVars.RATE_LIMITING as boolean,
      helmet: envVars.HELMET_ENABLED as boolean,
      compression: envVars.COMPRESSION_ENABLED as boolean,
    },
  },

  database: {
    type: envVars.DB_TYPE as 'postgres',
    host: envVars.DB_HOST as string,
    port: envVars.DB_PORT as number,
    database: envVars.DB_NAME as string,
    username: envVars.DB_USERNAME as string,
    password: envVars.DB_PASSWORD as string,
    ssl: envVars.DB_SSL as boolean,
    poolSize: envVars.DB_POOL_SIZE as number,
  },

  redis: {
    host: envVars.REDIS_HOST as string,
    port: envVars.REDIS_PORT as number,
    ...(envVars.REDIS_PASSWORD && { password: envVars.REDIS_PASSWORD as string }),
    db: envVars.REDIS_DB as number,
    ttl: envVars.REDIS_TTL as number,
  },

  auth: {
    jwtSecret: envVars.JWT_SECRET as string,
    jwtExpiresIn: envVars.JWT_EXPIRES_IN as string,
    refreshTokenExpiresIn: envVars.REFRESH_TOKEN_EXPIRES_IN as string,
    bcryptRounds: envVars.BCRYPT_ROUNDS as number,
  },

  modules: {
    providers: {
      'github-actions': {
        provider: PipelineProvider.GITHUB_ACTIONS,
        baseUrl: 'https://api.github.com',
        apiToken: envVars.GITHUB_TOKEN as string,
        webhookSecret: envVars.GITHUB_WEBHOOK_SECRET as string,
        rateLimits: {
          requestsPerMinute: 5000,
          burstLimit: 100,
          backoffStrategy: 'exponential' as const,
        },
        retryConfig: {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
        },
      },
      'gitlab-ci': {
        provider: PipelineProvider.GITLAB_CI,
        baseUrl: (envVars.GITLAB_BASE_URL as string) || 'https://gitlab.com/api/v4',
        apiToken: envVars.GITLAB_TOKEN as string,
        webhookSecret: envVars.GITLAB_WEBHOOK_SECRET as string,
        rateLimits: {
          requestsPerMinute: 2000,
          burstLimit: 50,
          backoffStrategy: 'exponential' as const,
        },
        retryConfig: {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
        },
      },
      jenkins: {
        provider: PipelineProvider.JENKINS,
        baseUrl: (envVars.JENKINS_URL as string) || '',
        apiToken: envVars.JENKINS_TOKEN as string,
        rateLimits: {
          requestsPerMinute: 1000,
          burstLimit: 25,
          backoffStrategy: 'linear' as const,
        },
        retryConfig: {
          maxAttempts: 2,
          initialDelay: 2000,
          maxDelay: 5000,
          backoffMultiplier: 1.5,
        },
      },
    },
    analysis: {
      performanceThresholds: {
        slowExecutionTime: 300000, // 5 minutes
        failureRateThreshold: 0.1, // 10%
        resourceEfficiencyThreshold: 0.7, // 70%
      },
      trendsAnalysis: {
        lookbackPeriod: 30, // days
        significanceThreshold: 0.05,
      },
    },
    caching: {
      enabled: envVars.CACHING_ENABLED as boolean,
      ttl: envVars.REDIS_TTL as number,
      maxSize: envVars.CACHING_MAX_SIZE as number,
      strategy: envVars.CACHING_STRATEGY as 'lru',
    },
  },

  monitoring: {
    enabled: envVars.MONITORING_ENABLED as boolean,
    prometheus: envVars.PROMETHEUS_ENABLED as boolean,
    jaeger: envVars.JAEGER_ENABLED as boolean,
    logging: {
      level: envVars.LOG_LEVEL as 'info',
      format: envVars.LOG_FORMAT as 'json',
      ...(process.env.LOG_FILE && { file: process.env.LOG_FILE }),
      maxSize: '10m',
      maxFiles: 5,
    },
  },
};

// === Configuration Utilities ===
export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    this.config = appConfig;
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public get(): AppConfig {
    return this.config;
  }

  public getServer(): AppConfig['server'] {
    return this.config.server;
  }

  public getDatabase(): AppConfig['database'] {
    return this.config.database;
  }

  public getRedis(): AppConfig['redis'] {
    return this.config.redis;
  }

  public getAuth(): AppConfig['auth'] {
    return this.config.auth;
  }

  public getModules(): AppConfig['modules'] {
    return this.config.modules;
  }

  public getMonitoring(): AppConfig['monitoring'] {
    return this.config.monitoring;
  }

  public getProviderConfig(provider: string): any {
    return this.config.modules.providers[provider];
  }

  public isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  public isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  public isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  // === Configuration Validation ===
  public validateConfiguration(): void {
    // Only require providers in production
    if (this.isProduction()) {
      const requiredProviders = ['github-actions'];

      for (const provider of requiredProviders) {
        const config = this.getProviderConfig(provider);
        if (!config?.apiToken) {
          throw new Error(`Missing configuration for required provider: ${provider}`);
        }
      }
    }

    // Validate JWT secret strength
    if (this.config.auth.jwtSecret.length < 32) {
      throw new Error('JWT secret must be at least 32 characters long');
    }

    // Validate database configuration unless DB init is intentionally skipped
    const skipDb = (process.env.SKIP_DB_INIT || 'false').toLowerCase() === 'true';
    if (!skipDb) {
      if (!this.config.database.database || !this.config.database.username) {
        throw new Error('Database configuration is incomplete');
      }
    }
  }

  // === Runtime Configuration Updates ===
  public updateProviderConfig(provider: string, config: Partial<any>): void {
    if (this.config.modules.providers[provider]) {
      this.config.modules.providers[provider] = {
        ...this.config.modules.providers[provider],
        ...config,
      };
    }
  }

  public enableModule(moduleName: string): void {
    // Implementation for enabling modules at runtime
  }

  public disableModule(moduleName: string): void {
    // Implementation for disabling modules at runtime
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();
export default appConfig;
