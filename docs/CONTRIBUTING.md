# Contributing to CI/CD Pipeline Analyzer

We welcome contributions to the CI/CD Pipeline Analyzer! This guide will help you get started with contributing to our project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

### Our Standards

- **Be respectful**: Treat everyone with respect and kindness
- **Be inclusive**: Welcome newcomers and help them succeed
- **Be collaborative**: Work together towards common goals
- **Be constructive**: Provide helpful feedback and suggestions
- **Be professional**: Maintain a professional tone in all interactions

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **npm** (v8.0.0 or higher)
- **PostgreSQL** (v13 or higher) - for database development
- **Git** - for version control

### First Time Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/CICDpa.git
   cd CICDpa
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/sirhCC/CICDpa.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

## Development Setup

### Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
# Database Configuration
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_NAME=cicd_analyzer_dev
DB_SSL=false

# Application Configuration
NODE_ENV=development
LOG_LEVEL=debug
PORT=3000

# Security Configuration
JWT_SECRET=your-development-jwt-secret
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d
```

### Database Setup

1. **Create a PostgreSQL database**:
   ```sql
   CREATE DATABASE cicd_analyzer_dev;
   ```

2. **Run migrations**:
   ```bash
   npm run db:migrate
   ```

3. **Seed initial data** (optional):
   ```bash
   npm run db:seed
   ```

### Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type checking
npm run type-check

# Database operations
npm run db:status
npm run db:health
npm run db:migrate
npm run db:seed
```

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

- **Bug fixes** - Help us squash bugs
- **Feature development** - Add new functionality
- **Documentation** - Improve our docs
- **Testing** - Add or improve tests
- **Performance** - Optimize existing code
- **Security** - Identify and fix security issues

### Finding Issues to Work On

