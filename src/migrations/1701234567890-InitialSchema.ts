import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class InitialSchema1701234567890 implements MigrationInterface {
  name = 'InitialSchema1701234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE "pipeline_provider_enum" AS ENUM (
        'github-actions', 'gitlab-ci', 'jenkins', 'azure-devops', 'circleci', 'bitbucket', 'custom'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "pipeline_status_enum" AS ENUM (
        'unknown', 'pending', 'running', 'success', 'failed', 'cancelled', 'skipped', 'timeout'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "pipeline_visibility_enum" AS ENUM (
        'public', 'private', 'internal'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM (
        'admin', 'analyst', 'viewer', 'developer'
      )
    `);

    // Create users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'username',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'firstName',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'lastName',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'passwordHash',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['admin', 'analyst', 'viewer', 'developer'],
            default: "'viewer'",
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'isEmailVerified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isMfaEnabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'mfaSecret',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'mfaBackupCodes',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'lastLoginAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'lastLoginIp',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'loginAttempts',
            type: 'int',
            default: 0,
          },
          {
            name: 'lockedUntil',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'emailVerificationToken',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'passwordResetToken',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'passwordResetExpiresAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'preferences',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'permissions',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'version',
            type: 'int',
            default: 1,
          },
          {
            name: 'isDeleted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'deletedAt',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create pipelines table
    await queryRunner.createTable(
      new Table({
        name: 'pipelines',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'provider',
            type: 'enum',
            enum: ['github-actions', 'gitlab-ci', 'jenkins', 'azure-devops', 'circleci', 'bitbucket', 'custom'],
          },
          {
            name: 'externalId',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'repository',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'branch',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['unknown', 'pending', 'running', 'success', 'failed', 'cancelled', 'skipped', 'timeout'],
            default: "'unknown'",
          },
          {
            name: 'visibility',
            type: 'enum',
            enum: ['public', 'private', 'internal'],
            default: "'private'",
          },
          {
            name: 'owner',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'organization',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'configuration',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'lastRunAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'lastSuccessAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'lastFailureAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'totalRuns',
            type: 'int',
            default: 0,
          },
          {
            name: 'successfulRuns',
            type: 'int',
            default: 0,
          },
          {
            name: 'failedRuns',
            type: 'int',
            default: 0,
          },
          {
            name: 'averageDuration',
            type: 'float',
            isNullable: true,
          },
          {
            name: 'successRate',
            type: 'float',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'isMonitored',
            type: 'boolean',
            default: false,
          },
          {
            name: 'webhookUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'webhookSecret',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'version',
            type: 'int',
            default: 1,
          },
          {
            name: 'isDeleted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'deletedAt',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create pipeline_runs table
    await queryRunner.createTable(
      new Table({
        name: 'pipeline_runs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'pipelineId',
            type: 'uuid',
          },
          {
            name: 'runNumber',
            type: 'int',
          },
          {
            name: 'branch',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'tag',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'commitSha',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'commitMessage',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'commitAuthor',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['unknown', 'pending', 'running', 'success', 'failed', 'cancelled', 'skipped', 'timeout'],
            default: "'pending'",
          },
          {
            name: 'triggeredBy',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'triggeredEvent',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'queuedAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'startedAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'completedAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'duration',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'exitCode',
            type: 'int',
            default: 0,
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'environment',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'variables',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'artifacts',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'testResults',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'resources',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'externalUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'rawData',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'version',
            type: 'int',
            default: 1,
          },
          {
            name: 'isDeleted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'deletedAt',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['pipelineId'],
            referencedTableName: 'pipelines',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );

    // Create pipeline_run_stages table
    await queryRunner.createTable(
      new Table({
        name: 'pipeline_run_stages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'runId',
            type: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['unknown', 'pending', 'running', 'success', 'failed', 'cancelled', 'skipped', 'timeout'],
            default: "'pending'",
          },
          {
            name: 'startedAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'completedAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'duration',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'exitCode',
            type: 'int',
            default: 0,
          },
          {
            name: 'logs',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'resources',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'artifacts',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'version',
            type: 'int',
            default: 1,
          },
          {
            name: 'isDeleted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'deletedAt',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['runId'],
            referencedTableName: 'pipeline_runs',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );

    // Create user_sessions table
    await queryRunner.createTable(
      new Table({
        name: 'user_sessions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'token',
            type: 'varchar',
            length: '500',
            isUnique: true,
          },
          {
            name: 'refreshToken',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamptz',
          },
          {
            name: 'refreshExpiresAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'lastActivityAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'version',
            type: 'int',
            default: 1,
          },
          {
            name: 'isDeleted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'deletedAt',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );

    // Create api_keys table
    await queryRunner.createTable(
      new Table({
        name: 'api_keys',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'key',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'permissions',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'scopes',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'lastUsedAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'lastUsedIp',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'usageCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'rateLimits',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'version',
            type: 'int',
            default: 1,
          },
          {
            name: 'isDeleted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'deletedAt',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );

    // Create indexes using the correct API
    await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_username" ON "users" ("username")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_role" ON "users" ("role")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_isActive" ON "users" ("isActive")`);

    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_pipelines_provider_externalId" ON "pipelines" ("provider", "externalId")`);
    await queryRunner.query(`CREATE INDEX "IDX_pipelines_repository_branch" ON "pipelines" ("repository", "branch")`);
    await queryRunner.query(`CREATE INDEX "IDX_pipelines_status" ON "pipelines" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_pipelines_createdAt" ON "pipelines" ("createdAt")`);

    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_pipeline_runs_pipelineId_runNumber" ON "pipeline_runs" ("pipelineId", "runNumber")`);
    await queryRunner.query(`CREATE INDEX "IDX_pipeline_runs_status" ON "pipeline_runs" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_pipeline_runs_triggeredBy" ON "pipeline_runs" ("triggeredBy")`);
    await queryRunner.query(`CREATE INDEX "IDX_pipeline_runs_startedAt" ON "pipeline_runs" ("startedAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_pipeline_runs_branch" ON "pipeline_runs" ("branch")`);

    await queryRunner.query(`CREATE INDEX "IDX_pipeline_run_stages_runId_name" ON "pipeline_run_stages" ("runId", "name")`);
    await queryRunner.query(`CREATE INDEX "IDX_pipeline_run_stages_status" ON "pipeline_run_stages" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_pipeline_run_stages_startedAt" ON "pipeline_run_stages" ("startedAt")`);

    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_user_sessions_token" ON "user_sessions" ("token")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_sessions_userId" ON "user_sessions" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_sessions_isActive" ON "user_sessions" ("isActive")`);

    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_api_keys_key" ON "api_keys" ("key")`);
    await queryRunner.query(`CREATE INDEX "IDX_api_keys_userId" ON "api_keys" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_api_keys_isActive" ON "api_keys" ("isActive")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.dropTable('api_keys');
    await queryRunner.dropTable('user_sessions');
    await queryRunner.dropTable('pipeline_run_stages');
    await queryRunner.dropTable('pipeline_runs');
    await queryRunner.dropTable('pipelines');
    await queryRunner.dropTable('users');

    // Drop enums
    await queryRunner.query('DROP TYPE "user_role_enum"');
    await queryRunner.query('DROP TYPE "pipeline_visibility_enum"');
    await queryRunner.query('DROP TYPE "pipeline_status_enum"');
    await queryRunner.query('DROP TYPE "pipeline_provider_enum"');
  }
}
