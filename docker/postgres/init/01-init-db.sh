#!/bin/bash
# =========================================
# PostgreSQL Database Initialization Script
# =========================================

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create extensions if needed
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
    
    -- Create additional schemas
    CREATE SCHEMA IF NOT EXISTS analytics;
    CREATE SCHEMA IF NOT EXISTS monitoring;
    
    -- Grant permissions
    GRANT ALL PRIVILEGES ON SCHEMA analytics TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON SCHEMA monitoring TO $POSTGRES_USER;
    
    -- Create indexes for better performance
    -- These will be created by TypeORM migrations, but we can prepare
    
    -- Log the initialization
    SELECT 'CI/CD Pipeline Analyzer database initialized successfully' as status;
EOSQL

echo "✅ PostgreSQL database initialization completed"
