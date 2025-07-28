# Database Layer Documentation

## Overview

The database layer provides enterprise-grade PostgreSQL integration with TypeORM for the CI/CD Pipeline Analyzer. This implementation includes comprehensive entity relationships, repository patterns, migrations, and CLI management tools.

## Architecture

### Core Components

1. **Entities** (`src/entities/`)
   - Base entity with common fields (timestamps, soft delete)
   - Pipeline entity with comprehensive metadata
   - PipelineRun and PipelineRunStage for execution tracking
   - User authentication with sessions and API keys

2. **Repositories** (`src/repositories/`)
   - Base repository with common CRUD operations
   - Specialized repositories for each entity
   - Repository factory for centralized access

3. **Migrations** (`src/migrations/`)
   - Initial schema with all tables and relationships
   - Proper PostgreSQL enums and constraints
   - Performance optimized indexes

4. **Services** (`src/services/`)
   - Database service for high-level operations
   - Health monitoring and maintenance
   - Data seeding capabilities

5. **CLI Tools** (`src/cli/`)
   - Command-line interface for database management
   - Migration, seeding, and maintenance operations

## Entity Structure

### BaseEntity
Abstract base class providing:
- UUID primary keys
- Created/updated timestamps
- Soft delete functionality
- Version control

### Pipeline Entity
Represents CI/CD pipelines with:
- Provider-specific integration (GitHub Actions, GitLab CI, Jenkins, etc.)
- Status tracking and statistics
- Performance metrics
- Organization and ownership

### PipelineRun Entity
Tracks individual pipeline executions:
- Detailed execution metadata
- Stage-by-stage breakdown
- Duration and performance tracking
- Trigger information

### User Management
Comprehensive user system:
- Authentication with password hashing
- Role-based permissions (Admin, Analyst, Viewer)
- Session management
- API key system

## Database Operations

### CLI Commands

```bash
# Initialize database and run migrations
npm run db:init

# Run migrations only
npm run db:migrate

# Seed with initial data
npm run db:seed

# Create admin user during seeding
npm run db:seed -- --users --admin-email admin@company.com

# Check database health
npm run db:health

# Show database status
npm run db:status

# Perform maintenance
npm run db:maintenance

# Create backup
npm run db:backup

# Clear all data (dev/test only)
npm run db:clear
```

### Repository Usage

```typescript
import { pipelineRepository, userRepository } from '@/repositories';

// Create a new pipeline
const pipeline = await pipelineRepository.create({
  name: 'My Pipeline',
  provider: PipelineProvider.GITHUB_ACTIONS,
  externalId: 'pipeline-123',
  repository: 'org/repo',
  branch: 'main',
  status: PipelineStatus.SUCCESS
});

// Find pipelines with pagination
const results = await pipelineRepository.findWithPagination({
  page: 1,
  limit: 20,
  search: 'test',
  filters: {
    provider: PipelineProvider.GITHUB_ACTIONS
  }
});

// Create user with authentication
const user = await userRepository.createUser({
  email: 'user@company.com',
  username: 'user123',
  firstName: 'John',
  lastName: 'Doe',
  passwordHash: 'plaintext-password', // Will be hashed automatically
  role: UserRole.ANALYST
});
```

### Database Service

```typescript
import { databaseService } from '@/services';

// Initialize database
await databaseService.initialize();

// Get health status
const health = await databaseService.getHealthStatus();
console.log(`Connected: ${health.isConnected}`);
console.log(`Users: ${health.entityCounts.users}`);

// Seed database
await databaseService.seedDatabase({
  createUsers: true,
  createPipelines: true,
  adminUser: {
    email: 'admin@company.com',
    username: 'admin',
    password: 'secure-password',
    firstName: 'Admin',
    lastName: 'User'
  }
});

// Perform maintenance
const result = await databaseService.performMaintenance();
console.log(`Cleaned up ${result.deletedOldRuns} old runs`);
```

## Configuration

### Environment Variables

```env
# Database Configuration
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_DATABASE=cicd_analyzer
DB_SSL=false

# Connection Pool
DB_MAX_CONNECTIONS=10
DB_ACQUIRE_TIMEOUT=60000
DB_TIMEOUT=60000
```

### TypeORM Configuration

The database configuration is managed through the `configManager` which reads from environment variables and provides defaults for development/testing.

## Features

### Advanced Querying
- Pagination with sorting and filtering
- Full-text search capabilities
- Complex relationship queries
- Performance optimized with proper indexing

### Data Integrity
- Foreign key constraints
- Enum validation
- Required field validation
- Soft delete support

### Performance
- Connection pooling
- Query optimization
- Index strategy
- Statistics collection

### Security
- Password hashing with bcrypt
- SQL injection prevention
- Input validation
- Role-based access control

### Monitoring
- Health check endpoints
- Performance metrics
- Connection pool statistics
- Query logging (configurable)

## Development Workflow

### Running Tests

```bash
# Run database tests
npm test src/test/database.test.ts

# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

### Database Development

1. **Create Migration**:
   ```bash
   # Generate new migration
   npx typeorm migration:generate -n FeatureName
   ```

2. **Update Entities**: Modify entity files in `src/entities/`

3. **Update Repositories**: Add new methods to repository classes

4. **Test Changes**: Use CLI tools to test migrations and data operations

### Troubleshooting

#### Connection Issues
```bash
# Check database status
npm run db:status

# Test connection health
npm run db:health
```

#### Migration Problems
```bash
# Check migration status
npm run db:status

# Re-run migrations
npm run db:migrate
```

#### Data Issues
```bash
# Clear and reseed (dev only)
npm run db:clear
npm run db:seed
```

## Production Considerations

### Deployment
- Use connection pooling for high concurrency
- Configure SSL for production databases
- Set up database monitoring
- Regular backup schedules

### Performance
- Monitor query performance
- Use database indexes effectively
- Regular maintenance operations
- Connection pool tuning

### Security
- Use environment variables for credentials
- Regular security updates
- Database user permissions
- Network security (VPN/private networks)

### Backup Strategy
- Automated daily backups
- Point-in-time recovery capability
- Cross-region backup storage
- Regular restore testing

## Future Enhancements

1. **Read Replicas**: Support for read-only database replicas
2. **Sharding**: Horizontal scaling for large datasets
3. **Caching**: Redis integration for query caching
4. **Analytics**: Advanced reporting and analytics queries
5. **Audit Logging**: Comprehensive audit trail
6. **Data Archiving**: Automated data lifecycle management