1. Check our [Issues](https://github.com/sirhCC/CICDpa/issues) page
2. Look for issues labeled:
   - `good first issue` - Great for newcomers
   - `help wanted` - We need assistance
   - `bug` - Bug reports that need fixing
   - `enhancement` - New feature requests

### Before You Start

1. **Check existing issues** to avoid duplicate work
2. **Comment on the issue** to let others know you're working on it
3. **Discuss your approach** for larger changes
4. **Create an issue** if one doesn't exist for your contribution

## Pull Request Process

### 1. Create a Feature Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a new feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 2. Make Your Changes

- Follow our [coding standards](#coding-standards)
- Write or update tests as needed
- Update documentation if required
- Ensure all tests pass

### 3. Commit Your Changes

Use conventional commit messages:

```bash
# Examples:
git commit -m "feat: add pipeline performance analytics"
git commit -m "fix: resolve database connection timeout issue"
git commit -m "docs: update API documentation"
git commit -m "test: add integration tests for user authentication"
```

#### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 4. Push and Create Pull Request

```bash
# Push your branch
git push origin feature/your-feature-name

# Create a pull request on GitHub
```

### 5. Pull Request Requirements

Your pull request must:

- [ ] Have a clear, descriptive title
- [ ] Include a detailed description of changes
- [ ] Reference any related issues (`Fixes #123`)
- [ ] Pass all CI checks
- [ ] Include tests for new functionality
- [ ] Update documentation if needed
- [ ] Be reviewed and approved by maintainers

### Pull Request Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Related Issues
Fixes #(issue number)

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings introduced
```

## Coding Standards

### TypeScript Guidelines

- Use **strict TypeScript** configuration
- Prefer **interfaces** over types for object shapes
- Use **explicit return types** for functions
- Avoid `any` - use proper typing
- Use **meaningful variable names**

### Code Style

We use Prettier and ESLint for consistent code formatting:

```bash
# Check formatting
npm run lint

# Fix formatting issues
npm run lint:fix
npm run format
```

### File Organization

```
src/
├── cli/           # Command-line interfaces
├── config/        # Configuration management
├── core/          # Core business logic
├── entities/      # Database entities
├── middleware/    # Express middleware
├── migrations/    # Database migrations
├── modules/       # Feature modules
├── providers/     # External service integrations
├── repositories/  # Data access layer
├── services/      # Business logic services
├── shared/        # Shared utilities
├── test/         # Test files
├── types/        # Type definitions
└── utils/        # Utility functions
```

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Classes**: `PascalCase`
- **Functions/Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `PascalCase` (no `I` prefix)
- **Types**: `PascalCase`

### Code Comments

- Use JSDoc for function documentation
- Explain **why**, not **what**
- Keep comments up-to-date with code changes

```typescript
/**
 * Calculates pipeline success rate based on historical data
 * @param pipelineId - Unique identifier for the pipeline
 * @param timeframe - Number of days to analyze (default: 30)
 * @returns Promise resolving to success rate percentage
 */
async function calculateSuccessRate(
  pipelineId: string, 
  timeframe: number = 30
): Promise<number> {
  // Implementation details...
}
```

## Testing Guidelines

### Test Structure

We use Jest for testing with the following structure:

```
src/
├── test/
│   ├── unit/          # Unit tests
│   ├── integration/   # Integration tests
│   ├── e2e/          # End-to-end tests
│   └── fixtures/     # Test data
```

### Writing Tests

- **Unit tests**: Test individual functions/methods
- **Integration tests**: Test component interactions
- **E2E tests**: Test complete user workflows

```typescript
describe('PipelineService', () => {
  describe('createPipeline', () => {
    it('should create a new pipeline with valid data', async () => {
      // Arrange
      const pipelineData = {
        name: 'Test Pipeline',
        provider: PipelineProvider.GITHUB_ACTIONS,
        repository: 'test/repo'
      };

      // Act
      const result = await pipelineService.createPipeline(pipelineData);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe('Test Pipeline');
    });
  });
});
```

### Test Coverage

- Maintain **minimum 80%** test coverage
- Focus on **critical business logic**
- Test **error scenarios** and edge cases

```bash
# Run tests with coverage
npm run test:coverage
```

## Documentation

### Types of Documentation

1. **Code Documentation**: JSDoc comments
2. **API Documentation**: OpenAPI/Swagger specs
3. **User Documentation**: README, guides
4. **Developer Documentation**: Architecture, contributing

### Documentation Standards

- Keep documentation **up-to-date** with code changes
- Use **clear, concise language**
- Include **practical examples**
- Structure content with **headings and lists**

### Updating Documentation

When making changes, update relevant documentation:

- **README.md**: For user-facing changes
- **API docs**: For endpoint changes
- **Code comments**: For implementation changes
- **Architecture docs**: For structural changes

## Issue Reporting

### Bug Reports

Use our bug report template:

```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**
1. Step one
2. Step two
3. Step three

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [e.g., Windows 11]
- Node.js version: [e.g., 18.17.0]
- Database version: [e.g., PostgreSQL 15]

**Additional Context**
Any other relevant information
```

### Feature Requests

Include:
- **Problem description**: What problem does this solve?
- **Proposed solution**: How should it work?
- **Alternatives considered**: Other approaches
- **Use cases**: Real-world scenarios

## Community

### Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and ideas
- **Documentation**: Check our [docs](docs/) first

### Communication Guidelines

- **Be respectful** and constructive
- **Search existing issues** before creating new ones
- **Provide detailed information** in reports
- **Follow up** on your contributions

### Recognition

We recognize contributors in:
- **GitHub contributors** list
- **Release notes** for significant contributions
- **Special mentions** for outstanding help

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Cycle

- **Patch releases**: As needed for critical fixes
- **Minor releases**: Monthly feature releases
- **Major releases**: Quarterly or as needed

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

## Questions?

If you have any questions about contributing, please:

1. Check our [documentation](docs/)
2. Search [existing issues](https://github.com/sirhCC/CICDpa/issues)
3. Create a new [discussion](https://github.com/sirhCC/CICDpa/discussions)

Thank you for contributing to CI/CD Pipeline Analyzer! 🚀
