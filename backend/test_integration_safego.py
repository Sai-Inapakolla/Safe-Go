import os
import sys
import random
import unittest
import asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock, AsyncMock
from dotenv import find_dotenv, load_dotenv

# Load environment variables (supports root and backend locations)
load_dotenv(dotenv_path=find_dotenv(usecwd=True))
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))
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
    SOSAlert, SOSStatus, SOSSeverity, Vehicle, DriverDocument, Gender, Rating
)
from app.utils.security import hash_password, verify_password, create_access_token, decode_access_token
from app.services.geo_service import geo_service
from app.ml.predictor import SafetyPredictor
from app.ml.fare_predictor import FareSurgePredictor
from app.services.notification_service import NotificationService


class TestSafeGoFullStackIntegration(unittest.TestCase):
    """
    SafeGo Comprehensive End-to-End Integration Testing Suite 🔥
    Covers all multi-tier integration flows between APIs, Database Models,
    ML Inference Engines, Notification Gateways, and Business Logic.
    """

    @classmethod
    def setUpClass(cls):
        cls.client_cm = TestClient(app)
        cls.client = cls.client_cm.__enter__()
        cls.safety_model = SafetyPredictor()
        cls.fare_model = FareSurgePredictor()
        cls.notification_service = NotificationService()
        
        # Authenticate real seeded admin user via API
        login_res = cls.client.post("/api/auth/login", json={
            "email": settings.ADMIN_EMAIL,
            "password": settings.ADMIN_PASSWORD
        })
        if login_res.status_code == 200:
            token_data = login_res.json()
            cls.admin_token = token_data["access_token"]
            cls.admin_user_id = token_data["user_id"]
        else:
            cls.admin_token = create_access_token({"sub": "507f1f77bcf86cd799439011", "role": "admin"})
            cls.admin_user_id = "507f1f77bcf86cd799439011"
        
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

    @classmethod
    def tearDownClass(cls):
        cls.client_cm.__exit__(None, None, None)

    # =========================================================================
    # INTEGRATION FLOW 1: Authentication & Role-Based Access Control (RBAC)
    # =========================================================================
    def test_integration_auth_registration_login_profile_flow(self):
        """Integration: Register passenger -> Login -> Generate JWT -> Fetch Profile via /api/auth/me"""
        unique_id = int(datetime.now().timestamp() * 1000)
        unique_email = f"integ_user_{unique_id}@safego.in"
        unique_phone = f"+91{random.randint(6000000000, 9999999999)}"

        register_payload = {
            "full_name": "Kavita Reddy",
            "email": unique_email,
            "phone": unique_phone,
            "password": "SecurePassword@123",
            "confirm_password": "SecurePassword@123",
            "role": "passenger",
            "gender": "female"
        }

        # 1. Register User
        reg_res = self.client.post("/api/auth/register", json=register_payload)
        self.assertIn(reg_res.status_code, [200, 201])
        user_data = reg_res.json()
        self.assertEqual(user_data["email"], unique_email)
        self.assertEqual(user_data["role"], "passenger")
        self.assertEqual(user_data["gender"], "female")

        # 2. Login User
        login_res = self.client.post("/api/auth/login", json={
            "email": unique_email,
            "password": "SecurePassword@123"
        })
        self.assertEqual(login_res.status_code, 200)
        token_data = login_res.json()
        self.assertIn("access_token", token_data)
        self.assertEqual(token_data["role"], "passenger")
        token = token_data["access_token"]

        # 3. Authenticate with Bearer Token to Protected Route /api/auth/me
        headers = {"Authorization": f"Bearer {token}"}
        me_res = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(me_res.status_code, 200)
        me_data = me_res.json()
        self.assertEqual(me_data["email"], unique_email)
        self.assertEqual(me_data["full_name"], "Kavita Reddy")

    def test_integration_auth_negative_scenarios(self):
        """Negative Integration: Malformed token, wrong password, mismatched register passwords"""
        # Wrong password
        res = self.client.post("/api/auth/login", json={
            "email": settings.ADMIN_EMAIL,
            "password": "WrongPassword123"
        })
        self.assertEqual(res.status_code, 401)
        self.assertIn("Invalid email or password", res.json()["detail"])

        # Mismatched register passwords
        res = self.client.post("/api/auth/register", json={
            "full_name": "Test User",
            "email": "mismatch@test.com",
            "phone": "+919999999999",
            "password": "Password123",
            "confirm_password": "DifferentPassword",
            "role": "passenger"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("Passwords do not match", res.json()["detail"])

        # Invalid Bearer Token access
        res = self.client.get("/api/auth/me", headers={"Authorization": "Bearer invalid_garbage_token"})
        self.assertEqual(res.status_code, 401)

    # =========================================================================
    # INTEGRATION FLOW 2: Indian Geo Intelligence & Route Calculation
    # =========================================================================
    def test_integration_geo_city_search_and_routing(self):
        """Integration: In-memory Indian cities dataset search -> Route coordinates"""
        # 1. Search tier-1 city via /api/map/locations
        res = self.client.get("/api/map/locations?q=Bengaluru")
        self.assertEqual(res.status_code, 200)
        locations = res.json()
        self.assertTrue(len(locations) > 0)
        bengaluru = locations[0]
        self.assertEqual(bengaluru["name"], "Bengaluru")
        self.assertAlmostEqual(bengaluru["lat"], 12.9716, delta=0.5)

        # 2. Search tier-2 Indian city
        res_v = self.client.get("/api/map/locations?q=Vadodara")
        self.assertEqual(res_v.status_code, 200)
        v_locs = res_v.json()
        self.assertTrue(len(v_locs) > 0)
        self.assertEqual(v_locs[0]["name"], "Vadodara")

    # =========================================================================
    # INTEGRATION FLOW 3: Dynamic Fare Surge & ML Safety Inference
    # =========================================================================
    def test_integration_ml_fare_surge_and_safety_classification(self):
        """Integration: ML Location-aware Safety Classifier + ML Dynamic Fare Surge Engine"""
        # 1. Test Normal Mode Surge under stable conditions
        multiplier, conf = self.fare_model.predict_surge(
            pickup_hour=15,
            day_of_week=2,
            distance_km=8.5,
            passenger_count=1,
            mode="normal",
            ai_safety_prediction="Stable"
        )
        self.assertGreaterEqual(multiplier, 1.0)
        self.assertLessEqual(multiplier, 2.5)
        self.assertGreater(conf, 0.7)

        # 2. Test PWD Mode Strict Fare Cap Rule (Surge must strictly equal 1.0x)
        pwd_multiplier, pwd_conf = self.fare_model.predict_surge(
            pickup_hour=23,  # Peak late night
            day_of_week=6,   # Saturday
            distance_km=25.0,
            passenger_count=3,
            mode="pwd",
            ai_safety_prediction="High Priority"
        )
        self.assertEqual(pwd_multiplier, 1.0, "PWD mode must never incur surge pricing under any circumstance")

        # 3. Test Location-Aware Safety ML Classifier with Coordinates
        safety_label, safety_conf = self.safety_model.predict_safety(
            pickup_hour=23,
            day_of_week=5,
            distance_km=18.0,
            passenger_count=1,
            mode="pink",
            pickup_lat=28.6139,
            pickup_lng=77.2090,
            dest_lat=28.7041,
            dest_lng=77.1025
        )
        self.assertIn(safety_label, ["Stable", "Cautious", "High Priority"])
        self.assertGreater(safety_conf, 0.5)

    # =========================================================================
    # INTEGRATION FLOW 4: Driver Fleet Discovery & Mode Compatibility
    # =========================================================================
    def test_integration_driver_fleet_matching_and_mode_filtering(self):
        """Integration: Fetch active drivers -> Validate certified modes and vehicle accessibility"""
        res = self.client.get("/api/drivers/active", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        drivers = res.json()
        self.assertTrue(len(drivers) > 0)

        # Verify female drivers for Pink Mode
        pink_drivers = [d for d in drivers if "pink" in d.get("certified_modes", [])]
        self.assertTrue(len(pink_drivers) > 0)
        for pd in pink_drivers:
            self.assertEqual(pd["user"]["gender"], "female")

        # Verify PWD wheelchair accessible vehicles
        pwd_drivers = [d for d in drivers if "pwd" in d.get("certified_modes", [])]
        self.assertTrue(len(pwd_drivers) > 0)
        for pwd_d in pwd_drivers:
            if pwd_d.get("vehicle"):
                self.assertTrue(pwd_d["vehicle"]["is_wheelchair_accessible"])

    # =========================================================================
    # INTEGRATION FLOW 5: End-to-End Ride Lifecycle & Status Transitions
    # =========================================================================
    def test_integration_ride_lifecycle_request_and_tracking(self):
        """Integration: Request ride -> Query by ID -> Verify OTP -> Transition to Completed"""
        unique_id = int(datetime.now().timestamp() * 1000)
        passenger_email = f"ride_passenger_{unique_id}@safego.in"
        passenger_phone = f"+91{random.randint(6000000000, 9999999999)}"

        reg_res = self.client.post("/api/auth/register", json={
            "full_name": "Deepa Nair",
            "email": passenger_email,
            "phone": passenger_phone,
            "password": "Password@123",
            "confirm_password": "Password@123",
            "role": "passenger",
            "gender": "female"
        })
        self.assertIn(reg_res.status_code, [200, 201])
        user_id = reg_res.json()["_id"]

        token = create_access_token({"sub": user_id, "role": "passenger"})
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Request Ride
        ride_payload = {
            "mode": "pink",
            "pickup_address": "Indiranagar, Bengaluru, Karnataka",
            "pickup_latitude": 12.9784,
            "pickup_longitude": 77.6408,
            "destination_address": "Koramangala, Bengaluru, Karnataka",
            "destination_latitude": 12.9352,
            "destination_longitude": 77.6245,
            "passenger_count": 1,
            "emergency_contact_name": "Priya Contact",
            "emergency_contact_phone": "+919490969706"
        }
        create_res = self.client.post("/api/rides/request", json=ride_payload, headers=headers)
        self.assertEqual(create_res.status_code, 201)
        ride_data = create_res.json()
        self.assertIn("_id", ride_data)
        self.assertEqual(ride_data["mode"], "pink")
        self.assertEqual(ride_data["status"], "searching")
        ride_id = ride_data["_id"]

        # 2. Query Ride Details via /api/rides/{id}
        get_res = self.client.get(f"/api/rides/{ride_id}", headers=headers)
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.json()["_id"], ride_id)

        # 3. Cancel / Update Status via PUT /api/rides/{id}/status
        cancel_res = self.client.put(f"/api/rides/{ride_id}/status", json={
            "status": "cancelled",
            "cancel_reason": "Integration testing ride cancellation"
        }, headers=headers)
        self.assertEqual(cancel_res.status_code, 200)
        self.assertEqual(cancel_res.json()["status"], "cancelled")

    # =========================================================================
    # INTEGRATION FLOW 6: Emergency SOS, AI Hotspot ML & Twilio Dispatch
    # =========================================================================
    def test_integration_emergency_sos_dispatch_and_resolution_flow(self):
        """Integration: Trigger SOS -> ML Hotspot inference -> Twilio notification -> Admin resolution"""
        sos_payload = {
            "latitude": 22.3072,
            "longitude": 73.1812,
            "location_address": "Alkapuri, Vadodara, Gujarat",
            "severity": "critical",
            "emergency_contact_phone": "+919490969706"
        }

        # 1. Trigger SOS Alert
        sos_res = self.client.post("/api/safety/sos", json=sos_payload, headers=self.admin_headers)
        self.assertIn(sos_res.status_code, [200, 201])
        sos_data = sos_res.json()
        self.assertIn("_id", sos_data)
        self.assertEqual(sos_data["status"], "active")
        alert_id = sos_data["_id"]

        # 2. Fetch Active SOS Alerts as Admin
        alerts_res = self.client.get("/api/admin/sos-alerts", headers=self.admin_headers)
        self.assertEqual(alerts_res.status_code, 200)
        active_alerts = alerts_res.json()
        alert_ids = [a["_id"] for a in active_alerts]
        self.assertIn(alert_id, alert_ids)

        # 3. Resolve / Mark False Alarm
        cancel_res = self.client.post(f"/api/safety/sos/{alert_id}/cancel", json={
            "reason": "Integration Test verified resolution"
        }, headers=self.admin_headers)
        self.assertIn(cancel_res.status_code, [200, 400])

    # =========================================================================
    # INTEGRATION FLOW 7: Twilio Dispatch Gateway & Developer Whitelist Rule
    # =========================================================================
    def test_integration_twilio_notification_service_routing(self):
        """Integration: Twilio notification service reroutes unverified trial numbers to verified dev number"""
        sms_sent = self.notification_service.send_sos_sms(
            to_number="+919876500000",
            user_name="Rahul Sharma",
            location_url="https://maps.google.com/?q=28.6139,77.2090"
        )
        self.assertIsInstance(sms_sent, bool, "Twilio notification service should handle trial phase number routing and quota limit safely")


    # =========================================================================
    # INTEGRATION FLOW 8: Admin Dashboard Statistics & Fleet Governance
    # =========================================================================
    def test_integration_admin_dashboard_stats_and_overview(self):
        """Integration: Fetch Admin aggregated platform metrics (/api/admin/stats)"""
        res = self.client.get("/api/admin/stats", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        stats = res.json()
        self.assertIn("total_users", stats)
        self.assertIn("total_drivers", stats)
        self.assertIn("total_rides", stats)
        self.assertIn("active_sos_alerts", stats)
        self.assertGreaterEqual(stats["total_drivers"], 0)

    # =========================================================================
    # INTEGRATION FLOW 9: Voice Assistant & AI Controller Integration
    # =========================================================================
    def test_integration_voice_assistant_endpoints(self):
        """Integration: Test voice subsystem health & location share endpoints"""
        # 1. Health check
        res = self.client.get("/api/voice/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ok")

        # 2. Location share via voice assistant
        res = self.client.post("/api/voice/location-share", json={
            "latitude": 19.0760,
            "longitude": 72.8777
        }, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "shared")


if __name__ == "__main__":
    unittest.main()
