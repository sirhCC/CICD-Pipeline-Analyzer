"use strict";
/**
 * Enterprise Configuration Management
 * Modular, type-safe configuration with environment validation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configManager = exports.ConfigManager = void 0;
const dotenv_1 = require("dotenv");
const joi_1 = __importDefault(require("joi"));
const types_1 = require("@/types");
// Load environment variables
(0, dotenv_1.config)();
// === Environment Validation Schema ===
const configSchema = joi_1.default.object({
    // Server Configuration
    NODE_ENV: joi_1.default.string().valid('development', 'production', 'test').default('development'),
    PORT: joi_1.default.number().port().default(3000),
    HOST: joi_1.default.string().default('0.0.0.0'),
    // Database Configuration
    DB_TYPE: joi_1.default.string().valid('postgres', 'mysql').default('postgres'),
    DB_HOST: joi_1.default.string().default('localhost'),
    DB_PORT: joi_1.default.number().port().default(5432),
    DB_NAME: joi_1.default.string().required(),
    DB_USERNAME: joi_1.default.string().required(),
    DB_PASSWORD: joi_1.default.string().required(),
    DB_SSL: joi_1.default.boolean().default(false),
    DB_POOL_SIZE: joi_1.default.number().min(1).max(100).default(10),
    // Redis Configuration
    REDIS_HOST: joi_1.default.string().default('localhost'),
    REDIS_PORT: joi_1.default.number().port().default(6379),
    REDIS_PASSWORD: joi_1.default.string().optional(),
    REDIS_DB: joi_1.default.number().min(0).max(15).default(0),
    REDIS_TTL: joi_1.default.number().min(60).default(3600),
    // Authentication Configuration
    JWT_SECRET: joi_1.default.string().min(32).required(),
    JWT_EXPIRES_IN: joi_1.default.string().default('24h'),
    REFRESH_TOKEN_EXPIRES_IN: joi_1.default.string().default('7d'),
    BCRYPT_ROUNDS: joi_1.default.number().min(10).max(15).default(12),
    // CORS Configuration
    CORS_ORIGIN: joi_1.default.string().default('*'),
    CORS_CREDENTIALS: joi_1.default.boolean().default(true),
    // Security Configuration
    RATE_LIMITING: joi_1.default.boolean().default(true),
    HELMET_ENABLED: joi_1.default.boolean().default(true),
    COMPRESSION_ENABLED: joi_1.default.boolean().default(true),
    // Module Configuration
    MODULES_ENABLED: joi_1.default.string().default('github-actions,gitlab-ci,jenkins'),
    CACHING_ENABLED: joi_1.default.boolean().default(true),
    CACHING_STRATEGY: joi_1.default.string().valid('lru', 'lfu', 'fifo').default('lru'),
    CACHING_MAX_SIZE: joi_1.default.number().min(100).default(10000),
    // Monitoring Configuration
    MONITORING_ENABLED: joi_1.default.boolean().default(true),
    PROMETHEUS_ENABLED: joi_1.default.boolean().default(true),
    JAEGER_ENABLED: joi_1.default.boolean().default(false),
    LOG_LEVEL: joi_1.default.string().valid('error', 'warn', 'info', 'debug').default('info'),
    LOG_FORMAT: joi_1.default.string().valid('json', 'simple').default('json'),
    // Provider-specific configurations (GitHub Actions)
    GITHUB_TOKEN: joi_1.default.string().optional(),
    GITHUB_WEBHOOK_SECRET: joi_1.default.string().optional(),
    // Provider-specific configurations (GitLab CI)
    GITLAB_TOKEN: joi_1.default.string().optional(),
    GITLAB_BASE_URL: joi_1.default.string().uri().optional(),
    GITLAB_WEBHOOK_SECRET: joi_1.default.string().optional(),
    // Provider-specific configurations (Jenkins)
    JENKINS_URL: joi_1.default.string().uri().optional(),
    JENKINS_USERNAME: joi_1.default.string().optional(),
    JENKINS_TOKEN: joi_1.default.string().optional(),
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
const appConfig = {
    server: {
        port: envVars.PORT,
        host: envVars.HOST,
        cors: {
            origin: envVars.CORS_ORIGIN,
            credentials: envVars.CORS_CREDENTIALS,
            optionsSuccessStatus: 200,
        },
        security: {
            rateLimiting: envVars.RATE_LIMITING,
            helmet: envVars.HELMET_ENABLED,
            compression: envVars.COMPRESSION_ENABLED,
        },
    },
    database: {
        type: envVars.DB_TYPE,
        host: envVars.DB_HOST,
        port: envVars.DB_PORT,
        database: envVars.DB_NAME,
        username: envVars.DB_USERNAME,
        password: envVars.DB_PASSWORD,
        ssl: envVars.DB_SSL,
        poolSize: envVars.DB_POOL_SIZE,
    },
    redis: {
        host: envVars.REDIS_HOST,
        port: envVars.REDIS_PORT,
        ...(envVars.REDIS_PASSWORD && { password: envVars.REDIS_PASSWORD }),
        db: envVars.REDIS_DB,
        ttl: envVars.REDIS_TTL,
    },
    auth: {
        jwtSecret: envVars.JWT_SECRET,
        jwtExpiresIn: envVars.JWT_EXPIRES_IN,
        refreshTokenExpiresIn: envVars.REFRESH_TOKEN_EXPIRES_IN,
        bcryptRounds: envVars.BCRYPT_ROUNDS,
    },
    modules: {
        providers: {
            'github-actions': {
                provider: types_1.PipelineProvider.GITHUB_ACTIONS,
                baseUrl: 'https://api.github.com',
                apiToken: envVars.GITHUB_TOKEN,
                webhookSecret: envVars.GITHUB_WEBHOOK_SECRET,
                rateLimits: {
                    requestsPerMinute: 5000,
                    burstLimit: 100,
                    backoffStrategy: 'exponential',
                },
                retryConfig: {
                    maxAttempts: 3,
                    initialDelay: 1000,
                    maxDelay: 10000,
                    backoffMultiplier: 2,
                },
            },
            'gitlab-ci': {
                provider: types_1.PipelineProvider.GITLAB_CI,
                baseUrl: envVars.GITLAB_BASE_URL || 'https://gitlab.com/api/v4',
                apiToken: envVars.GITLAB_TOKEN,
                webhookSecret: envVars.GITLAB_WEBHOOK_SECRET,
                rateLimits: {
                    requestsPerMinute: 2000,
                    burstLimit: 50,
                    backoffStrategy: 'exponential',
                },
                retryConfig: {
                    maxAttempts: 3,
                    initialDelay: 1000,
                    maxDelay: 10000,
                    backoffMultiplier: 2,
                },
            },
            jenkins: {
                provider: types_1.PipelineProvider.JENKINS,
                baseUrl: envVars.JENKINS_URL || '',
                apiToken: envVars.JENKINS_TOKEN,
                rateLimits: {
                    requestsPerMinute: 1000,
                    burstLimit: 25,
                    backoffStrategy: 'linear',
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
            enabled: envVars.CACHING_ENABLED,
            ttl: envVars.REDIS_TTL,
            maxSize: envVars.CACHING_MAX_SIZE,
            strategy: envVars.CACHING_STRATEGY,
        },
    },
    monitoring: {
        enabled: envVars.MONITORING_ENABLED,
        prometheus: envVars.PROMETHEUS_ENABLED,
        jaeger: envVars.JAEGER_ENABLED,
        logging: {
            level: envVars.LOG_LEVEL,
            format: envVars.LOG_FORMAT,
            ...(process.env.LOG_FILE && { file: process.env.LOG_FILE }),
            maxSize: '10m',
            maxFiles: 5,
        },
    },
};
// === Configuration Utilities ===
class ConfigManager {
    static instance;
    config;
    constructor() {
        this.config = appConfig;
    }
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
    get() {
        return this.config;
    }
    getServer() {
        return this.config.server;
    }
    getDatabase() {
        return this.config.database;
    }
    getRedis() {
        return this.config.redis;
    }
    getAuth() {
        return this.config.auth;
    }
    getModules() {
        return this.config.modules;
    }
    getMonitoring() {
        return this.config.monitoring;
    }
    getProviderConfig(provider) {
        return this.config.modules.providers[provider];
    }
    isProduction() {
        return process.env.NODE_ENV === 'production';
    }
    isDevelopment() {
        return process.env.NODE_ENV === 'development';
    }
    isTest() {
        return process.env.NODE_ENV === 'test';
    }
    // === Configuration Validation ===
    validateConfiguration() {
        const requiredProviders = ['github-actions'];
        for (const provider of requiredProviders) {
            const config = this.getProviderConfig(provider);
            if (!config || !config.apiToken) {
                throw new Error(`Missing configuration for required provider: ${provider}`);
            }
        }
        // Validate JWT secret strength
        if (this.config.auth.jwtSecret.length < 32) {
            throw new Error('JWT secret must be at least 32 characters long');
        }
        // Validate database configuration
        if (!this.config.database.database || !this.config.database.username) {
            throw new Error('Database configuration is incomplete');
        }
    }
    // === Runtime Configuration Updates ===
    updateProviderConfig(provider, config) {
        if (this.config.modules.providers[provider]) {
            this.config.modules.providers[provider] = {
                ...this.config.modules.providers[provider],
                ...config,
            };
        }
    }
    enableModule(moduleName) {
        // Implementation for enabling modules at runtime
    }
    disableModule(moduleName) {
        // Implementation for disabling modules at runtime
    }
}
exports.ConfigManager = ConfigManager;
// Export singleton instance
exports.configManager = ConfigManager.getInstance();
exports.default = appConfig;
//# sourceMappingURL=index.js.map