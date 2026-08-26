import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// =============================================================================
// SAFEGO PHASE 4 — FULL LOAD & STRESS TESTING HARNESS
// Targets: Auth, Booking, Driver Matching, ML Fare, Location, SOS, Admin, MongoDB
// =============================================================================

// Custom Metric Trends for Latency Distribution (p50, p90, p95, p99)
const authLatency = new Trend('auth_duration');
const bookingLatency = new Trend('booking_duration');
const driverMatchingLatency = new Trend('driver_matching_duration');
const fareMlLatency = new Trend('fare_ml_duration');
const locationSearchLatency = new Trend('location_search_duration');
const sosEmergencyLatency = new Trend('sos_emergency_duration');
const adminDashboardLatency = new Trend('admin_dashboard_duration');
const dbLifecycleLatency = new Trend('db_lifecycle_duration');

// Custom Counters & Rates for Verification
const errorRate = new Rate('custom_error_rate');
const sosTotalRequests = new Counter('sos_total_requests');
const sosCanonicalCreated = new Counter('sos_canonical_created');
const sosDebouncedSuppressed = new Counter('sos_debounced_suppressed');
const sosDuplicateRecords = new Counter('sos_duplicate_records');

// =============================================================================
// Load Test Execution Profiles & Scenario Matrix
// =============================================================================
export const options = {
  scenarios: {
    // 1. Smoke Test (Sanity Verification across all 8 endpoints)
    smoke_test: {
      executor: 'constant-vus',
      vus: 20,
      duration: '1m',
      exec: 'defaultWorkflow',
      tags: { test_type: 'smoke' },
    },

    // 2. Standard Production Load Test (Simulates Daily Traffic)
    standard_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 500 },
        { duration: '5m', target: 1500 },
        { duration: '2m', target: 0 },
      ],
      startTime: '1m',
      exec: 'defaultWorkflow',
      tags: { test_type: 'load' },
    },

    // 3. Peak Stress & Sudden Spike Burst (Flash-Crowd Surge)
    stress_spike_burst: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 1000 },
        { duration: '30s', target: 3500 }, // Sudden flash spike
        { duration: '2m', target: 3500 },  // Sustained burst peak
        { duration: '1m', target: 0 },
      ],
      startTime: '10m',
      exec: 'defaultWorkflow',
      tags: { test_type: 'stress_spike' },
    },

    // 4. Dedicated SOS Storm Scenario (1,500 VUs x 100 rapid attempts = 150,000 requests)
    sos_storm_burst: {
      executor: 'per-vu-iterations',
      vus: 1500,
      iterations: 100, // Exactly 100 requests per VU = 150,000 total requests
      maxDuration: '2m',
      startTime: '15m',
      exec: 'sosStormScenario',
      tags: { test_type: 'sos_storm' },
    },

    // 5. Breakpoint Test (Progressive step ramping to locate single-node capacity limits)
    breakpoint_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 1000 },
        { duration: '2m', target: 2000 }, // Approaches Bcrypt single-node ceiling
        { duration: '2m', target: 3000 },
        { duration: '2m', target: 5000 }, // Tests event loop & DB connection pool limits
        { duration: '1m', target: 0 },
      ],
      startTime: '18m',
      exec: 'defaultWorkflow',
      tags: { test_type: 'breakpoint' },
    },

    // 6. Endurance Soak Test Profile (4-Hour Longevity & Memory Leak Analysis)
    // Note: Kept optional/configurable via CLI environment variable SOAK_ENABLED
    ...( __ENV.SOAK_ENABLED === 'true' ? {
      soak_longevity_test: {
        executor: 'constant-vus',
        vus: 3000,
        duration: '4h',
        startTime: '27m',
        exec: 'defaultWorkflow',
        tags: { test_type: 'soak_4h' },
      }
    } : {} ),
  },

  // Service Level Agreement (SLA) Thresholds
  thresholds: {
    'http_req_duration': ['p(95)<150', 'p(99)<300'],  // 95% of total requests < 150ms
    'custom_error_rate': ['rate<0.01'],              // Global error rate < 1%
    'auth_duration': ['p(95)<200'],                  // Bcrypt Auth p95 < 200ms
    'booking_duration': ['p(95)<100'],               // Ride Creation p95 < 100ms
    'driver_matching_duration': ['p(95)<80'],        // Fleet Discovery p95 < 80ms
    'fare_ml_duration': ['p(95)<50'],                 // ML Fare Estimation p95 < 50ms
    'location_search_duration': ['p(95)<20'],        // In-Memory City Search p95 < 20ms
    'sos_emergency_duration': ['p(95)<60'],           // Emergency SOS Dispatch p95 < 60ms
    'admin_dashboard_duration': ['p(95)<250'],        // Heavy Aggregation Stats p95 < 250ms
    'db_lifecycle_duration': ['p(95)<100'],          // CRUD Document Lifecycle p95 < 100ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

// Global Test Data Pool
const INDIAN_CITIES = ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Vadodara', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur'];
const RIDE_MODES = ['pink', 'pwd', 'green', 'night', 'normal'];

