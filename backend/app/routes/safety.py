from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from beanie import PydanticObjectId

from fastapi import APIRouter, Depends, HTTPException

from app.models import User, SOSAlert, SOSStatus, SOSSeverity, EmergencyContact
from app.schemas import SOSCreate, SOSResponse, SOSResolve
from app.utils.dependencies import get_current_user, get_current_admin, get_optional_user
from app.services.notification_service import notification_service

router = APIRouter(prefix="/api/safety", tags=["safety"])


from app.config import settings


def _format_phone(num: str | None) -> str | None:
    if not num:
        return num
    clean = str(num).replace(" ", "").replace("-", "")
    if len(clean) == 10 and clean.isdigit():
        return f"+91{clean}"
    if not clean.startswith("+") and clean.isdigit():
        return f"+{clean}"
    return clean


def _sos_dict(sos: SOSAlert) -> dict:
    return {
        "_id": str(sos.id),
        "user_id": str(sos.user_id),
        "ride_id": str(sos.ride_id) if sos.ride_id else None,
        "latitude": sos.latitude,
        "longitude": sos.longitude,
        "location_address": sos.location_address,
        "emergency_contact_name": getattr(sos, "emergency_contact_name", None),
        "emergency_contact_phone": getattr(sos, "emergency_contact_phone", None),
        "route_info": getattr(sos, "route_info", None),
        "severity": sos.severity.value,
        "status": sos.status.value,
        "notes": sos.notes,
        "resolved_by": str(sos.resolved_by) if sos.resolved_by else None,
        "resolved_at": sos.resolved_at,
        "created_at": sos.created_at,
    }


from datetime import datetime, timezone, timedelta

@router.post("/sos", response_model=SOSResponse, status_code=201)
async def trigger_sos(payload: SOSCreate, current_user: Optional[User] = Depends(get_optional_user)):
    user_name = current_user.full_name if current_user else (payload.emergency_contact_name or "Pink Mode Passenger")
    user_id = current_user.id if current_user else PydanticObjectId("000000000000000000000000")

    # 1. Idempotency Check: return existing SOS if same idempotency key provided
    if payload.idempotency_key:
        existing = await SOSAlert.find_one({"idempotency_key": payload.idempotency_key})
        if existing:
            return _sos_dict(existing)

    # 2. Concurrency & Burst Abuse Guard (15-second deduplication for same user or contact)
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=15)
    if current_user and current_user.id:
        recent_active = await SOSAlert.find_one({
            "user_id": current_user.id,
            "status": SOSStatus.active.value,
            "created_at": {"$gte": cutoff}
        })
        if recent_active:
            return _sos_dict(recent_active)
    elif payload.emergency_contact_phone:
        recent_active = await SOSAlert.find_one({
            "emergency_contact_phone": payload.emergency_contact_phone,
            "status": SOSStatus.active.value,
            "created_at": {"$gte": cutoff}
        })
        if recent_active:
            return _sos_dict(recent_active)

    sos = SOSAlert(
        user_id=user_id,
        ride_id=PydanticObjectId(payload.ride_id) if payload.ride_id else None,
        latitude=payload.latitude,
        longitude=payload.longitude,
        location_address=payload.location_address,
        emergency_contact_name=payload.emergency_contact_name,
        emergency_contact_phone=payload.emergency_contact_phone,
        route_info=payload.route_info,
        severity=SOSSeverity(payload.severity),
        status=SOSStatus.active,
        idempotency_key=payload.idempotency_key,
    )

    # 3. Resilient Database Insertion
    try:
        await sos.insert()
    except Exception as db_err:
        print(f"[SOS DB ERROR] Critical database error creating SOS record: {db_err}")
        raise HTTPException(
            status_code=503,
            detail="SafeGo Emergency Database temporarily unavailable. Local emergency dialer activated. Please dial 112 directly."
        )

    # 4. Multi-Channel Notification Dispatch with Isolated Error Domains
    location_url = (
        f"https://www.google.com/maps?q={payload.latitude},{payload.longitude}"
        if (payload.latitude and payload.longitude)
        else payload.location_address
    )
    phone = _format_phone(payload.emergency_contact_phone)
    admin_phone = _format_phone(settings.ADMIN_PHONE)
    tester_phone = _format_phone(settings.TESTER_PHONE)
    location_info = f"{location_url} | Route: {payload.route_info or 'Active Route'}"
    notified_numbers = set()

    # A. Passenger Contact SMS & Call
    if phone:
        try:
            notification_service.send_sos_sms(to_number=phone, user_name=user_name, location_url=location_url or "Live Tracking Active")
            notified_numbers.add(phone)
        except Exception as e:
            print(f"[SOS CONTACT SMS ERROR]: {e}")

        try:
            notification_service.trigger_sos_call(to_number=phone, user_name=user_name)
        except Exception as e:
            print(f"[SOS CONTACT CALL ERROR]: {e}")

    # B. Central Admin Phone Alert
    if admin_phone and admin_phone not in notified_numbers:
        try:
            notification_service.send_sos_sms(to_number=admin_phone, user_name=f"[ADMIN] {user_name}", location_url=location_info)
            notified_numbers.add(admin_phone)
        except Exception as e:
            print(f"[SOS ADMIN ALERT ERROR]: {e}")

    # C. Central Tester Phone Alert
    if tester_phone and tester_phone not in notified_numbers:
        try:
            notification_service.send_sos_sms(to_number=tester_phone, user_name=f"[TESTER] {user_name}", location_url=location_info)
            notified_numbers.add(tester_phone)
        except Exception as e:
            print(f"[SOS TESTER ALERT ERROR]: {e}")

    # D. User's Saved Emergency Contacts
    if current_user:
        try:
            contacts = await EmergencyContact.find(EmergencyContact.user_id == current_user.id).to_list()
            for contact in contacts:
                c_phone = _format_phone(contact.phone)
                if c_phone and c_phone not in notified_numbers:
                    try:
                        notification_service.send_sos_sms(to_number=c_phone, user_name=user_name, location_url=location_url or "Live Tracking Active")
                        notified_numbers.add(c_phone)
                    except Exception as c_err:
                        print(f"[SOS SAVED CONTACT SMS ERROR]: {c_err}")
        except Exception as e:
            print(f"[SOS SAVED CONTACTS FETCH ERROR]: {e}")

    return _sos_dict(sos)


