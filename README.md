# 🚀 CI/CD Pipeline Analyzer

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.0+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)](#)
[![Coverage](https://img.shields.io/badge/Coverage-80%25+-success.svg)](#)

> **Enterprise-grade CI/CD pipeline analysis and optimization platform** 🎯

An intelligent, modular system for analyzing, monitoring, and optimizing CI/CD pipelines across multiple platforms. Built with TypeScript and designed for scalability, performance, and enterprise deployment.

---

## ✨ Features

### 🔍 **Multi-Platform Support**
- **GitHub Actions** - Complete workflow analysis and optimization
- **GitLab CI/CD** - Pipeline performance monitoring
- **Jenkins** - Classic CI/CD system integration
- **Azure DevOps** - Microsoft ecosystem support
- **CircleCI** - Cloud-native pipeline analysis
- **Buildkite** - Agent-based build system support

### 📊 **Advanced Analytics**
- **Performance Metrics** - Execution time, success rates, resource usage
- **Bottleneck Detection** - Automated identification of pipeline inefficiencies
- **Trend Analysis** - Historical performance tracking and predictions
- **Cost Optimization** - Resource usage analysis and cost reduction suggestions
- **Anomaly Detection** - AI-powered identification of unusual pipeline behavior

### 🛠️ **Enterprise Features**
- **Modular Architecture** - Plugin-based system for extensibility
- **Real-time Monitoring** - Live pipeline status and notifications
- **Security First** - JWT authentication, rate limiting, audit logging
- **High Performance** - Redis caching, connection pooling, optimized queries
- **Scalable Design** - Microservices-ready, container-native architecture

---

## 🏗️ Architecture

```mermaid
graph TB
    A[Web Dashboard] --> B[API Gateway]
    B --> C[Authentication Service]
    B --> D[Pipeline Analyzer]
    B --> E[Analytics Engine]
    
    D --> F[Provider Modules]
    F --> G[GitHub Actions]
    F --> H[GitLab CI]
    F --> I[Jenkins]
    F --> J[Azure DevOps]
    
    E --> K[Machine Learning]
    E --> L[Trend Analysis]
    E --> M[Anomaly Detection]
    
    D --> N[(PostgreSQL)]
    E --> O[(Redis Cache)]
    
    P[Webhook Handlers] --> B
    Q[Notification Service] --> R[Slack/Teams/Email]
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0+ 
- **PostgreSQL** 12+
- **Redis** 6.0+
- **npm** 8.0+

### Installation

```bash
# Clone the repository
git clone https://github.com/sirhCC/CICDpa.git
cd CICDpa

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database (Docker)
docker run --name cicd-postgres \
  -e POSTGRES_DB=cicd_analyzer \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your-password \
  -p 5432:5432 -d postgres:15

# Setup Redis (Docker)
docker run --name cicd-redis \
  -p 6379:6379 -d redis:7-alpine

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build custom image
docker build -t cicd-analyzer .
docker run -p 3000:3000 cicd-analyzer
```

---

## 📖 API Documentation

### Core Endpoints

#### Health & Status
```http
GET /health           # System health check
GET /version          # Application version info
GET /modules          # Module status and configuration
```

#### Pipeline Management
```http
GET    /api/v1/pipelines              # List all pipelines
POST   /api/v1/pipelines              # Create new pipeline
GET    /api/v1/pipelines/:id          # Get pipeline details
PUT    /api/v1/pipelines/:id          # Update pipeline
DELETE /api/v1/pipelines/:id          # Delete pipeline
```

#### Analytics & Reports
```http
GET /api/v1/analytics/performance/:id  # Performance metrics
GET /api/v1/analytics/bottlenecks/:id  # Bottleneck analysis
GET /api/v1/analytics/trends/:id       # Trend analysis
GET /api/v1/analytics/optimization/:id # Optimization suggestions
```

#### Webhook Integration
```http
POST /api/v1/webhooks/github          # GitHub webhook handler
POST /api/v1/webhooks/gitlab          # GitLab webhook handler
POST /api/v1/webhooks/jenkins         # Jenkins webhook handler
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Application
NODE_ENV=production
LOG_LEVEL=info
SERVER_PORT=3000

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=cicd_analyzer
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your-secure-password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=24h

# Provider Configuration
GITHUB_APP_ID=your-github-app-id
GITHUB_PRIVATE_KEY=your-github-private-key
GITLAB_TOKEN=your-gitlab-token
JENKINS_URL=https://your-jenkins.com
JENKINS_USERNAME=admin
JENKINS_TOKEN=your-jenkins-token
```

### Provider Setup

<details>
<summary><strong>GitHub Actions Setup</strong></summary>

1. Create a GitHub App with the following permissions:
   - Actions: Read
   - Contents: Read
   - Metadata: Read
   - Pull requests: Read

2. Install the app on your repositories

3. Configure webhook endpoint: `https://your-domain.com/api/v1/webhooks/github`

</details>

<details>
<summary><strong>GitLab CI Setup</strong></summary>

1. Create a GitLab Personal Access Token with:
   - `api` scope
   - `read_api` scope
   - `read_repository` scope

2. Configure webhook: `https://your-domain.com/api/v1/webhooks/gitlab`

</details>

---

## 🧪 Development

### Project Structure

```
src/
├── config/           # Configuration management
├── core/             # Core services (database, cache, modules)
├── entities/         # Database models
├── middleware/       # Express middleware
├── modules/          # Feature modules
├── providers/        # CI/CD platform integrations
├── shared/           # Shared utilities
├── test/             # Test files
├── types/            # TypeScript definitions
└── utils/            # Helper functions
```

### Available Scripts

```bash
npm run dev           # Start development server with hot reload
npm run build         # Build TypeScript to JavaScript
npm run start         # Start production server
npm test              # Run test suite
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint issues
npm run format        # Format code with Prettier
npm run migrate       # Run database migrations
npm run seed          # Seed database with sample data
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- foundation.test.ts

# Run tests in watch mode
npm run test:watch
```

---

## 🔌 Extending the Platform

### Creating a Custom Provider

```typescript
// src/providers/custom-provider.ts
import { BaseProvider } from './base-provider';
import { PipelineProvider } from '../types';

export class CustomProvider extends BaseProvider {
  provider = PipelineProvider.CUSTOM;
  
  async fetchPipelines(): Promise<Pipeline[]> {
    // Implement your custom logic
  }
  
  async analyzePipeline(id: string): Promise<PipelineAnalysis> {
    // Implement analysis logic
  }
}
```

### Adding Custom Analytics

```typescript
// src/modules/custom-analytics.ts
import { AnalysisModule } from '../types';

export class CustomAnalyticsModule implements AnalysisModule {
  name = 'custom-analytics';
  version = '1.0.0';
  
  async analyze(pipeline: Pipeline): Promise<OptimizationSuggestion[]> {
    // Implement custom analysis
  }
}
```

---

## 📊 Performance & Monitoring

### Metrics Collected

- **Pipeline Execution Time** - Start to finish duration
- **Stage Performance** - Individual stage timing
- **Resource Usage** - CPU, memory, disk, network
- **Success/Failure Rates** - Historical success patterns
- **Cost Analysis** - Resource cost optimization
- **Queue Times** - Wait times in pipeline execution

### Monitoring Integration

- **Prometheus** metrics export
- **Grafana** dashboard templates
- **Health check** endpoints
- **Structured logging** with Winston
- **Performance profiling** built-in

---

## 🚀 Deployment

### Production Deployment

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    image: cicd-analyzer:latest
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/cicd_analyzer
      - REDIS_URL=redis://cache:6379
    depends_on:
      - db
      - cache
      
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: cicd_analyzer
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      
  cache:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cicd-analyzer
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cicd-analyzer
  template:
    metadata:
      labels:
        app: cicd-analyzer
    spec:
      containers:
      - name: app
        image: cicd-analyzer:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Quality

- **TypeScript** strict mode enabled
- **ESLint** for code linting
- **Prettier** for code formatting
- **Jest** for testing (80%+ coverage required)
- **Conventional Commits** for commit messages

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🌟 Roadmap

- [ ] **Phase 2**: Advanced middleware and authentication
- [ ] **Phase 3**: Machine learning-powered optimization
- [ ] **Phase 4**: Real-time dashboard and notifications
- [ ] **Phase 5**: Multi-tenant SaaS platform
- [ ] **Phase 6**: Mobile app for pipeline monitoring

---

## 🙏 Acknowledgments

- Built with ❤️ by [sirhCC](https://github.com/sirhCC)
- Inspired by modern DevOps practices and enterprise needs
- Special thanks to the open-source community

---

<div align="center">

**Made with 🚀 for the DevOps Community**

[⭐ Star this repo](https://github.com/sirhCC/CICDpa) | [🐛 Report Bug](https://github.com/sirhCC/CICDpa/issues) | [💡 Request Feature](https://github.com/sirhCC/CICDpa/issues)

</div>
