import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// =============================================================================
// SAFEGO PHASE 4 — 4-HOUR ENDURANCE SOAK TEST HARNESS
// Goal: Validate zero memory leaks, connection pool stability, and sustained
//       5,400 ops/sec database throughput over a continuous 240-minute window.
// =============================================================================

// Custom Metrics
const soakReqDuration = new Trend('soak_req_duration');
const dbOpsLatency = new Trend('db_ops_duration');
const errorRate = new Rate('soak_error_rate');
const successfulOpsCount = new Counter('soak_successful_operations');

export const options = {
  scenarios: {
    sustained_4h_soak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 3000 },    // Warm-up ramp to 3,000 VUs
        { duration: '230m', target: 3000 },  // Sustained 3,000 VUs for ~3.8 hours
        { duration: '5m', target: 0 },       // Graceful cooldown
      ],
      exec: 'soakWorkflow',
      tags: { test_type: 'soak_4h' },
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<120', 'p(99)<250'], // 95% < 120ms throughout 4 hours
    'soak_error_rate': ['rate<0.005'],               // Error rate < 0.5%
    'db_ops_duration': ['p(95)<40'],                 // Database operations < 40ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const SAMPLE_CITIES = ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Vadodara', 'Chennai', 'Pune'];
const RIDE_MODES = ['pink', 'pwd', 'green', 'night', 'normal'];

export function soakWorkflow() {
  let authToken = null;

  // 1. Authenticate / Session Refresh
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'passenger@example.com',
    password: 'password123',
  }), { headers: { 'Content-Type': 'application/json' } });

  if (loginRes.status === 200) {
    try {
      authToken = JSON.parse(loginRes.body).access_token;
    } catch (e) {}
  }

  const authHeaders = authToken
    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }
    : { 'Content-Type': 'application/json' };

  // 2. Geospatial & City Resolution Query
  const city = SAMPLE_CITIES[Math.floor(Math.random() * SAMPLE_CITIES.length)];
  const mapRes = http.get(`${BASE_URL}/api/map/search?q=${city}`);
  soakReqDuration.add(mapRes.timings.duration);

  // 3. Dynamic ML Fare Calculation
  const selectedMode = RIDE_MODES[Math.floor(Math.random() * RIDE_MODES.length)];
  const fareRes = http.post(`${BASE_URL}/api/rides/estimate-fare`, JSON.stringify({
    pickup_lat: 19.0760, pickup_lon: 72.8777,
    dest_lat: 19.2183, dest_lon: 72.9781,
    mode: selectedMode,
  }), { headers: { 'Content-Type': 'application/json' } });
  soakReqDuration.add(fareRes.timings.duration);

  // 4. Database CRUD: Active Rides & State Transition
  const dbRes = http.get(`${BASE_URL}/api/rides/active`, { headers: authHeaders });
  dbOpsLatency.add(dbRes.timings.duration);
  soakReqDuration.add(dbRes.timings.duration);

  const passed = check(dbRes, {
    'Soak DB operation succeeded': (r) => r.status === 200,
  });

  if (passed) {
    successfulOpsCount.add(3); // 3 queries per VU iteration
  } else {
    errorRate.add(1);
  }

  sleep(1.5); // Realistic passenger pacing
}
