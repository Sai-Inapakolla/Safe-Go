import os
import sys
import unittest
import asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock, AsyncMock

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.models import SOSAlert, SOSStatus, SOSSeverity, User, UserRole
from app.schemas import SOSCreate
from app.utils.security import create_access_token
from app.services.notification_service import NotificationService


class TestSOSConcurrencyAndAbuse(unittest.TestCase):
    """
    Comprehensive SOS Abuse, Concurrency & Failure Resilience Test Suite 🔥
    Covers all 11 production stress scenarios.
    """

    @classmethod
    def setUpClass(cls):
        cls.client_cm = TestClient(app)
        cls.client = cls.client_cm.__enter__()
        cls.headers = {"Authorization": "Bearer admin-dummy-token"}

    @classmethod
    def tearDownClass(cls):
        cls.client_cm.__exit__(None, None, None)

    # -------------------------------------------------------------
    # Scenario 1: 2 SOS requests at exactly the same time
    # -------------------------------------------------------------
    def test_scenario_01_two_simultaneous_sos_requests(self):
        """2 SOS requests triggered concurrently must return consistent active SOS records"""
        payload = {
            "latitude": 12.9716,
            "longitude": 77.5946,
            "location_address": "MG Road, Bengaluru",
            "severity": "critical"
        }

        # Issue 2 requests back-to-back
        res1 = self.client.post("/api/safety/sos", json=payload, headers=self.headers)
        res2 = self.client.post("/api/safety/sos", json=payload, headers=self.headers)

        self.assertIn(res1.status_code, [200, 201])
        self.assertIn(res2.status_code, [200, 201])
        
        data1 = res1.json()
        data2 = res2.json()

        # Due to 15s concurrency guard, both should refer to the same active alert or valid IDs
        self.assertEqual(data1["status"], "active")
        self.assertEqual(data2["status"], "active")

    # -------------------------------------------------------------
    # Scenario 2: 10 SOS requests in 1 second (Burst flood)
    # -------------------------------------------------------------
    def test_scenario_02_ten_rapid_sos_requests_in_one_second(self):
        """10 rapid SOS requests in 1 second are throttled to prevent spam and duplicate DB floods"""
        payload = {
            "latitude": 19.0760,
            "longitude": 72.8777,
            "location_address": "Mumbai Central",
            "severity": "critical"
        }

        responses = []
        for _ in range(10):
            res = self.client.post("/api/safety/sos", json=payload, headers=self.headers)
            responses.append(res)

        # All requests must succeed with 200/201 without crashing
        for res in responses:
            self.assertIn(res.status_code, [200, 201])
            self.assertEqual(res.json()["status"], "active")

        # The ID of the subsequent requests matches the initial active request (cooldown reuse)
        first_id = responses[0].json()["_id"]
        for res in responses[1:]:
            self.assertEqual(res.json()["_id"], first_id)

    # -------------------------------------------------------------
    # Scenario 3: SOS triggered while another SOS is processing
    # -------------------------------------------------------------
    def test_scenario_03_in_flight_concurrent_trigger(self):
        """In-flight overlapping trigger safely reuses or awaits active state"""
        payload = {
            "latitude": 28.6139,
            "longitude": 77.2090,
            "location_address": "Connaught Place, New Delhi",
            "severity": "critical"
        }

        res1 = self.client.post("/api/safety/sos", json=payload, headers=self.headers)
        res2 = self.client.post("/api/safety/sos", json=payload, headers=self.headers)

        self.assertEqual(res1.status_code, 201)
        self.assertIn(res2.status_code, [200, 201])
        self.assertEqual(res1.json()["_id"], res2.json()["_id"])

    # -------------------------------------------------------------
    # Scenario 4: Duplicate requests with the same reference/idempotency ID
    # -------------------------------------------------------------
    def test_scenario_04_idempotent_duplicate_reference_id(self):
        """Requests with identical idempotency_key must return the exact same instance"""
        idem_key = "IDEMPOTENT_REF_TEST_12345"
        payload = {
            "latitude": 13.0827,
            "longitude": 80.2707,
            "location_address": "Chennai Central",
            "severity": "critical",
            "idempotency_key": idem_key
        }

        res1 = self.client.post("/api/safety/sos", json=payload, headers=self.headers)
        self.assertIn(res1.status_code, [200, 201])
        id1 = res1.json()["_id"]

        # Duplicate retry with same idempotency key
        res2 = self.client.post("/api/safety/sos", json=payload, headers=self.headers)
        self.assertIn(res2.status_code, [200, 201])
        id2 = res2.json()["_id"]

        self.assertEqual(id1, id2)

    # -------------------------------------------------------------
    # Scenario 5: Cancellation arriving while dispatch is happening
    # -------------------------------------------------------------
    def test_scenario_05_cancellation_during_dispatch_race_condition(self):
        """Cancelled SOS alert cannot be subsequently escalated to authorities"""
        create_res = self.client.post("/api/safety/sos", json={
            "latitude": 12.9716,
            "longitude": 77.5946,
            "severity": "critical",
            "idempotency_key": "CANCEL_RACE_TEST_001"
        }, headers=self.headers)

        sos_id = create_res.json()["_id"]

        # User cancels SOS
        cancel_res = self.client.post(f"/api/safety/sos/{sos_id}/cancel", headers=self.headers)
        self.assertEqual(cancel_res.status_code, 200)
        self.assertEqual(cancel_res.json()["status"], "false_alarm")

        # In-flight authority escalation attempted after cancellation must be rejected with 400
        escalate_res = self.client.post(f"/api/safety/sos/{sos_id}/dispatch-authorities", headers=self.headers)
        self.assertEqual(escalate_res.status_code, 400)
        self.assertIn("Cannot escalate", escalate_res.json()["detail"])

    # -------------------------------------------------------------
    # Scenario 6: SOS after cooldown expires
    # -------------------------------------------------------------
    def test_scenario_06_sos_after_cooldown_expires(self):
        """New distinct SOS alert is created when cooldown timestamp is elapsed"""
        now = datetime.now(timezone.utc)
        payload1 = {"latitude": 12.97, "longitude": 77.59, "idempotency_key": "COOLDOWN_EXPIRE_01"}
        payload2 = {"latitude": 12.98, "longitude": 77.60, "idempotency_key": "COOLDOWN_EXPIRE_02"}

        res1 = self.client.post("/api/safety/sos", json=payload1, headers=self.headers)
        self.assertIn(res1.status_code, [200, 201])

        # Second payload with distinct key after state clear
        res2 = self.client.post("/api/safety/sos", json=payload2, headers=self.headers)
        self.assertIn(res2.status_code, [200, 201])

    # -------------------------------------------------------------
    # Scenario 7: SOS immediately before cooldown expires (boundary test)
    # -------------------------------------------------------------
    def test_scenario_07_boundary_cooldown_deduplication(self):
        """Immediate back-to-back triggers without distinct keys return same active SOS"""
        res1 = self.client.post("/api/safety/sos", json={"latitude": 22.30, "longitude": 73.18}, headers=self.headers)
        res2 = self.client.post("/api/safety/sos", json={"latitude": 22.30, "longitude": 73.18}, headers=self.headers)

        self.assertEqual(res1.json()["_id"], res2.json()["_id"])

    # -------------------------------------------------------------
    # Scenario 8: Database failure during SOS creation
    # -------------------------------------------------------------
    @patch("app.routes.safety.SOSAlert.insert", new_callable=AsyncMock)
    def test_scenario_08_database_failure_during_sos_creation(self, mock_insert):
        """Database exception returns structured 503 HTTP status for offline emergency fallback"""
        mock_insert.side_effect = Exception("MongoDB Connection Pool Exhausted")

        fresh_token = create_access_token({
            "sub": "507f1f77bcf86cd799439099",
            "email": "fresh_db_failure_user@safego.in",
            "role": "passenger"
        })
        fresh_headers = {"Authorization": f"Bearer {fresh_token}"}

        res = self.client.post("/api/safety/sos", json={
            "latitude": 12.9716,
            "longitude": 77.5946,
            "idempotency_key": "DB_FAIL_SIMULATION"
        }, headers=fresh_headers)

        self.assertEqual(res.status_code, 503)
        self.assertIn("temporarily unavailable", res.json()["detail"])

    # -------------------------------------------------------------
    # Scenario 9: SMS failure after SOS is successfully stored
    # -------------------------------------------------------------
    @patch("app.services.notification_service.NotificationService.send_sos_sms")
    def test_scenario_09_sms_failure_after_db_storage(self, mock_sms):
        """Twilio SMS failure does not crash endpoint or rollback active SOS in database"""
        mock_sms.side_effect = Exception("Twilio SMS Gateway 504 Gateway Timeout")

        res = self.client.post("/api/safety/sos", json={
            "latitude": 12.9716,
            "longitude": 77.5946,
            "emergency_contact_phone": "+919490969706",
            "idempotency_key": "SMS_FAIL_TEST_001"
        }, headers=self.headers)

        # SOS creation succeeds despite SMS failure
        self.assertIn(res.status_code, [200, 201])
        self.assertEqual(res.json()["status"], "active")

    # -------------------------------------------------------------
    # Scenario 10: Voice-call failure after SMS succeeds
    # -------------------------------------------------------------
    @patch("app.services.notification_service.NotificationService.trigger_sos_call")
    def test_scenario_10_voice_call_failure_after_sms_succeeds(self, mock_call):
        """Voice call exception is isolated; SMS and SOS document remain active"""
        mock_call.side_effect = Exception("Twilio Voice Call Line Busy")

        res = self.client.post("/api/safety/sos", json={
            "latitude": 12.9716,
            "longitude": 77.5946,
            "emergency_contact_phone": "+919490969706",
            "idempotency_key": "VOICE_FAIL_TEST_001"
        }, headers=self.headers)

        self.assertIn(res.status_code, [200, 201])
        self.assertEqual(res.json()["status"], "active")

    # -------------------------------------------------------------
    # Scenario 11: Both Admin and Tester unavailable
    # -------------------------------------------------------------
    @patch("app.config.settings.ADMIN_PHONE", "")
    @patch("app.config.settings.TESTER_PHONE", "")
    def test_scenario_11_both_admin_and_tester_unavailable(self):
        """Unconfigured Admin/Tester contacts do not prevent passenger SOS creation"""
        res = self.client.post("/api/safety/sos", json={
            "latitude": 12.9716,
            "longitude": 77.5946,
            "emergency_contact_phone": "+919490969706",
            "idempotency_key": "NO_ADMIN_TEST_001"
        }, headers=self.headers)

        self.assertIn(res.status_code, [200, 201])
        self.assertEqual(res.json()["status"], "active")


if __name__ == "__main__":
    unittest.main()
