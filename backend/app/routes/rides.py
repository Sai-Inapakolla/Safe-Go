from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from beanie import PydanticObjectId
from beanie.operators import In

from fastapi import APIRouter, Depends, HTTPException, status

from app.models import User, Ride, Rating, Driver, Vehicle, RideStatus
from app.schemas import RideRequest, RideResponse, RideStatusUpdate, RatingCreate, RatingResponse, RideOTPVerifyRequest
from app.services.ride_service import create_ride, complete_ride, update_driver_rating
from app.utils.dependencies import get_current_user, get_current_passenger

router = APIRouter(prefix="/api/rides", tags=["rides"])


def _format_dt(dt) -> Optional[str]:
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _ride_dict(ride: Ride, driver_brief=None) -> dict:
    return {
        "_id": str(ride.id),
        "passenger_id": str(ride.passenger_id),
        "driver_id": str(ride.driver_id) if ride.driver_id else None,
        "mode": ride.mode.value if hasattr(ride.mode, "value") else ride.mode,
        "status": ride.status.value if hasattr(ride.status, "value") else ride.status,
        "pickup_address": ride.pickup_address,
        "pickup_latitude": ride.pickup_latitude,
        "pickup_longitude": ride.pickup_longitude,
        "destination_address": ride.destination_address,
        "destination_latitude": ride.destination_latitude,
        "destination_longitude": ride.destination_longitude,
        "distance_km": ride.distance_km,
        "duration_minutes": ride.duration_minutes,
        "fare_amount": ride.fare_amount,
        "safety_score": ride.safety_score,
        "route_polyline": ride.route_polyline,
        "scheduled_at": _format_dt(ride.scheduled_at),
        "started_at": _format_dt(ride.started_at),
        "completed_at": _format_dt(ride.completed_at),
        "cancelled_at": _format_dt(ride.cancelled_at),
        "cancel_reason": ride.cancel_reason,
        "passenger_count": ride.passenger_count,
        "passenger_details": ride.passenger_details,
        "has_female_passenger_declared": getattr(ride, "has_female_passenger_declared", False),
        "female_passenger_name": getattr(ride, "female_passenger_name", None),
        "penalty_amount": getattr(ride, "penalty_amount", None),
        "is_penalty_applied": getattr(ride, "is_penalty_applied", False),
        "penalty_reason": getattr(ride, "penalty_reason", None),
        "driver_compensation_amount": getattr(ride, "driver_compensation_amount", None),
        "emergency_contact_name": getattr(ride, "emergency_contact_name", None),
        "emergency_contact_phone": getattr(ride, "emergency_contact_phone", None),
        "otp": getattr(ride, "otp", None) or f"{(abs(hash(str(ride.id))) % 9000) + 1000}",
        "is_otp_verified": getattr(ride, "is_otp_verified", False),
        "created_at": _format_dt(ride.created_at),
        "updated_at": _format_dt(ride.updated_at),
        "driver": driver_brief,
    }


async def _load_driver_brief(driver_id: Optional[PydanticObjectId | str]):
    if not driver_id:
        return None
    if isinstance(driver_id, str):
        if not PydanticObjectId.is_valid(driver_id):
            return None
        driver_id = PydanticObjectId(driver_id)
    driver = await Driver.get(driver_id)
    if not driver:
        return None
    user = await User.get(driver.user_id)
    vehicle = await Vehicle.find_one(Vehicle.driver_id == driver.id)
    return {
        "_id": str(driver.id),
        "average_rating": driver.average_rating,
        "user": {"full_name": user.full_name} if user else None,
        "vehicle": {"make": vehicle.make, "model": vehicle.model, "plate_number": vehicle.plate_number} if vehicle else None,
    }


@router.post("/request", response_model=RideResponse, status_code=201)
async def request_ride(payload: RideRequest, current_user: User = Depends(get_current_passenger)):
    if not current_user.id:
        raise HTTPException(status_code=400, detail="User ID is required")
    ride = await create_ride(
        passenger_id=current_user.id,
        mode=payload.mode,
        pickup_address=payload.pickup_address,
        pickup_latitude=payload.pickup_latitude,
        pickup_longitude=payload.pickup_longitude,
        destination_address=payload.destination_address,
        destination_latitude=payload.destination_latitude,
        destination_longitude=payload.destination_longitude,
        scheduled_at=payload.scheduled_at,
        passenger_count=payload.passenger_count,
        passenger_details=payload.passenger_details,
        emergency_contact_name=payload.emergency_contact_name,
        emergency_contact_phone=payload.emergency_contact_phone,
        driver_id=payload.driver_id,
        fare_amount=payload.fare_amount,
        has_female_passenger_declared=payload.has_female_passenger_declared or False,
        female_passenger_name=payload.female_passenger_name,
    )
    driver_brief = await _load_driver_brief(ride.driver_id)
    return _ride_dict(ride, driver_brief)


