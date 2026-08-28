from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from app.config import settings
import logging
import re
import datetime

logger = logging.getLogger(__name__)

# Development Phase Twilio Verified Numbers
DEV_VERIFIED_PHONE = "+919042862878"
FALLBACK_VERIFIED_PHONE = "+919490969706"


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
        verified = {self.dev_verified_phone, FALLBACK_VERIFIED_PHONE}
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
        Sends an SOS SMS alert to the target contact number given by the user.
        Attempts direct delivery first. If in Twilio Trial and the number is unverified (Error 21608),
        it automatically falls back to verified backup numbers with full destination context.
        """
        if not self.client:
            self._init_client()
        if not self.client:
            print(f"[TWILIO WARNING] Twilio client not initialized. Cannot send SMS to {to_number}.")
            logger.warning("Twilio client not initialized. SMS not sent.")
            return False

        normalized_target = _normalize_phone(to_number)
        if not normalized_target:
            normalized_target = self.dev_verified_phone

        now_str = datetime.datetime.now().strftime("%I:%M:%S %p")
        ref_code = str(int(datetime.datetime.now().timestamp() * 1000))[-4:]
        from_num = (settings.TWILIO_PHONE_NUMBER or "").strip()

        # 1. Attempt direct delivery to the user-specified emergency contact number
        message_body = (
            f"🚨 SAFEGO EMERGENCY [Ref #{ref_code} - {now_str}]: "
            f"{user_name} triggered an SOS alert! Track Location & Route: {location_url}"
        )

        try:
            print(f"[TWILIO] Sending SOS SMS directly to target contact: {normalized_target}...")
            message = self.client.messages.create(
                body=message_body,
                from_=from_num,
                to=normalized_target
            )
            print(f"[TWILIO SUCCESS] SOS SMS delivered to {normalized_target}. SID: {message.sid}")
            logger.info(f"SOS SMS delivered to {normalized_target}. SID: {message.sid}")
            return True
        except TwilioRestException as e:
            # Twilio trial mode error: unverified destination number
            if getattr(e, "code", None) == 21608 or "unverified" in str(e).lower():
                print(
                    f"[TWILIO TRIAL FALLBACK] Contact number {normalized_target} is unverified in Twilio Trial Console. "
                    f"Routing alert to verified emergency responder {self.dev_verified_phone} to ensure delivery."
                )
                fallback_body = (
                    f"🚨 SAFEGO EMERGENCY [Ref #{ref_code} - {now_str}]: "
                    f"{user_name} (Intended Contact: {to_number}) triggered an SOS alert! "
                    f"Track Location & Route: {location_url}"
                )
                try:
                    fallback_msg = self.client.messages.create(
                        body=fallback_body,
                        from_=from_num,
                        to=self.dev_verified_phone
                    )
                    print(f"[TWILIO FALLBACK SUCCESS] SOS SMS sent to {self.dev_verified_phone}. SID: {fallback_msg.sid}")
                    return True
                except Exception as fb_err:
                    print(f"[TWILIO FALLBACK ERROR] Failed to send fallback SMS: {fb_err}")
            print(f"[TWILIO API EXCEPTION] Twilio rejected SMS to {normalized_target}: {e.msg}")
            logger.error(f"TwilioRestException sending SMS to {normalized_target}: {e}")
            return False
        except Exception as e:
            print(f"[TWILIO ERROR] Error sending SOS SMS to {normalized_target}: {e}")
            logger.error(f"Error sending SOS SMS to {normalized_target}: {e}")
            return False

    def trigger_sos_call(self, to_number: str, user_name: str) -> bool:
        """
        Triggers an automated emergency voice call to the contact number given by the user.
        Attempts direct phone call first. If in Twilio Trial and the number is unverified,
        it calls the verified developer/admin phone as a fail-safe.
        """
        if not self.client:
            self._init_client()
        if not self.client:
            print(f"[TWILIO WARNING] Twilio client not initialized. Cannot make call to {to_number}.")
            logger.warning("Twilio client not initialized. Call not triggered.")
            return False

        normalized_target = _normalize_phone(to_number)
        if not normalized_target:
            normalized_target = self.dev_verified_phone

        from_num = (settings.TWILIO_PHONE_NUMBER or "").strip()
        twiml_content = (
            f"<Response><Say voice='alice'>"
            f"SafeGo Emergency Voice Alert for {user_name}. An SOS signal has been activated. "
            f"Please check your phone for the live GPS route tracking link."
            f"</Say></Response>"
        )

        try:
            print(f"[TWILIO] Initiating automated emergency call directly to target contact: {normalized_target}...")
            call = self.client.calls.create(
                twiml=twiml_content,
                from_=from_num,
                to=normalized_target
            )
            print(f"[TWILIO SUCCESS] SOS Voice Call connected to {normalized_target}. SID: {call.sid}")
            logger.info(f"SOS Voice Call connected to {normalized_target}. SID: {call.sid}")
            return True
        except TwilioRestException as e:
            if getattr(e, "code", None) in (21608, 21217) or "unverified" in str(e).lower():
                print(
                    f"[TWILIO TRIAL FALLBACK] Contact number {normalized_target} is unverified for voice in Twilio Trial. "
                    f"Routing emergency voice call to verified backup responder {self.dev_verified_phone}."
                )
                try:
                    fallback_call = self.client.calls.create(
                        twiml=twiml_content,
                        from_=from_num,
                        to=self.dev_verified_phone
                    )
                    print(f"[TWILIO FALLBACK SUCCESS] Voice Call placed to {self.dev_verified_phone}. SID: {fallback_call.sid}")
                    return True
                except Exception as fb_err:
                    print(f"[TWILIO FALLBACK CALL ERROR] Failed to make fallback call: {fb_err}")
            print(f"[TWILIO API EXCEPTION] Twilio call rejected for {normalized_target}: {e.msg}")
            logger.error(f"TwilioRestException making call to {normalized_target}: {e}")
            return False
        except Exception as e:
            print(f"[TWILIO ERROR] Error triggering SOS call to {normalized_target}: {e}")
            logger.error(f"Error triggering SOS call to {normalized_target}: {e}")
            return False


notification_service = NotificationService()

