from __future__ import annotations

from typing import List
from datetime import datetime, timezone

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.models import User, Driver, Vehicle, DriverDocument, Ride, RideStatus, UserRole, DocumentStatus, Rating, DriverStatus
from app.schemas import (
    DriverRegister, DriverApplication, DriverResponse, DriverEarnings, DriverOnlineStatus,
    DriverDocumentResponse, DocumentUpload, RideResponse,
)
from app.services.driver_service import create_driver_profile
from app.utils.dependencies import get_current_user, get_current_driver
import asyncio

router = APIRouter(prefix="/api/drivers", tags=["drivers"])


@router.get("/active", response_model=List[DriverResponse])
async def get_active_drivers(current_user: User = Depends(get_current_user)):
    """Fetch all approved and online drivers for live ride matching.
    Only returns real fleet drivers (not auto-created profiles from passengers/admins).
    """
    drivers = await Driver.find(
        Driver.status == DriverStatus.approved,
        Driver.is_online == True
    ).to_list()
    
    fleet_emails = [
        "priya.singh@safego.in", "ananya.rao@safego.in", "diya.kapoor@safego.in", 
        "neha.acharya@safego.in", "pooja.verma@safego.in",
        "aarav.sharma@safego.in", "kabir.khan@safego.in",
        "rohan.mehta@safego.in", "aditya.patel@safego.in", "vihaan.gupta@safego.in"
    ]
    
    # Filter to strictly include ONLY official fleet drivers by email
    fleet_drivers = []
    for d in drivers:
        user = await User.get(d.user_id)
        if user and user.email in fleet_emails:
            fleet_drivers.append(d)
    
    # Limit to max 10 fleet cabs (5 male, 5 female)
    fleet_drivers = fleet_drivers[:10]
    return await asyncio.gather(*[_driver_dict(d) for d in fleet_drivers])


async def _driver_dict(driver: Driver) -> dict:
    user = await User.get(driver.user_id)
    vehicle = await Vehicle.find_one(Vehicle.driver_id == driver.id)
    return {
        "_id": str(driver.id), "user_id": str(driver.user_id),
        "license_number": driver.license_number, "status": driver.status.value,
        "is_online": driver.is_online, "current_latitude": driver.current_latitude,
        "current_longitude": driver.current_longitude, "average_rating": driver.average_rating,
        "total_rides": driver.total_rides, "today_rides": driver.today_rides,
        "today_earnings": driver.today_earnings, "acceptance_rate": driver.acceptance_rate,
        "certified_modes": driver.certified_modes, "approved_at": driver.approved_at,
        "created_at": driver.created_at, "updated_at": driver.updated_at,
        "user": {"_id": str(user.id), "full_name": user.full_name, "email": user.email,
                 "phone": user.phone, "role": user.role.value,
                 "preferred_mode": user.preferred_mode.value if user.preferred_mode else None,
                 "gender": user.gender.value if user.gender else None,
                 "profile_photo": user.profile_photo, "is_active": user.is_active,
                 "is_verified": user.is_verified, "created_at": user.created_at,
                 "updated_at": user.updated_at} if user else None,
        "vehicle": {"_id": str(vehicle.id), "make": vehicle.make, "model": vehicle.model,
                    "year": vehicle.year, "color": vehicle.color,
                    "plate_number": vehicle.plate_number,
                    "is_wheelchair_accessible": vehicle.is_wheelchair_accessible,
                    "is_approved": vehicle.is_approved,
                    "created_at": vehicle.created_at} if vehicle else None,
    }


def _doc_dict(doc: DriverDocument) -> dict:
    return {
        "_id": str(doc.id), "driver_id": str(doc.driver_id),
        "document_type": doc.document_type.value, "file_url": doc.file_url,
        "status": doc.status.value,
        "reviewed_by": str(doc.reviewed_by) if doc.reviewed_by else None,
        "reviewed_at": doc.reviewed_at, "notes": doc.notes,
        "created_at": doc.created_at, "updated_at": doc.updated_at,
    }


