@echo off
echo Setting up CICD Pipeline Analyzer test environment...

REM Start Docker services
echo Starting Docker services...
docker-compose up -d postgres postgres-test redis

REM Wait for services to be ready
echo Waiting for services to initialize...
timeout /t 10 /nobreak > nul

REM Check service health
echo Checking service health...
docker-compose ps

REM Run tests
echo Running tests...
npm test

REM Show results
echo.
echo ======================================
echo Test run completed!
echo ======================================
