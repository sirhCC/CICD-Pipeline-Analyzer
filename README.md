# CI/CD Pipeline Analyzer

A comprehensive TypeScript-based application for analyzing and monitoring CI/CD pipeline performance across multiple platforms including GitHub Actions and GitLab CI.

## 🚀 Features

- **Multi-Platform Support**: GitHub Actions, GitLab CI, and extensible provider architecture
- **Real-time Analytics**: Pipeline performance monitoring and statistical analysis
- **Security-First**: JWT authentication, rate limiting, and comprehensive security measures
- **Database Integration**: PostgreSQL with Redis caching for optimal performance
- **REST API**: Full REST API with OpenAPI documentation
- **Statistical Analytics**: Advanced metrics calculation and trend analysis
- **Health Monitoring**: Built-in health checks and monitoring endpoints

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Database](#database)
- [Testing](#testing)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## 🛠️ Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Redis 6+
- npm or yarn

### Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd CICDpa
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Configuration**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database Setup**

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Build and Start**

   ```bash
   npm run build
   npm start
   ```

## 🚀 Quick Start

### Basic Usage

```typescript
import { PipelineAnalyzer } from './src';

const analyzer = new PipelineAnalyzer({
  provider: 'github-actions',
  apiToken: 'your-token'
});

// Analyze a pipeline
const metrics = await analyzer.analyze('owner/repo');
console.log(metrics);
```

### API Example

```bash
# Health check
curl http://localhost:3000/health

# Get pipeline analytics
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/analytics/pipelines
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `GITHUB_TOKEN` | GitHub API token | Optional |
| `GITLAB_TOKEN` | GitLab API token | Optional |

### Database Configuration

The application uses PostgreSQL as the primary database with Redis for caching. See [DATABASE.md](docs/DATABASE.md) for detailed configuration.

## 📚 API Documentation

### Authentication

All API endpoints require JWT authentication:

```bash
POST /api/auth/login
{
  "username": "your-username",
  "password": "your-password"
}
```

### Pipeline Endpoints

- `GET /api/pipelines` - List all pipelines
- `GET /api/pipelines/:id` - Get pipeline details
- `POST /api/pipelines` - Create new pipeline
- `PUT /api/pipelines/:id` - Update pipeline
- `DELETE /api/pipelines/:id` - Delete pipeline

### Analytics Endpoints

- `GET /api/analytics/overview` - Analytics overview
- `GET /api/analytics/pipelines` - Pipeline analytics
- `GET /api/analytics/performance` - Performance metrics
- `GET /api/analytics/trends` - Trend analysis

### Statistical Analytics

- `GET /api/statistical-analytics/summary` - Statistical summary
- `GET /api/statistical-analytics/trends` - Statistical trends
- `GET /api/statistical-analytics/correlations` - Correlation analysis

## 🗄️ Database

### Schema Overview

- **Pipelines**: Core pipeline configuration and metadata
- **Pipeline Runs**: Individual execution records
- **Pipeline Metrics**: Performance and statistical data
- **Users**: Authentication and authorization

### Migrations

```bash
# Run migrations
npm run db:migrate

# Create new migration
npm run db:migration:create migration-name

# Rollback
npm run db:rollback
```

## 🧪 Testing

### Run Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

### Test Structure

- `src/test/` - Test files
- `jest.config.js` - Jest configuration
- Coverage reports in `coverage/`

## 🔧 Development

### Project Structure

```text
src/
├── cli/              # CLI tools
├── config/           # Configuration
├── controllers/      # HTTP controllers
├── core/            # Core functionality
├── entities/        # Database entities
├── middleware/      # Express middleware
├── providers/       # CI/CD platform providers
├── repositories/    # Data access layer
├── routes/          # API routes
├── services/        # Business logic
├── shared/          # Shared utilities
├── test/           # Test files
├── types/          # TypeScript types
└── utils/          # Utility functions
```

### Development Commands

```bash
# Development server with hot reload
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build
npm run build
```

### Adding New Providers

1. Create provider in `src/providers/`
2. Implement `BaseProvider` interface
3. Register in provider factory
4. Add tests

Example:

```typescript
export class CustomProvider extends BaseProvider {
  async fetchPipelineData(config: PipelineConfig): Promise<PipelineData> {
    // Implementation
  }
}
```

## 📊 Analytics Features

### Statistical Metrics

- **Performance Metrics**: Execution times, success rates, failure patterns
- **Trend Analysis**: Historical performance trends and forecasting
- **Correlation Analysis**: Dependencies and bottleneck identification
- **Custom Metrics**: Extensible metrics framework

### Visualization

The application provides REST endpoints that can be integrated with visualization tools like Grafana or custom dashboards.

## 🛡️ Security

- JWT-based authentication
- Rate limiting (100 requests/minute by default)
- Input validation and sanitization
- SQL injection protection
- CORS configuration
- Security headers

## 🚀 Deployment

### Production Setup

1. **Environment**

   ```bash
   NODE_ENV=production
   ```

2. **Database**

   ```bash
   npm run db:migrate
   ```

3. **Build and Start**

   ```bash
   npm run build
   npm start
   ```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📈 Performance

- **Caching**: Redis caching for frequently accessed data
- **Database**: Optimized queries with proper indexing
- **Rate Limiting**: Configurable rate limits to prevent abuse
- **Monitoring**: Built-in health checks and metrics endpoints

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run the test suite
6. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙋 Support

- **Documentation**: Check the `docs/` directory
- **Issues**: Use GitHub Issues for bug reports
- **Questions**: Use GitHub Discussions for questions

## 🎯 Roadmap

- [ ] Additional CI/CD platform support
- [ ] Real-time notifications
- [ ] Advanced visualization dashboard
- [ ] Machine learning pipeline optimization
- [ ] Kubernetes integration

---

**Project Status**: ✅ Phase 3 Complete - Statistical Analytics Implemented

For detailed documentation, see the `docs/` directory.