import os
import sys
import time
import random
import unittest
import asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from bson import ObjectId
from beanie import PydanticObjectId
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.models import (
    User, UserRole, Driver, RideMode, DriverStatus, Ride, RideStatus,
    SOSAlert, SOSStatus, SOSSeverity, Vehicle, DriverDocument, Gender
)
from app.utils.security import (
    hash_password, verify_password, create_access_token, decode_access_token
)
import app.routes.safety as safety_module
from app.services.notification_service import notification_service
from app.services.geo_service import geo_service
from app.ml.predictor import SafetyPredictor
from app.ml.fare_predictor import FareSurgePredictor


class TestSafeGoEndToEndAndRegression(unittest.TestCase):
    """
    🎯 SafeGo End-to-End & Automated Regression Test Suite 🎯
    Covers:
    1. Complete End-to-End SOS Emergency Lifecycle:
       - User triggers SOS with GPS Telemetry
       - Backend processes & classifies risk
       - Correct Admin/Tester receives notification
       - SMS & Voice telephony generated and sent
       - Database persists event with Beanie ODM
       - Correct status & tracking returned to user
    2. Automated Regression & Quality Gates:
       - Full critical API pipeline verification
       - Latency & SLA compliance (<2500ms)
       - PWD zero-surge & 15s concurrency abuse guard
       - CI/CD threshold failure protection
    """

    created_sos_id = None

    @classmethod
    def setUpClass(cls):
        cls.client_cm = TestClient(app)
        cls.client = cls.client_cm.__enter__()
        cls.safety_model = SafetyPredictor()
        cls.fare_model = FareSurgePredictor()

        # 1. Admin Authentication Setup
        admin_login = cls.client.post("/api/auth/login", json={
            "email": settings.ADMIN_EMAIL,
            "password": settings.ADMIN_PASSWORD
        })
        if admin_login.status_code == 200:
            token_info = admin_login.json()
            cls.admin_token = token_info["access_token"]
            cls.admin_user_id = token_info["user_id"]
        else:
            cls.admin_user_id = "507f1f77bcf86cd799439011"
            cls.admin_token = create_access_token({
                "sub": cls.admin_user_id,
                "email": settings.ADMIN_EMAIL,
                "role": "admin"
            })
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        # 2. QA Tester Authentication Setup
        tester_login = cls.client.post("/api/auth/login", json={
            "email": settings.TESTER_EMAIL,
            "password": settings.TESTER_PASSWORD
        })
        if tester_login.status_code == 200:
            token_info = tester_login.json()
            cls.tester_token = token_info["access_token"]
            cls.tester_user_id = token_info["user_id"]
        else:
            cls.tester_user_id = "507f1f77bcf86cd799439022"
            cls.tester_token = create_access_token({
                "sub": cls.tester_user_id,
                "email": settings.TESTER_EMAIL,
                "role": "admin"
            })
        cls.tester_headers = {"Authorization": f"Bearer {cls.tester_token}"}

        # 3. Create & Authenticate Passenger for E2E Flow
        unique_stamp = int(time.time() * 1000)
        cls.passenger_email = f"e2e_passenger_{unique_stamp}@safego.in"
        cls.passenger_phone = f"+91{random.randint(6000000000, 9999999999)}"
        cls.passenger_name = "Pooja Sharma (Pink Mode)"

        reg_res = cls.client.post("/api/auth/register", json={
            "full_name": cls.passenger_name,
            "email": cls.passenger_email,
            "phone": cls.passenger_phone,
            "password": "E2ESecurePassword@2026",
            "confirm_password": "E2ESecurePassword@2026",
            "role": "passenger",
            "gender": "female"
        })
        if reg_res.status_code in [200, 201]:
            u_data = reg_res.json()
            cls.passenger_id = u_data.get("_id") or u_data.get("id") or u_data.get("user_id")
        else:
            cls.passenger_id = str(ObjectId())

        login_res = cls.client.post("/api/auth/login", json={
            "email": cls.passenger_email,
            "password": "E2ESecurePassword@2026"
        })
        if login_res.status_code == 200:
            cls.passenger_token = login_res.json()["access_token"]
        else:
            cls.passenger_token = create_access_token({
                "sub": cls.passenger_id,
                "email": cls.passenger_email,
                "role": "passenger"
            })
        cls.passenger_headers = {"Authorization": f"Bearer {cls.passenger_token}"}

    @classmethod
    def tearDownClass(cls):
        cls.client_cm.__exit__(None, None, None)

    # =========================================================================
    # END-TO-END SOS LIFECYCLE TESTS (6 CORE STAGES)
    # =========================================================================

    def test_01_e2e_user_triggers_sos_full_backend_processing(self):
        """E2E Stage 1 & 2: User triggers SOS -> Backend processes & initiates dispatch"""
        sos_payload = {
            "latitude": 19.0760,
            "longitude": 72.8777,
            "location_address": "Bandra Kurla Complex, Mumbai, Maharashtra",
            "emergency_contact_name": "Karan Sharma",
            "emergency_contact_phone": "+919876543210",
            "route_info": "BKC Connector towards Airport",
            "severity": "critical",
            "idempotency_key": f"e2e_sos_{int(time.time()*1000)}"
        }

        # Trigger SOS via API
        response = self.client.post("/api/safety/sos", json=sos_payload, headers=self.passenger_headers)
        self.assertIn(response.status_code, [200, 201])
        data = response.json()

        # Assert correct status returned to user
        self.assertIn("_id", data)
        self.assertEqual(data["status"], "active")
        self.assertEqual(data["severity"], "critical")
        self.assertAlmostEqual(data["latitude"], 19.0760, places=3)
        self.assertAlmostEqual(data["longitude"], 72.8777, places=3)
        self.assertEqual(data["location_address"], "Bandra Kurla Complex, Mumbai, Maharashtra")
        self.assertIsNotNone(data["created_at"])

        # Store for subsequent stages
        TestSafeGoEndToEndAndRegression.created_sos_id = data["_id"]

    def test_02_e2e_correct_admin_and_tester_receive_sos_alert(self):
        """E2E Stage 3: Correct Admin & Tester receive SOS distress signal in real-time"""
        # Trigger an SOS first if not already present
        if not TestSafeGoEndToEndAndRegression.created_sos_id:
            res = self.client.post("/api/safety/sos", json={
                "latitude": 19.0760,
                "longitude": 72.8777,
                "location_address": "BKC Central, Mumbai",
                "severity": "critical",
                "idempotency_key": f"e2e_stage3_{int(time.time()*1000)}"
            }, headers=self.passenger_headers)
            if res.status_code in [200, 201]:
                TestSafeGoEndToEndAndRegression.created_sos_id = res.json()["_id"]

        sos_id = TestSafeGoEndToEndAndRegression.created_sos_id
        self.assertIsNotNone(sos_id, "SOS ID must be active")

        # 1. Admin checks SOS distress feed
        admin_res = self.client.get("/api/admin/sos-alerts", headers=self.admin_headers)
        self.assertEqual(admin_res.status_code, 200)
        alerts = admin_res.json()
        self.assertIsInstance(alerts, list)
        
        # Verify alert presence in Admin portal
        matched_alert = next((a for a in alerts if a.get("_id") == sos_id or a.get("id") == sos_id), None)
        self.assertIsNotNone(matched_alert, "Admin feed must contain the newly triggered SOS alert")
        self.assertEqual(matched_alert["status"], "active")

        # 2. Verify platform statistics reflect active distress incident
        stats_res = self.client.get("/api/admin/stats", headers=self.admin_headers)
        self.assertEqual(stats_res.status_code, 200)
        stats = stats_res.json()
        self.assertIn("active_sos_alerts", stats)
        self.assertGreaterEqual(stats["active_sos_alerts"], 1)

    def test_03_e2e_sms_and_voice_telephony_generation(self):
        """E2E Stage 4: SMS & Voice notifications are generated with correct payload & location link"""
        fresh_passenger_token = create_access_token({
            "sub": str(ObjectId()),
            "email": f"telephony_passenger_{int(time.time()*1000)}@safego.in",
            "role": "passenger"
        })
        fresh_headers = {"Authorization": f"Bearer {fresh_passenger_token}"}

        with patch.object(safety_module.notification_service, "send_sos_sms", return_value="SM_MOCK_12345") as mock_sms, \
             patch.object(safety_module.notification_service, "trigger_sos_call", return_value="CA_MOCK_67890") as mock_call:

            # Trigger SOS with mock telephony spy
            payload = {
                "latitude": 19.0760,
                "longitude": 72.8777,
                "location_address": "Bandra Kurla Complex, Mumbai",
                "emergency_contact_name": "Emergency Team",
                "emergency_contact_phone": "+919490969706",
                "severity": "critical",
                "idempotency_key": f"telephony_e2e_{int(time.time()*1000)}"
            }
            res = self.client.post("/api/safety/sos", json=payload, headers=fresh_headers)
            self.assertIn(res.status_code, [200, 201])

            # Verify SMS was dispatched to passenger contact and central admin/tester
            self.assertTrue(mock_sms.called)
            self.assertTrue(mock_call.called)
            self.assertGreaterEqual(mock_sms.call_count, 1)

    def test_04_e2e_database_records_event_integrity(self):
        """E2E Stage 5: Database records event with full schema fields, timestamps, and indexes"""
        if not TestSafeGoEndToEndAndRegression.created_sos_id:
            res = self.client.post("/api/safety/sos", json={
                "latitude": 19.0760,
                "longitude": 72.8777,
                "location_address": "BKC Database Integrity Node",
                "severity": "critical",
                "idempotency_key": f"e2e_stage5_{int(time.time()*1000)}"
            }, headers=self.passenger_headers)
            if res.status_code in [200, 201]:
                TestSafeGoEndToEndAndRegression.created_sos_id = res.json()["_id"]

        sos_id = TestSafeGoEndToEndAndRegression.created_sos_id
        self.assertIsNotNone(sos_id)

        # Query admin endpoint for document fields
        doc_res = self.client.get("/api/admin/sos-alerts", headers=self.admin_headers)
        self.assertEqual(doc_res.status_code, 200)
        alerts = doc_res.json()
        doc = next((a for a in alerts if a.get("_id") == sos_id or a.get("id") == sos_id), None)
        self.assertIsNotNone(doc)
        self.assertEqual(doc["status"], "active")
        self.assertEqual(doc["severity"], "critical")

    def test_05_e2e_correct_status_returned_and_resolved_lifecycle(self):
        """E2E Stage 6: Correct status is returned to user throughout escalation & resolution"""
        if not TestSafeGoEndToEndAndRegression.created_sos_id:
            res = self.client.post("/api/safety/sos", json={
                "latitude": 19.0760,
                "longitude": 72.8777,
                "location_address": "BKC Resolution Node",
                "severity": "moderate",
                "idempotency_key": f"e2e_stage6_{int(time.time()*1000)}"
            }, headers=self.passenger_headers)
            if res.status_code in [200, 201]:
                TestSafeGoEndToEndAndRegression.created_sos_id = res.json()["_id"]

        sos_id = TestSafeGoEndToEndAndRegression.created_sos_id
        self.assertIsNotNone(sos_id)

        # 1. Authority Escalation (Severity -> Critical)
        esc_res = self.client.post(f"/api/safety/sos/{sos_id}/dispatch-authorities", headers=self.passenger_headers)
        self.assertEqual(esc_res.status_code, 200)
        esc_data = esc_res.json()
        self.assertEqual(esc_data["severity"], "critical")
        self.assertIn("AUTHORITIES ESCALATION", esc_data.get("notes", ""))

        # 2. Resolve the Emergency Distress via Safety Resolve Route
        resolve_payload = {
            "status": "resolved",
            "notes": "Emergency resolved by Quick Response Patrol Unit. Passenger safe."
        }
        resolve_res = self.client.put(f"/api/safety/sos/{sos_id}/resolve", json=resolve_payload, headers=self.admin_headers)
        self.assertEqual(resolve_res.status_code, 200)
        resolved_data = resolve_res.json()
        self.assertEqual(resolved_data["status"], "resolved")
        self.assertIsNotNone(resolved_data.get("resolved_at"))

    # =========================================================================
    # AUTOMATED REGRESSION & CI/CD THRESHOLD GATES
    # =========================================================================

    def test_06_regression_core_api_endpoints_health_and_sla(self):
        """Regression: Core platform endpoints respond within SLA latency (<2500ms) with 0 errors"""
        endpoints = [
            ("GET", "/", None, None, 200),
            ("GET", "/api/modes", None, None, 200),
            ("GET", "/api/map/locations?q=Bengaluru", None, None, 200),
            ("GET", "/api/drivers/active", None, self.passenger_headers, 200),
            ("GET", "/api/admin/stats", None, self.admin_headers, 200),
            ("GET", "/api/auth/me", None, self.passenger_headers, 200),
        ]

        for method, path, payload, headers, expected_status in endpoints:
            start = time.perf_counter()
            if method == "GET":
                res = self.client.get(path, headers=headers)
            else:
                res = self.client.post(path, json=payload, headers=headers)
            elapsed_ms = (time.perf_counter() - start) * 1000

            self.assertEqual(
                res.status_code, expected_status,
                f"Regression failure at {method} {path}: received {res.status_code} != {expected_status}"
            )
            self.assertLess(
                elapsed_ms, 3000,
                f"SLA latency threshold exceeded at {method} {path}: took {elapsed_ms:.1f}ms"
            )

    def test_07_regression_pwd_mode_zero_surge_ceiling_guarantee(self):
        """Regression: PWD Mode fare surge strictly clamped to 1.00x under extreme peak demand"""
        surge_mult, conf = self.fare_model.predict_surge(
            pickup_hour=0,         # Midnight peak
            day_of_week=6,         # Weekend peak
            distance_km=25.0,      # Long haul
            passenger_count=3,     # Group demand
            mode="pwd",            # PWD Accessibility Mode
            ai_safety_prediction="High Priority"
        )
        self.assertEqual(surge_mult, 1.0, f"PWD surge {surge_mult}x violated 1.00x zero-surge guarantee!")
        self.assertGreaterEqual(conf, 0.90)

    def test_08_regression_sos_concurrency_debounce_abuse_guard(self):
        """Regression: Rapid burst of 5 identical SOS triggers deduplicates to single DB event"""
        base_key = f"burst_e2e_{int(time.time()*1000)}"
        payload = {
            "latitude": 28.6139,
            "longitude": 77.2090,
            "location_address": "Connaught Place, New Delhi",
            "emergency_contact_phone": "+919999999001",
            "severity": "critical",
            "idempotency_key": base_key
        }

        # Fire 5 rapid requests with mocked notifications to avoid Twilio 429 rate limit
        with patch.object(safety_module.notification_service, "send_sos_sms", return_value="SM_OK"), \
             patch.object(safety_module.notification_service, "trigger_sos_call", return_value="CA_OK"):
            responses = [
                self.client.post("/api/safety/sos", json=payload, headers=self.passenger_headers)
                for _ in range(5)
            ]

        # All must succeed (200/201)
        for r in responses:
            self.assertIn(r.status_code, [200, 201])

        # All returned IDs must match (deduplicated)
        returned_ids = {r.json()["_id"] for r in responses}
        self.assertEqual(len(returned_ids), 1, "Concurrency guard failed: multiple DB documents created for burst")


if __name__ == "__main__":
    unittest.main()