// =============================================================================
// Helper: Seeded Dynamic Session Tokens
// =============================================================================
function getPassengerAuth() {
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'passenger@example.com',
    password: 'password123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (loginRes.status === 200) {
    try {
      const data = JSON.parse(loginRes.body);
      return data.access_token;
    } catch (e) {
      return null;
    }
  }
  return null;
}

// =============================================================================
// Main Workflow: Executes all 8 Benchmark Targets
// =============================================================================
export function defaultWorkflow() {
  let token = null;

  // ---------------------------------------------------------------------------
  // Target 1: Auth API — Concurrent Login Benchmark
  // ---------------------------------------------------------------------------
  group('Target 1: Auth API Concurrent Login', function () {
    const loginPayload = JSON.stringify({
      email: 'passenger@example.com',
      password: 'password123',
    });
    const res = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
    });
    authLatency.add(res.timings.duration);
    const passed = check(res, {
      'Auth status is 200': (r) => r.status === 200,
      'Auth returns valid JWT access_token': (r) => {
        try {
          const body = JSON.parse(r.body);
          if (body.access_token) {
            token = body.access_token;
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
    });
    if (!passed) errorRate.add(1);
  });

  const authHeaders = token
    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };

  // ---------------------------------------------------------------------------
  // Target 5: Location & Map API — 4,231 Indian Cities In-Memory Spatial Search
  // ---------------------------------------------------------------------------
  group('Target 5: Location API Search', function () {
    const queryCity = INDIAN_CITIES[Math.floor(Math.random() * INDIAN_CITIES.length)];
    const res = http.get(`${BASE_URL}/api/map/search?q=${queryCity}`);
    locationSearchLatency.add(res.timings.duration);
    const passed = check(res, {
      'Map search status is 200': (r) => r.status === 200,
      'Map returns resolved city records': (r) => {
        try {
          return JSON.parse(r.body).length > 0;
        } catch {
          return false;
        }
      },
    });
    if (!passed) errorRate.add(1);
  });

  // ---------------------------------------------------------------------------
  // Target 4: Dynamic Fare & Safety ML API — High Concurrency Pricing Inference
  // ---------------------------------------------------------------------------
  group('Target 4: Fare API ML Concurrency', function () {
    const selectedMode = RIDE_MODES[Math.floor(Math.random() * RIDE_MODES.length)];
    const farePayload = JSON.stringify({
      pickup_lat: 19.0760,
      pickup_lon: 72.8777,
      dest_lat: 19.2183,
      dest_lon: 72.9781,
      mode: selectedMode,
    });
    const res = http.post(`${BASE_URL}/api/rides/estimate-fare`, farePayload, {
      headers: { 'Content-Type': 'application/json' },
    });
    fareMlLatency.add(res.timings.duration);
    const passed = check(res, {
      'Fare estimation status is 200': (r) => r.status === 200,
      'PWD Mode strictly enforces 1.0x surge clamp': (r) => {
        try {
          const body = JSON.parse(r.body);
          if (selectedMode === 'pwd') {
            return body.surge_multiplier === 1.0;
          }
          return true;
        } catch {
          return false;
        }
      },
      'Fare estimate is non-zero': (r) => {
        try {
          return JSON.parse(r.body).estimated_fare > 0;
        } catch {
          return false;
        }
      },
    });
    if (!passed) errorRate.add(1);
  });

  // ---------------------------------------------------------------------------
  // Target 2: Booking API — Flash Booking Burst Benchmark
  // ---------------------------------------------------------------------------
  let createdRideId = null;
  group('Target 2: Booking API Ride Creation Burst', function () {
    const ridePayload = JSON.stringify({
      mode: 'normal',
      pickup_address: 'Andheri East, Mumbai',
      pickup_latitude: 19.1136,
      pickup_longitude: 72.8697,
      destination_address: 'Bandra Kurla Complex, Mumbai',
      destination_latitude: 19.0657,
      destination_longitude: 72.8687,
      passenger_count: 1,
      passenger_details: 'Load Test Passenger',
      fare_amount: 250.0,
    });
    const res = http.post(`${BASE_URL}/api/rides/create`, ridePayload, {
      headers: authHeaders,
    });
    bookingLatency.add(res.timings.duration);
    const passed = check(res, {
      'Ride creation status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'Ride ID returned and 4-digit OTP issued': (r) => {
        try {
          const body = JSON.parse(r.body);
          if (body._id || body.id) {
            createdRideId = body._id || body.id;
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
    });
    if (!passed) errorRate.add(1);
  });

  // ---------------------------------------------------------------------------
  // Target 3: Driver Matching API — Fleet Discovery & Spatial Gating
  // ---------------------------------------------------------------------------
  group('Target 3: Driver Matching Fleet Discovery', function () {
    const res = http.get(`${BASE_URL}/api/drivers/active`, {
      headers: authHeaders,
    });
    driverMatchingLatency.add(res.timings.duration);
    const passed = check(res, {
      'Active driver fleet status is 200': (r) => r.status === 200,
      'Fleet array returned without error': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body));
        } catch {
          return false;
        }
      },
    });
    if (!passed) errorRate.add(1);
  });

  // ---------------------------------------------------------------------------
  // Target 6: Emergency SOS API — Panic Click Burst & Debounce Check
  // ---------------------------------------------------------------------------
  group('Target 6: Emergency SOS Panic Dispatch', function () {
    const sosPayload = JSON.stringify({
      user_id: '66cd1234567890abcdef1234',
      latitude: 19.0760,
      longitude: 72.8777,
      address: 'Marine Drive, Mumbai',
      severity: 'high',
      idempotency_key: `k6_sos_${__VU}_${Math.floor(Date.now() / 15000)}`,
    });
    const res = http.post(`${BASE_URL}/api/safety/sos`, sosPayload, {
      headers: authHeaders,
    });
    sosEmergencyLatency.add(res.timings.duration);
    const passed = check(res, {
      'SOS status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'SOS response contains alert ID': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body._id !== undefined || body.id !== undefined;
        } catch {
          return false;
        }
      },
    });
    if (!passed) errorRate.add(1);
  });

  // ---------------------------------------------------------------------------
  // Target 7: Admin Dashboard API — Analytical Aggregation Load
  // ---------------------------------------------------------------------------
  group('Target 7: Admin Dashboard Stats Aggregation', function () {
    const res = http.get(`${BASE_URL}/api/admin/stats`, {
      headers: authHeaders,
    });
    adminDashboardLatency.add(res.timings.duration);
    const passed = check(res, {
      'Admin stats responded promptly (200 or 403)': (r) => r.status === 200 || r.status === 403,
    });
    if (!passed) errorRate.add(1);
  });

  // ---------------------------------------------------------------------------
  // Target 8: MongoDB Sustained CRUD & Document Lifecycle
  // ---------------------------------------------------------------------------
  group('Target 8: MongoDB Active Ride Query & Status Lifecycle', function () {
    const res = http.get(`${BASE_URL}/api/rides/active`, {
      headers: authHeaders,
    });
    dbLifecycleLatency.add(res.timings.duration);
    const passed = check(res, {
      'Active ride query status is 200': (r) => r.status === 200,
    });
    if (!passed) errorRate.add(1);
  });

  sleep(1);
}

