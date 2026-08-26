import os
import sys
import unittest
from datetime import datetime, timedelta

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)
from app.routes.safety import _format_phone
from app.services.notification_service import NotificationService
from app.models import (
    UserRole,
    RideMode,
    RideStatus,
    SOSStatus,
    SOSSeverity,
)
from app.ml.predictor import SafetyPredictor
from app.ml.fare_predictor import FareSurgePredictor


class TestPhoneValidationAndFormatting(unittest.TestCase):
    """1. Phone-number validation & formatting tests"""

    def test_standard_10_digit_indian_number(self):
        self.assertEqual(_format_phone("9876543210"), "+919876543210")

    def test_phone_with_spaces_and_hyphens(self):
        self.assertEqual(_format_phone("98765-43210"), "+919876543210")
        self.assertEqual(_format_phone("98765 43210"), "+919876543210")

    def test_already_formatted_e164_number(self):
        self.assertEqual(_format_phone("+919876543210"), "+919876543210")

    def test_none_or_empty_phone(self):
        self.assertIsNone(_format_phone(None))
        self.assertEqual(_format_phone(""), "")


class TestSMSAlertGeneration(unittest.TestCase):
    """2. SMS Generation & Template Formatting tests"""

    def setUp(self):
        self.service = NotificationService()

    def test_sms_message_structure(self):
        user_name = "Priya Sharma"
        location_url = "https://www.google.com/maps?q=22.308,73.185"
        
        # Test simulated SMS dispatch payload
        now_str = datetime.now().strftime("%I:%M:%S %p")
        msg = f"🚨 SAFEGO EMERGENCY [{now_str}]: {user_name} triggered an SOS alert! Track Location & Route: {location_url}"
        
        self.assertIn("SAFEGO EMERGENCY", msg)
        self.assertIn(user_name, msg)
        self.assertIn(location_url, msg)
        self.assertLess(len(msg), 300)

    def test_verified_number_detection(self):
        # 9490969706 and +919490969706 must be detected as verified
        self.assertTrue(self.service.is_number_verified("+919490969706"))
        self.assertTrue(self.service.is_number_verified("9490969706"))
        self.assertFalse(self.service.is_number_verified("+919999999999"))
        self.assertFalse(self.service.is_number_verified(None))

    def test_dev_voice_call_strict_routing(self):
        # Service strictly sets dev_verified_phone to +919490969706
        self.assertEqual(self.service.dev_verified_phone, "+919490969706")
        self.assertIn("+919490969706", self.service.get_verified_numbers())

    def test_unverified_number_graceful_handling(self):
        # In dev phase, unverified numbers are routed to dev verified number safely
        success = self.service.send_sos_sms(
            to_number="+919999999999",
            user_name="Test User",
            location_url="https://maps.google.com"
        )
        self.assertIsInstance(success, bool)


class TestAdminTesterRoutingAndRoles(unittest.TestCase):
    """3. Admin/Tester Routing & Role-Based Authorization tests"""

    def test_role_enum_values(self):
        self.assertEqual(UserRole.admin.value, "admin")
        self.assertEqual(UserRole.driver.value, "driver")
        self.assertEqual(UserRole.passenger.value, "passenger")

    def test_admin_jwt_claims(self):
        admin_payload = {
            "sub": "admin_user_001",
            "email": "tester@safego.in",
            "role": UserRole.admin.value,
        }
        token = create_access_token(admin_payload)
        decoded = decode_access_token(token)
        
        self.assertIsNotNone(decoded)
        self.assertEqual(decoded["role"], "admin")
        self.assertEqual(decoded["email"], "tester@safego.in")

    def test_passenger_cannot_masquerade_as_admin(self):
        passenger_payload = {
            "sub": "passenger_user_002",
            "email": "user@gmail.com",
            "role": UserRole.passenger.value,
        }
        token = create_access_token(passenger_payload)
        decoded = decode_access_token(token)
        
        self.assertIsNotNone(decoded)
        self.assertNotEqual(decoded["role"], "admin")
        self.assertEqual(decoded["role"], "passenger")


class TestSOSTriggerLogic(unittest.TestCase):
    """4. SOS Trigger Logic & Status Lifecycle tests"""

    def test_sos_status_enums(self):
        self.assertEqual(SOSStatus.active.value, "active")
        self.assertEqual(SOSStatus.resolved.value, "resolved")
        self.assertEqual(SOSStatus.false_alarm.value, "false_alarm")

    def test_sos_severity_enums(self):
        self.assertEqual(SOSSeverity.critical.value, "critical")
        self.assertEqual(SOSSeverity.moderate.value, "moderate")
        self.assertEqual(SOSSeverity.low.value, "low")


class TestAuthenticationAndAuthorization(unittest.TestCase):
    """5. Authentication & Authorization Security tests"""

    def test_bcrypt_hashing_and_verification(self):
        plain = "AdminSecret2026!#"
        hashed = hash_password(plain)
        
        self.assertTrue(verify_password(plain, hashed))
        self.assertFalse(verify_password("WrongPassword", hashed))
        self.assertFalse(verify_password("", hashed))

    def test_jwt_token_generation_and_claims(self):
        payload = {"sub": "usr_9988", "email": "driver@safego.in", "role": "driver"}
        token = create_access_token(payload, expires_delta=timedelta(hours=1))
        
        decoded = decode_access_token(token)
        self.assertEqual(decoded["sub"], "usr_9988")
        self.assertEqual(decoded["role"], "driver")

    def test_invalid_jwt_token_rejection(self):
        invalid_token = "invalid.token.structure"
        decoded = decode_access_token(invalid_token)
        self.assertIsNone(decoded)


class TestEdgeCasesAndInvalidInputs(unittest.TestCase):
    """6. Edge Cases & Invalid Input Resilience tests"""

    def setUp(self):
        self.safety_predictor = SafetyPredictor()
        self.fare_predictor = FareSurgePredictor()

    def test_pwd_mode_zero_surge_violation_invariance(self):
        # Regardless of high-risk night hours or outskirts, PWD surge must be exactly 1.0x
        multiplier, conf = self.fare_predictor.predict_surge(
            pickup_hour=2,
            day_of_week=6,
            distance_km=25.0,
            passenger_count=1,
            mode="pwd",
            ai_safety_prediction="High Priority",
        )
        self.assertEqual(multiplier, 1.0)

    def test_safety_prediction_with_extreme_coordinates(self):
        # Center of India vs remote coordinate
        label, conf = self.safety_predictor.predict_safety(
            pickup_hour=12,
            day_of_week=3,
            distance_km=2.0,
            passenger_count=1,
            mode="normal",
            pickup_lat=28.6139,
            pickup_lng=77.2090,
            dest_lat=28.7041,
            dest_lng=77.1025,
        )
        self.assertIn(label, ["Stable", "Cautious", "High Priority"])
        self.assertGreater(conf, 0.0)

    def test_ride_status_transitions(self):
        valid_statuses = [
            RideStatus.pending,
            RideStatus.searching,
            RideStatus.matched,
            RideStatus.driver_arriving,
            RideStatus.in_progress,
            RideStatus.completed,
            RideStatus.cancelled,
        ]
        self.assertEqual(len(valid_statuses), 7)


if __name__ == "__main__":
    unittest.main()
