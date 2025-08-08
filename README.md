# CI/CD Pipeline Analyzer

[![CI](https://github.com/sirhCC/CICD-Pipeline-Analyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/sirhCC/CICD-Pipeline-Analyzer/actions/workflows/ci.yml)
[![Build](https://img.shields.io/github/actions/workflow/status/sirhCC/CICD-Pipeline-Analyzer/ci.yml?branch=main&label=build)](https://github.com/sirhCC/CICD-Pipeline-Analyzer/actions)
[![License](https://img.shields.io/github/license/sirhCC/CICD-Pipeline-Analyzer)](LICENSE)

Enterprise-grade CI/CD analytics with provider integrations, secure middleware, and TypeScript APIs.

## Features

- GitHub Actions and GitLab CI providers (extensible via factory)
- Security: JWT auth, rate limiting, request validation, RBAC
- Analytics: metrics, failure patterns, recommendations, alerts
- Storage: PostgreSQL (TypeORM), caching/queues via Redis
- CLI for DB admin, Docker Compose for local stack

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

Create a `.env` file with the following as a starting point:

```dotenv
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/cicd_analyzer
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me-refresh
API_KEY_SECRET=change-me-api-key
NODE_ENV=development
```

Notes:

- Tests provide safe defaults for `JWT_REFRESH_SECRET` and `API_KEY_SECRET`.
- See `docs/DEVELOPMENT.md` and related docs for deeper configuration.

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

Unit tests (fast):

```powershell
npm run test:unit
```

Full test suite:

```powershell
npm test
```

Coverage:

```powershell
npm run test:coverage
```

Notes:

- DB-dependent tests skip gracefully if Postgres is unavailable.
- Provider checks may log expected 401s without failing tests.

## API Quick Check

With the server running at <http://localhost:3000>:

```powershell
# Health
curl http://localhost:3000/health

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
  config/           # App config and routing
  controllers/      # HTTP controllers
  core/             # DB, Redis, env validation
  entities/         # TypeORM entities
  middleware/       # Auth, rate limit, logging, validation
  providers/        # CI providers (GitHub Actions, GitLab CI)
  repositories/     # Data access
  routes/           # Express routes
  test/             # Jest tests and setup
```

## Contributing

See `docs/CONTRIBUTING.md`. Before opening a PR:

```powershell
npm run lint
npm run test:unit
```

## License

MIT © sirhCC
