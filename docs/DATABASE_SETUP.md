# 🗄️ Database Setup Guide

This guide explains how to set up the PostgreSQL database for the CI/CD Pipeline Analyzer application.

## 📋 Prerequisites

### Option 1: Docker (Recommended)
- Docker Desktop installed and running
- docker-compose available

### Option 2: Local PostgreSQL Installation
- PostgreSQL 13+ installed locally
- Database server running on port 5432

## 🚀 Quick Setup

### Using Docker (Recommended)

1. **Start the database services:**
   ```bash
   docker-compose up -d postgres redis
   ```

2. **Initialize the database:**
   ```bash
   npm run db:init
   ```

3. **Seed with sample data (optional):**
   ```bash
   npm run db:seed -- --users --pipelines --admin-email admin@example.com
   ```

### Using Local PostgreSQL

1. **Create the database:**
   ```sql
   CREATE DATABASE cicddpa_dev;
   CREATE USER cicddpa_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE cicddpa_dev TO cicddpa_user;
   ```

2. **Update your .env file:**
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_DATABASE=cicddpa_dev
   DB_USERNAME=cicddpa_user
   DB_PASSWORD=your_secure_password
   DB_SSL=false
   DB_POOL_SIZE=10
   ```

3. **Initialize the database:**
   ```bash
   npm run db:init
   ```

## 🛠️ Database CLI Commands

The application includes a comprehensive database CLI for management tasks:

### Basic Operations

```bash
# Check database status and configuration
npm run db:status

# Initialize database and run migrations
npm run db:init

# Run migrations only
npm run db:migrate

# Check database health
npm run db:health
```

### Data Management

```bash
# Seed database with sample data
npm run db:seed -- --users --pipelines

# Create admin user
npm run db:seed -- --admin-email admin@example.com --admin-password secure123

# Clear all data (development only)
npm run db:clear -- --confirm

# Create backup
npm run db:backup
```

### Maintenance

```bash
# Clean up old data (older than 90 days)
npm run db:maintenance

# Clean up with custom retention (30 days)
npm run db:maintenance -- --days 30
```

## 🏗️ Database Schema

The application uses TypeORM with the following main entities:

### Core Entities
- **User**: Application users with role-based access
- **Pipeline**: CI/CD pipeline configurations
- **PipelineRun**: Individual pipeline executions
- **PipelineMetrics**: Performance and analytics data

### Analytics Entities
- **StatisticalResult**: Statistical analysis results
- **StatisticalCache**: Cached statistical computations
- **AnomalyHistory**: Detected anomalies and patterns
- **TrendHistory**: Historical trend data

## 🔧 Configuration

### Environment Variables

Required database configuration variables:

```env
# Database Connection
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=cicddpa_dev
DB_USERNAME=cicddpa_user
DB_PASSWORD=your_secure_password

# Connection Pool
DB_POOL_SIZE=10
DB_SSL=false

# SSL Configuration (Production)
DB_SSL_REJECT_UNAUTHORIZED=true
DB_SSL_CA=/path/to/ca-cert.crt
DB_SSL_CERT=/path/to/client-cert.crt
DB_SSL_KEY=/path/to/client-key.key
```

### Docker Environment

The docker-compose.yml includes pre-configured PostgreSQL and Redis services:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: cicddpa_dev
      POSTGRES_USER: cicddpa_user
      POSTGRES_PASSWORD: cicddpa_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

## 🧪 Testing Database

For running tests, the application can use:

1. **In-memory database** (default for tests)
2. **Separate test database** (PostgreSQL)
3. **Docker test containers**

### Test Database Setup

```bash
# Create test database
createdb cicddpa_test

# Set test environment variables
export NODE_ENV=test
export DB_DATABASE=cicddpa_test

# Run tests
npm test
```

## 🔍 Troubleshooting

### Common Issues

#### Connection Refused Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**
1. Ensure PostgreSQL is running
2. Check if Docker containers are up: `docker ps`
3. Verify database credentials in .env
4. Check firewall settings

#### Migration Errors
```
Error: relation "users" already exists
```

**Solutions:**
1. Check migration status: `npm run db:status`
2. Reset database: `npm run db:clear -- --confirm && npm run db:init`
3. Review migration files in `src/migrations/`

#### SSL Connection Issues
```
Error: self signed certificate
```

**Solutions:**
1. Set `DB_SSL_REJECT_UNAUTHORIZED=false` for development
2. Configure proper SSL certificates for production
3. Use connection string with SSL parameters

### Debug Mode

Enable detailed database logging:

```env
NODE_ENV=development
DB_LOGGING=true
LOG_LEVEL=debug
```

## 📊 Monitoring

### Health Checks

The application provides comprehensive database monitoring:

```bash
# Basic health check
npm run db:health

# Detailed status with metrics
npm run db:status
```

### Performance Monitoring

- Connection pool statistics
- Query performance metrics
- Cache hit ratios
- Migration history

## 🔐 Security

### Production Security

1. **SSL/TLS Encryption**: Always enable SSL in production
2. **Strong Passwords**: Use complex database passwords
3. **Connection Limits**: Configure appropriate pool sizes
4. **Access Control**: Restrict database access by IP
5. **Audit Logging**: Enable query logging for security analysis

### Best Practices

- Regular backups with `npm run db:backup`
- Monitor connection pool utilization
- Review and rotate database credentials
- Keep PostgreSQL version updated
- Use read replicas for analytics queries

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TypeORM Documentation](https://typeorm.io/)
- [Docker PostgreSQL](https://hub.docker.com/_/postgres)
- [Database Security Best Practices](../DATABASE_SECURITY_COMPLETE.md)

---

*For more detailed information, see the related documentation files in the `docs/` directory.*