@router.get("/me", response_model=List[RideResponse])
async def get_my_rides(current_user: User = Depends(get_current_user)):
    from datetime import datetime
    # Find rides for passenger
    user_rides = await Ride.find(
        Ride.passenger_id == current_user.id,
        Ride.is_deleted_by_user == False
    ).sort("-created_at").to_list()
    
    # Also fetch all recent rides to support cross-account testing and demo sessions
    recent_rides = await Ride.find(Ride.is_deleted_by_user == False).sort("-created_at").limit(25).to_list()
    
    seen_ids = set()
    combined_rides = []
    for ride in user_rides:
        seen_ids.add(str(ride.id))
        combined_rides.append(ride)
    for ride in recent_rides:
        if str(ride.id) not in seen_ids:
            seen_ids.add(str(ride.id))
            combined_rides.append(ride)
    
    # Sort with newest cancelled/updated trips at the top
    combined_rides.sort(key=lambda r: (r.cancelled_at or r.updated_at or r.created_at or datetime.min), reverse=True)
    
    result = []
    for ride in combined_rides:
        db = await _load_driver_brief(ride.driver_id)
        result.append(_ride_dict(ride, db))
    return result


@router.get("/active", response_model=RideResponse)
async def get_active_ride(current_user: User = Depends(get_current_user)):
    active_statuses = [
        RideStatus.pending.value,
        RideStatus.searching.value,
        RideStatus.matched.value,
        RideStatus.driver_arriving.value,
        RideStatus.in_progress.value
    ]
    ride = await Ride.find_one(
        {"passenger_id": current_user.id, "status": {"$in": active_statuses}}
    )
    if not ride:
        raise HTTPException(status_code=404, detail="No active ride found")
    driver_brief = await _load_driver_brief(ride.driver_id)
    return _ride_dict(ride, driver_brief)


@router.get("/latest", response_model=RideResponse)
async def get_latest_ride(current_user: User = Depends(get_current_user)):
    ride = await Ride.find(Ride.passenger_id == current_user.id).sort("-created_at").first_or_none()
    if not ride:
        raise HTTPException(status_code=404, detail="No ride found")
    driver_brief = await _load_driver_brief(ride.driver_id)
    return _ride_dict(ride, driver_brief)


@router.get("/{ride_id}", response_model=RideResponse)
async def get_ride_by_id(ride_id: str, current_user: User = Depends(get_current_user)):
    ride = None
    if PydanticObjectId.is_valid(ride_id):
        ride = await Ride.get(PydanticObjectId(ride_id))
    if not ride:
        ride = await Ride.find(Ride.passenger_id == current_user.id).sort("-created_at").first_or_none()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    driver_brief = await _load_driver_brief(ride.driver_id)
    return _ride_dict(ride, driver_brief)

@router.post("/simulate-completed", response_model=RideResponse)
async def simulate_completed_ride(current_user: User = Depends(get_current_user)):
    import random
    from datetime import datetime, timezone
    from app.models import Driver, DriverStatus, User, Ride, RideStatus, RideMode
    
    # 1. Find a random approved driver
    driver = await Driver.find_one(Driver.status == DriverStatus.approved)
    if not driver:
        # Fallback to creating a mock driver profile if none exists
        driver = Driver(
            user_id=current_user.id,
            license_number="SIM-LICENSE-123",
            status=DriverStatus.approved,
            is_online=True,
            certified_modes=["normal", "pink", "pwd", "premium", "elderly"]
        )
        await driver.insert()
        
    destinations = [
        {"pickup": "SH158, Waghodia Road, Vadodara", "dest": "Nadiad, Gujarat, India", "dist": 45.5},
        {"pickup": "Vadodara Station, Vadodara", "dest": "Delhi, India", "dist": 1000.2},
        {"pickup": "SH158, Waghodia Road, Vadodara", "dest": "Namakkal, Tamil Nadu, India", "dist": 1300.5},
        {"pickup": "Delhi Airport, Delhi", "dest": "Kerala, India", "dist": 2000.0}
    ]
    route = random.choice(destinations)
    
    dist_val = float(route["dist"])
    fare_val = round(50 + dist_val * 12.5, 2)
    ride = Ride(
        passenger_id=current_user.id,
        driver_id=driver.id,
        mode=RideMode.normal,
        status=RideStatus.completed,
        pickup_address=str(route["pickup"]),
        destination_address=str(route["dest"]),
        distance_km=dist_val,
        duration_minutes=round(dist_val * 1.2, 1),
        fare_amount=fare_val,
        safety_score=random.randint(90, 98),
        completed_at=datetime.now(timezone.utc),
        passenger_count=1
    )
    await ride.insert()
    
    # Increment driver stats
    driver.total_rides = (driver.total_rides or 0) + 1
    driver.today_rides = (driver.today_rides or 0) + 1
    driver.today_earnings = (driver.today_earnings or 0.0) + fare_val
    await driver.save()
    
    db_brief = await _load_driver_brief(ride.driver_id)
    return _ride_dict(ride, db_brief)



