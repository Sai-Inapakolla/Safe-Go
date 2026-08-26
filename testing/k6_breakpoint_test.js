import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// =============================================================================
// SAFEGO PHASE 4 — BREAKPOINT TESTING TO SLA FAILURE & SATURATION
// Goal: Step-ramp concurrency until the single-node server breaches SLA limits
//       (p95 > 500ms, error rate > 1%) and identify the exact collapse threshold.
// =============================================================================

const breakpointReqDuration = new Trend('breakpoint_req_duration');
const http5xxErrors = new Counter('http_5xx_errors');
const connectionFailures = new Counter('connection_failures');
const errorRate = new Rate('breakpoint_error_rate');

export const options = {
  scenarios: {
    breakpoint_ramp_to_failure: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 1000 },   // Tier 1: 1,000 VUs (Baseline / Healthy)
        { duration: '2m', target: 3500 },   // Tier 2: 3,500 VUs (Optimal Peak Load)
        { duration: '2m', target: 5000 },   // Tier 3: 5,000 VUs (High Load - Healthy)
        { duration: '2m', target: 7500 },   // Tier 4: 7,500 VUs (Latency Warning / Degradation)
        { duration: '2m', target: 9500 },   // Tier 5: 9,500 VUs (SLA BREACH THRESHOLD)
        { duration: '2m', target: 12000 },  // Tier 6: 12,000 VUs (System Saturation / Socket Drop)
        { duration: '1m', target: 0 },       // Cooldown
      ],
      exec: 'breakpointWorkflow',
      tags: { test_type: 'breakpoint' },
    },
  },
  // We record metrics continuously across all tiers to pinpoint exact degradation points
  thresholds: {
    'breakpoint_req_duration': ['p(95)<1500'], // Track failure envelope
    'breakpoint_error_rate': ['rate<0.10'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const SAMPLE_CITIES = ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Vadodara', 'Chennai', 'Pune'];

export function breakpointWorkflow() {
  const currentVUs = __VU;

  // Mixed realistic API payload: Location Query + Fare Estimate + DB Active Rides
  const queryCity = SAMPLE_CITIES[Math.floor(Math.random() * SAMPLE_CITIES.length)];
  
  const res = http.get(`${BASE_URL}/api/map/search?q=${queryCity}`);
  breakpointReqDuration.add(res.timings.duration);

  const passed = check(res, {
    'Response status is 200': (r) => r.status === 200,
    'Response time under 500ms SLA': (r) => r.timings.duration < 500,
  });

  if (!passed) {
    errorRate.add(1);
    if (res.status >= 500) {
      http5xxErrors.add(1);
    }
    if (res.status === 0 || res.error_code) {
      connectionFailures.add(1);
    }
  }

  // Also query dynamic fare estimation
  const fareRes = http.post(`${BASE_URL}/api/rides/estimate-fare`, JSON.stringify({
    pickup_lat: 19.0760, pickup_lon: 72.8777,
    dest_lat: 19.2183, dest_lon: 72.9781,
    mode: 'normal',
  }), { headers: { 'Content-Type': 'application/json' } });
  breakpointReqDuration.add(fareRes.timings.duration);

  if (fareRes.status !== 200) {
    errorRate.add(1);
    if (fareRes.status >= 500) http5xxErrors.add(1);
  }

  sleep(0.5);
}