@router.post("/sos/{sos_id}/dispatch-authorities", response_model=SOSResponse)
async def dispatch_authorities(sos_id: str, current_user: Optional[User] = Depends(get_optional_user)):
    """Escalate SOS alert to dispatch authorities and alert both Admin and Tester."""
    if not PydanticObjectId.is_valid(sos_id):
        raise HTTPException(status_code=404, detail="SOS alert not found")
    sos = await SOSAlert.get(PydanticObjectId(sos_id))
    if not sos:
        raise HTTPException(status_code=404, detail="SOS alert not found")

    if sos.status == SOSStatus.false_alarm or sos.status == SOSStatus.resolved:
        raise HTTPException(status_code=400, detail="Cannot escalate cancelled or resolved SOS alert")

    sos.notes = f"{(sos.notes or '')} [AUTHORITIES ESCALATION: Response Requested]".strip()
    sos.severity = SOSSeverity.critical
    await sos.save()

    try:
        location_url = f"https://www.google.com/maps?q={sos.latitude},{sos.longitude}" if (sos.latitude and sos.longitude) else sos.location_address
        admin_phone = _format_phone(settings.ADMIN_PHONE)
        tester_phone = _format_phone(settings.TESTER_PHONE)

        notified = set()
        for p, role_label in [(admin_phone, "[ADMIN PRIORITY]"), (tester_phone, "[TESTER PRIORITY]")]:
            if p and p not in notified:
                notification_service.send_sos_sms(
                    to_number=p,
                    user_name=f"{role_label} CRITICAL DISPATCH ESCALATION",
                    location_url=f"{location_url} | Severity: CRITICAL"
                )
                notified.add(p)
    except Exception as e:
        print(f"Failed to dispatch authority notifications: {e}")

    return _sos_dict(sos)


