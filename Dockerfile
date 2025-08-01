# =========================================
# CI/CD Pipeline Analyzer - Multi-stage Docker Build
# =========================================

# === BUILD STAGE ===
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production --ignore-scripts

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# === PRODUCTION STAGE ===
FROM node:18-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S cicdapp -u 1001

# Set working directory
WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create necessary directories
RUN mkdir -p logs && \
    chown -R cicdapp:nodejs /app

# Switch to non-root user
USER cicdapp

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]

# === DEVELOPMENT STAGE ===
FROM node:18-alpine AS development

# Install development tools
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S cicdapp -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci && npm cache clean --force

# Create necessary directories
RUN mkdir -p logs src dist && \
    chown -R cicdapp:nodejs /app

# Switch to non-root user
USER cicdapp

# Expose application port and debug port
EXPOSE 3000 9229

# Start development server with hot reload
CMD ["npm", "run", "dev"]
