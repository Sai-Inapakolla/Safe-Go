from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from beanie import PydanticObjectId

from fastapi import APIRouter, Depends, HTTPException, Query

from app.models import User, Driver, Vehicle, Ride, SOSAlert, DriverDocument, UserRole, DriverStatus, RideStatus, RideMode, SOSStatus, DocumentStatus
from app.schemas import (
    AdminStats, RidesByMode, SafetyScoreStat, DriverApproval, DocumentReview,
    UserResponse, DriverResponse, RideResponse, SOSResponse, DriverDocumentResponse,
    UserToggleActive, AdminUserCreate, AdminUserUpdate, DriverOnlineStatus
)
from app.utils.dependencies import get_current_admin
from app.utils.security import hash_password

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _user_dict(u: User) -> dict:
    full_name = getattr(u, "full_name", getattr(u, "name", "Unknown User"))
    return {"_id": str(u.id), "full_name": full_name, "email": u.email, "phone": u.phone,
            "role": u.role.value if hasattr(u.role, "value") else u.role,
            "position": u.position, "department": u.department,
            "preferred_mode": u.preferred_mode.value if u.preferred_mode and hasattr(u.preferred_mode, "value") else u.preferred_mode,
            "gender": u.gender.value if u.gender and hasattr(u.gender, "value") else u.gender,
            "profile_photo": u.profile_photo,
            "is_active": u.is_active, "is_verified": u.is_verified, "created_at": u.created_at, "updated_at": u.updated_at}


def _sos_dict(s: SOSAlert) -> dict:
    return {"_id": str(s.id), "user_id": str(s.user_id), "ride_id": str(s.ride_id) if s.ride_id else None,
            "latitude": s.latitude, "longitude": s.longitude, "location_address": s.location_address,
            "severity": s.severity.value, "status": s.status.value, "notes": s.notes,
            "resolved_by": str(s.resolved_by) if s.resolved_by else None, "resolved_at": s.resolved_at, "created_at": s.created_at}


def _doc_dict(d: DriverDocument) -> dict:
    return {"_id": str(d.id), "driver_id": str(d.driver_id), "document_type": d.document_type.value,
            "file_url": d.file_url, "status": d.status.value, "reviewed_by": str(d.reviewed_by) if d.reviewed_by else None,
            "reviewed_at": d.reviewed_at, "notes": d.notes, "created_at": d.created_at, "updated_at": d.updated_at}


def _format_dt(dt) -> Optional[str]:
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _ride_dict(r: Ride) -> dict:
    return {"_id": str(r.id), "passenger_id": str(r.passenger_id), "driver_id": str(r.driver_id) if r.driver_id else None,
            "mode": r.mode.value if hasattr(r.mode, "value") else r.mode,
            "status": r.status.value if hasattr(r.status, "value") else r.status,
            "pickup_address": r.pickup_address,
            "pickup_latitude": r.pickup_latitude, "pickup_longitude": r.pickup_longitude,
            "destination_address": r.destination_address, "destination_latitude": r.destination_latitude,
            "destination_longitude": r.destination_longitude, "distance_km": r.distance_km,
            "duration_minutes": r.duration_minutes, "fare_amount": r.fare_amount, "safety_score": r.safety_score,
            "route_polyline": r.route_polyline, 
            "scheduled_at": _format_dt(r.scheduled_at), 
            "started_at": _format_dt(r.started_at),
            "completed_at": _format_dt(r.completed_at), 
            "cancelled_at": _format_dt(r.cancelled_at), 
            "cancel_reason": r.cancel_reason,
            "created_at": _format_dt(r.created_at), 
            "updated_at": _format_dt(r.updated_at), 
            "driver": None}


async def _driver_dict(driver: Driver) -> dict:
    user = await User.get(driver.user_id)
    vehicle = await Vehicle.find_one(Vehicle.driver_id == driver.id)
    return {
        "_id": str(driver.id), "user_id": str(driver.user_id), "license_number": driver.license_number,
        "status": driver.status.value, "is_online": driver.is_online,
        "current_latitude": driver.current_latitude, "current_longitude": driver.current_longitude,
        "average_rating": driver.average_rating, "total_rides": driver.total_rides,
        "today_rides": driver.today_rides, "today_earnings": driver.today_earnings,
        "acceptance_rate": driver.acceptance_rate, "certified_modes": driver.certified_modes,
        "approved_at": driver.approved_at, "created_at": driver.created_at, "updated_at": driver.updated_at,
        "user": _user_dict(user) if user else None,
        "vehicle": {"_id": str(vehicle.id), "make": vehicle.make, "model": vehicle.model, "year": vehicle.year,
                    "color": vehicle.color, "plate_number": vehicle.plate_number,
                    "is_wheelchair_accessible": vehicle.is_wheelchair_accessible,
                    "is_approved": vehicle.is_approved, "created_at": vehicle.created_at} if vehicle else None,
    }