@router.post("/sos/{sos_id}/cancel", response_model=SOSResponse)
async def cancel_sos(sos_id: str, current_user: Optional[User] = Depends(get_optional_user)):
    if not PydanticObjectId.is_valid(sos_id):
        raise HTTPException(status_code=404, detail="SOS alert not found")
    sos = await SOSAlert.get(PydanticObjectId(sos_id))
    if not sos:
        raise HTTPException(status_code=404, detail="SOS alert not found")
    if sos.status == SOSStatus.false_alarm:
        return _sos_dict(sos)
    if sos.status != SOSStatus.active:
        raise HTTPException(status_code=400, detail="SOS alert is not active")

    # IDOR Check: Users can only cancel their own SOS unless admin
    if current_user:
        role_val = current_user.role.value if hasattr(current_user.role, 'value') else current_user.role
        if role_val != "admin" and sos.user_id and sos.user_id != current_user.id and str(sos.user_id) != "000000000000000000000000":
            raise HTTPException(status_code=403, detail="Access denied: cannot cancel another user's SOS alert")

    sos.status = SOSStatus.false_alarm
    sos.resolved_at = datetime.now(timezone.utc)
    sos.resolved_by = current_user.id if current_user else None
    sos.notes = "Cancelled by user (false alarm / alert dismissed)"
    await sos.save()
    return _sos_dict(sos)


@router.put("/sos/{sos_id}/resolve", response_model=SOSResponse)
async def resolve_sos(sos_id: str, payload: SOSResolve, admin_user: User = Depends(get_current_admin)):
    if not PydanticObjectId.is_valid(sos_id):
        raise HTTPException(status_code=404, detail="SOS alert not found")
    sos = await SOSAlert.get(PydanticObjectId(sos_id))
    if not sos:
        raise HTTPException(status_code=404, detail="SOS alert not found")
    sos.status = SOSStatus(payload.status)
    sos.notes = payload.notes
    sos.resolved_by = admin_user.id
    sos.resolved_at = datetime.now(timezone.utc)
    await sos.save()
    return _sos_dict(sos)



@router.post("/public-sos", status_code=201)
async def trigger_public_sos(payload: SOSCreate):
    """Trigger SOS for guest/unauthenticated users directly to Twilio SMS and Admin/Tester phones."""
    try:
        location_url = f"https://www.google.com/maps?q={payload.latitude},{payload.longitude}" if (payload.latitude and payload.longitude) else payload.location_address
        phone = _format_phone(payload.emergency_contact_phone)
        contact_name = payload.emergency_contact_name or "Emergency Contact"

        print(f"[SOS DISPATCH] Contact Phone: {phone}, Admin Phone: {settings.ADMIN_PHONE}, Tester Phone: {settings.TESTER_PHONE}")

        if phone:
            res1 = notification_service.send_sos_sms(to_number=phone, user_name=f"Pink Mode Passenger ({contact_name})", location_url=location_url or "Live Tracking Active")
            res2 = notification_service.trigger_sos_call(to_number=phone, user_name="Pink Mode Passenger")
            print(f"[SOS DISPATCH] Contact SMS result: {res1}, Call result: {res2}")

        admin_phone = _format_phone(settings.ADMIN_PHONE)
        tester_phone = _format_phone(settings.TESTER_PHONE)
        notified = {phone} if phone else set()

        if admin_phone and admin_phone not in notified:
            res3 = notification_service.send_sos_sms(to_number=admin_phone, user_name="[ADMIN] Pink Mode Passenger", location_url=f"{location_url} | Route: {payload.route_info or 'Active Route'}")
            print(f"[SOS DISPATCH] Admin SMS result: {res3}")
            notified.add(admin_phone)

        if tester_phone and tester_phone not in notified:
            res4 = notification_service.send_sos_sms(to_number=tester_phone, user_name="[TESTER] Pink Mode Passenger", location_url=f"{location_url} | Route: {payload.route_info or 'Active Route'}")
            print(f"[SOS DISPATCH] Tester SMS result: {res4}")
            notified.add(tester_phone)

        return {"status": "success", "message": "SOS alert transmitted via Twilio to Admin and Tester"}
    except Exception as e:
        print(f"[SOS DISPATCH ERROR] {e}")
        return {"status": "error", "detail": str(e)}