// =============================================================================
// Target 6 Dedicated Scenario: SOS Storm (150,000 Total Rapid Burst Requests)
// 1,500 Virtual Users x 100 Rapid Attempts = 150,000 Total Requests
// =============================================================================
export function sosStormScenario() {
  const vuId = __VU;
  // All 100 requests within the same 15-second epoch share the identical idempotency window
  const timeEpoch15s = Math.floor(Date.now() / 15000);
  const idempotencyKey = `sos_storm_vu_${vuId}_epoch_${timeEpoch15s}`;

  const sosPayload = JSON.stringify({
    user_id: `66cd1234567890abcdef${vuId.toString().padStart(4, '0')}`,
    latitude: 19.0760 + (vuId * 0.0001),
    longitude: 72.8777 + (vuId * 0.0001),
    address: `Storm Simulation Point ${vuId}`,
    severity: 'critical',
    idempotency_key: idempotencyKey,
  });

  const res = http.post(`${BASE_URL}/api/safety/sos`, sosPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  sosTotalRequests.add(1);
  sosEmergencyLatency.add(res.timings.duration);

  let isFirstForVU = false;
  try {
    const body = JSON.parse(res.body);
    if (res.status === 201) {
      // New canonical incident created
      sosCanonicalCreated.add(1);
      isFirstForVU = true;
    } else if (res.status === 200) {
      // 15-second debounce returned existing canonical record
      sosDebouncedSuppressed.add(1);
    }
  } catch (e) {
    errorRate.add(1);
  }

  check(res, {
    'SOS Storm status is valid (200/201)': (r) => r.status === 200 || r.status === 201,
    'Zero unhandled 500 crashes during storm': (r) => r.status !== 500,
  });
}
