from twilio.rest import Client
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        self.client = None
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

    def send_sos_sms(self, to_number: str, user_name: str, location_url: str):
        """Sends an SOS SMS alert to a trusted contact."""
        if not self.client:
            self._init_client()
        if not self.client:
            print(f"[TWILIO WARNING] Twilio client not initialized. Cannot send SMS to {to_number}.")
            logger.warning("Twilio client not initialized. SMS not sent.")
            return False

        try:
            import datetime
            now_str = datetime.datetime.now().strftime("%I:%M:%S %p")
            ref_code = str(int(datetime.datetime.now().timestamp() * 1000))[-4:]
            message_body = f"🚨 SAFEGO EMERGENCY [Ref #{ref_code} - {now_str}]: {user_name} triggered an SOS alert! Track Location & Route: {location_url}"
            from_num = (settings.TWILIO_PHONE_NUMBER or "").strip()
            print(f"[TWILIO] Sending SMS from {from_num} to {to_number}...")
            message = self.client.messages.create(
                body=message_body,
                from_=from_num,
                to=to_number
            )
            print(f"[TWILIO SUCCESS] SOS SMS sent to {to_number}. SID: {message.sid}")
            logger.info(f"SOS SMS sent to {to_number}. SID: {message.sid}")
            return True
        except Exception as e:
            print(f"[TWILIO ERROR] Error sending SOS SMS to {to_number}: {e}")
            logger.error(f"Error sending SOS SMS to {to_number}: {e}")
            return False

    def trigger_sos_call(self, to_number: str, user_name: str):
        """Triggers an automated SOS phone call to a trusted contact."""
        if not self.client:
            self._init_client()
        if not self.client:
            print(f"[TWILIO WARNING] Twilio client not initialized. Cannot make call to {to_number}.")
            logger.warning("Twilio client not initialized. Call not triggered.")
            return False

        try:
            twiml_content = f"<Response><Say voice='alice'>Emergency alert for {user_name}. An SOS signal has been triggered. Please check your phone for the live route and location link.</Say></Response>"
            from_num = (settings.TWILIO_PHONE_NUMBER or "").strip()
            print(f"[TWILIO] Initiating call from {from_num} to {to_number}...")
            call = self.client.calls.create(
                twiml=twiml_content,
                from_=from_num,
                to=to_number
            )
            print(f"[TWILIO SUCCESS] SOS Call triggered to {to_number}. SID: {call.sid}")
            logger.info(f"SOS Call triggered to {to_number}. SID: {call.sid}")
            return True
        except Exception as e:
            print(f"[TWILIO ERROR] Error triggering SOS call to {to_number}: {e}")
            logger.error(f"Error triggering SOS call to {to_number}: {e}")
            return False

notification_service = NotificationService()
