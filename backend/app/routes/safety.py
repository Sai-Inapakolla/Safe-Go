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


@router.post("/sos", response_model=SOSResponse, status_code=201)
async def trigger_sos(payload: SOSCreate, current_user: Optional[User] = Depends(get_optional_user)):
    user_name = current_user.full_name if current_user else (payload.emergency_contact_name or "Pink Mode Passenger")
    user_id = current_user.id if current_user else PydanticObjectId("000000000000000000000000")

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
    )
    await sos.insert()

    try:
        location_url = f"https://www.google.com/maps?q={payload.latitude},{payload.longitude}" if (payload.latitude and payload.longitude) else payload.location_address
        phone = _format_phone(payload.emergency_contact_phone)
        if phone:
            notification_service.send_sos_sms(to_number=phone, user_name=user_name, location_url=location_url or "Live Tracking Active")
            notification_service.trigger_sos_call(to_number=phone, user_name=user_name)

        # Dispatch Emergency Alert to Admin Phone
        admin_phone = _format_phone(settings.ADMIN_PHONE)
        if admin_phone and admin_phone != phone:
            notification_service.send_sos_sms(to_number=admin_phone, user_name=f"[ADMIN] {user_name}", location_url=f"{location_url} | Route: {payload.route_info or 'Active Route'}")

        if current_user:
            contacts = await EmergencyContact.find(EmergencyContact.user_id == current_user.id).to_list()
            for contact in contacts:
                c_phone = _format_phone(contact.phone)
                if c_phone and c_phone != phone and c_phone != admin_phone:
                    notification_service.send_sos_sms(to_number=c_phone, user_name=user_name, location_url=location_url or "Live Tracking Active")
    except Exception as e:
        print(f"Failed to send emergency notifications: {e}")

    return _sos_dict(sos)


@router.post("/sos/{sos_id}/cancel", response_model=SOSResponse)
async def cancel_sos(sos_id: str, current_user: User = Depends(get_current_user)):
    sos = await SOSAlert.find_one(SOSAlert.id == PydanticObjectId(sos_id), SOSAlert.user_id == current_user.id)
    if not sos:
        raise HTTPException(status_code=404, detail="SOS alert not found")
    if sos.status != SOSStatus.active:
        raise HTTPException(status_code=400, detail="SOS alert is not active")
    sos.status = SOSStatus.false_alarm
    sos.resolved_at = datetime.now(timezone.utc)
    sos.resolved_by = current_user.id
    sos.notes = "Cancelled by user (false alarm)"
    await sos.save()
    return _sos_dict(sos)


@router.put("/sos/{sos_id}/resolve", response_model=SOSResponse)
async def resolve_sos(sos_id: str, payload: SOSResolve, admin_user: User = Depends(get_current_admin)):
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
    """Trigger SOS for guest/unauthenticated users directly to Twilio SMS and Admin phone."""
    try:
        location_url = f"https://www.google.com/maps?q={payload.latitude},{payload.longitude}" if (payload.latitude and payload.longitude) else payload.location_address
        phone = _format_phone(payload.emergency_contact_phone)
        contact_name = payload.emergency_contact_name or "Emergency Contact"

        print(f"[SOS DISPATCH] Contact Phone: {phone}, Admin Phone: {settings.ADMIN_PHONE}")

        if phone:
            res1 = notification_service.send_sos_sms(to_number=phone, user_name=f"Pink Mode Passenger ({contact_name})", location_url=location_url or "Live Tracking Active")
            res2 = notification_service.trigger_sos_call(to_number=phone, user_name="Pink Mode Passenger")
            print(f"[SOS DISPATCH] Contact SMS result: {res1}, Call result: {res2}")

        admin_phone = _format_phone(settings.ADMIN_PHONE)
        if admin_phone and admin_phone != phone:
            res3 = notification_service.send_sos_sms(to_number=admin_phone, user_name="[ADMIN] Pink Mode Passenger", location_url=f"{location_url} | Route: {payload.route_info or 'Active Route'}")
            print(f"[SOS DISPATCH] Admin SMS result: {res3}")

        return {"status": "success", "message": "SOS alert transmitted via Twilio"}
    except Exception as e:
        print(f"[SOS DISPATCH ERROR] {e}")
        return {"status": "error", "detail": str(e)}