@router.get("/{ride_id}", response_model=RideResponse)
async def get_ride(ride_id: str, current_user: User = Depends(get_current_user)):
    if not PydanticObjectId.is_valid(ride_id):
        raise HTTPException(status_code=404, detail="Ride not found")
    ride = await Ride.get(PydanticObjectId(ride_id))
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    role_val = current_user.role.value if hasattr(current_user.role, 'value') else current_user.role
    if role_val != "admin" and ride.passenger_id != current_user.id:
        driver = await Driver.find_one(Driver.user_id == current_user.id)
        if not driver or ride.driver_id != driver.id:
            raise HTTPException(status_code=403, detail="Access denied")
    driver_brief = await _load_driver_brief(ride.driver_id)
    return _ride_dict(ride, driver_brief)


@router.put("/{ride_id}/status", response_model=RideResponse)
async def update_ride_status(ride_id: str, payload: RideStatusUpdate, current_user: User = Depends(get_current_user)):
    if not PydanticObjectId.is_valid(ride_id):
        raise HTTPException(status_code=404, detail="Ride not found")
    ride = await Ride.get(PydanticObjectId(ride_id))
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    role_val = current_user.role.value if hasattr(current_user.role, 'value') else current_user.role
    if role_val != "admin" and ride.passenger_id != current_user.id:
        driver = await Driver.find_one(Driver.user_id == current_user.id)
        if not driver or ride.driver_id != driver.id:
            raise HTTPException(status_code=403, detail="Access denied: unauthorized ride modification")

    if payload.status == "completed":
        ride = await complete_ride(ride)
    elif payload.status == "cancelled":
        ride.status = RideStatus.cancelled
        ride.cancelled_at = datetime.now(timezone.utc)
        ride.cancel_reason = payload.cancel_reason
        await ride.save()
    elif payload.status == "in_progress":
        if not getattr(ride, "is_otp_verified", False):
            raise HTTPException(
                status_code=400,
                detail="OTP verification required before starting the ride. Please verify the 4-digit passenger OTP."
            )
        ride.status = RideStatus.in_progress
        ride.started_at = datetime.now(timezone.utc)
        await ride.save()
    elif payload.status == "driver_arriving":
        ride.status = RideStatus.driver_arriving
        await ride.save()
    else:
        ride.status = RideStatus(payload.status)
        await ride.save()
    driver_brief = await _load_driver_brief(ride.driver_id)
    return _ride_dict(ride, driver_brief)



@router.post("/{ride_id}/rate", response_model=RatingResponse, status_code=201)
async def rate_ride(ride_id: str, payload: RatingCreate, current_user: User = Depends(get_current_passenger)):
    ride = await Ride.find_one(Ride.id == PydanticObjectId(ride_id), Ride.passenger_id == current_user.id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride.status != RideStatus.completed:
        raise HTTPException(status_code=400, detail="Can only rate completed rides")
    if not ride.driver_id:
        raise HTTPException(status_code=400, detail="Ride has no driver to rate")
    existing = await Rating.find_one(Rating.ride_id == ride.id)
    if existing:
        raise HTTPException(status_code=400, detail="Ride already rated")
    # AI Sentiment Analysis
    sentiment_score = 0.0
    sentiment_label = "Neutral"
    if payload.comment:
        try:
            import importlib
            tb_mod = importlib.import_module("textblob")
            tb_cls = getattr(tb_mod, "TextBlob")
            analysis = tb_cls(payload.comment)
            sentiment_score = round(analysis.sentiment.polarity, 2)
            if sentiment_score > 0.1:
                sentiment_label = "Positive"
            elif sentiment_score < -0.1:
                sentiment_label = "Critical"
        except Exception:
            pass

    rating = Rating(
        ride_id=ride.id,
        rater_id=current_user.id,
        driver_id=ride.driver_id,
        score=payload.score,
        comment=payload.comment,
        sentiment_score=sentiment_score,
        sentiment_label=sentiment_label,
    )
    await rating.insert()
    await update_driver_rating(ride.driver_id)
    return {
        "_id": str(rating.id),
        "ride_id": str(rating.ride_id),
        "rater_id": str(rating.rater_id),
        "driver_id": str(rating.driver_id),
        "score": rating.score,
        "comment": rating.comment,
        "sentiment_score": rating.sentiment_score,
        "sentiment_label": rating.sentiment_label,
        "created_at": rating.created_at,
    }


@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
async def clear_ride_history(current_user: User = Depends(get_current_user)):
    """
    Soft-delete all ride history for the current user.
    Sets is_deleted_by_user=True but keeps the data in MongoDB.
    """
    await Ride.get_motor_collection().update_many(
        {"passenger_id": current_user.id},
        {"$set": {"is_deleted_by_user": True}}
    )
    return None


@router.delete("/history/bulk", status_code=status.HTTP_204_NO_CONTENT)
async def delete_selected_rides(
    ride_ids: List[str],
    current_user: User = Depends(get_current_user)
):
    """
    Soft-delete specific rides from history.
    """
    ids = [PydanticObjectId(rid) for rid in ride_ids]
    await Ride.get_motor_collection().update_many(
        {"passenger_id": current_user.id, "_id": {"$in": ids}},
        {"$set": {"is_deleted_by_user": True}}
    )
    return None
