# CI/CD Pipeline Analyzer - Development Setup

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Setup Database**
   ```bash
   # Start PostgreSQL (Docker example)
   docker run --name cicd-postgres -e POSTGRES_DB=cicd_analyzer -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15

   # Start Redis (Docker example)
   docker run --name cicd-redis -p 6379:6379 -d redis:7-alpine
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run build` - Build the TypeScript application
- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Development Environment

The application is configured for enterprise-grade development with:

- **TypeScript 5+** with strict mode
- **Express.js** with security middleware
- **PostgreSQL** with TypeORM
- **Redis** for caching
- **Winston** for structured logging
- **Jest** for testing
- **ESLint + Prettier** for code quality

## API Endpoints

- `GET /health` - Health check
- `GET /version` - Application version
- `GET /modules` - Module status
- `GET /config` - Configuration (development only)

## Architecture

The application follows a modular enterprise architecture:

- **Core Layer**: Database, Redis, Module Manager
- **Shared Layer**: Logging, Health checks
- **Entity Layer**: Database models
- **Provider Layer**: CI/CD platform integrations
- **Module Layer**: Feature modules

## Next Steps

1. Complete Phase 1 foundation ✅
2. Implement middleware (auth, rate limiting, etc.)
3. Create provider modules for GitHub Actions, GitLab CI, etc.
4. Add API routes for pipeline management
5. Implement analytics and reporting features

See `PROJECT_INSTRUCTIONS.md` for detailed implementation plan.
