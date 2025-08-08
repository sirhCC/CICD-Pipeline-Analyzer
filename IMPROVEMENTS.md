# Improvement Plan – CI/CD Pipeline Analyzer

Legend: Priority (High/Med/Low), Effort (S/M/L). Use this as a living checklist.

## ✅ Completed (Aug 8, 2025)

- Liveness and readiness endpoints added:
	- /health (fast liveness: uptime, memory, version)
	- /ready (readiness with DB/Redis health; returns 503 when dependencies are down/skipped)
- Basic metrics endpoint added at /metrics (JSON via request-logger). Prometheus format is a follow-up.
- Graceful shutdown in place: shuts down background jobs, WebSocket, HTTP server, modules, DB, and Redis.
- Environment improvements:
	- Accept DATABASE_* and DB_* aliases; and SERVER_* to HOST/PORT pre-validation.
	- Added SKIP_DB_INIT and SKIP_REDIS_INIT flags; validator honors DB skip to allow local start without infra.
- Operability polish: request logger skips /health, /ready, /metrics paths to reduce noise.
- Generated .env.example.generated aligned with current config schema (DB_*, HOST/PORT, JWT_*, Redis).

## Quick wins (next 1–2 days)

- [x] (High, S) Add graceful shutdown (SIGTERM/SIGINT): close HTTP server, DB, Redis, Bull queues
- [x] (High, S) Split health endpoints: `/health` (liveness) and `/ready` (readiness incl. DB/Redis)
- [ ] (High, S) Raise Jest thresholds slightly (e.g., unit: 85%) and enforce in CI
- [ ] (High, S) Add npm audit/Dependabot workflow for vulnerability alerts
- [x] (Med, S) Add metrics endpoint `/metrics` (JSON and Prometheus text when enabled)
- [ ] (Med, S) Extend Prometheus metrics: DB connection pool, Redis, Bull queue depth
- [x] (Med, S) Add .env.example with safe defaults; ensure env validation covers all secrets
- [ ] (Med, S) Ensure compression, CORS allowlist, body size limits are configured centrally
- [ ] (Med, S) Add Docker .dockerignore and run-as-nonroot in Dockerfile

## Performance & scalability

- [ ] (High, S) Use pino (or optimized winston) on hot paths; ensure requestId propagation
- [ ] (High, M) Introduce Redis response caching for heavy GETs with cache keys + TTL + busting on writes
- [ ] (High, M) Add DB indexes for frequent filters/joins; review queries via EXPLAIN; add migrations
- [ ] (Med, S) Paginate list endpoints consistently; enforce max limits
- [ ] (Med, M) Validate with Ajv (JSON Schema) or precompiled Joi for hot endpoints
- [ ] (Med, S) Tune Node/Express: trust proxy, compression threshold, ETag/Cache-Control where safe
- [ ] (Low, M) Stream large responses (NDJSON) for long-running exports

## Reliability & operations

- [x] (High, S) Central shutdown hooks to gracefully stop services (HTTP, DB, Redis, queues)
- [ ] (Med, M) Circuit breaker + retry/backoff for provider API calls
- [ ] (Med, M) Queue backpressure policy + metrics for Bull; dead-letter handling
- [ ] (Med, S) Separate rate limiting by route and by identity (IP/user/API key)
- [ ] (Low, S) Feature flags for risky features; document toggles clearly

## Security

- [x] (High, S) Enforce min length/entropy for JWT_SECRET/JWT_REFRESH_SECRET/API_KEY_SECRET in env validator
- [ ] (High, S) Restrictive CORS allowlist from env; reject wildcard in production
- [ ] (High, S) Set request body size limits; sanitize/validate headers, query, and body uniformly
- [ ] (Med, S) Add security linters (eslint-plugin-security, eslint-plugin-sonarjs)
- [ ] (Med, S) Add SAST/Dependency scan in CI (CodeQL/Snyk/Trivy)
- [ ] (Low, S) Secrets rotation policy; document rotation and key IDs

## Code quality & types