import asyncio

@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(admin: User = Depends(get_current_admin)):
    """
    Fetch comprehensive system metrics in parallel for maximum dashboard performance.
    """
    (
        total_users, 
        total_drivers, 
        active_drivers, 
        pending_drivers, 
        total_rides, 
        active_rides, 
        total_sos, 
        active_sos
    ) = await asyncio.gather(
        User.count(),
        Driver.count(),
        Driver.find(Driver.is_online == True, Driver.status == DriverStatus.approved).count(),
        Driver.find(Driver.status == DriverStatus.pending).count(),
        Ride.count(),
        Ride.find({"status": {"$in": [
            RideStatus.searching.value, 
            RideStatus.matched.value, 
            RideStatus.driver_arriving.value, 
            RideStatus.in_progress.value
        ]}}).count(),
        SOSAlert.count(),
        SOSAlert.find(SOSAlert.status == SOSStatus.active).count()
    )
    
    return AdminStats(
        total_users=total_users, 
        total_drivers=total_drivers, 
        active_drivers=active_drivers,
        pending_drivers=pending_drivers, 
        total_rides=total_rides, 
        active_rides=active_rides,
        total_sos_alerts=total_sos, 
        active_sos_alerts=active_sos
    )


@router.get("/analytics/rides-by-mode", response_model=List[RidesByMode])
async def get_rides_by_mode(admin: User = Depends(get_current_admin)):
    results = {}
    for mode in RideMode:
        count = await Ride.find(Ride.mode == mode).count()
        if count > 0:
            results[mode.value] = count
    return [RidesByMode(mode=m, rides=c) for m, c in results.items()]


@router.get("/analytics/safety-scores", response_model=List[SafetyScoreStat])
async def get_safety_scores(admin: User = Depends(get_current_admin)):
    import calendar
    from datetime import date
    today = date.today()
    stats = []
    for i in range(5, -1, -1):
        month = today.month - i
        year = today.year
        if month <= 0:
            month += 12
            year -= 1
        stats.append(SafetyScoreStat(month=f"{year}-{month:02d}", score=90.0))
    return stats


@router.get("/drivers", response_model=List[DriverResponse])
async def get_all_drivers(status: Optional[str] = Query(None), q: Optional[str] = Query(None),
                          page: int = Query(default=1, ge=1), per_page: int = Query(default=20, ge=1, le=100),
                          admin: User = Depends(get_current_admin)):
    query = {}
    if status:
        query["status"] = status
    if q:
        # Search by name requires finding the user first
        matching_users = await User.find({"full_name": {"$regex": q, "$options": "i"}}).to_list()
        user_ids = [u.id for u in matching_users]
        query["user_id"] = {"$in": user_ids}
        
    drivers = await Driver.find(query).sort(-Driver.created_at).skip((page - 1) * per_page).limit(per_page).to_list()
    # Parallelize the dossier assembly to avoid N+1 bottleneck
    return await asyncio.gather(*[_driver_dict(d) for d in drivers])


@router.get("/drivers/pending", response_model=List[DriverResponse])
async def get_pending_drivers(admin: User = Depends(get_current_admin)):
    drivers = await Driver.find(Driver.status == DriverStatus.pending).to_list()
    return await asyncio.gather(*[_driver_dict(d) for d in drivers])


@router.get("/drivers/{driver_id}/dossier")
async def get_driver_dossier(driver_id: str, admin: User = Depends(get_current_admin)):
    driver = await Driver.get(PydanticObjectId(driver_id))
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Get basic info (User + Vehicle)
    data = await _driver_dict(driver)
    
    # Get documents
    docs = await DriverDocument.find(DriverDocument.driver_id == driver.id).to_list()
    data["documents"] = [_doc_dict(d) for d in docs]
    
    # Get recent rides
    rides = await Ride.find(Ride.driver_id == driver.id).sort(-Ride.created_at).limit(10).to_list()
    data["recent_rides"] = [_ride_dict(r) for r in rides]
    
    return data


