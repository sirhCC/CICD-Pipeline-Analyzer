import { log } from '@/shared/logger';

interface EnvironmentConfig {
  [key: string]: {
    required: boolean;
    description: string;
    validator?: (value: string) => boolean;
    defaultValue?: string;
  };
}

const environmentConfig: EnvironmentConfig = {
  // Application Environment
  NODE_ENV: {
    required: true,
    description: 'Application environment (development, production, test)',
    validator: (value: string) => ['development', 'production', 'test'].includes(value),
    defaultValue: 'development',
  },
  LOG_LEVEL: {
    required: false,
    description: 'Logging level (error, warn, info, debug)',
    validator: (value: string) => ['error', 'warn', 'info', 'debug'].includes(value),
    defaultValue: 'info',
  },

  // Server Configuration
  PORT: {
    required: false,
    description: 'Server port number',
    validator: (value: string) => !isNaN(parseInt(value)) && parseInt(value) > 0,
    defaultValue: '3000',
  },
  HOST: {
    required: false,
    description: 'Server host address',
    defaultValue: 'localhost',
  },

  // Security - REQUIRED in production
  JWT_SECRET: {
    required: true,
    description: 'JWT signing secret (minimum 32 characters)',
    validator: (value: string) => value.length >= 32,
  },
  JWT_REFRESH_SECRET: {
    required: true,
    description: 'JWT refresh token secret (minimum 32 characters)',
    validator: (value: string) => value.length >= 32,
  },
  API_KEY_SECRET: {
    required: true,
    description: 'API key signing secret (minimum 32 characters)',
    validator: (value: string) => value.length >= 32,
  },
  SESSION_SECRET: {
    required: false,
    description: 'Session secret (minimum 32 characters)',
    validator: (value: string) => value.length >= 32,
  },

  // Database Configuration
  DATABASE_HOST: {
    required: true,
    description: 'PostgreSQL database host',
    defaultValue: 'localhost',
  },
  DATABASE_PORT: {
    required: false,
    description: 'PostgreSQL database port',
    validator: (value: string) => !isNaN(parseInt(value)) && parseInt(value) > 0,
    defaultValue: '5432',
  },
  DATABASE_NAME: {
    required: true,
    description: 'PostgreSQL database name',
  },
  DATABASE_USERNAME: {
    required: true,
    description: 'PostgreSQL database username',
  },
  DATABASE_PASSWORD: {
    required: true,
    description: 'PostgreSQL database password',
  },

  // Redis Configuration
  REDIS_HOST: {
    required: false,
    description: 'Redis host address',
    defaultValue: 'localhost',
  },
  REDIS_PORT: {
    required: false,
    description: 'Redis port number',
    validator: (value: string) => !isNaN(parseInt(value)) && parseInt(value) > 0,
    defaultValue: '6379',
  },
  REDIS_DB: {
    required: false,
    description: 'Redis database number',
    validator: (value: string) => !isNaN(parseInt(value)) && parseInt(value) >= 0,
    defaultValue: '0',
  },
};

export class EnvironmentValidator {
  private static instance: EnvironmentValidator;
  private validationErrors: string[] = [];
  private validationWarnings: string[] = [];
  private warnedDbSkip: boolean = false;

  public static getInstance(): EnvironmentValidator {
    if (!EnvironmentValidator.instance) {
      EnvironmentValidator.instance = new EnvironmentValidator();
    }
    return EnvironmentValidator.instance;
  }

  /**
   * Validate all environment variables
   */
  public validateEnvironment(): { isValid: boolean; errors: string[]; warnings: string[] } {
    this.validationErrors = [];
    this.validationWarnings = [];
    this.warnedDbSkip = false;

    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';
    const skipDb = (process.env.SKIP_DB_INIT || 'false').toLowerCase() === 'true';

    // Apply backward-compatible aliases so validation can see equivalent values
    const env = process.env as Record<string, string | undefined>;
    // Database aliases (both directions, prefer explicit DATABASE_*)
    if (!env.DATABASE_HOST && env.DB_HOST) env.DATABASE_HOST = env.DB_HOST;
    if (!env.DATABASE_PORT && env.DB_PORT) env.DATABASE_PORT = env.DB_PORT;
    if (!env.DATABASE_NAME && env.DB_NAME) env.DATABASE_NAME = env.DB_NAME;
    if (!env.DATABASE_USERNAME && env.DB_USERNAME) env.DATABASE_USERNAME = env.DB_USERNAME;
    if (!env.DATABASE_PASSWORD && env.DB_PASSWORD) env.DATABASE_PASSWORD = env.DB_PASSWORD;
    if (!env.DATABASE_SSL && env.DB_SSL) env.DATABASE_SSL = env.DB_SSL;
    // Server aliases
    if (!env.HOST && (env.SERVER_HOST || env.SERVERNAME))
      env.HOST = env.SERVER_HOST || env.SERVERNAME;
    if (!env.PORT && env.SERVER_PORT) env.PORT = env.SERVER_PORT;

    // Validate each environment variable
    for (const [key, config] of Object.entries(environmentConfig)) {
      const value = process.env[key];

      if (!value) {
        // If DB init is skipped, don't require DATABASE_* keys
        if (skipDb && key.startsWith('DATABASE_')) {
          if (!this.warnedDbSkip) {
            this.validationWarnings.push(
              'Database initialization is skipped (SKIP_DB_INIT=true); DATABASE_* variables are not required.'
            );
            this.warnedDbSkip = true;
          }
          continue;
        }

        if (config.required || (isProduction && this.isSecurityCritical(key))) {
          this.validationErrors.push(
            `Missing required environment variable: ${key} - ${config.description}`
          );
        } else if (config.defaultValue) {
          this.validationWarnings.push(
            `Using default value for ${key}: ${config.defaultValue} - ${config.description}`
          );
          // Set the default value
          process.env[key] = config.defaultValue;
        }
        continue;
      }

      // Validate value format if validator is provided
      if (config.validator && !config.validator(value)) {
        this.validationErrors.push(`Invalid value for ${key}: "${value}" - ${config.description}`);
      }

      // Check for weak secrets in production
      if (isProduction && this.isSecurityCritical(key)) {
        if (this.isWeakSecret(value)) {
          this.validationErrors.push(
            `Weak or default secret detected for ${key} in production environment`
          );
        }
      }
    }

    // Production-specific validations
    if (isProduction) {
      this.validateProductionRequirements();
    }

    return {
      isValid: this.validationErrors.length === 0,
      errors: this.validationErrors,
      warnings: this.validationWarnings,
    };
  }

