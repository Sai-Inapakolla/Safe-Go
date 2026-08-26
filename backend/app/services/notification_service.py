from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from app.config import settings
import logging
import re
import datetime

logger = logging.getLogger(__name__)

# Development Phase Twilio Verified Numbers
DEV_VERIFIED_PHONE = "+919490969706"


def _normalize_phone(num: str | None) -> str:
    if not num:
        return ""
    clean = re.sub(r"[\s\-()]", "", str(num))
    if len(clean) == 10 and clean.isdigit():
        return f"+91{clean}"
    if not clean.startswith("+") and clean.isdigit():
        return f"+{clean}"
    return clean


class NotificationService:
    def __init__(self):
        self.client = None
        self.dev_verified_phone = DEV_VERIFIED_PHONE
        self._init_client()

    def _init_client(self):
        sid = (settings.TWILIO_ACCOUNT_SID or "").strip()
        token = (settings.TWILIO_AUTH_TOKEN or "").strip()
        if sid and token:
            try:
                self.client = Client(sid, token)
                print(f"[TWILIO INIT] Twilio client initialized with SID ending in ...{sid[-6:]}")
            except Exception as e:
                print(f"[TWILIO ERROR] Failed to initialize Twilio client: {e}")
                logger.error(f"Failed to initialize Twilio client: {e}")

    def get_verified_numbers(self) -> set[str]:
        """Returns set of phone numbers verified for trial/development usage."""
        verified = {self.dev_verified_phone}
        if settings.ADMIN_PHONE:
            verified.add(_normalize_phone(settings.ADMIN_PHONE))
        if settings.TESTER_PHONE:
            verified.add(_normalize_phone(settings.TESTER_PHONE))
        return {v for v in verified if v}

    def is_number_verified(self, phone: str) -> bool:
        """Verifies if a target number is in the allowed Twilio verified numbers list."""
        if not phone:
            return False
        normalized = _normalize_phone(phone)
        return normalized in self.get_verified_numbers()

    def send_sos_sms(self, to_number: str, user_name: str, location_url: str) -> bool:
        """
        Sends an SOS SMS alert to a contact.
        In dev/trial phase, validates number against verified list first.
        """
        if not self.client:
            self._init_client()
        if not self.client:
            print(f"[TWILIO WARNING] Twilio client not initialized. Cannot send SMS to {to_number}.")
            logger.warning("Twilio client not initialized. SMS not sent.")
            return False

        normalized_target = _normalize_phone(to_number)
        
        # Verify phone number before dispatch
        if not self.is_number_verified(normalized_target):
            print(
                f"[TWILIO VERIFICATION] Number {to_number} is unverified in Twilio Trial Console. "
                f"Routing alert to verified developer number {self.dev_verified_phone} to prevent HTTP 400 error."
            )
            # Route to developer verified phone with destination context
            dispatch_number = self.dev_verified_phone
            user_context = f"{user_name} (Target Contact: {to_number})"
        else:
            dispatch_number = normalized_target
            user_context = user_name

        try:
            now_str = datetime.datetime.now().strftime("%I:%M:%S %p")
            ref_code = str(int(datetime.datetime.now().timestamp() * 1000))[-4:]
            message_body = (
                f"🚨 SAFEGO EMERGENCY [Ref #{ref_code} - {now_str}]: "
                f"{user_context} triggered an SOS alert! Track Location & Route: {location_url}"
            )
            from_num = (settings.TWILIO_PHONE_NUMBER or "").strip()
            print(f"[TWILIO] Sending SMS from {from_num} to verified number {dispatch_number}...")
            message = self.client.messages.create(
                body=message_body,
                from_=from_num,
                to=dispatch_number
            )
            print(f"[TWILIO SUCCESS] SOS SMS sent to {dispatch_number}. SID: {message.sid}")
            logger.info(f"SOS SMS sent to {dispatch_number}. SID: {message.sid}")
            return True
        except TwilioRestException as e:
            print(f"[TWILIO API EXCEPTION] Twilio rejected message to {dispatch_number}: {e.msg}")
            logger.error(f"TwilioRestException sending SMS to {dispatch_number}: {e}")
            return False
        except Exception as e:
            print(f"[TWILIO ERROR] Error sending SOS SMS to {dispatch_number}: {e}")
            logger.error(f"Error sending SOS SMS to {dispatch_number}: {e}")
            return False

    def trigger_sos_call(self, to_number: str, user_name: str) -> bool:
        """
        Triggers an automated SOS phone call.
        In development phase, strictly uses verified number +919490969706.
        """
        if not self.client:
            self._init_client()
        if not self.client:
            print(f"[TWILIO WARNING] Twilio client not initialized. Cannot make call to {to_number}.")
            logger.warning("Twilio client not initialized. Call not triggered.")
            return False

        # Strictly use verified developer phone for all voice calls in development phase
        call_target = self.dev_verified_phone
        normalized_requested = _normalize_phone(to_number)
        
        if normalized_requested != call_target:
            print(
                f"[TWILIO CALL VERIFICATION] Voice calls in dev phase are restricted to verified number: {call_target} "
                f"(Requested destination: {to_number})"
            )

        try:
            twiml_content = (
                f"<Response><Say voice='alice'>"
                f"SafeGo Emergency Voice Alert for {user_name}. An SOS signal has been activated. "
                f"Please check your phone for the live GPS route tracking link."
                f"</Say></Response>"
            )
            from_num = (settings.TWILIO_PHONE_NUMBER or "").strip()
            print(f"[TWILIO] Initiating automated emergency call from {from_num} to {call_target}...")
            call = self.client.calls.create(
                twiml=twiml_content,
                from_=from_num,
                to=call_target
            )
            print(f"[TWILIO SUCCESS] SOS Voice Call triggered to {call_target}. SID: {call.sid}")
            logger.info(f"SOS Voice Call triggered to {call_target}. SID: {call.sid}")
            return True
        except TwilioRestException as e:
            print(f"[TWILIO API EXCEPTION] Twilio call rejected for {call_target}: {e.msg}")
            logger.error(f"TwilioRestException making call to {call_target}: {e}")
            return False
        except Exception as e:
            print(f"[TWILIO ERROR] Error triggering SOS call to {call_target}: {e}")
            logger.error(f"Error triggering SOS call to {call_target}: {e}")
            return False


notification_service = NotificationService()
