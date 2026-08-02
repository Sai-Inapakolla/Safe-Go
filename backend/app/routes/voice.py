from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from beanie import PydanticObjectId

from fastapi import APIRouter, Depends

from app.models import Ride, SOSAlert, SOSSeverity, SOSStatus, User
from app.schemas import LocationShareRequest, RideResponse, SOSResponse, SOSTriggerRequest
from app.utils.dependencies import get_current_user, get_optional_user

router = APIRouter(prefix="/api/voice", tags=["voice"])


@router.post("/sos-trigger", response_model=SOSResponse)
async def trigger_sos(payload: SOSTriggerRequest, current_user: User = Depends(get_current_user)):
    sos = SOSAlert(
        user_id=current_user.id,
        ride_id=PydanticObjectId(payload.ride_id) if payload.ride_id else None,
        latitude=payload.latitude,
        longitude=payload.longitude,
        location_address=payload.location_address or "Current Location",
        severity=SOSSeverity.critical,
        status=SOSStatus.active,
        notes="Triggered via Voice Assistance",
    )
    await sos.insert()
    return {
        "_id": str(sos.id), "user_id": str(sos.user_id),
        "ride_id": str(sos.ride_id) if sos.ride_id else None,
        "latitude": sos.latitude, "longitude": sos.longitude,
        "location_address": sos.location_address,
        "severity": sos.severity.value, "status": sos.status.value,
        "notes": sos.notes, "resolved_by": None, "resolved_at": None, "created_at": sos.created_at,
    }


@router.post("/location-share")
async def share_location(payload: LocationShareRequest, current_user: User = Depends(get_current_user)):
    print(f"[Voice Location Share] User {current_user.id} at {payload.latitude}, {payload.longitude}")
    return {"status": "shared", "timestamp": datetime.now(timezone.utc).isoformat()}


@router.get("/ride-status")
async def get_ride_status(current_user: User = Depends(get_current_user)):
    ride = await Ride.find_one(Ride.passenger_id == current_user.id, sort=[("-created_at", 1)])
    if not ride:
        return None
    return {
        "_id": str(ride.id), "passenger_id": str(ride.passenger_id),
        "driver_id": str(ride.driver_id) if ride.driver_id else None,
        "mode": ride.mode.value, "status": ride.status.value,
        "pickup_address": ride.pickup_address, "pickup_latitude": ride.pickup_latitude,
        "pickup_longitude": ride.pickup_longitude, "destination_address": ride.destination_address,
        "destination_latitude": ride.destination_latitude, "destination_longitude": ride.destination_longitude,
        "distance_km": ride.distance_km, "duration_minutes": ride.duration_minutes,
        "fare_amount": ride.fare_amount, "safety_score": ride.safety_score,
        "route_polyline": ride.route_polyline, "created_at": ride.created_at, "updated_at": ride.updated_at,
    }


@router.get("/health")
async def voice_health():
    return {"status": "ok", "system": "Browser-Native AI Controller"}
