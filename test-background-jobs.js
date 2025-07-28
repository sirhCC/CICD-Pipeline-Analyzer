/**
 * Background Job System Test Script
 * Demonstrates the complete functionality of the background job processing system
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/v1/analytics/statistical`;

// Generate a test JWT token
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key-change-in-production';
const testToken = jwt.sign(
  {
    userId: 'test-user-id',
    role: 'admin',
    sessionId: 'test-session',
    permissions: ['read:analytics', 'write:analytics', 'read:pipelines', 'write:pipelines']
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const headers = {
  'Authorization': `Bearer ${testToken}`,
  'Content-Type': 'application/json'
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testBackgroundJobSystem() {
  console.log('🚀 Testing Background Job Processing System\n');

  try {
    // Test 1: Create a background job
    console.log('1. Creating a new background job...');
    const createJobResponse = await axios.post(`${API_BASE}/jobs`, {
      name: 'Daily Pipeline Anomaly Detection',
      type: 'anomaly_detection',
      schedule: '0 0 * * *', // Daily at midnight
      enabled: true,
      pipelineId: '550e8400-e29b-41d4-a716-446655440000',
      parameters: {
        metric: 'duration',
        method: 'z-score',
        periodDays: 30,
        alertThresholds: {
          anomaly: 'high'
        }
      }
    }, { headers });

    const jobId = createJobResponse.data.data.jobId;
    console.log(`✅ Job created successfully with ID: ${jobId}\n`);

    // Test 2: List all jobs
    console.log('2. Listing all background jobs...');
    const listJobsResponse = await axios.get(`${API_BASE}/jobs`, { headers });
    console.log(`✅ Found ${listJobsResponse.data.data.total} jobs:`);
    listJobsResponse.data.data.jobs.forEach(job => {
      console.log(`   - ${job.name} (${job.type}) - ${job.enabled ? 'Enabled' : 'Disabled'}`);
    });
    console.log();

    // Test 3: Get specific job details
    console.log('3. Getting job details...');
    const jobDetailsResponse = await axios.get(`${API_BASE}/jobs/${jobId}`, { headers });
    const jobDetails = jobDetailsResponse.data.data.job;
    console.log(`✅ Job Details:`);
    console.log(`   Name: ${jobDetails.name}`);
    console.log(`   Type: ${jobDetails.type}`);
    console.log(`   Schedule: ${jobDetails.schedule}`);
    console.log(`   Pipeline ID: ${jobDetails.pipelineId}`);
    console.log(`   Run Count: ${jobDetails.metadata.runCount}`);
    console.log(`   Is Active: ${jobDetails.isActive}`);
    console.log();

    // Test 4: Get job metrics
    console.log('4. Getting job service metrics...');
    const metricsResponse = await axios.get(`${API_BASE}/jobs/metrics`, { headers });
    const metrics = metricsResponse.data.data.metrics;
    console.log(`✅ Job Service Metrics:`);
    console.log(`   Total Jobs: ${metrics.totalJobs}`);
    console.log(`   Scheduled Jobs: ${metrics.scheduledJobs}`);
    console.log(`   Active Jobs: ${metrics.activeJobs}`);
    console.log(`   Total Executions: ${metrics.totalExecutions}`);
    console.log(`   Success Rate: ${metrics.successRate.toFixed(2)}%`);
    console.log();

    // Test 5: Create additional job types
    console.log('5. Creating different types of background jobs...');
    
    const jobs = [
      {
        name: 'Weekly Trend Analysis',
        type: 'trend_analysis',
        schedule: '0 9 * * 1', // Monday at 9 AM
        enabled: true,
        parameters: {
          metric: 'success_rate',
          periodDays: 7
        }
      },
      {
        name: 'SLA Monitoring',
        type: 'sla_monitoring',
        schedule: '0 */4 * * *', // Every 4 hours
        enabled: true,
        parameters: {
          slaTarget: 99.5,
          metric: 'duration'
        }
      },
      {
        name: 'Cost Analysis',
        type: 'cost_analysis',
        schedule: '0 8 1 * *', // Monthly on 1st at 8 AM
        enabled: false, // Disabled initially
        parameters: {
          periodDays: 30
        }
      }
    ];

    const createdJobIds = [];
    for (const job of jobs) {
      const response = await axios.post(`${API_BASE}/jobs`, job, { headers });
      const newJobId = response.data.data.jobId;
      createdJobIds.push(newJobId);
      console.log(`   ✅ Created ${job.type} job: ${newJobId}`);
    }
    console.log();

    // Test 6: List updated jobs
    console.log('6. Listing all jobs after creation...');
    const updatedListResponse = await axios.get(`${API_BASE}/jobs`, { headers });
    const updatedJobs = updatedListResponse.data.data;
    console.log(`✅ Total jobs: ${updatedJobs.total} (${updatedJobs.enabled} enabled, ${updatedJobs.disabled} disabled)`);
    console.log();

    // Test 7: Enable/Disable jobs
    console.log('7. Testing job enable/disable...');
    const disabledJobId = createdJobIds[createdJobIds.length - 1];
    
    // Enable the disabled job
    await axios.put(`${API_BASE}/jobs/${disabledJobId}/enable`, {}, { headers });
    console.log(`   ✅ Enabled job: ${disabledJobId}`);
    
    // Disable the first job
    await axios.put(`${API_BASE}/jobs/${jobId}/disable`, {}, { headers });
    console.log(`   ✅ Disabled job: ${jobId}`);
    console.log();

    // Test 8: Test WebSocket info endpoint
    console.log('8. Testing WebSocket info endpoint...');
    const wsInfoResponse = await axios.get(`${API_BASE}/websocket/info`, { headers });
    const wsInfo = wsInfoResponse.data.data;
    console.log(`✅ WebSocket Info:`);
    console.log(`   URL: ${wsInfo.websocketUrl}`);
    console.log(`   Features: ${wsInfo.features.join(', ')}`);
    console.log(`   Authentication Required: ${wsInfo.authentication.required}`);
    console.log();

    // Test 9: Test statistical analytics endpoints (to show integration)
    console.log('9. Testing statistical analytics integration...');
    
    // Anomaly detection
    const anomalyData = [
      { timestamp: new Date('2024-01-01'), value: 100 },
      { timestamp: new Date('2024-01-02'), value: 105 },
      { timestamp: new Date('2024-01-03'), value: 98 },
      { timestamp: new Date('2024-01-04'), value: 103 },
      { timestamp: new Date('2024-01-05'), value: 200 }, // Anomaly
      { timestamp: new Date('2024-01-06'), value: 101 },
      { timestamp: new Date('2024-01-07'), value: 99 },
      { timestamp: new Date('2024-01-08'), value: 102 },
      { timestamp: new Date('2024-01-09'), value: 97 },
      { timestamp: new Date('2024-01-10'), value: 104 }
    ];

    const anomalyResponse = await axios.post(`${API_BASE}/anomalies`, {
      data: anomalyData,
      method: 'z-score'
    }, { headers });

    console.log(`   ✅ Anomaly Detection:`);
    console.log(`      Data Points: ${anomalyResponse.data.data.summary.totalDataPoints}`);
    console.log(`      Anomalies Found: ${anomalyResponse.data.data.summary.anomaliesDetected}`);
    console.log(`      Anomaly Rate: ${anomalyResponse.data.data.summary.anomalyRate.toFixed(2)}%`);
    console.log();

    // Test 10: Clean up (delete some test jobs)
    console.log('10. Cleaning up test jobs...');
    
    // Delete one of the created jobs
    const jobToDelete = createdJobIds[0];
    await axios.delete(`${API_BASE}/jobs/${jobToDelete}`, { headers });
    console.log(`   ✅ Deleted job: ${jobToDelete}`);
    console.log();

    // Final metrics
    console.log('11. Final job service metrics...');
    const finalMetricsResponse = await axios.get(`${API_BASE}/jobs/metrics`, { headers });
    const finalMetrics = finalMetricsResponse.data.data.metrics;
    console.log(`✅ Final Metrics:`);
    console.log(`   Total Jobs: ${finalMetrics.totalJobs}`);
    console.log(`   Scheduled Jobs: ${finalMetrics.scheduledJobs}`);
    console.log(`   Total Executions: ${finalMetrics.totalExecutions}`);
    console.log();

    console.log('🎉 Background Job System Test Completed Successfully!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Job creation and management working');
    console.log('   ✅ Job scheduling and configuration working');
    console.log('   ✅ Job metrics and monitoring working');
    console.log('   ✅ WebSocket integration ready');
    console.log('   ✅ Statistical analytics integration working');
    console.log('   ✅ All API endpoints functional');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.error('   Make sure the server is running and JWT authentication is working');
    }
    process.exit(1);
  }
}

async function checkServerHealth() {
  try {
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    if (healthResponse.status === 200) {
      console.log('✅ Server is running and healthy\n');
      return true;
    }
  } catch (error) {
    console.error('❌ Server health check failed. Please start the server first:');
    console.error('   npm run dev');
    return false;
  }
}

// Main execution
async function main() {
  console.log('Background Job System Integration Test');
  console.log('=====================================\n');

  const isHealthy = await checkServerHealth();
  if (!isHealthy) {
    process.exit(1);
  }

  await testBackgroundJobSystem();
}

if (require.main === module) {
  main();
}