  /**
   * Check if an environment variable is security-critical
   */
  private isSecurityCritical(key: string): boolean {
    const securityKeys = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'API_KEY_SECRET',
      'SESSION_SECRET',
      'DATABASE_PASSWORD',
      'REDIS_PASSWORD',
    ];
    return securityKeys.includes(key);
  }

  /**
   * Check if a secret value appears to be weak or default
   */
  private isWeakSecret(value: string): boolean {
    const weakPatterns = [
      /^(test|dev|development|production|default)/i,
      /^(secret|password|key|token)/i,
      /^(123|abc|admin|user)/i,
      /change.*production/i,
      /your.*secret/i,
      /super.*secret/i,
    ];

    return (
      weakPatterns.some(pattern => pattern.test(value)) ||
      value.length < 16 ||
      value === value.toLowerCase() ||
      value === value.toUpperCase()
    );
  }

  /**
   * Validate production-specific requirements
   */
  private validateProductionRequirements(): void {
    const skipDb = (process.env.SKIP_DB_INIT || 'false').toLowerCase() === 'true';
    // Ensure HTTPS in production
    const corsOrigin = process.env.CORS_ORIGIN;
    if (corsOrigin && !corsOrigin.startsWith('https://')) {
      this.validationWarnings.push('CORS_ORIGIN should use HTTPS in production environment');
    }

    // Ensure database SSL in production
    if (!skipDb) {
      const databaseSsl = process.env.DATABASE_SSL;
      if (!databaseSsl || databaseSsl.toLowerCase() !== 'true') {
        this.validationWarnings.push('DATABASE_SSL should be enabled in production environment');
      }
    }

    // Ensure proper log level in production
    const logLevel = process.env.LOG_LEVEL;
    if (logLevel === 'debug') {
      this.validationWarnings.push('LOG_LEVEL should not be "debug" in production environment');
    }
  }

  /**
   * Print validation results
   */
  public printValidationResults(results: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }): void {
    if (results.errors.length > 0) {
      log.error('❌ Environment validation failed:');
      results.errors.forEach(error => log.error(`  • ${error}`));
    }

    if (results.warnings.length > 0) {
      log.warn('⚠️  Environment validation warnings:');
      results.warnings.forEach(warning => log.warn(`  • ${warning}`));
    }

    if (results.isValid && results.warnings.length === 0) {
      log.info('✅ Environment validation passed');
    }
  }

  /**
   * Generate .env.example content based on current configuration
   */
  public generateEnvExample(): string {
    const lines: string[] = [
      '# ===============================================',
      '# CI/CD Pipeline Analyzer - Environment Variables',
      '# ===============================================',
      '# Copy this file to .env and configure your values',
      '# Never commit .env to version control!',
      '',
    ];

    let currentSection = '';
    for (const [key, config] of Object.entries(environmentConfig)) {
      const section = this.getEnvironmentSection(key);
      if (section !== currentSection) {
        lines.push(`# ${section}`);
        currentSection = section;
      }

      const defaultValue =
        config.defaultValue ||
        (config.required ? `your-${key.toLowerCase().replace(/_/g, '-')}` : '');
      lines.push(`${key}=${defaultValue}`);
      lines.push(`# ${config.description}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get the section name for an environment variable
   */
  private getEnvironmentSection(key: string): string {
    if (key.startsWith('NODE_') || key.startsWith('LOG_')) return 'Application Configuration';
    if (key.startsWith('PORT') || key.startsWith('HOST') || key.startsWith('SERVER_'))
      return 'Server Configuration';
    if (key.includes('SECRET') || key.includes('JWT') || key.includes('API_KEY'))
      return 'Security Configuration';
    if (key.startsWith('DATABASE_')) return 'Database Configuration';
    if (key.startsWith('REDIS_')) return 'Redis Configuration';
    if (key.startsWith('GITHUB_') || key.startsWith('GITLAB_'))
      return 'CI/CD Provider Configuration';
    return 'Other Configuration';
  }
}

// Export singleton instance
export const environmentValidator = EnvironmentValidator.getInstance();