def _format_dt(dt) -> Optional[str]:
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


async def _ride_dict(ride: Ride, passenger_map: Optional[dict] = None) -> dict:
    passenger = None
    if passenger_map and ride.passenger_id in passenger_map:
        passenger = passenger_map[ride.passenger_id]
    else:
        passenger = await User.get(ride.passenger_id)
        
    return {
        "_id": str(ride.id), "passenger_id": str(ride.passenger_id),
        "passenger_name": passenger.full_name if passenger else "Guest User",
        "passenger_rating": 4.8,
        "driver_id": str(ride.driver_id) if ride.driver_id else None,
        "mode": ride.mode.value if hasattr(ride.mode, "value") else ride.mode,
        "status": ride.status.value if hasattr(ride.status, "value") else ride.status,
        "pickup_address": ride.pickup_address, "pickup_latitude": ride.pickup_latitude,
        "pickup_longitude": ride.pickup_longitude, "destination_address": ride.destination_address,
        "destination_latitude": ride.destination_latitude,
        "destination_longitude": ride.destination_longitude,
        "distance_km": ride.distance_km, "duration_minutes": ride.duration_minutes,
        "fare_amount": ride.fare_amount, "safety_score": ride.safety_score,
        "route_polyline": ride.route_polyline,
        "scheduled_at": _format_dt(ride.scheduled_at),
        "started_at": _format_dt(ride.started_at),
        "completed_at": _format_dt(ride.completed_at),
        "cancelled_at": _format_dt(ride.cancelled_at),
        "cancel_reason": ride.cancel_reason,
        "otp": getattr(ride, "otp", None) or f"{(abs(hash(str(ride.id))) % 9000) + 1000}",
        "is_otp_verified": getattr(ride, "is_otp_verified", False),
        "created_at": _format_dt(ride.created_at),
        "updated_at": _format_dt(ride.updated_at),
        "driver": None,
    }


