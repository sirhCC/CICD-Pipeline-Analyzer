# 🐳 Docker Development Environment

This document describes how to use Docker for local development of the CI/CD Pipeline Analyzer.

## 📋 Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v2.0+
- 4GB+ RAM available for containers
- Ports available: 3000, 5432, 5433, 6379, 8080, 8081

## 🚀 Quick Start

### 1. Start Development Environment

```bash
# Start all services (PostgreSQL, Redis, App)
npm run docker:dev

# Or with detached mode (runs in background)
npm run docker:dev:detached
```

### 2. Access Services

- **Application**: http://localhost:3000
- **Database Admin (Adminer)**: http://localhost:8080
  - Server: `postgres`
  - Username: `postgres` 
  - Password: `dev-password-change-in-production`
  - Database: `cicd_analyzer`
- **Redis Admin**: http://localhost:8081
  - Username: `admin`
  - Password: `admin`

### 3. View Logs

```bash
# View application logs
npm run docker:logs

# View all service logs
docker-compose logs -f
```

## 🛠️ Development Workflow

### Container Management

```bash
# Stop all containers
npm run docker:down

# Stop and remove volumes (fresh start)
npm run docker:down:volumes

# Rebuild containers
npm run docker:dev
```

### Database Operations

```bash
# Access PostgreSQL shell
npm run docker:db:shell

# Access application container shell
npm run docker:shell

# Run database migrations (inside app container)
docker-compose exec app npm run db:migrate

# Seed test data
docker-compose exec app npm run db:seed
```

### Testing with Docker

```bash
# Run tests inside container
docker-compose exec app npm test

# Run tests with coverage
docker-compose exec app npm run test:coverage
```

## 📁 Service Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   PostgreSQL    │    │     Redis       │
│   (Node.js)     │────│   (Database)    │    │    (Cache)      │
│   Port: 3000    │    │   Port: 5432    │    │   Port: 6379    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐    ┌─────────────────┐
                    │     Adminer     │    │ Redis Commander │
                    │  (DB Admin UI)  │    │ (Redis Admin)   │
                    │   Port: 8080    │    │   Port: 8081    │
                    └─────────────────┘    └─────────────────┘
```

## 🔧 Configuration

### Environment Variables

The Docker setup uses these key environment files:

- `.env.docker` - Docker-specific configuration
- `.env` - Application configuration (auto-loaded)

### Database Configuration

**Main Database (Development)**
- Host: `postgres` (container name)
- Port: `5432`
- Database: `cicd_analyzer`
- User: `postgres`
- Password: `dev-password-change-in-production`

**Test Database**
- Host: `postgres-test` (container name)  
- Port: `5433` (mapped to host)
- Database: `cicd_analyzer_test`
- User: `test_user`
- Password: `test_password`

### Redis Configuration

- Host: `redis` (container name)
- Port: `6379`
- Password: `dev-redis-password`
- Persistence: Enabled with AOF + RDB

## 🐛 Debugging

### Application Debugging

The development container exposes port `9229` for Node.js debugging:

```bash
# VS Code launch.json configuration
{
  "type": "node",
  "request": "attach",
  "name": "Attach to Docker",
  "port": 9229,
  "address": "localhost",
  "localRoot": "${workspaceFolder}",
  "remoteRoot": "/app",
  "protocol": "inspector"
}
```

### Health Checks

All services include health checks:

```bash
# Check service health
docker-compose ps

# View health check logs
docker inspect cicd-app --format='{{.State.Health.Status}}'
```

## 📊 Monitoring

### Container Metrics

```bash
# View resource usage
docker stats

# View container logs
docker-compose logs -f [service-name]
```

### Database Monitoring

```bash
# Connect to PostgreSQL and check status
docker-compose exec postgres psql -U postgres -d cicd_analyzer -c "SELECT version();"

# View active connections
docker-compose exec postgres psql -U postgres -d cicd_analyzer -c "SELECT * FROM pg_stat_activity;"
```

## 🔄 Data Persistence

### Volumes

The setup uses named volumes for data persistence:

- `postgres_data` - Main database data
- `postgres_test_data` - Test database data  
- `redis_data` - Redis persistence
- `app_logs` - Application logs

### Backup & Restore

```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres cicd_analyzer > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres cicd_analyzer < backup.sql
```

## 🚨 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Check what's using the port
netstat -ano | findstr :3000

# Kill the process or change ports in docker-compose.yml
```

**Database Connection Errors**
```bash
# Check if PostgreSQL is ready
docker-compose exec postgres pg_isready -U postgres

# Reset database
npm run docker:down:volumes
npm run docker:dev
```

**Memory Issues**
```bash
# Check Docker resource usage
docker system df

# Clean up unused resources
docker system prune -a
```

### Performance Optimization

**For Windows/Mac users:**
- Ensure Docker Desktop has adequate memory (4GB+)
- Use volume mounts carefully for better performance
- Consider using Docker Desktop WSL2 backend (Windows)

**For Development:**
- The application container includes hot reload
- Changes to source files automatically restart the application
- Database schema changes require manual migration runs

## 🔐 Security Notes

**Development Environment Only:**
- All passwords are default development values
- Services are exposed on localhost only
- Redis and PostgreSQL use development-friendly configurations

**Production Deployment:**
- Use proper secrets management
- Enable SSL/TLS for all services
- Implement proper network isolation
- Follow principle of least privilege

## 📝 Additional Commands

```bash
# View all available Docker commands
npm run | grep docker

# Access any service shell
docker-compose exec [service-name] sh

# Follow logs for specific service
docker-compose logs -f [service-name]

# Restart specific service
docker-compose restart [service-name]

# Scale services (for testing)
docker-compose up --scale app=2
```
