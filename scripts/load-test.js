// =========================================
// CI/CD Pipeline Analyzer - Load Test Script
// K6 performance testing for API endpoints
// =========================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '5s', target: 5 },   // Ramp up
    { duration: '10s', target: 10 }, // Stay at 10 users
    { duration: '10s', target: 20 }, // Ramp to 20 users
    { duration: '5s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
    errors: ['rate<0.1'],
  },
};

const BASE_URL = 'http://localhost:3000';

// Sample API token for testing (should be replaced with real token in CI)
const API_TOKEN = 'test-token';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_TOKEN}`,
  };

  // Test 1: Health check endpoint
  let response = http.get(`${BASE_URL}/health`);
  check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
  }) || errorRate.add(1);

  sleep(0.5);

  // Test 2: API version info
  response = http.get(`${BASE_URL}/api/v1`, { headers });
  check(response, {
    'API version status is 200': (r) => r.status === 200,
    'API version has correct structure': (r) => {
      try {
        const json = r.json();
        return json.version && json.name;
      } catch (e) {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(0.5);

  // Test 3: Pipelines endpoint
  response = http.get(`${BASE_URL}/api/v1/pipelines`, { headers });
  check(response, {
    'pipelines status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'pipelines response time < 300ms': (r) => r.timings.duration < 300,
  }) || errorRate.add(1);

  sleep(0.5);

  // Test 4: Analytics dashboard endpoint
  response = http.get(`${BASE_URL}/api/v1/analytics/dashboard`, { headers });
  check(response, {
    'analytics status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'analytics response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(0.5);

  // Test 5: Create pipeline (POST test)
  const pipelineData = {
    name: `test-pipeline-${Math.random().toString(36).substring(7)}`,
    provider: 'github-actions',
    repositoryUrl: 'https://github.com/test/repo',
    branch: 'main',
    description: 'Load test pipeline',
  };

  response = http.post(`${BASE_URL}/api/v1/pipelines`, JSON.stringify(pipelineData), { headers });
  check(response, {
    'create pipeline status is 201, 400, or 401': (r) => 
      r.status === 201 || r.status === 400 || r.status === 401,
    'create pipeline response time < 1000ms': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(1);
}

// Setup function - runs once before the test
export function setup() {
  console.log('🚀 Starting load test...');
  console.log(`Target: ${BASE_URL}`);
  
  // Test connectivity
  const response = http.get(`${BASE_URL}/health`);
  if (response.status !== 200) {
    console.error('❌ Health check failed, aborting test');
    throw new Error('Service not available');
  }
  
  console.log('✅ Service is healthy, proceeding with load test');
  return { startTime: Date.now() };
}

// Teardown function - runs once after the test
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`⏱️ Load test completed in ${duration}s`);
}