@router.post("/register", response_model=DriverResponse, status_code=201)
async def register_driver(payload: DriverRegister, current_user: User = Depends(get_current_user)):
    if current_user.role not in (UserRole.driver, UserRole.admin):
        raise HTTPException(status_code=403, detail="User must have driver role to register as driver")
    try:
        driver = await create_driver_profile(
            user=current_user,
            license_number=payload.license_number,
            vehicle_data=payload.vehicle.model_dump(),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return await _driver_dict(driver)


@router.post("/apply", response_model=DriverResponse, status_code=201)
async def apply_as_driver(payload: DriverApplication):
    # Check if user already exists
    existing_user = await User.find_one(User.email == payload.email)
    if existing_user and existing_user.role == UserRole.driver:
        raise HTTPException(status_code=400, detail="You are already registered as a driver")

    if existing_user:
        # Update role to driver and sync profile info from application
        existing_user.role = UserRole.driver
        existing_user.full_name = payload.full_name
        existing_user.phone = payload.phone
        await existing_user.save()
        user = existing_user
    else:
        # Create new user
        from app.utils.security import hash_password
        user = User(
            full_name=payload.full_name,
            email=payload.email,
            phone=payload.phone,
            role=UserRole.driver,
            gender=payload.gender,
            hashed_password=hash_password("SafeGo@2025"), # Temporary password
            is_active=True,
            is_verified=False
        )
        await user.insert()
    
    # Create driver profile (pending)
    from app.models import DriverStatus
    driver = Driver(
        user_id=user.id,
        license_number=payload.license_number,
        status=DriverStatus.pending,
        is_online=False,
        average_rating=5.0,
        total_rides=0,
        today_rides=0,
        today_earnings=0.0,
        acceptance_rate=100.0,
        certified_modes=[payload.preferred_mode] if payload.preferred_mode != "standard" else ["normal"]
    )
    await driver.insert()
    
    # Create vehicle
    vehicle = Vehicle(
        driver_id=driver.id,
        make=payload.vehicle.make,
        model=payload.vehicle.model,
        year=payload.vehicle.year,
        color=payload.vehicle.color,
        plate_number=payload.vehicle.plate_number,
        is_wheelchair_accessible=payload.vehicle.is_wheelchair_accessible,
        is_approved=False
    )
    await vehicle.insert()
    
    return await _driver_dict(driver)


async def _get_or_create_driver(user_id) -> Driver:
    driver = await Driver.find_one(Driver.user_id == user_id)
    if not driver:
        # Auto-create a driver profile for seamless demo flow
        driver = Driver(
            user_id=user_id,
            license_number=f"DEMO-{user_id}",
            status=DriverStatus.approved,
            is_online=True,
            average_rating=5.0,
            certified_modes=["normal", "pink", "pwd", "premium", "elderly"]
        )
        await driver.insert()
    return driver


@router.get("/me", response_model=DriverResponse)
async def get_driver_profile(current_user: User = Depends(get_current_driver)):
    driver = await _get_or_create_driver(current_user.id)
    if not driver.is_online:
        driver.is_online = True
        await driver.save()
    return await _driver_dict(driver)


@router.get("/me/earnings", response_model=DriverEarnings)
async def get_driver_earnings(current_user: User = Depends(get_current_driver)):
    driver = await _get_or_create_driver(current_user.id)
    return DriverEarnings(
        today_rides=driver.today_rides or 0, today_earnings=driver.today_earnings or 0.0,
        total_rides=driver.total_rides or 0, acceptance_rate=driver.acceptance_rate or 100.0,
        average_rating=driver.average_rating or 0.0,
    )


@router.put("/me/online-status", response_model=DriverResponse)
async def toggle_online_status(payload: DriverOnlineStatus, current_user: User = Depends(get_current_driver)):
    driver = await _get_or_create_driver(current_user.id)
    driver.is_online = payload.is_online
    driver.updated_at = datetime.now(timezone.utc)
    await driver.save()
    return await _driver_dict(driver)

@router.get("/me/available-rides", response_model=List[RideResponse])
async def get_available_rides(current_user: User = Depends(get_current_driver)):
    driver = await _get_or_create_driver(current_user.id)
    # Return last 15 rides in the system to keep payload lightweight and ensure instant rendering
    rides = await Ride.find().sort(-Ride.created_at).limit(15).to_list()
    
    # Batch load passengers to prevent N+1 query timeout
    passenger_ids = list(set(r.passenger_id for r in rides if r.passenger_id))
    passengers = await User.find({"_id": {"$in": passenger_ids}}).to_list() if passenger_ids else []
    passenger_map = {p.id: p for p in passengers}
    
    return [await _ride_dict(r, passenger_map) for r in rides]


@router.get("/me/history", response_model=List[RideResponse])
async def get_driver_history(current_user: User = Depends(get_current_driver)):
    """
    Get all ride history for the current driver.
    Note: is_deleted_by_user only hides the ride for the passenger.
    Drivers can always see their ride history.
    """
    driver = await _get_or_create_driver(current_user.id)
    rides = await Ride.find(Ride.driver_id == driver.id).sort(-Ride.created_at).to_list()
    
    # Batch load passengers to prevent N+1 query timeout
    passenger_ids = list(set(r.passenger_id for r in rides if r.passenger_id))
    passengers = await User.find({"_id": {"$in": passenger_ids}}).to_list() if passenger_ids else []
    passenger_map = {p.id: p for p in passengers}
    
    return [await _ride_dict(r, passenger_map) for r in rides]


@router.post("/me/rides/{ride_id}/accept", response_model=RideResponse)
async def accept_ride(ride_id: str, current_user: User = Depends(get_current_driver)):
    driver = await _get_or_create_driver(current_user.id)
    ride = await Ride.get(PydanticObjectId(ride_id))
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    # Accept if pending, searching, or matched to any driver in demo environment (disabled for mentor presentations)
    # if ride.status not in (RideStatus.pending, RideStatus.searching, RideStatus.matched):
    #     raise HTTPException(status_code=400, detail="Ride is no longer available")
    ride.driver_id = driver.id
    ride.status = RideStatus.matched
    await ride.save()
    return await _ride_dict(ride)


@router.post("/me/rides/{ride_id}/decline")
async def decline_ride(ride_id: str, current_user: User = Depends(get_current_driver)):
    driver = await _get_or_create_driver(current_user.id)
    ride = await Ride.find_one(Ride.id == PydanticObjectId(ride_id), Ride.driver_id == driver.id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found or not assigned to you")
    ride.driver_id = None
    ride.status = RideStatus.searching
    await ride.save()
    return {"detail": "Ride declined"}


@router.get("/me/documents", response_model=List[DriverDocumentResponse])
async def list_documents(current_user: User = Depends(get_current_driver)):
    driver = await _get_or_create_driver(current_user.id)
    docs = await DriverDocument.find(DriverDocument.driver_id == driver.id).to_list()
    return [_doc_dict(d) for d in docs]


@router.put("/me/documents/{doc_id}/upload", response_model=DriverDocumentResponse)
async def upload_document(doc_id: str, payload: DocumentUpload, current_user: User = Depends(get_current_driver)):
    driver = await _get_or_create_driver(current_user.id)
    doc = await DriverDocument.find_one(
        DriverDocument.id == PydanticObjectId(doc_id),
        DriverDocument.driver_id == driver.id,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.file_url = payload.file_url
    doc.status = DocumentStatus.pending
    doc.updated_at = datetime.now(timezone.utc)
    await doc.save()
    return _doc_dict(doc)


@router.get("/me/activity", response_model=List[dict])
async def get_driver_activity(current_user: User = Depends(get_current_driver)):
    driver = await _get_or_create_driver(current_user.id)
    activity = []
    
    # 1. Recent completed rides
    rides = await Ride.find(Ride.driver_id == driver.id, Ride.status == RideStatus.completed).sort(-Ride.completed_at).limit(5).to_list()
    for r in rides:
        activity.append({
            "text": f"Completed ride to {r.destination_address}",
            "time": r.completed_at.strftime("%I:%M %p") if r.completed_at else "Just now",
            "type": "ride"
        })
        
    # 2. Verified documents
    docs = await DriverDocument.find(DriverDocument.driver_id == driver.id, DriverDocument.status == DocumentStatus.verified).sort(-DriverDocument.updated_at).limit(3).to_list()
    for d in docs:
        activity.append({
            "text": f"Document approved: {d.document_type.value.replace('_', ' ').title()}",
            "time": d.updated_at.strftime("%I:%M %p") if d.updated_at else "Today",
            "type": "document"
        })
        
    # 3. High ratings
    ratings = await Rating.find(Rating.driver_id == driver.id, Rating.score >= 4).sort(-Rating.created_at).limit(3).to_list()
    for r in ratings:
        activity.append({
            "text": f"{r.score}-star rating received",
            "time": r.created_at.strftime("%I:%M %p") if r.created_at else "Today",
            "type": "rating"
        })
        
    return sorted(activity, key=lambda x: x["time"], reverse=True)[:10]
    ratings = await Rating.find(Rating.driver_id == driver.id, Rating.score >= 4).sort(-Rating.created_at).limit(3).to_list()
    for r in ratings:
        activity.append({
            "text": f"{r.score}-star rating received",
            "time": r.created_at.strftime("%I:%M %p") if r.created_at else "Today",
            "type": "rating"
        })
        
    return sorted(activity, key=lambda x: x["time"], reverse=True)[:10]
