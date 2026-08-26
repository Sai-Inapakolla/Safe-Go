import asyncio
import os
import sys
import unittest
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings

from app.utils.security import hash_password, verify_password, create_access_token, decode_access_token
from app.models import (
    User, UserRole, Driver, RideMode, DriverStatus, Ride, RideStatus,
    SOSAlert, SOSStatus, SOSSeverity, Vehicle, DriverDocument, Gender
)
from app.services.geo_service import geo_service
from app.ml.predictor import SafetyPredictor
from app.ml.fare_predictor import FareSurgePredictor
from app.main import app
from fastapi.testclient import TestClient


class TestSafeGoSecurity(unittest.TestCase):
    def test_password_hashing(self):
        password = "TestPassword@123"
        hashed = hash_password(password)
        self.assertNotEqual(password, hashed)
        self.assertTrue(verify_password(password, hashed))
        self.assertFalse(verify_password("WrongPassword", hashed))

    def test_jwt_tokens(self):
        payload = {"sub": "test_user_id", "email": "test@safego.ph", "role": "passenger"}
        token = create_access_token(payload)
        self.assertIsInstance(token, str)
        self.assertTrue(len(token) > 20)
        
        decoded = decode_access_token(token)
        self.assertIsNotNone(decoded)
        self.assertEqual(decoded.get("sub"), "test_user_id")
        self.assertEqual(decoded.get("email"), "test@safego.ph")


class TestSafeGoGeoEngine(unittest.TestCase):
    def test_geo_service_dataset_loaded(self):
        results = geo_service.search_locations("Mumbai", limit=5)
        self.assertTrue(len(results) > 0)
        top = results[0]
        self.assertIn("name", top)
        self.assertIn("lat", top)
        self.assertIn("lng", top)
        self.assertIn("state", top)

    def test_geo_service_multiple_cities(self):
        cities = ["Delhi", "Bengaluru", "Chennai", "Kolkata", "Hyderabad", "Vadodara"]
        for city in cities:
            res = geo_service.search_locations(city, limit=3)
            self.assertTrue(len(res) > 0, f"Failed finding city: {city}")

    def test_geo_service_empty_or_missing(self):
        res = geo_service.search_locations("NonExistentCityXYZ12345", limit=5)
        self.assertEqual(len(res), 0)


class TestSafeGoMLModels(unittest.TestCase):
    def setUp(self):
        self.safety_model = SafetyPredictor()
        self.fare_model = FareSurgePredictor()

    def test_safety_predictor_stable_case(self):
        label, conf = self.safety_model.predict_safety(
            pickup_hour=14,
            day_of_week=1,
            distance_km=4.5,
            passenger_count=1,
            mode="normal",
            pickup_lat=22.308,
            pickup_lng=73.185,
            dest_lat=22.310,
            dest_lng=73.188
        )
        self.assertIn(label, ["Stable", "Cautious", "High Priority"])
        self.assertGreater(conf, 0.5)

    def test_fare_surge_predictor(self):
        multiplier, conf = self.fare_model.predict_surge(
            pickup_hour=14,
            day_of_week=1,
            distance_km=5.0,
            passenger_count=1,
            mode="normal",
            ai_safety_prediction="Stable"
        )
        self.assertGreaterEqual(multiplier, 1.0)
        self.assertLessEqual(multiplier, 3.0)
        self.assertGreater(conf, 0.5)

    def test_pwd_fare_surge_protection(self):
        # PWD mode must never surge above 1.0x
        multiplier, conf = self.fare_model.predict_surge(
            pickup_hour=23,
            day_of_week=5,
            distance_km=15.0,
            passenger_count=1,
            mode="pwd",
            ai_safety_prediction="High Priority"
        )
        self.assertEqual(multiplier, 1.0)


class TestSafeGoModels(unittest.TestCase):
    def test_user_roles(self):
        self.assertEqual(UserRole.passenger, "passenger")
        self.assertEqual(UserRole.driver, "driver")
        self.assertEqual(UserRole.admin, "admin")

    def test_driver_modes(self):
        self.assertEqual(RideMode.normal, "normal")
        self.assertEqual(RideMode.pink, "pink")
        self.assertEqual(RideMode.pwd, "pwd")
        self.assertEqual(RideMode.elderly, "elderly")

    def test_ride_statuses(self):
        self.assertEqual(RideStatus.pending, "pending")
        self.assertEqual(RideStatus.searching, "searching")
        self.assertEqual(RideStatus.in_progress, "in_progress")
        self.assertEqual(RideStatus.completed, "completed")
        self.assertEqual(RideStatus.cancelled, "cancelled")


class TestSafeGoFastAPIEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client_cm = TestClient(app)
        cls.client = cls.client_cm.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client_cm.__exit__(None, None, None)

    def test_health_check(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["app"], settings.APP_NAME)

    def test_get_modes(self):
        response = self.client.get("/api/modes")
        self.assertEqual(response.status_code, 200)
        modes = response.json()
        self.assertTrue(len(modes) >= 4)
        mode_ids = [m["id"] for m in modes]
        self.assertIn("normal", mode_ids)
        self.assertIn("pink", mode_ids)
        self.assertIn("pwd", mode_ids)
        self.assertIn("elderly", mode_ids)

    def test_map_location_search_api(self):
        response = self.client.get("/api/map/locations?q=Mumbai")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(len(data) > 0)
        self.assertIn("name", data[0])

    def test_auth_login_invalid(self):
        response = self.client.post("/api/auth/login", json={"email": "nonexistent@test.com", "password": "wrong"})
        self.assertIn(response.status_code, [400, 401, 404, 422, 500])


if __name__ == "__main__":
    unittest.main()

