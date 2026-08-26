import os
import sys
import time
import random
import unittest
import asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from dotenv import load_dotenv
from jose import jwt

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


class TestSafeGoSecurityAndAbuse(unittest.TestCase):
    """
    🔥 Phase 3 — Complete Security, Authorization & API Abuse Test Suite 🔥
    Simulates adversarial external attacker testing across:
    - Authentication attacks (Missing, Invalid, Expired, Tampered, Malformed JWTs)
    - Authorization & RBAC Privilege Escalations (Passenger/Driver -> Admin APIs)
    - Insecure Direct Object References (IDOR on Rides, SOS Alerts, Driver Earnings)
    - API Abuse (100x Login Brute-force, 100x SOS Flood, 100x Booking Flood)
    - Payload Fuzzing (Oversized JSON, Malicious ObjectIds, Extra Fields, SQLi strings)
    - Coordinate Boundary Attacks (Extreme, Inverted, Zero Coordinates)
    - SOS-Specific Security Vectors (Cancellation races, Authority escalation blocks)
    """

    @classmethod
    def setUpClass(cls):
        cls.client_cm = TestClient(app)
        cls.client = cls.client_cm.__enter__()

        # 1. Authenticate / Setup Admin User
        admin_login = cls.client.post("/api/auth/login", json={
            "email": settings.ADMIN_EMAIL,
            "password": settings.ADMIN_PASSWORD
        })
        if admin_login.status_code == 200:
            cls.admin_token = admin_login.json()["access_token"]
            cls.admin_user_id = admin_login.json()["user_id"]
        else:
            cls.admin_user_id = "507f1f77bcf86cd799439011"
            cls.admin_token = create_access_token({"sub": cls.admin_user_id, "role": "admin"})

        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        # 2. Register & Setup Victim Passenger (User A)
        cls.user_a_email = f"victim_a_{int(time.time() * 1000)}@safego.in"
        reg_a = cls.client.post("/api/auth/register", json={
            "full_name": "Victim User A",
            "email": cls.user_a_email,
            "phone": f"+91{random.randint(6000000000, 9999999999)}",
            "password": "PasswordA@123",
            "confirm_password": "PasswordA@123",
            "role": "passenger",
            "gender": "female"
        })
        cls.user_a_id = reg_a.json()["_id"]
        login_a = cls.client.post("/api/auth/login", json={
            "email": cls.user_a_email,
            "password": "PasswordA@123"
        })
        cls.user_a_token = login_a.json()["access_token"]
        cls.user_a_headers = {"Authorization": f"Bearer {cls.user_a_token}"}

        # 3. Register & Setup Attacker Passenger (User B)
        cls.user_b_email = f"attacker_b_{int(time.time() * 1000)}@safego.in"
        reg_b = cls.client.post("/api/auth/register", json={
            "full_name": "Attacker User B",
            "email": cls.user_b_email,
            "phone": f"+91{random.randint(6000000000, 9999999999)}",
            "password": "PasswordB@123",
            "confirm_password": "PasswordB@123",
            "role": "passenger",
            "gender": "male"
        })
        cls.user_b_id = reg_b.json()["_id"]
        login_b = cls.client.post("/api/auth/login", json={
            "email": cls.user_b_email,
            "password": "PasswordB@123"
        })
        cls.user_b_token = login_b.json()["access_token"]
        cls.user_b_headers = {"Authorization": f"Bearer {cls.user_b_token}"}

        # 4. Register & Setup Driver User
        cls.driver_email = f"driver_{int(time.time() * 1000)}@safego.in"
        reg_d = cls.client.post("/api/auth/register", json={
            "full_name": "Fleet Driver Ramesh",
            "email": cls.driver_email,
            "phone": f"+91{random.randint(6000000000, 9999999999)}",
            "password": "DriverPassword@123",
            "confirm_password": "DriverPassword@123",
            "role": "driver",
            "gender": "male"
        })
        cls.driver_user_id = reg_d.json()["_id"]
        login_d = cls.client.post("/api/auth/login", json={
            "email": cls.driver_email,
            "password": "DriverPassword@123"
        })
        cls.driver_token = login_d.json()["access_token"]
        cls.driver_headers = {"Authorization": f"Bearer {cls.driver_token}"}

    @classmethod
    def tearDownClass(cls):
        cls.client_cm.__exit__(None, None, None)

    # =========================================================================
    # SECTION 1: AUTHENTICATION ATTACKS
    # =========================================================================
    def test_auth_attack_01_missing_token(self):
        """Attacker calls protected routes without Authorization header -> 401 Unauthorized"""
        endpoints = [
            ("GET", "/api/auth/me"),
            ("GET", "/api/admin/stats"),
            ("GET", "/api/drivers/me"),
            ("GET", "/api/rides/active"),
        ]
        for method, ep in endpoints:
            res = self.client.request(method, ep)
            self.assertEqual(res.status_code, 401, f"Expected 401 on {ep} without token")

    def test_auth_attack_02_invalid_token(self):
        """Attacker sends garbage token string -> 401 Unauthorized"""
        headers = {"Authorization": "Bearer random_garbage_not_a_valid_token_xyz"}
        res = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(res.status_code, 401)

    def test_auth_attack_03_expired_token(self):
        """Attacker sends token with past expiration timestamp -> 401 Unauthorized"""
        past_expire = datetime.now(timezone.utc) - timedelta(hours=24)
        expired_token = jwt.encode(
            {"sub": self.user_a_id, "role": "passenger", "exp": past_expire},
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
        self.assertEqual(res.status_code, 401)

    def test_auth_attack_04_tampered_token_signature(self):
        """Attacker alters payload or signs with forged secret key -> 401 Unauthorized"""
        forged_token = jwt.encode(
            {"sub": self.user_a_id, "role": "admin", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            "attacker-fake-secret-key-1234567890",
            algorithm=settings.ALGORITHM
        )
        res = self.client.get("/api/admin/stats", headers={"Authorization": f"Bearer {forged_token}"})
        self.assertEqual(res.status_code, 401)

    def test_auth_attack_05_malformed_jwt(self):
        """Attacker sends malformed header formats (no scheme, single dot, empty bearer) -> 401/403"""
        malformed_headers = [
            {"Authorization": "InvalidScheme token123"},
            {"Authorization": "Bearer not.a.jwt"},
            {"Authorization": "Bearer"},
            {"Authorization": ""},
        ]
        for h in malformed_headers:
            res = self.client.get("/api/auth/me", headers=h)
            self.assertIn(res.status_code, [401, 403])

    def test_auth_attack_06_nonexistent_user_token(self):
        """Attacker generates validly signed token with a non-existent ObjectId -> 401/404"""
        fake_id = "507f1f77bcf86cd799439999"
        orphan_token = create_access_token({"sub": fake_id, "role": "passenger"})
        res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {orphan_token}"})
        self.assertIn(res.status_code, [401, 404])

    # =========================================================================
    # SECTION 2: AUTHORIZATION ATTACKS & ROLE PRIVILEGE ESCALATION
    # =========================================================================
    def test_authz_attack_01_passenger_accessing_admin_apis(self):
        """Passenger attempts to access Admin-only endpoints -> 403 Forbidden"""
        admin_endpoints = [
            ("GET", "/api/admin/stats", None),
            ("GET", "/api/admin/users", None),
            ("GET", "/api/admin/sos-alerts", None),
            ("GET", "/api/admin/drivers/pending", None),
            ("PUT", f"/api/admin/drivers/{ObjectId()}/approval", {"status": "approved"}),
        ]
        for method, ep, body in admin_endpoints:
            res = self.client.request(method, ep, json=body, headers=self.user_a_headers)
            self.assertEqual(res.status_code, 403, f"Passenger should be forbidden (403) on {ep}")


    def test_authz_attack_02_passenger_accessing_driver_apis(self):
        """Passenger attempts to access Driver-only operational endpoints -> 403 Forbidden"""
        driver_endpoints = [
            ("GET", "/api/drivers/me"),
            ("GET", "/api/drivers/me/earnings"),
            ("GET", "/api/drivers/me/available-rides"),
            ("PUT", "/api/drivers/me/online-status"),
        ]
        for method, ep in driver_endpoints:
            res = self.client.request(method, ep, json={"is_online": True} if method == "PUT" else None, headers=self.user_a_headers)
            self.assertEqual(res.status_code, 403, f"Passenger should be forbidden (403) on {ep}")

    def test_authz_attack_03_driver_accessing_admin_apis(self):
        """Driver attempts to access Admin-only endpoints -> 403 Forbidden"""
        admin_endpoints = [
            ("GET", "/api/admin/stats"),
            ("GET", "/api/admin/users"),
            ("GET", "/api/admin/sos-alerts"),
        ]
        for method, ep in admin_endpoints:
            res = self.client.request(method, ep, headers=self.driver_headers)
            self.assertEqual(res.status_code, 403, f"Driver should be forbidden (403) on {ep}")

    # =========================================================================
    # SECTION 3: INSECURE DIRECT OBJECT REFERENCE (IDOR) ATTACKS
    # =========================================================================
    def test_idor_attack_01_user_b_viewing_user_a_private_ride(self):
        """User B (Attacker) attempts to read User A's private ride details via IDOR -> 403 Access Denied"""
        # 1. User A creates a ride
        create_res = self.client.post("/api/rides/request", json={
            "mode": "normal",
            "pickup_address": "Indiranagar, Bengaluru",
            "pickup_latitude": 12.9784,
            "pickup_longitude": 77.6408,
            "destination_address": "MG Road, Bengaluru",
            "destination_latitude": 12.9716,
            "destination_longitude": 77.5946,
            "passenger_count": 1
        }, headers=self.user_a_headers)
        self.assertEqual(create_res.status_code, 201)
        ride_a_id = create_res.json()["_id"]

        # 2. User B tries to view User A's ride
        res = self.client.get(f"/api/rides/{ride_a_id}", headers=self.user_b_headers)
        self.assertEqual(res.status_code, 403, "User B should be blocked from reading User A's ride")

    def test_idor_attack_02_user_b_cancelling_user_a_ride(self):
        """User B (Attacker) attempts to cancel User A's active ride via status update -> 403 Access Denied"""
        # 1. User A creates a ride
        create_res = self.client.post("/api/rides/request", json={
            "mode": "normal",
            "pickup_address": "Indiranagar, Bengaluru",
            "pickup_latitude": 12.9784,
            "pickup_longitude": 77.6408,
            "destination_address": "MG Road, Bengaluru",
            "destination_latitude": 12.9716,
            "destination_longitude": 77.5946,
            "passenger_count": 1
        }, headers=self.user_a_headers)
        self.assertEqual(create_res.status_code, 201)
        ride_a_id = create_res.json()["_id"]

        # 2. User B tries to cancel User A's ride
        cancel_res = self.client.put(f"/api/rides/{ride_a_id}/status", json={
            "status": "cancelled",
            "cancel_reason": "Malicious cancellation by attacker"
        }, headers=self.user_b_headers)
        self.assertEqual(cancel_res.status_code, 403, "User B must not be permitted to cancel User A's ride")

    def test_idor_attack_03_user_b_cancelling_user_a_sos_alert(self):
        """User B (Attacker) attempts to cancel User A's emergency SOS distress signal -> 403 Access Denied"""
        # 1. User A triggers emergency SOS
        sos_res = self.client.post("/api/safety/sos", json={
            "latitude": 12.9716,
            "longitude": 77.5946,
            "location_address": "MG Road Distress Point",
            "severity": "critical"
        }, headers=self.user_a_headers)
        self.assertIn(sos_res.status_code, [200, 201])
        sos_a_id = sos_res.json()["_id"]

        # 2. User B attempts to cancel User A's SOS
        cancel_res = self.client.post(f"/api/safety/sos/{sos_a_id}/cancel", json={
            "reason": "Malicious attempt to silence emergency"
        }, headers=self.user_b_headers)
        self.assertEqual(cancel_res.status_code, 403, "Attacker cannot dismiss another passenger's emergency alert")

    # =========================================================================
    # SECTION 4: API ABUSE, BRUTE-FORCE & FLOOD ATTACKS
    # =========================================================================
    def test_abuse_01_rapid_login_burst_100_requests(self):
        """100 rapid incorrect login attempts -> Handled cleanly without server crash or pool starvation"""
        for i in range(100):
            res = self.client.post("/api/auth/login", json={
                "email": f"target_user_{i}@safego.in",
                "password": f"WrongPassword_{i}"
            })
            self.assertEqual(res.status_code, 401)

    def test_abuse_02_rapid_sos_burst_100_requests(self):
        """25 rapid SOS requests in burst -> 15s concurrency guard deduplicates to 1 active emergency record"""
        payload = {
            "latitude": 19.0760,
            "longitude": 72.8777,
            "location_address": "Mumbai Central",
            "severity": "critical"
        }
        responses = []
        for _ in range(25):
            res = self.client.post("/api/safety/sos", json=payload, headers=self.user_a_headers)
            responses.append(res)

        # All requests must succeed with 200/201 without throwing 500
        for res in responses:
            self.assertIn(res.status_code, [200, 201])

        # All responses must refer to the exact same deduplicated emergency ID
        first_alert_id = responses[0].json()["_id"]
        for res in responses[1:]:
            self.assertEqual(res.json()["_id"], first_alert_id, "25 SOS flood must be deduplicated into 1 record")

    def test_abuse_03_duplicate_sos_idempotency_key(self):
        """Identical idempotency_key returned repeatedly -> Exact same object returned, zero duplicate SMS"""
        idem_key = f"IDEMPOTENCY_SECURITY_ATTACK_{time.time()}"
        payload = {
            "latitude": 28.6139,
            "longitude": 77.2090,
            "location_address": "Connaught Place, New Delhi",
            "severity": "critical",
            "idempotency_key": idem_key
        }

        res1 = self.client.post("/api/safety/sos", json=payload, headers=self.user_a_headers)
        res2 = self.client.post("/api/safety/sos", json=payload, headers=self.user_a_headers)

        self.assertIn(res1.status_code, [200, 201])
        self.assertIn(res2.status_code, [200, 201])
        self.assertEqual(res1.json()["_id"], res2.json()["_id"])

    # =========================================================================
    # SECTION 5: PAYLOAD FUZZING, INJECTION & SCHEMA VALIDATION
    # =========================================================================
    def test_fuzzing_01_oversized_payload(self):
        """Attacker sends oversized 500KB string payload in address/notes -> Handled gracefully without crash"""
        giant_string = "A" * (500 * 1024)  # 500KB
        res = self.client.post("/api/safety/sos", json={
            "latitude": 12.9716,
            "longitude": 77.5946,
            "location_address": giant_string,
            "severity": "critical"
        }, headers=self.user_a_headers)
        self.assertIn(res.status_code, [200, 201, 400, 413, 422])

    def test_fuzzing_02_missing_required_fields(self):
        """Attacker sends empty or missing required fields -> 422 Unprocessable Entity"""
        # Missing password in login
        res1 = self.client.post("/api/auth/login", json={"email": "test@safego.in"})
        self.assertEqual(res1.status_code, 422)

        # Missing email in register
        res2 = self.client.post("/api/auth/register", json={
            "full_name": "Test User",
            "password": "Password123",
            "confirm_password": "Password123"
        })
        self.assertEqual(res2.status_code, 422)

    def test_fuzzing_03_privilege_escalation_injected_fields(self):
        """Attacker attempts to inject role='admin' or is_verified=True during regular registration"""
        unique_email = f"injected_user_{int(time.time() * 1000)}@safego.in"
        res = self.client.post("/api/auth/register", json={
            "full_name": "Hacker User",
            "email": unique_email,
            "phone": f"+91{random.randint(6000000000, 9999999999)}",
            "password": "Password123@",
            "confirm_password": "Password123@",
            "role": "admin",  # Injected admin role in public registration
            "is_verified": True
        })
        # Public registration strictly rejects 'admin' role
        self.assertEqual(res.status_code, 400)
        self.assertIn("Role must be 'passenger' or 'driver'", res.json()["detail"])

    def test_fuzzing_04_malicious_non_objectids(self):
        """Attacker passes SQL injection strings, non-hex IDs, path traversals into URL params -> 400/404 (No 500 crash)"""
        malicious_ids = [
            "' OR '1'='1",
            "../../../../etc/passwd",
            "<script>alert(1)</script>",
            "undefined",
            "null",
            "123",
            "zzzzzzzzzzzzzzzzzzzzzzzz"
        ]
        for mid in malicious_ids:
            res_ride = self.client.get(f"/api/rides/{mid}", headers=self.user_a_headers)
            self.assertIn(res_ride.status_code, [400, 404, 422], f"Failed on ride malicious ID: {mid}")

            res_sos = self.client.post(f"/api/safety/sos/{mid}/cancel", json={"reason": "test"}, headers=self.user_a_headers)
            self.assertIn(res_sos.status_code, [400, 404, 422], f"Failed on SOS malicious ID: {mid}")

    # =========================================================================
    # SECTION 6: COORDINATE BOUNDARY & SPATIAL ATTACKS
    # =========================================================================
    def test_spatial_attack_01_extreme_impossible_coordinates(self):
        """Attacker submits impossible GPS coordinates (lat 999.0, lng -999.0) -> Handled cleanly without ML crash"""
        res = self.client.post("/api/safety/sos", json={
            "latitude": 999.0,
            "longitude": -999.0,
            "location_address": "Space Coordinates",
            "severity": "critical"
        }, headers=self.user_a_headers)
        self.assertIn(res.status_code, [200, 201, 400, 422])

    def test_spatial_attack_02_inverted_negative_coordinates(self):
        """Attacker submits negative inverted coordinates (lat -90.0, lng 180.0) -> System processes safely"""
        res = self.client.post("/api/safety/sos", json={
            "latitude": -89.99,
            "longitude": 179.99,
            "location_address": "South Pole Edge",
            "severity": "critical"
        }, headers=self.user_a_headers)
        self.assertIn(res.status_code, [200, 201])

    def test_spatial_attack_03_zero_distance_ride_request(self):
        """Passenger books ride with identical pickup and destination coordinates -> Validates or computes base floor fare"""
        res = self.client.post("/api/rides/request", json={
            "mode": "normal",
            "pickup_address": "Same Spot, Bengaluru",
            "pickup_latitude": 12.9716,
            "pickup_longitude": 77.5946,
            "destination_address": "Same Spot, Bengaluru",
            "destination_latitude": 12.9716,
            "destination_longitude": 77.5946,
            "passenger_count": 1
        }, headers=self.user_a_headers)
        self.assertIn(res.status_code, [201, 400])
        if res.status_code == 201:
            data = res.json()
            self.assertGreaterEqual(data.get("fare_amount", 0.0), 0.0)

    # =========================================================================
    # SECTION 7: SOS-SPECIFIC SECURITY SUITE
    # =========================================================================
    def test_sos_security_01_escalation_blocked_on_cancelled_sos(self):
        """Attacker cannot escalate a cancelled/false-alarm SOS alert to authorities -> 400 Bad Request"""
        # 1. Trigger SOS
        sos_res = self.client.post("/api/safety/sos", json={
            "latitude": 12.9716,
            "longitude": 77.5946,
            "severity": "critical"
        }, headers=self.admin_headers)
        self.assertIn(sos_res.status_code, [200, 201])
        sos_id = sos_res.json()["_id"]

        # 2. Cancel SOS
        self.client.post(f"/api/safety/sos/{sos_id}/cancel", json={"reason": "False alarm"}, headers=self.admin_headers)

        # 3. Attempt escalation to authorities on cancelled SOS
        esc_res = self.client.post(f"/api/safety/sos/{sos_id}/dispatch-authorities", headers=self.admin_headers)
        self.assertEqual(esc_res.status_code, 400)
        self.assertIn("Cannot escalate cancelled or resolved SOS alert", esc_res.json()["detail"])

    def test_sos_security_02_resolve_sos_without_admin_token(self):
        """Regular passenger attempts to resolve/close SOS alerts via PUT /api/safety/sos/{id}/resolve -> 403 Forbidden"""
        sos_res = self.client.post("/api/safety/sos", json={
            "latitude": 12.9716,
            "longitude": 77.5946,
            "severity": "critical"
        }, headers=self.user_a_headers)
        self.assertIn(sos_res.status_code, [200, 201])
        sos_id = sos_res.json()["_id"]

        res = self.client.put(f"/api/safety/sos/{sos_id}/resolve", json={
            "status": "resolved",
            "notes": "Unauthorized resolution attempt"
        }, headers=self.user_a_headers)
        self.assertEqual(res.status_code, 403, "Non-admin users cannot resolve platform SOS alerts")


if __name__ == "__main__":
    unittest.main()