- [ ] (High, M) Enable TypeScript strict mode (strict, noImplicitAny, strictNullChecks) and fix drift
- [ ] (Med, S) ESLint: add import/order, jest, unused-imports; fail CI on warnings
- [ ] (Med, M) Centralize DTOs/validators; generate typed responses (zod + zod-to-openapi or ts-rest)
- [ ] (Med, S) Adopt consistent error shape (Problem Details RFC7807)
- [ ] (Low, S) Enforce module boundaries and path alias hygiene

## Testing

- [ ] (Med, M) Use Testcontainers for Postgres/Redis in CI integration tests
- [ ] (Med, S) Mock provider HTTP with nock to eliminate flaky network calls
- [ ] (Med, M) Add smoke e2e suite covering each main route happy path
- [ ] (Low, M) Add lightweight performance checks (k6/autocannon) for hot endpoints

## Database

- [ ] (High, M) Add indexes and composite indexes for common queries; migration checklist
- [ ] (Med, S) Configure connection pool (min/max/idleTimeout) via env; log pool stats in debug
- [ ] (Med, S) Adopt snake_case naming strategy consistently and verify in migrations
- [ ] (Med, M) Review N+1 patterns; prefer joins/selects over lazy relations

## Observability

- [ ] (Med, M) OpenTelemetry traces for HTTP, TypeORM, Redis, Bull; OTLP exporter; sampling in prod
- [x] (Med, S) Prometheus metrics: http_server/process (exposed in `/metrics` when enabled)
- [ ] (Med, S) Prometheus metrics: db connection and queue depth (extend `/metrics`)
- [ ] (Low, S) Correlation IDs propagated through logs, HTTP headers (x-request-id), and jobs

## API design & DX

- [ ] (Med, M) Generate OpenAPI spec and serve Swagger UI at `/docs` in non-prod
- [ ] (Med, S) Document and enforce API versioning strategy and deprecation headers
- [ ] (Med, S) Consistent pagination, filtering, and sorting conventions across endpoints
- [ ] (Low, S) ETags/If-None-Match for cacheable GETs

## CI/CD

- [ ] (Med, S) Split CI: lint+typecheck, unit tests, integration (with services), build
- [ ] (Med, S) Cache npm and Jest between jobs; matrix Node 18/20
- [ ] (Med, S) Docker image build + Trivy scan; push to registry on tags
- [ ] (Low, S) Release notes automation (release-please or changesets)

## Packaging & runtime

- [ ] (Med, S) Add .dockerignore; multi-stage Dockerfile: non-root user, NODE_ENV=production, tini
- [ ] (Low, S) docker-compose: healthchecks, resource limits, named volumes
- [ ] (Low, S) Provide sample `docker-compose.override.yml` (git-ignored) for local overrides


## File pointers (where to implement)

- `src/index.ts`: graceful shutdown, readiness probe, health/metrics routes, SKIP_* flags handling
- `src/middleware/*`: auth, rate limiter, request logger (skipPaths), validation limits
- `src/core/environment-validator.ts`: secret strength checks, alias support, SKIP_DB_INIT handling
- `src/config/index.ts`: env aliases, config validation, server/security config
- `src/core/database.ts`: pool sizing, logging, naming strategy
- `src/providers/*`: retries/circuit breakers; remove network flakes via mocks in tests
- `src/routes/*` and `src/controllers/*`: pagination, cache headers, error shape
- `jest.config.js` / `jest.unit.config.js`: thresholds, Testcontainers setup
- `Dockerfile`, `docker-compose.yml`, `.dockerignore`: non-root, healthchecks, build cache
- `.github/workflows/*`: split pipelines, cache, scans
- `.env.example` (generated from `.env.example.generated`): publish canonical example

## References

- OpenTelemetry JS: <https://opentelemetry.io/docs/instrumentation/js/>
- Prometheus client for Node: <https://github.com/siimon/prom-client>
- Ajv JSON Schema validator: <https://ajv.js.org>
- Pino logger: <https://github.com/pinojs/pino>
- Testcontainers: <https://node.testcontainers.org/>
