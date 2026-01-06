# CI/CD Pipeline Analyzer

[![CI](https://github.com/sirhCC/CICD-Pipeline-Analyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/sirhCC/CICD-Pipeline-Analyzer/actions/workflows/ci.yml)
[![Quality](https://github.com/sirhCC/CICD-Pipeline-Analyzer/actions/workflows/quality.yml/badge.svg)](https://github.com/sirhCC/CICD-Pipeline-Analyzer/actions/workflows/quality.yml)
[![Build](https://img.shields.io/github/actions/workflow/status/sirhCC/CICD-Pipeline-Analyzer/ci.yml?branch=main&label=build)](https://github.com/sirhCC/CICD-Pipeline-Analyzer/actions)
[![License](https://img.shields.io/github/license/sirhCC/CICD-Pipeline-Analyzer)](LICENSE)

Enterprise-grade CI/CD analytics with provider integrations, secure middleware, and TypeScript APIs.

**Performance Optimized**: 300-500% improvement with Phase 3 enhancements (memoization, batch processing, statistical analytics).

## Quick Start

```powershell
# Clone and install
git clone https://github.com/sirhCC/CICD-Pipeline-Analyzer.git
cd CICD-Pipeline-Analyzer
npm ci

# Configure environment
cp .env.example .env
# Edit .env with your settings (DB, Redis, JWT secrets)

# Option 1: Run with Docker (recommended - includes DB + Redis)
npm run docker:dev

# Option 2: Run locally (requires PostgreSQL and Redis)
npm run dev

# Check health
curl http://localhost:3000/health
curl http://localhost:3000/ready
```

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running](#running)
- [Database CLI](#database-cli)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [API Quick Check](#api-quick-check)
- [Contributing](#contributing)
- [Documentation](#documentation)
- [Performance](#performance)
- [License](#license)

## Features

### Core Capabilities
- **Multi-Provider Support**: GitHub Actions, GitLab CI (extensible via factory pattern)
- **Advanced Analytics**: Real-time metrics, failure pattern detection, optimization recommendations
- **Statistical Analysis**: Anomaly detection, trend analysis, SLA monitoring, cost optimization
- **Performance Optimized**: Memoization, batch processing, intelligent caching (300-500% faster)

### Security & Infrastructure
- **Authentication**: JWT-based auth with session management and API keys
- **Authorization**: Role-Based Access Control (RBAC) with granular permissions
- **Rate Limiting**: Token bucket algorithm with distributed Redis support
- **Request Validation**: Joi schemas with data sanitization and XSS protection
- **Comprehensive Logging**: Structured logging with security event tracking

### Data & Integration
- **Database**: PostgreSQL with TypeORM, connection pooling, migrations
- **Caching**: Redis with advanced eviction policies and TTL management
- **Background Jobs**: Bull queue for async processing
- **WebSocket**: Real-time updates for pipeline status and metrics
- **API Versioning**: Header and URL-based versioning with deprecation support

## Requirements

- Node.js >= 18, npm >= 8
- Optional: PostgreSQL >= 12, Redis >= 6

## Installation

```powershell
# clone
git clone https://github.com/sirhCC/CICD-Pipeline-Analyzer.git
cd CICD-Pipeline-Analyzer

# install
npm ci

# type check
npm run type-check
```

## Configuration

Copy `.env.example` to `.env` and adjust values (strong secrets, DB/Redis creds). The app accepts DATABASE_* and SERVER_* aliases, but DB_* and HOST/PORT are canonical now.

Notes:

- Secrets must be at least 32 characters (enforced).
- You can start locally without DB/Redis by setting `SKIP_DB_INIT=true` and `SKIP_REDIS_INIT=true` (readiness will be 503 until services are available).
- See `docs/DEVELOPMENT.md` for deeper configuration.

## Running

Development (hot reload):

```powershell
npm run dev
```

Production build and start:

```powershell
npm run build
npm start
```

Docker (Postgres + Redis + app):

```powershell
npm run docker:dev           # up (foreground)
npm run docker:dev:detached  # up -d
npm run docker:down          # stop
```

## Database CLI

Helpful commands from `src/cli/database.cli.ts`:

```powershell
npm run db:health
npm run db:init
npm run db:migrate
npm run db:seed
npm run db:status
npm run db:maintenance
npm run db:backup
npm run db:clear -- --confirm
```

## Testing

We maintain high code quality with comprehensive testing:

```powershell
# Run all tests (278 tests)
npm test

# Unit tests only (fast)
npm run test:unit

# Watch mode for development
npm run test:watch

# Coverage report (current: ~30%, target: 80%+)
npm run test:coverage

# Database tests
npm run test:db

# Integration tests
npm run test:integration
```

**Test Coverage Status**:
- ✅ 14 test suites passing
- ✅ 278 tests passing
- 🎯 Current coverage: ~30%
- 🎯 Target coverage: 80%+

Notes:

- DB-dependent tests skip gracefully if Postgres is unavailable.
- Provider checks may log expected 401s without failing tests.
- Tests use in-memory mocks for Redis and external services.

## Code Quality

Maintain code quality with automated checks:

```powershell
# Run all quality checks (lint + format + type-check)
npm run quality

# Auto-fix issues
npm run quality:fix

# Individual checks
npm run lint           # ESLint
npm run lint:fix       # ESLint with auto-fix
npm run format         # Prettier formatting
npm run format:check   # Check formatting
npm run type-check     # TypeScript type checking
```

**Quality Standards**:
- ✅ TypeScript strict mode enabled
- ✅ ESLint with recommended TypeScript rules
- ✅ Prettier for consistent formatting
- ✅ Pre-commit hooks ready (Husky configuration available)
- ✅ GitHub Actions quality checks on every PR

See [docs/CODE_QUALITY.md](docs/CODE_QUALITY.md) for detailed guidelines and improvement roadmap.

## API Quick Check

With the server running at <http://localhost:3000>:

```powershell
curl http://localhost:3000/health    # liveness (200)
curl http://localhost:3000/ready     # readiness (200 when DB/Redis OK, else 503)
curl http://localhost:3000/metrics   # basic JSON metrics

# Login (example payload)
$headers = @{"Content-Type"="application/json"}
$body    = '{"username":"admin","password":"admin"}'
curl -Method POST http://localhost:3000/api/auth/login -Headers $headers -Body $body

# Dashboard (replace TOKEN)
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/analytics/dashboard
```

## Project structure (abridged)

```text
src/
  cli/              # Database management CLI tools
  config/           # App config, routing, versioning
  controllers/      # HTTP request handlers
  core/             # Database, Redis, environment validation
  entities/         # TypeORM entity models
  middleware/       # Auth, rate limiting, logging, validation
  migrations/       # Database schema migrations
  providers/        # CI/CD provider integrations (GitHub, GitLab)
  repositories/     # Data access layer with factories
  routes/           # Express route definitions
  services/         # Business logic and analytics
  shared/           # Utilities, logger, API response builders
  test/             # Jest tests and test utilities
  types/            # TypeScript type definitions

docs/
  CODE_QUALITY.md           # Code quality guidelines
  CONTRIBUTING.md           # Contribution guidelines
  DATABASE_SETUP.md         # Database configuration guide
  DEVELOPMENT.md            # Development setup
  DOCKER.md                 # Docker usage
  PHASE3_COMPLETION.md      # Phase 3 optimization details
  PROJECT_INSTRUCTIONS.md   # Original project spec

.github/
  workflows/
    ci.yml          # Continuous integration
    quality.yml     # Code quality checks
```

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed guidelines.

### Quick Contribution Checklist

Before opening a PR:

```powershell
# 1. Run quality checks
npm run quality

# 2. Run tests
npm test

# 3. Check coverage (if adding features)
npm run test:coverage

# 4. Format code
npm run format
```

### Development Workflow

1. Create a feature branch from `main`
2. Make your changes with tests
3. Ensure all quality checks pass
4. Update documentation if needed
5. Submit PR with clear description

**Code Standards**:
- Follow existing code style (enforced by ESLint/Prettier)
- Write tests for new features
- Update types as needed
- Document complex logic
- Keep functions focused and < 150 lines

## Documentation

- [CODE_QUALITY.md](docs/CODE_QUALITY.md) - Code quality guidelines and improvement roadmap
- [CONTRIBUTING.md](docs/CONTRIBUTING.md) - How to contribute
- [DEVELOPMENT.md](docs/DEVELOPMENT.md) - Development setup and workflow
- [DATABASE_SETUP.md](docs/DATABASE_SETUP.md) - Database configuration
- [DOCKER.md](docs/DOCKER.md) - Docker usage and deployment
- [PHASE3_COMPLETION.md](docs/PHASE3_COMPLETION.md) - Performance optimization details

## Performance

Phase 3 optimizations deliver significant performance improvements:

- **Memoization**: 60-70% reduction in repeated calculations
- **Batch Processing**: 40-50% improvement for bulk operations
- **Statistical Analytics**: 300-500% faster anomaly detection
- **Smart Caching**: Reduces database load by 50-80%

See [docs/PHASE3_COMPLETION.md](docs/PHASE3_COMPLETION.md) for benchmarks and implementation details.

## License

MIT © sirhCC