@router.put("/drivers/{driver_id}/approval", response_model=DriverResponse)
async def approve_driver(driver_id: str, payload: DriverApproval, admin: User = Depends(get_current_admin)):
    driver = await Driver.get(PydanticObjectId(driver_id))
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    if payload.status == "approved":
        driver.status = DriverStatus.approved
        driver.approved_at = datetime.now(timezone.utc)
        await driver.save()
        return await _driver_dict(driver)
    elif payload.status == "rejected":
        driver.status = DriverStatus.rejected
        await driver.save()
        
        # Suspend access of the associated user
        user = await User.get(driver.user_id)
        if user:
            user.is_verified = False
            user.is_active = False
            await user.save()
            
        return await _driver_dict(driver)


@router.put("/drivers/{driver_id}/online-status", response_model=DriverResponse)
async def toggle_driver_online(driver_id: str, payload: DriverOnlineStatus, admin: User = Depends(get_current_admin)):
    driver = await Driver.get(PydanticObjectId(driver_id))
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    driver.is_online = payload.is_online
    driver.updated_at = datetime.now(timezone.utc)
    await driver.save()
    return await _driver_dict(driver)


@router.put("/drivers/{driver_id}/documents/{doc_id}", response_model=DriverDocumentResponse)
async def review_document(driver_id: str, doc_id: str, payload: DocumentReview, admin: User = Depends(get_current_admin)):
    doc = await DriverDocument.find_one(DriverDocument.id == PydanticObjectId(doc_id), DriverDocument.driver_id == PydanticObjectId(driver_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if payload.status not in ("verified", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be 'verified' or 'rejected'")
    doc.status = DocumentStatus(payload.status)
    doc.notes = payload.notes
    doc.reviewed_by = admin.id
    doc.reviewed_at = datetime.now(timezone.utc)
    await doc.save()
    return _doc_dict(doc)


@router.get("/rides/live", response_model=List[RideResponse])
async def get_live_rides(admin: User = Depends(get_current_admin)):
    # Return last 15 rides in the system so completed ones show up as well during demo
    rides = await Ride.find().sort(-Ride.created_at).limit(15).to_list()
    return [_ride_dict(r) for r in rides]


@router.get("/rides", response_model=List[RideResponse])
async def get_all_rides(status: Optional[str] = Query(None), mode: Optional[str] = Query(None),
                        page: int = Query(default=1, ge=1), per_page: int = Query(default=20, ge=1, le=100),
                        admin: User = Depends(get_current_admin)):
    query = {}
    if status:
        query["status"] = status
    if mode:
        query["mode"] = mode
    rides = await Ride.find(query).sort(-Ride.created_at).skip((page - 1) * per_page).limit(per_page).to_list()
    return [_ride_dict(r) for r in rides]


@router.get("/sos-alerts", response_model=List[SOSResponse])
async def get_sos_alerts(status: Optional[str] = Query(None), admin: User = Depends(get_current_admin)):
    query = {}
    if status:
        query["status"] = status
    alerts = await SOSAlert.find(query).sort(-SOSAlert.created_at).to_list()
    return [_sos_dict(a) for a in alerts]


@router.put("/sos-alerts/{alert_id}/resolve", response_model=SOSResponse)
async def resolve_sos(alert_id: str, status: str = Query("resolved"), admin: User = Depends(get_current_admin)):
    alert = await SOSAlert.get(PydanticObjectId(alert_id))
    if not alert:
        raise HTTPException(status_code=404, detail="SOS Alert not found")
    
    if status not in ("resolved", "false_alarm"):
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'resolved' or 'false_alarm'")
        
    alert.status = SOSStatus(status)
    alert.resolved_by = admin.id
    alert.resolved_at = datetime.now(timezone.utc)
    await alert.save()
    return _sos_dict(alert)


@router.get("/users", response_model=List[UserResponse])
async def get_all_users(role: Optional[str] = Query(None), q: Optional[str] = Query(None),
                        page: int = Query(default=1, ge=1),
                        per_page: int = Query(default=20, ge=1, le=100), admin: User = Depends(get_current_admin)):
    query = {}
    if role:
        query["role"] = role
    if q:
        query["$or"] = [
            {"full_name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}}
        ]
    
    # Get all matching users
    users = await User.find(query).sort(-User.created_at).to_list()
    
    # Batch load driver profiles to prevent N+1 sequential database queries
    driver_user_ids = [u.id for u in users if u.role == UserRole.driver]
    drivers = await Driver.find({"user_id": {"$in": driver_user_ids}}).to_list() if driver_user_ids else []
    approved_driver_user_ids = {d.user_id for d in drivers if d.status == DriverStatus.approved}
    
    filtered_users = []
    for u in users:
        if u.role == UserRole.driver:
            if u.id not in approved_driver_user_ids:
                continue
        filtered_users.append(u)
        
    # Apply pagination on the filtered list
    start = (page - 1) * per_page
    end = start + per_page
    paginated_users = filtered_users[start:end]
    
    return [_user_dict(u) for u in paginated_users]


@router.put("/users/{user_id}/toggle-active", response_model=UserResponse)
async def toggle_user_active(user_id: str, payload: UserToggleActive, admin: User = Depends(get_current_admin)):
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = payload.is_active
    await user.save()
    return _user_dict(user)


@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user(payload: AdminUserCreate, admin: User = Depends(get_current_admin)):
    existing_email = await User.find_one(User.email == payload.email)
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    existing_phone = await User.find_one(User.phone == payload.phone)
    if existing_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        role=UserRole(payload.role),
        position=payload.position,
        department=payload.department,
        gender=payload.gender,
        is_active=payload.is_active,
        is_verified=payload.is_verified
    )
    await user.insert()

    # Automatically provision Driver & Vehicle records if user is created as a driver
    if user.role == UserRole.driver:
        driver = await Driver.find_one(Driver.user_id == user.id)
        if not driver:
            driver = Driver(
                user_id=user.id,
                license_number=f"DL-{str(user.id)[:10].upper()}",
                status=DriverStatus.approved,
                is_online=True
            )
            await driver.insert()

            vehicle = await Vehicle.find_one(Vehicle.driver_id == driver.id)
            if not vehicle:
                vehicle = Vehicle(
                    driver_id=driver.id,
                    make="Toyota",
                    model="Vios",
                    color="Black",
                    plate_number=f"TXT-{str(user.id)[:4].upper()}",
                    year=2023,
                    is_approved=True
                )
                await vehicle.insert()

    return _user_dict(user)


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, payload: AdminUserUpdate, admin: User = Depends(get_current_admin)):
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role_changing_to_driver = payload.role is not None and payload.role == "driver" and user.role != UserRole.driver

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.email is not None:
        # Check uniqueness if email is changing
        if payload.email != user.email:
            existing = await User.find_one(User.email == payload.email)
            if existing:
                raise HTTPException(status_code=400, detail="Email already registered")
        user.email = payload.email
    if payload.phone is not None:
        if payload.phone != user.phone:
            existing = await User.find_one(User.phone == payload.phone)
            if existing:
                raise HTTPException(status_code=400, detail="Phone number already registered")
        user.phone = payload.phone
    if payload.role is not None:
        user.role = UserRole(payload.role)
    if payload.position is not None:
        user.position = payload.position
    if payload.department is not None:
        user.department = payload.department
    if payload.gender is not None:
        user.gender = payload.gender
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.is_verified is not None:
        user.is_verified = payload.is_verified

    await user.save()

    # Automatically provision Driver & Vehicle records if user is updated to a driver
    if role_changing_to_driver:
        driver = await Driver.find_one(Driver.user_id == user.id)
        if not driver:
            driver = Driver(
                user_id=user.id,
                license_number=f"DL-{str(user.id)[:10].upper()}",
                status=DriverStatus.approved,
                is_online=True
            )
            await driver.insert()

            vehicle = await Vehicle.find_one(Vehicle.driver_id == driver.id)
            if not vehicle:
                vehicle = Vehicle(
                    driver_id=driver.id,
                    make="Toyota",
                    model="Vios",
                    color="Black",
                    plate_number=f"TXT-{str(user.id)[:4].upper()}",
                    year=2023,
                    is_approved=True
                )
                await vehicle.insert()

    return _user_dict(user)


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(user_id: str, admin: User = Depends(get_current_admin)):
    try:
        user_obj_id = PydanticObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    # Clean up associated Driver and Vehicle records regardless of user role
    driver = await Driver.find_one(Driver.user_id == user_obj_id)
    if driver:
        # Delete vehicle too
        vehicle = await Vehicle.find_one(Vehicle.driver_id == driver.id)
        if vehicle:
            await vehicle.delete()
        
        # Delete documents
        docs = await DriverDocument.find(DriverDocument.driver_id == driver.id).to_list()
        for doc in docs:
            await doc.delete()
            
        await driver.delete()

    user = await User.get(user_obj_id)
    if user:
        await user.delete()
    
    return None
